import "server-only";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { contactMessages, newsletterSubscribers } from "@/db/schema";
import { env } from "@/lib/env";
import type { Locale } from "@/i18n/config";
import { randomToken, sha256Hex } from "@/lib/auth/crypto";
import { newReference } from "@/lib/reference";
import { contactSchema, newsletterSchema } from "@/lib/schemas/public-forms";
import { rateLimit } from "@/lib/security/rate-limit";
import { requestMeta } from "@/lib/security/request";
import { dispatchAfterResponse, enqueue } from "@/server/notifications/outbox";
import { fieldErrors, guard, uniqueViolation, type SubmitResult } from "./guard";

export async function submitContact(input: unknown, locale: Locale): Promise<SubmitResult> {
  const parsed = contactSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "validation", fieldErrors: fieldErrors(parsed.error) };
  const data = parsed.data;

  const existing = await db()
    .select({ reference: contactMessages.reference })
    .from(contactMessages)
    .where(eq(contactMessages.idempotencyKey, data.idempotencyKey))
    .limit(1);
  if (existing[0]) return { ok: true, reference: existing[0].reference, status: "new", duplicate: true };

  const g = await guard("contact", data, { limit: 5, windowSeconds: 900 });
  if (!g.ok) return { ok: false, error: g.error };

  try {
    const result = await db().transaction(async (tx) => {
      const reference = newReference("message");
      const [row] = await tx
        .insert(contactMessages)
        .values({
          reference,
          name: data.name,
          email: data.email,
          phone: data.phone,
          topic: data.topic,
          subject: data.subject,
          message: data.message,
          locale,
          idempotencyKey: data.idempotencyKey,
          ipHash: g.ipHash,
        })
        .returning({ id: contactMessages.id });
      const ids = await enqueue(
        { template: "contact.received", locale, email: data.email, related: { type: "contact_message", id: row.id }, payload: { name: data.name.split(" ")[0] ?? data.name, reference, subject: data.subject } },
        tx,
      );
      ids.push(
        ...(await enqueue(
          {
            template: "staff.submission",
            locale: "en",
            email: env().STAFF_NOTIFY_EMAIL,
            related: { type: "contact_message", id: row.id },
            payload: { kind: "Contact message", reference, name: data.name, summary: `[${data.topic}] ${data.subject}`, adminUrl: `${env().APP_URL}/admin/messages/${row.id}` },
          },
          tx,
        )),
      );
      return { reference, ids };
    });
    dispatchAfterResponse(result.ids);
    return { ok: true, reference: result.reference, status: "new" };
  } catch (error) {
    if (uniqueViolation(error, /idempotency/i)) return { ok: true, reference: "", status: "new", duplicate: true };
    console.error("contact message failed", error);
    return { ok: false, error: "generic" };
  }
}

export type NewsletterResult = { ok: true; already?: boolean } | { ok: false; error: "validation" | "rate_limited" | "generic" };

/** Double opt-in: the address only becomes active after the confirmation link is used. */
export async function subscribe(input: unknown, locale: Locale): Promise<NewsletterResult> {
  const parsed = newsletterSchema.safeParse(input);
  if (!parsed.success || parsed.data.website) return { ok: false, error: "validation" };
  const meta = await requestMeta();
  const rl = await rateLimit("newsletter", meta.ipHash, { limit: 5, windowSeconds: 900 });
  if (!rl.ok) return { ok: false, error: "rate_limited" };

  const email = parsed.data.email;
  const token = randomToken(24);
  try {
    const [existing] = await db()
      .select()
      .from(newsletterSubscribers)
      .where(eq(sql`lower(${newsletterSubscribers.email})`, email))
      .limit(1);
    if (existing?.status === "active") return { ok: true, already: true };
    if (existing) {
      await db()
        .update(newsletterSubscribers)
        .set({ status: "pending", tokenHash: sha256Hex(token), consentAt: new Date(), locale })
        .where(eq(newsletterSubscribers.id, existing.id));
    } else {
      await db().insert(newsletterSubscribers).values({ email, locale, status: "pending", tokenHash: sha256Hex(token), consentAt: new Date() });
    }
    const ids = await enqueue({
      template: "newsletter.confirm",
      locale,
      email,
      payload: { confirmUrl: `${env().APP_URL}/${locale}/newsletter/confirm?token=${token}` },
    });
    dispatchAfterResponse(ids);
    return { ok: true };
  } catch (error) {
    console.error("newsletter subscribe failed", error);
    return { ok: false, error: "generic" };
  }
}

export async function confirmSubscription(token: string): Promise<boolean> {
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(token)) return false;
  const updated = await db()
    .update(newsletterSubscribers)
    .set({ status: "active", confirmedAt: new Date(), tokenHash: null })
    .where(and(eq(newsletterSubscribers.tokenHash, sha256Hex(token)), eq(newsletterSubscribers.status, "pending")))
    .returning({ id: newsletterSubscribers.id });
  return updated.length === 1;
}
