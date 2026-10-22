import "server-only";
import { after } from "next/server";
import { and, eq, inArray, lte, sql } from "drizzle-orm";
import { db, type Database } from "@/db";
import { notifications } from "@/db/schema";
import { env, gmailConfigured, whatsappConfigured } from "@/lib/env";
import type { Locale } from "@/i18n/config";
import { NotConfiguredError, sendEmail } from "./gmail";
import { renderEmail, whatsappTemplate, type TemplateKey, type TemplatePayloads } from "./templates";
import { sendWhatsAppTemplate } from "./whatsapp";

/**
 * Transactional outbox. Submissions write notification rows in the same
 * transaction as the data they describe, then dispatch runs after the response
 * (`after`) and again from the cron job for retries. A provider outage never
 * loses a message and never blocks a form submission.
 */
const MAX_ATTEMPTS = 6;

type Tx = Pick<Database, "insert">;

export type OutgoingNotification<K extends TemplateKey = TemplateKey> = {
  template: K;
  payload: TemplatePayloads[K];
  locale: Locale;
  email?: string | null;
  whatsapp?: string | null;
  related?: { type: string; id: string };
};

export async function enqueue<K extends TemplateKey>(n: OutgoingNotification<K>, tx: Tx = db()): Promise<string[]> {
  const rows: (typeof notifications.$inferInsert)[] = [];
  const base = {
    template: n.template,
    locale: n.locale,
    payload: n.payload as Record<string, unknown>,
    relatedType: n.related?.type ?? null,
    relatedId: n.related?.id ?? null,
  };
  if (n.email) {
    const subject = renderEmail(n.template, n.payload, n.locale).subject;
    rows.push({ ...base, channel: "email", recipient: n.email, subject });
  }
  if (n.whatsapp && whatsappTemplate(n.template, n.payload, n.locale)) {
    rows.push({ ...base, channel: "whatsapp", recipient: n.whatsapp });
  }
  if (!rows.length) return [];
  const inserted = await tx.insert(notifications).values(rows).returning({ id: notifications.id });
  return inserted.map((r) => r.id);
}

/** Queue + dispatch after the response is sent. */
export function dispatchAfterResponse(ids: string[]) {
  if (!ids.length) return;
  after(() => dispatch({ ids }).catch((e) => console.error("notification dispatch failed", e)));
}

function backoff(attempt: number) {
  return new Date(Date.now() + Math.min(6 * 3600, 60 * 2 ** attempt) * 1000);
}

/** Claims due notifications (SKIP LOCKED, safe with concurrent workers) and sends them. */
export async function dispatch({ ids, limit = 25 }: { ids?: string[]; limit?: number } = {}) {
  const claimed = await db().transaction(async (tx) => {
    const due = await tx
      .select({ id: notifications.id })
      .from(notifications)
      .where(
        and(
          eq(notifications.status, "queued"),
          lte(notifications.nextAttemptAt, new Date()),
          ids?.length ? inArray(notifications.id, ids) : undefined,
        ),
      )
      .orderBy(notifications.createdAt)
      .limit(limit)
      .for("update", { skipLocked: true });
    if (!due.length) return [];
    return tx
      .update(notifications)
      .set({ status: "sending", attempts: sql`${notifications.attempts} + 1` })
      .where(inArray(notifications.id, due.map((d) => d.id)))
      .returning();
  });

  let sent = 0;
  for (const n of claimed) {
    try {
      const locale = (n.locale === "de" ? "de" : "en") as Locale;
      let providerId: string;
      if (n.channel === "email") {
        if (!gmailConfigured()) throw new NotConfiguredError("Gmail API not configured");
        const rendered = renderEmail(n.template as TemplateKey, n.payload as never, locale);
        const res = await sendEmail({
          to: n.recipient,
          subject: rendered.subject,
          html: rendered.html,
          text: rendered.text,
          attachments: rendered.attachments,
          replyTo: env().STAFF_NOTIFY_EMAIL,
        });
        providerId = res.id;
      } else {
        if (!whatsappConfigured()) throw new NotConfiguredError("WhatsApp API not configured");
        const t = whatsappTemplate(n.template as TemplateKey, n.payload as never, locale);
        if (!t) throw new NotConfiguredError("No WhatsApp template for this notification");
        providerId = (await sendWhatsAppTemplate(n.recipient, t)).id;
      }
      await db()
        .update(notifications)
        .set({ status: "sent", sentAt: new Date(), providerMessageId: providerId, lastError: null })
        .where(eq(notifications.id, n.id));
      sent++;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const skipped = error instanceof NotConfiguredError;
      const final = skipped || n.attempts >= MAX_ATTEMPTS;
      await db()
        .update(notifications)
        .set({
          status: skipped ? "skipped" : final ? "failed" : "queued",
          lastError: message.slice(0, 500),
          nextAttemptAt: final ? new Date() : backoff(n.attempts),
        })
        .where(eq(notifications.id, n.id));
      if (!skipped) console.error(`notification ${n.id} (${n.channel}) failed: ${message}`);
    }
  }
  return { claimed: claimed.length, sent };
}

/** Admin "retry": requeue a failed/skipped notification. */
export async function requeue(id: string) {
  await db()
    .update(notifications)
    .set({ status: "queued", nextAttemptAt: new Date(), lastError: null })
    .where(and(eq(notifications.id, id), inArray(notifications.status, ["failed", "skipped"])));
  dispatchAfterResponse([id]);
}
