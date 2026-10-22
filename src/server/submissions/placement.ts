import "server-only";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { placementApplications, placementSessions } from "@/db/schema";
import { env } from "@/lib/env";
import type { Locale } from "@/i18n/config";
import { formatClock, formatDate, formatPKR } from "@/lib/format";
import { buildIcs } from "@/lib/ics";
import { newReference } from "@/lib/reference";
import { placementSchema } from "@/lib/schemas/public-forms";
import { dispatchAfterResponse, enqueue } from "@/server/notifications/outbox";
import { fieldErrors, guard, uniqueViolation, type SubmitResult } from "./guard";

class ClosedError extends Error {}
class FullError extends Error {}

export async function submitPlacement(input: unknown, locale: Locale): Promise<SubmitResult> {
  const parsed = placementSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "validation", fieldErrors: fieldErrors(parsed.error) };
  const data = parsed.data;

  const existing = await db()
    .select({ reference: placementApplications.reference, status: placementApplications.status })
    .from(placementApplications)
    .where(eq(placementApplications.idempotencyKey, data.idempotencyKey))
    .limit(1);
  if (existing[0]) return { ok: true, reference: existing[0].reference, status: existing[0].status, duplicate: true };

  const g = await guard("placement", data, { limit: 6, windowSeconds: 900 });
  if (!g.ok) return { ok: false, error: g.error };

  try {
    const result = await db().transaction(async (tx) => {
      const [session] = await tx.select().from(placementSessions).where(eq(placementSessions.id, data.sessionId)).for("update").limit(1);
      if (!session || session.status !== "open" || session.registrationDeadline.getTime() < Date.now()) throw new ClosedError();
      if (!session.levels.includes(data.targetLevel)) return { invalid: { targetLevel: "required" } } as const;

      const reserved = await tx
        .update(placementSessions)
        .set({ seatsTaken: sql`${placementSessions.seatsTaken} + 1` })
        .where(and(eq(placementSessions.id, session.id), sql`${placementSessions.seatsTaken} < ${placementSessions.capacity}`))
        .returning({ id: placementSessions.id });
      if (!reserved.length) throw new FullError();

      const reference = newReference("placement");
      const [row] = await tx
        .insert(placementApplications)
        .values({
          reference,
          sessionId: session.id,
          status: "submitted",
          locale,
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          phone: data.phone,
          cnic: data.cnic,
          dateOfBirth: data.dateOfBirth,
          targetLevel: data.targetLevel,
          priorLearning: data.priorLearning,
          whatsappOptIn: data.whatsappOptIn,
          privacyConsentAt: new Date(),
          idempotencyKey: data.idempotencyKey,
          ipHash: g.ipHash,
        })
        .returning({ id: placementApplications.id });

      const when = `${formatDate(session.startsAt, locale, { weekday: "long" })}, ${formatClock(session.startsAt, locale)}${locale === "de" ? " bis " : " to "}${formatClock(session.endsAt, locale)}${locale === "de" ? " Uhr" : ""}`;
      const ids = await enqueue(
        {
          template: "placement.received",
          locale,
          email: data.email,
          whatsapp: data.whatsappOptIn ? data.phone : null,
          related: { type: "placement_application", id: row.id },
          payload: {
            name: data.firstName,
            reference,
            trackUrl: `${env().APP_URL}/${locale}/track?ref=${reference}`,
            when,
            venue: session.venue,
            fee: formatPKR(session.feePkr, locale),
            level: data.targetLevel,
            ics: buildIcs({
              uid: reference,
              title: locale === "de" ? "ASH Einstufungstest" : "ASH placement test",
              description: `${reference}: ${locale === "de" ? "Original-CNIC mitbringen" : "Bring your original CNIC"}`,
              location: session.venue,
              start: session.startsAt,
              end: session.endsAt,
            }),
          },
        },
        tx,
      );
      ids.push(
        ...(await enqueue(
          {
            template: "staff.submission",
            locale: "en",
            email: env().STAFF_NOTIFY_EMAIL,
            related: { type: "placement_application", id: row.id },
            payload: {
              kind: "Placement test application",
              reference,
              name: `${data.firstName} ${data.lastName}`,
              summary: `${data.firstName} ${data.lastName} registered for ${session.code} (target ${data.targetLevel}).`,
              adminUrl: `${env().APP_URL}/admin/placement/${session.id}`,
            },
          },
          tx,
        )),
      );
      return { reference, ids };
    });

    if ("invalid" in result) return { ok: false, error: "validation", fieldErrors: { ...result.invalid } };
    dispatchAfterResponse(result.ids);
    return { ok: true, reference: result.reference, status: "submitted" };
  } catch (error) {
    if (error instanceof ClosedError) return { ok: false, error: "closed" };
    if (error instanceof FullError) return { ok: false, error: "closed", message: "full" };
    if (uniqueViolation(error, "placement_applications_active_cnic_key")) return { ok: false, error: "duplicate" };
    if (uniqueViolation(error, /idempotency/i)) {
      const again = await db().select({ reference: placementApplications.reference, status: placementApplications.status }).from(placementApplications).where(eq(placementApplications.idempotencyKey, data.idempotencyKey)).limit(1);
      if (again[0]) return { ok: true, reference: again[0].reference, status: again[0].status, duplicate: true };
    }
    console.error("placement application failed", error);
    return { ok: false, error: "generic" };
  }
}
