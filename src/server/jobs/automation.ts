import "server-only";
import { and, eq, inArray, lt, sql } from "drizzle-orm";
import { db } from "@/db";
import { contactMessages, courseOfferings, courses, enrollments, eventRegistrations, events, placementApplications, placementSessions, privateFiles } from "@/db/schema";
import { pick, type Locale } from "@/i18n/config";
import { audit } from "@/lib/audit";
import { env } from "@/lib/env";
import { formatClock, formatDate, formatPKR, formatTimeRange, formatWeekdays } from "@/lib/format";
import { changeEnrollmentStatus, promoteCourseWaitlist } from "@/server/admin/enrollments";
import { promoteEventWaitlist } from "@/server/admin/programme";
import { dispatchAfterResponse, enqueue } from "@/server/notifications/outbox";
import type { TemplatePayloads } from "@/server/notifications/templates";
import { getSettings } from "@/server/public/queries";

/**
 * Automatic workflows. Every function is idempotent: "already reminded?" is answered by
 * the notification outbox itself, so overlapping or repeated runs never double-send.
 */

const loc = (v: string): Locale => (v === "de" ? "de" : "en");
const trackUrl = (locale: Locale, reference: string) => `${env().APP_URL}/${locale}/track?ref=${reference}`;
const uhr = (locale: Locale) => (locale === "de" ? " Uhr" : "");
const notReminded = (relatedId: unknown, kind: string, since?: unknown) =>
  sql`not exists (select 1 from notifications n where n.related_id = ${relatedId} and n.template = 'applicant.reminder' and n.payload->>'kind' = ${kind}${since ? sql` and n.created_at >= ${since}` : sql``})`;

async function remind(
  payload: TemplatePayloads["applicant.reminder"],
  to: { locale: Locale; email: string; phone: string; whatsapp: boolean; relatedType: string; relatedId: string },
) {
  const ids = await enqueue({
    template: "applicant.reminder",
    locale: to.locale,
    email: to.email,
    whatsapp: to.whatsapp ? to.phone : null,
    related: { type: to.relatedType, id: to.relatedId },
    payload,
  });
  dispatchAfterResponse(ids);
}

/** Day-before reminders for events and placement tests, 3-day reminder before a course starts. */
export async function sendReminders() {
  const settings = await getSettings();
  if (!settings.automation.reminders) return { events: 0, placement: 0, courses: 0 };

  const eventRows = await db()
    .select({ r: eventRegistrations, e: events })
    .from(eventRegistrations)
    .innerJoin(events, eq(events.id, eventRegistrations.eventId))
    .where(
      and(
        eq(eventRegistrations.status, "registered"),
        eq(events.status, "published"),
        sql`${events.startsAt} between now() + interval '1 hour' and now() + interval '26 hours'`,
        notReminded(eventRegistrations.id, "event"),
      ),
    )
    .limit(300);
  for (const { r, e } of eventRows) {
    const locale = loc(r.locale);
    await remind(
      {
        kind: "event",
        name: r.name.split(" ")[0],
        reference: r.reference,
        trackUrl: trackUrl(locale, r.reference),
        title: pick(e, "title", locale),
        when: `${formatDate(e.startsAt, locale, { weekday: "long" })}, ${formatClock(e.startsAt, locale)}${uhr(locale)}`,
        venue: `${e.venue}, ${e.address}`,
        note: e.requiresCnic ? (locale === "de" ? "Bitte bringen Sie Ihre Original-CNIC mit." : "Please bring your original CNIC.") : undefined,
      },
      { locale, email: r.email, phone: r.phone, whatsapp: r.whatsappOptIn, relatedType: "event_registration", relatedId: r.id },
    );
  }

  const placementRows = await db()
    .select({ a: placementApplications, s: placementSessions })
    .from(placementApplications)
    .innerJoin(placementSessions, eq(placementSessions.id, placementApplications.sessionId))
    .where(
      and(
        inArray(placementApplications.status, ["submitted", "confirmed"]),
        sql`${placementSessions.status} <> 'cancelled'`,
        sql`${placementSessions.startsAt} between now() + interval '1 hour' and now() + interval '26 hours'`,
        notReminded(placementApplications.id, "placement"),
      ),
    )
    .limit(300);
  for (const { a, s } of placementRows) {
    const locale = loc(a.locale);
    await remind(
      {
        kind: "placement",
        name: a.firstName,
        reference: a.reference,
        trackUrl: trackUrl(locale, a.reference),
        title: locale === "de" ? "Einstufungstest" : "Placement test",
        when: `${formatDate(s.startsAt, locale, { weekday: "long" })}, ${formatClock(s.startsAt, locale)}${uhr(locale)}`,
        venue: s.venue,
      },
      { locale, email: a.email, phone: a.phone, whatsapp: a.whatsappOptIn, relatedType: "placement_application", relatedId: a.id },
    );
  }

  const courseRows = await db()
    .select({ e: enrollments, o: courseOfferings, titleEn: courses.titleEn, titleDe: courses.titleDe })
    .from(enrollments)
    .innerJoin(courseOfferings, eq(courseOfferings.id, enrollments.offeringId))
    .innerJoin(courses, eq(courses.id, courseOfferings.courseId))
    .where(
      and(
        eq(enrollments.status, "confirmed"),
        sql`${courseOfferings.status} <> 'cancelled'`,
        sql`${courseOfferings.startsOn} between (now() at time zone 'Asia/Karachi')::date + 1 and (now() at time zone 'Asia/Karachi')::date + 3`,
        notReminded(enrollments.id, "course"),
      ),
    )
    .limit(500);
  for (const { e, o, titleEn, titleDe } of courseRows) {
    const locale = loc(e.locale);
    await remind(
      {
        kind: "course",
        name: e.firstName,
        reference: e.reference,
        trackUrl: trackUrl(locale, e.reference),
        title: pick({ titleEn, titleDe }, "title", locale),
        when: `${formatDate(o.startsOn, locale, { weekday: "long" })} · ${formatWeekdays(o.weekdays, locale)} ${formatTimeRange(o.startTime, o.endTime, locale)}`,
        venue: o.mode === "online" ? (locale === "de" ? "Online (Zoom-Link folgt per E-Mail)" : "Online (Zoom link follows by email)") : settings.contact.address,
      },
      { locale, email: e.email, phone: e.phone, whatsapp: e.whatsappOptIn, relatedType: "enrollment", relatedId: e.id },
    );
  }
  return { events: eventRows.length, placement: placementRows.length, courses: courseRows.length };
}

/** Halfway through the payment window: one friendly reminder per payment request. */
export async function sendPaymentReminders() {
  const settings = await getSettings();
  if (!settings.automation.paymentReminders) return 0;
  const hours = settings.enrollment.paymentWindowHours;
  const rows = await db()
    .select({ e: enrollments, titleEn: courses.titleEn, titleDe: courses.titleDe })
    .from(enrollments)
    .innerJoin(courseOfferings, eq(courseOfferings.id, enrollments.offeringId))
    .innerJoin(courses, eq(courses.id, courseOfferings.courseId))
    .where(
      and(
        eq(enrollments.status, "payment_pending"),
        sql`${enrollments.paymentRef} is null`,
        sql`${enrollments.statusChangedAt} < now() - make_interval(secs => ${hours * 1800})`,
        sql`${enrollments.statusChangedAt} > now() - make_interval(secs => ${hours * 3600})`,
        notReminded(enrollments.id, "payment", enrollments.statusChangedAt),
      ),
    )
    .limit(300);
  for (const { e, titleEn, titleDe } of rows) {
    const locale = loc(e.locale);
    const deadline = new Date(e.statusChangedAt.getTime() + hours * 3600_000);
    await remind(
      {
        kind: "payment",
        name: e.firstName,
        reference: e.reference,
        trackUrl: trackUrl(locale, e.reference),
        title: pick({ titleEn, titleDe }, "title", locale),
        when: `${formatDate(deadline, locale, { weekday: "long" })}, ${formatClock(deadline, locale)}${uhr(locale)}`,
        deadline: `${formatDate(deadline, locale, { weekday: "short" })}, ${formatClock(deadline, locale)}${uhr(locale)}`,
        amount: formatPKR(e.amountDuePkr, locale),
        paymentInstructions: locale === "de" ? settings.enrollment.paymentInstructionsDe : settings.enrollment.paymentInstructionsEn,
      },
      { locale, email: e.email, phone: e.phone, whatsapp: e.whatsappOptIn, relatedType: "enrollment", relatedId: e.id },
    );
  }
  return rows.length;
}

/** Releases seats whose payment window has passed (the applicant is told and the seat goes to the waitlist). */
export async function releaseUnpaidSeats() {
  const settings = await getSettings();
  const hours = settings.enrollment.paymentWindowHours;
  const overdue = await db()
    .select({ id: enrollments.id, reference: enrollments.reference })
    .from(enrollments)
    .where(
      and(
        eq(enrollments.status, "payment_pending"),
        // Someone who already reported a payment is never released automatically — staff check it first.
        sql`${enrollments.paymentRef} is null`,
        lt(enrollments.statusChangedAt, new Date(Date.now() - hours * 3600_000)),
      ),
    )
    .limit(200);
  let released = 0;
  for (const e of overdue) {
    try {
      await changeEnrollmentStatus(null, e.id, "cancelled", { notify: true, note: `Payment window of ${hours} h passed — seat released automatically.` });
      released++;
    } catch (error) {
      console.error(`could not release ${e.reference}`, error);
    }
  }
  if (released) await audit(null, { action: "job.release_unpaid", entityType: "enrollment", summary: `Released ${released} unpaid seat(s) after the payment window` });
  return released;
}

/** Closes registration when batches start / test deadlines pass and completes finished courses. */
export async function autoCloseAndComplete() {
  const settings = await getSettings();
  if (!settings.automation.autoClose) return { closed: 0, completed: 0, sessions: 0 };
  const today = sql`(now() at time zone 'Asia/Karachi')::date`;
  const closed = await db()
    .update(courseOfferings)
    .set({ status: "closed" })
    .where(and(eq(courseOfferings.status, "open"), sql`(${courseOfferings.startsOn} < ${today} or (${courseOfferings.registrationClosesAt} is not null and ${courseOfferings.registrationClosesAt} < now()))`))
    .returning({ id: courseOfferings.id, code: courseOfferings.code });
  const finished = await db()
    .update(courseOfferings)
    .set({ status: "completed" })
    .where(and(eq(courseOfferings.status, "closed"), sql`${courseOfferings.endsOn} is not null and ${courseOfferings.endsOn} < ${today}`))
    .returning({ id: courseOfferings.id, code: courseOfferings.code });
  if (finished.length) {
    await db()
      .update(enrollments)
      .set({ status: "completed", statusChangedAt: new Date() })
      .where(and(eq(enrollments.status, "confirmed"), inArray(enrollments.offeringId, finished.map((f) => f.id))));
  }
  const sessions = await db()
    .update(placementSessions)
    .set({ status: "closed" })
    .where(and(eq(placementSessions.status, "open"), lt(placementSessions.registrationDeadline, new Date())))
    .returning({ code: placementSessions.code });
  const parts = [
    closed.length && `closed ${closed.map((c) => c.code).join(", ")}`,
    finished.length && `completed ${finished.map((c) => c.code).join(", ")}`,
    sessions.length && `closed placement test ${sessions.map((s) => s.code).join(", ")}`,
  ].filter(Boolean);
  if (parts.length) await audit(null, { action: "job.auto_close", entityType: "offering", summary: `Automatic: ${parts.join("; ")}` });
  return { closed: closed.length, completed: finished.length, sessions: sessions.length };
}

/** Safety net: offers any free seats to waitlists (e.g. after a manual database change). */
export async function sweepWaitlists() {
  const offerings = await db()
    .selectDistinct({ id: enrollments.offeringId })
    .from(enrollments)
    .innerJoin(courseOfferings, eq(courseOfferings.id, enrollments.offeringId))
    .where(and(eq(enrollments.status, "waitlisted"), sql`${courseOfferings.seatsTaken} < ${courseOfferings.capacity}`));
  const evs = await db()
    .selectDistinct({ id: eventRegistrations.eventId })
    .from(eventRegistrations)
    .innerJoin(events, eq(events.id, eventRegistrations.eventId))
    .where(and(eq(eventRegistrations.status, "waitlisted"), sql`${events.capacity} is not null and ${events.seatsTaken} < ${events.capacity}`));
  let promoted = 0;
  for (const o of offerings) promoted += await promoteCourseWaitlist(o.id);
  for (const e of evs) promoted += await promoteEventWaitlist(e.id);
  return promoted;
}

/** Deletes uploaded identity documents of applications that ended long ago (data minimisation). */
export async function purgeOldDocuments() {
  const { documentRetentionDays: days } = (await getSettings()).automation;
  const deleted = await db()
    .delete(privateFiles)
    .where(
      and(
        eq(privateFiles.ownerType, "enrollment"),
        sql`${privateFiles.ownerId} in (select id from enrollments where status in ('rejected','cancelled','completed') and status_changed_at < now() - make_interval(days => ${days}))`,
      ),
    )
    .returning({ id: privateFiles.id });
  if (deleted.length) await audit(null, { action: "job.purge_documents", entityType: "private_file", summary: `Deleted ${deleted.length} document(s) older than ${days} days after the application ended` });
  return deleted.length;
}

/** One morning summary per working day (after 08:00 Lahore time) to STAFF_NOTIFY_EMAIL. */
export async function sendStaffDigest(now = new Date()) {
  const settings = await getSettings();
  const to = env().STAFF_NOTIFY_EMAIL;
  if (!settings.automation.staffDigest || !to) return false;
  const pkt = new Date(now.getTime() + 5 * 3600_000);
  const isoDay = ((pkt.getUTCDay() + 6) % 7) + 1;
  if (pkt.getUTCHours() < 8 || !settings.hours.days.includes(isoDay)) return false;
  const [{ sent }] = (await db().execute(
    sql`select exists (select 1 from notifications where template = 'staff.digest' and (created_at at time zone 'Asia/Karachi')::date = (now() at time zone 'Asia/Karachi')::date) as sent`,
  )).rows as { sent: boolean }[];
  if (sent) return false;

  const count = async (q: PromiseLike<{ n: number }[]>) => (await q)[0]?.n ?? 0;
  const n = sql<number>`count(*)::int`;
  const [toReview, reported, awaiting, waitlisted, messages, placementNew] = await Promise.all([
    count(db().select({ n }).from(enrollments).where(eq(enrollments.status, "submitted"))),
    count(db().select({ n }).from(enrollments).where(and(inArray(enrollments.status, ["submitted", "payment_pending"]), sql`${enrollments.paymentRef} is not null`))),
    count(db().select({ n }).from(enrollments).where(eq(enrollments.status, "payment_pending"))),
    count(db().select({ n }).from(enrollments).where(eq(enrollments.status, "waitlisted"))),
    count(db().select({ n }).from(contactMessages).where(eq(contactMessages.status, "new"))),
    count(db().select({ n }).from(placementApplications).where(eq(placementApplications.status, "submitted"))),
  ]);
  const todayEvents = await db()
    .select({ titleEn: events.titleEn, startsAt: events.startsAt, seatsTaken: events.seatsTaken, capacity: events.capacity })
    .from(events)
    .where(and(eq(events.status, "published"), sql`(${events.startsAt} at time zone 'Asia/Karachi')::date = (now() at time zone 'Asia/Karachi')::date`))
    .orderBy(events.startsAt);
  const tests = await db()
    .select({ code: placementSessions.code, startsAt: placementSessions.startsAt, seatsTaken: placementSessions.seatsTaken })
    .from(placementSessions)
    .where(and(sql`${placementSessions.status} <> 'cancelled'`, sql`(${placementSessions.startsAt} at time zone 'Asia/Karachi')::date between (now() at time zone 'Asia/Karachi')::date and (now() at time zone 'Asia/Karachi')::date + 1`));

  const highlights = [
    reported && `${reported} applicant(s) reported a payment — please check and confirm their seats.`,
    toReview && `${toReview} new course application(s) are waiting for review.`,
    messages && `${messages} new message(s) in the inbox.`,
    ...todayEvents.map((e) => `Today ${formatClock(e.startsAt, "en")}: ${e.titleEn} — ${e.seatsTaken}${e.capacity ? `/${e.capacity}` : ""} seats booked.`),
    ...tests.map((t) => `Placement test ${t.code} on ${formatDate(t.startsAt, "en", { weekday: "short" })} ${formatClock(t.startsAt, "en")} — ${t.seatsTaken} candidate(s).`),
  ].filter(Boolean) as string[];
  const ids = await enqueue({
    template: "staff.digest",
    locale: "en",
    email: to,
    payload: {
      date: formatDate(now, "en", { weekday: "long" }),
      rows: [
        ["New applications to review", String(toReview)],
        ["Payments reported", String(reported)],
        ["Awaiting payment", String(awaiting)],
        ["On course waitlists", String(waitlisted)],
        ["New placement test candidates", String(placementNew)],
        ["New messages", String(messages)],
      ],
      highlights,
      adminUrl: `${env().APP_URL}/admin`,
    },
  });
  dispatchAfterResponse(ids);
  return true;
}
