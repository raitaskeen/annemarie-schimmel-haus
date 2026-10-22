import "server-only";
import { and, asc, count, desc, eq, gte, ilike, lt, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { eventRegistrations, events, placementApplications, placementSessions, type Event, type PlacementApplication } from "@/db/schema";
import { commonDictionary } from "@/i18n/common";
import { pick, type Locale } from "@/i18n/config";
import { audit } from "@/lib/audit";
import type { SessionUser } from "@/lib/auth/session";
import { getSettings } from "@/server/public/queries";

/** Staff member, or null for automatic jobs and applicant self-service (audited as "system"). */
type Actor = Pick<SessionUser, "id" | "email"> | null;
import { env } from "@/lib/env";
import { formatClock, formatDate } from "@/lib/format";
import { ActionError } from "@/server/admin/action-utils";
import { dispatchAfterResponse, enqueue } from "@/server/notifications/outbox";

/* ------------------------------------------------------------------- events */

export async function listEventsAdmin({ period = "upcoming", q }: { period?: string; q?: string }) {
  const parts: (SQL | undefined)[] = [];
  if (period === "past") parts.push(lt(sql`coalesce(${events.endsAt}, ${events.startsAt})`, new Date()));
  else if (period !== "all") parts.push(gte(sql`coalesce(${events.endsAt}, ${events.startsAt})`, new Date()));
  if (q?.trim()) parts.push(ilike(events.titleEn, `%${q.trim()}%`));
  return db()
    .select({
      e: events,
      registered: sql<number>`(select count(*)::int from event_registrations r where r.event_id = "events"."id" and r.status in ('registered','attended'))`,
      waitlisted: sql<number>`(select count(*)::int from event_registrations r where r.event_id = "events"."id" and r.status = 'waitlisted')`,
      attended: sql<number>`(select count(*)::int from event_registrations r where r.event_id = "events"."id" and r.status = 'attended')`,
    })
    .from(events)
    .where(parts.length ? and(...parts) : undefined)
    .orderBy(period === "past" ? desc(events.startsAt) : asc(events.startsAt))
    .limit(200);
}

export async function getEventAdmin(id: string) {
  if (!/^[0-9a-f-]{36}$/.test(id)) return null;
  const [e] = await db().select().from(events).where(eq(events.id, id)).limit(1);
  return e ?? null;
}

export async function listRegistrations(eventId: string, { q, status }: { q?: string; status?: string }) {
  const parts: (SQL | undefined)[] = [eq(eventRegistrations.eventId, eventId)];
  if (status && ["registered", "waitlisted", "cancelled", "attended"].includes(status)) parts.push(eq(eventRegistrations.status, status as "registered"));
  if (q?.trim()) {
    const like = `%${q.trim()}%`;
    parts.push(or(ilike(eventRegistrations.name, like), ilike(eventRegistrations.email, like), ilike(eventRegistrations.reference, like), ilike(eventRegistrations.phone, like)));
  }
  return db().select().from(eventRegistrations).where(and(...parts)).orderBy(asc(eventRegistrations.createdAt)).limit(2000);
}

const SEAT_STATUSES = ["registered", "attended"];

/** Status changes keep the event's seat count (1 + guests) exact. */
export async function changeRegistrationStatus(user: Actor, id: string, next: "registered" | "waitlisted" | "cancelled" | "attended", notify: boolean, note?: string) {
  const result = await db().transaction(async (tx) => {
    const [r] = await tx.select().from(eventRegistrations).where(eq(eventRegistrations.id, id)).for("update").limit(1);
    if (!r) throw new ActionError("Registration not found.");
    if (r.status === next) return { r, ids: [] as string[], event: null as Event | null, released: false };
    const [ev] = await tx.select().from(events).where(eq(events.id, r.eventId)).for("update").limit(1);
    const seats = 1 + r.guests;
    const had = SEAT_STATUSES.includes(r.status);
    const wants = SEAT_STATUSES.includes(next);
    if (wants && !had) {
      const ok = await tx
        .update(events)
        .set({ seatsTaken: sql`${events.seatsTaken} + ${seats}` })
        .where(and(eq(events.id, r.eventId), sql`(${events.capacity} IS NULL OR ${events.seatsTaken} + ${seats} <= ${events.capacity})`))
        .returning({ id: events.id });
      if (!ok.length) throw new ActionError("The event is full. Increase the capacity first.");
    } else if (!wants && had) {
      await tx.update(events).set({ seatsTaken: sql`greatest(${events.seatsTaken} - ${seats}, 0)` }).where(eq(events.id, r.eventId));
    }
    const [updated] = await tx
      .update(eventRegistrations)
      .set({ status: next, checkedInAt: next === "attended" ? new Date() : next === "registered" ? null : r.checkedInAt })
      .where(eq(eventRegistrations.id, id))
      .returning();
    await audit(user, { action: "event_registration.status", entityType: "event_registration", entityId: id, summary: `${r.reference}: ${r.status} → ${next}${note ? ` (${note})` : ""}` }, tx);
    let ids: string[] = [];
    if (notify && (next === "registered" || next === "cancelled") && r.status !== "attended") {
      const locale = (r.locale === "de" ? "de" : "en") as Locale;
      ids = await enqueue(
        {
          template: "event.status",
          locale,
          email: r.email,
          whatsapp: r.whatsappOptIn ? r.phone : null,
          related: { type: "event_registration", id: r.id },
          payload: {
            name: r.name.split(" ")[0],
            reference: r.reference,
            trackUrl: `${env().APP_URL}/${locale}/track?ref=${r.reference}`,
            event: pick(ev, "title", locale),
            when: `${formatDate(ev.startsAt, locale, { weekday: "long" })}, ${formatClock(ev.startsAt, locale)}`,
            status: next,
            statusLabel: commonDictionary(locale).status.event[next],
          },
        },
        tx,
      );
    }
    return { r: updated, ids, event: ev, released: had && !wants };
  });
  dispatchAfterResponse(result.ids);
  // A freed seat goes to the next person on the waitlist (never back to the one just moved).
  if (result.released) await promoteEventWaitlist(result.r.eventId, result.r.id);
  return result.r;
}

/**
 * Offers free seats to waitlisted guests, oldest first, as long as their whole party fits.
 * Runs after cancellations, capacity increases and from the maintenance job.
 */
export async function promoteEventWaitlist(eventId: string, excludeId?: string) {
  const settings = await getSettings();
  if (!settings.automation.autoPromoteWaitlist) return 0;
  let promoted = 0;
  for (let i = 0; i < 100; i++) {
    const ids = await db().transaction(async (tx) => {
      const [ev] = await tx.select().from(events).where(eq(events.id, eventId)).for("update").limit(1);
      if (!ev || ev.status !== "published" || ev.registrationMode !== "internal" || ev.capacity === null) return null;
      if (ev.startsAt.getTime() < Date.now()) return null;
      const free = ev.capacity - ev.seatsTaken;
      if (free <= 0) return null;
      const [next] = await tx
        .select()
        .from(eventRegistrations)
        .where(
          and(
            eq(eventRegistrations.eventId, eventId),
            eq(eventRegistrations.status, "waitlisted"),
            sql`1 + ${eventRegistrations.guests} <= ${free}`,
            excludeId ? sql`${eventRegistrations.id} <> ${excludeId}` : undefined,
          ),
        )
        .orderBy(asc(eventRegistrations.createdAt))
        .for("update", { skipLocked: true })
        .limit(1);
      if (!next) return null;
      await tx.update(events).set({ seatsTaken: sql`${events.seatsTaken} + ${1 + next.guests}` }).where(eq(events.id, eventId));
      await tx.update(eventRegistrations).set({ status: "registered" }).where(eq(eventRegistrations.id, next.id));
      await audit(null, { action: "event_registration.promoted", entityType: "event_registration", entityId: next.id, summary: `${next.reference}: moved up from the waitlist automatically` }, tx);
      const locale = (next.locale === "de" ? "de" : "en") as Locale;
      return enqueue(
        {
          template: "event.status",
          locale,
          email: next.email,
          whatsapp: next.whatsappOptIn ? next.phone : null,
          related: { type: "event_registration", id: next.id },
          payload: {
            name: next.name.split(" ")[0],
            reference: next.reference,
            trackUrl: `${env().APP_URL}/${locale}/track?ref=${next.reference}`,
            event: pick(ev, "title", locale),
            when: `${formatDate(ev.startsAt, locale, { weekday: "long" })}, ${formatClock(ev.startsAt, locale)}`,
            status: "registered",
            statusLabel: commonDictionary(locale).status.event.registered,
          },
        },
        tx,
      );
    });
    if (!ids) break;
    dispatchAfterResponse(ids);
    promoted++;
  }
  return promoted;
}

/** Check-in by ticket number (QR scan or typed). */
export async function checkInByReference(user: Actor, eventId: string, reference: string) {
  const ref = reference.trim().toUpperCase();
  const [r] = await db().select().from(eventRegistrations).where(and(eq(eventRegistrations.eventId, eventId), eq(eventRegistrations.reference, ref))).limit(1);
  if (!r) throw new ActionError(`No registration ${ref} for this event.`);
  if (r.status === "attended") return { already: true, r };
  if (r.status !== "registered") throw new ActionError(`${ref} is ${r.status}, not admitted.`);
  const updated = await changeRegistrationStatus(user, r.id, "attended", false);
  return { already: false, r: updated };
}

/* ------------------------------------------------------- placement sessions */

export async function listPlacementSessionsAdmin() {
  return db()
    .select({
      s: placementSessions,
      past: sql<boolean>`${placementSessions.endsAt} < now()`,
      submitted: sql<number>`(select count(*)::int from placement_applications a where a.session_id = "placement_sessions"."id" and a.status = 'submitted')`,
      total: sql<number>`(select count(*)::int from placement_applications a where a.session_id = "placement_sessions"."id" and a.status <> 'cancelled')`,
    })
    .from(placementSessions)
    .orderBy(desc(placementSessions.startsAt))
    .limit(200);
}

export async function getPlacementSessionAdmin(id: string) {
  if (!/^[0-9a-f-]{36}$/.test(id)) return null;
  const [s] = await db().select().from(placementSessions).where(eq(placementSessions.id, id)).limit(1);
  if (!s) return null;
  const apps = await db().select().from(placementApplications).where(eq(placementApplications.sessionId, id)).orderBy(asc(placementApplications.lastName));
  const [{ n }] = await db().select({ n: count() }).from(placementApplications).where(eq(placementApplications.sessionId, id));
  return { s, apps, n };
}

export async function updatePlacementApplication(
  user: Actor,
  id: string,
  input: { status: PlacementApplication["status"]; resultLevel?: string | null; resultScore?: number | null; resultNotes?: string | null; notify: boolean },
) {
  const result = await db().transaction(async (tx) => {
    const [a] = await tx.select().from(placementApplications).where(eq(placementApplications.id, id)).for("update").limit(1);
    if (!a) throw new ActionError("Application not found.");
    const [s] = await tx.select().from(placementSessions).where(eq(placementSessions.id, a.sessionId)).for("update").limit(1);
    const had = a.status !== "cancelled";
    const wants = input.status !== "cancelled";
    if (had && !wants) await tx.update(placementSessions).set({ seatsTaken: sql`greatest(${placementSessions.seatsTaken} - 1, 0)` }).where(eq(placementSessions.id, s.id));
    if (!had && wants) {
      const ok = await tx.update(placementSessions).set({ seatsTaken: sql`${placementSessions.seatsTaken} + 1` }).where(and(eq(placementSessions.id, s.id), sql`${placementSessions.seatsTaken} < ${placementSessions.capacity}`)).returning({ id: placementSessions.id });
      if (!ok.length) throw new ActionError("The test session is full.");
    }
    if (input.status === "completed" && !input.resultLevel) throw new ActionError("Enter the recommended level to publish the result.");
    const [updated] = await tx
      .update(placementApplications)
      .set({ status: input.status, resultLevel: input.resultLevel ?? a.resultLevel, resultScore: input.resultScore ?? a.resultScore, resultNotes: input.resultNotes ?? a.resultNotes })
      .where(eq(placementApplications.id, id))
      .returning();
    await audit(user, { action: "placement.update", entityType: "placement_application", entityId: id, summary: `${a.reference}: ${a.status} → ${input.status}${input.resultLevel ? ` (result ${input.resultLevel})` : ""}` }, tx);
    let ids: string[] = [];
    const statusChanged = input.status !== a.status && ["confirmed", "completed", "cancelled"].includes(input.status);
    const resultChanged = input.status === "completed" && updated.resultLevel !== a.resultLevel;
    if (input.notify && (statusChanged || resultChanged)) {
      const locale = (a.locale === "de" ? "de" : "en") as Locale;
      ids = await enqueue(
        {
          template: "placement.status",
          locale,
          email: a.email,
          whatsapp: a.whatsappOptIn ? a.phone : null,
          related: { type: "placement_application", id: a.id },
          payload: {
            name: a.firstName,
            reference: a.reference,
            trackUrl: `${env().APP_URL}/${locale}/track?ref=${a.reference}`,
            when: `${formatDate(s.startsAt, locale, { weekday: "long" })}, ${formatClock(s.startsAt, locale)}`,
            status: input.status,
            statusLabel: commonDictionary(locale).status.placement[input.status],
            resultLevel: updated.resultLevel,
          },
        },
        tx,
      );
    }
    return { updated, ids };
  });
  dispatchAfterResponse(result.ids);
  return result.updated;
}
