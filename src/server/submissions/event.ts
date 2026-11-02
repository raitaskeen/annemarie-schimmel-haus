import "server-only";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { eventRegistrations, events } from "@/db/schema";
import { env } from "@/lib/env";
import { pick, type Locale } from "@/i18n/config";
import { formatClock, formatDate } from "@/lib/format";
import { buildIcs } from "@/lib/ics";
import { newReference } from "@/lib/reference";
import { eventRegistrationSchema } from "@/lib/schemas/public-forms";
import { dispatchAfterResponse, enqueue } from "@/server/notifications/outbox";
import { fieldErrors, guard, uniqueViolation, type SubmitResult } from "./guard";

class ClosedError extends Error {}

export async function submitEventRegistration(input: unknown, locale: Locale): Promise<SubmitResult> {
  const parsed = eventRegistrationSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "validation", fieldErrors: fieldErrors(parsed.error) };
  const data = parsed.data;

  const existing = await db()
    .select({ reference: eventRegistrations.reference, status: eventRegistrations.status })
    .from(eventRegistrations)
    .where(eq(eventRegistrations.idempotencyKey, data.idempotencyKey))
    .limit(1);
  if (existing[0]) return { ok: true, reference: existing[0].reference, status: existing[0].status, duplicate: true };

  const g = await guard("event", data, { limit: 10, windowSeconds: 900 });
  if (!g.ok) return { ok: false, error: g.error };

  try {
    const result = await db().transaction(async (tx) => {
      const [event] = await tx
        .select()
        .from(events)
        .where(eq(events.id, data.eventId))
        .for("update")
        .limit(1);
      const now = Date.now();
      if (
        !event ||
        event.status !== "published" ||
        event.registrationMode !== "internal" ||
        event.startsAt.getTime() < now ||
        (event.registrationClosesAt && event.registrationClosesAt.getTime() < now)
      ) {
        throw new ClosedError();
      }
      if (event.requiresCnic && !data.cnic) {
        return { invalid: { cnic: "required" } } as const;
      }
      const guestDetails = data.guestDetails.slice(0, event.maxGuests);
      const missingCnic = event.requiresCnic ? guestDetails.findIndex((g) => !g.cnic) : -1;
      if (missingCnic >= 0) {
        return { invalid: { [`guestDetails.${missingCnic}.cnic`]: "required" } } as const;
      }
      const guests = guestDetails.length;
      const seats = 1 + guests;

      const reserved = await tx
        .update(events)
        .set({ seatsTaken: sql`${events.seatsTaken} + ${seats}` })
        .where(and(eq(events.id, event.id), sql`(${events.capacity} IS NULL OR ${events.seatsTaken} + ${seats} <= ${events.capacity})`))
        .returning({ id: events.id });
      const status = reserved.length ? "registered" : "waitlisted";

      const reference = newReference("event");
      const [row] = await tx
        .insert(eventRegistrations)
        .values({
          reference,
          eventId: event.id,
          status,
          locale,
          name: data.name,
          email: data.email,
          phone: data.phone,
          cnic: data.cnic,
          organization: data.organization || null,
          guests,
          guestDetails,
          whatsappOptIn: data.whatsappOptIn,
          privacyConsentAt: new Date(),
          idempotencyKey: data.idempotencyKey,
          ipHash: g.ipHash,
        })
        .returning({ id: eventRegistrations.id });

      const title = pick(event, "title", locale);
      const when = `${formatDate(event.startsAt, locale, { weekday: "long" })}, ${formatClock(event.startsAt, locale)}${locale === "de" ? " Uhr" : ""}`;
      const ids = await enqueue(
        {
          template: "event.registered",
          locale,
          email: data.email,
          whatsapp: data.whatsappOptIn ? data.phone : null,
          related: { type: "event_registration", id: row.id },
          payload: {
            name: data.name.split(" ")[0] ?? data.name,
            reference,
            trackUrl: `${env().APP_URL}/${locale}/track?ref=${reference}`,
            event: title,
            when,
            venue: `${event.venue}, ${event.address}`,
            guests,
            requiresCnic: event.requiresCnic,
            waitlisted: status === "waitlisted",
            ics: buildIcs({
              uid: reference,
              title,
              description: `${pick(event, "summary", locale)}\n\n${reference}`,
              location: `${event.venue}, ${event.address}`,
              start: event.startsAt,
              end: event.endsAt,
              url: `${env().APP_URL}/${locale}/events/${event.slug}`,
            }),
          },
        },
        tx,
      );
      return { reference, status, ids, slug: event.slug };
    });

    if ("invalid" in result) return { ok: false, error: "validation", fieldErrors: { ...result.invalid } };
    dispatchAfterResponse(result.ids);
    return { ok: true, reference: result.reference, status: result.status };
  } catch (error) {
    if (error instanceof ClosedError) return { ok: false, error: "closed" };
    if (uniqueViolation(error, "event_registrations_active_email_key")) return { ok: false, error: "duplicate" };
    if (uniqueViolation(error, /idempotency/i)) {
      const again = await db().select({ reference: eventRegistrations.reference, status: eventRegistrations.status }).from(eventRegistrations).where(eq(eventRegistrations.idempotencyKey, data.idempotencyKey)).limit(1);
      if (again[0]) return { ok: true, reference: again[0].reference, status: again[0].status, duplicate: true };
    }
    console.error("event registration failed", error);
    return { ok: false, error: "generic" };
  }
}
