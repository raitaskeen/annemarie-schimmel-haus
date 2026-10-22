import "server-only";
import { and, count, eq, gte, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  contactMessages,
  courseOfferings,
  courses,
  enrollments,
  eventRegistrations,
  events,
  newsletterSubscribers,
  notifications,
  placementApplications,
  placementSessions,
} from "@/db/schema";

export type NavCounts = { enrollments: number; placement: number; messages: number; notifications: number };

/** Small counters for sidebar badges. */
export async function navCounts(): Promise<NavCounts> {
  const [[e], [p], [m], [n]] = await Promise.all([
    db().select({ n: count() }).from(enrollments).where(eq(enrollments.status, "submitted")),
    db().select({ n: count() }).from(placementApplications).where(eq(placementApplications.status, "submitted")),
    db().select({ n: count() }).from(contactMessages).where(eq(contactMessages.status, "new")),
    db().select({ n: count() }).from(notifications).where(eq(notifications.status, "failed")),
  ]);
  return { enrollments: e.n, placement: p.n, messages: m.n, notifications: n.n };
}

export async function dashboardData() {
  const since = new Date(Date.now() - 29 * 86_400_000);
  since.setHours(0, 0, 0, 0);
  const d = db();
  const [
    [kpi],
    perDay,
    upcomingBatches,
    upcomingEvents,
    recentEnrollments,
    [subs],
    nextPlacement,
    channelStats,
  ] = await Promise.all([
    d
      .select({
        pending: sql<number>`count(*) filter (where ${enrollments.status} = 'submitted')::int`,
        awaitingPayment: sql<number>`count(*) filter (where ${enrollments.status} = 'payment_pending')::int`,
        reported: sql<number>`count(*) filter (where ${enrollments.status} in ('submitted','payment_pending') and ${enrollments.paymentRef} is not null)::int`,
        confirmed30: sql<number>`count(*) filter (where ${enrollments.status} = 'confirmed' and ${enrollments.statusChangedAt} >= ${since})::int`,
        waitlisted: sql<number>`count(*) filter (where ${enrollments.status} = 'waitlisted')::int`,
        revenue30: sql<number>`coalesce(sum(${enrollments.amountDuePkr}) filter (where ${enrollments.status} in ('confirmed','completed') and ${enrollments.paidAt} >= ${since}), 0)::int`,
        total30: sql<number>`count(*) filter (where ${enrollments.createdAt} >= ${since})::int`,
      })
      .from(enrollments),
    d.execute<{ day: string; enrollments: number; events: number; placement: number }>(sql`
      WITH days AS (SELECT generate_series(${since}::date, current_date, interval '1 day')::date AS day)
      SELECT to_char(days.day, 'YYYY-MM-DD') AS day,
        (SELECT count(*)::int FROM enrollments e WHERE e.created_at::date = days.day) AS enrollments,
        (SELECT count(*)::int FROM event_registrations r WHERE r.created_at::date = days.day) AS events,
        (SELECT count(*)::int FROM placement_applications p WHERE p.created_at::date = days.day) AS placement
      FROM days ORDER BY days.day`),
    d
      .select({
        id: courseOfferings.id,
        code: courseOfferings.code,
        startsOn: courseOfferings.startsOn,
        capacity: courseOfferings.capacity,
        seatsTaken: courseOfferings.seatsTaken,
        mode: courseOfferings.mode,
        status: courseOfferings.status,
        courseCode: courses.code,
        level: courses.level,
      })
      .from(courseOfferings)
      .innerJoin(courses, eq(courses.id, courseOfferings.courseId))
      .where(and(gte(courseOfferings.startsOn, sql`current_date`), inArray(courseOfferings.status, ["open", "draft"])))
      .orderBy(courseOfferings.startsOn)
      .limit(6),
    d
      .select({ id: events.id, slug: events.slug, titleEn: events.titleEn, startsAt: events.startsAt, capacity: events.capacity, seatsTaken: events.seatsTaken, status: events.status })
      .from(events)
      .where(gte(events.startsAt, new Date()))
      .orderBy(events.startsAt)
      .limit(5),
    d
      .select({
        id: enrollments.id,
        reference: enrollments.reference,
        firstName: enrollments.firstName,
        lastName: enrollments.lastName,
        status: enrollments.status,
        createdAt: enrollments.createdAt,
        code: courseOfferings.code,
      })
      .from(enrollments)
      .innerJoin(courseOfferings, eq(courseOfferings.id, enrollments.offeringId))
      .orderBy(sql`${enrollments.createdAt} desc`)
      .limit(7),
    d.select({ n: count() }).from(newsletterSubscribers).where(eq(newsletterSubscribers.status, "active")),
    d
      .select({ id: placementSessions.id, code: placementSessions.code, startsAt: placementSessions.startsAt, capacity: placementSessions.capacity, seatsTaken: placementSessions.seatsTaken })
      .from(placementSessions)
      .where(gte(placementSessions.startsAt, new Date()))
      .orderBy(placementSessions.startsAt)
      .limit(1),
    d
      .select({ status: notifications.status, n: count() })
      .from(notifications)
      .where(gte(notifications.createdAt, since))
      .groupBy(notifications.status),
  ]);

  const [eventRegs] = await d.select({ n: count() }).from(eventRegistrations).where(gte(eventRegistrations.createdAt, since));

  return {
    kpi: { ...kpi, eventRegistrations30: eventRegs.n, subscribers: subs.n },
    perDay: perDay.rows,
    upcomingBatches,
    upcomingEvents,
    recentEnrollments,
    nextPlacement: nextPlacement[0] ?? null,
    notifications: Object.fromEntries(channelStats.map((c) => [c.status, c.n])) as Record<string, number>,
  };
}
