import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { and, asc, desc, eq, gte, inArray, lt, ne, or, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  courseOfferings,
  courses,
  events,
  examDates,
  galleryItems,
  partners,
  placementSessions,
  posts,
  siteSettings,
  type Course,
} from "@/db/schema";
import { TAGS } from "@/lib/cache-tags";
import { defaultSiteSettings, siteSettingsSchema, type SiteSettings } from "@/lib/site-settings-schema";

/**
 * Public, cached reads. Every function here runs inside `use cache` and is
 * tagged, so pages prerender into the static shell and admin edits refresh them
 * instantly via updateTag(). Only public fields are selected.
 */

const today = () => new Date().toISOString().slice(0, 10);

/* ----------------------------------------------------------------- settings */

export async function getCurrentYear(): Promise<number> {
  "use cache";
  cacheLife("days");
  return new Date().getFullYear();
}

export async function getSettings(): Promise<SiteSettings> {
  "use cache";
  cacheLife("days");
  cacheTag(TAGS.settings);
  const row = await db().query.siteSettings.findFirst({ where: eq(siteSettings.key, "site") });
  const parsed = siteSettingsSchema.safeParse(row?.value);
  return parsed.success ? parsed.data : defaultSiteSettings;
}

/* ------------------------------------------------------------------ courses */

export type RegistrationState = "open" | "opens_soon" | "full" | "closed";

export type OfferingCard = {
  id: string;
  code: string;
  mode: "on_campus" | "online";
  track: "standard" | "intensive" | "superintensive" | "weekend";
  startsOn: string;
  endsOn: string | null;
  weekdays: number[];
  startTime: string;
  endTime: string;
  capacity: number;
  seatsLeft: number;
  feePkr: number;
  registrationOpensAt: Date | null;
  registrationClosesAt: Date | null;
  state: RegistrationState;
  notesEn: string;
  notesDe: string;
  course: Pick<Course, "id" | "slug" | "code" | "level" | "titleEn" | "titleDe" | "imagePath" | "requiresPlacement">;
};

export function registrationState(
  o: { status: string; capacity: number; seatsTaken: number; startsOn: string; registrationOpensAt: Date | null; registrationClosesAt: Date | null },
  now = Date.now(),
): RegistrationState {
  if (o.status !== "open") return "closed";
  if (o.registrationOpensAt && o.registrationOpensAt.getTime() > now) return "opens_soon";
  if (o.registrationClosesAt && o.registrationClosesAt.getTime() < now) return "closed";
  if (new Date(`${o.startsOn}T23:59:59+05:00`).getTime() < now) return "closed";
  if (o.seatsTaken >= o.capacity) return "full";
  return "open";
}

const offeringColumns = {
  id: courseOfferings.id,
  code: courseOfferings.code,
  mode: courseOfferings.mode,
  track: courseOfferings.track,
  startsOn: courseOfferings.startsOn,
  endsOn: courseOfferings.endsOn,
  weekdays: courseOfferings.weekdays,
  startTime: courseOfferings.startTime,
  endTime: courseOfferings.endTime,
  capacity: courseOfferings.capacity,
  seatsTaken: courseOfferings.seatsTaken,
  status: courseOfferings.status,
  feeOverride: courseOfferings.feePkr,
  registrationOpensAt: courseOfferings.registrationOpensAt,
  registrationClosesAt: courseOfferings.registrationClosesAt,
  notesEn: courseOfferings.notesEn,
  notesDe: courseOfferings.notesDe,
  courseId: courses.id,
  courseSlug: courses.slug,
  courseCode: courses.code,
  courseLevel: courses.level,
  courseTitleEn: courses.titleEn,
  courseTitleDe: courses.titleDe,
  courseImage: courses.imagePath,
  courseFee: courses.feePkr,
  courseRequiresPlacement: courses.requiresPlacement,
};

type OfferingRow = Awaited<ReturnType<typeof upcomingOfferingRows>>[number];

function toCard(r: OfferingRow, now: number): OfferingCard {
  return {
    id: r.id,
    code: r.code,
    mode: r.mode,
    track: r.track,
    startsOn: r.startsOn,
    endsOn: r.endsOn,
    weekdays: r.weekdays,
    startTime: r.startTime.slice(0, 5),
    endTime: r.endTime.slice(0, 5),
    capacity: r.capacity,
    seatsLeft: Math.max(0, r.capacity - r.seatsTaken),
    feePkr: r.feeOverride ?? r.courseFee,
    registrationOpensAt: r.registrationOpensAt,
    registrationClosesAt: r.registrationClosesAt,
    state: registrationState(r, now),
    notesEn: r.notesEn,
    notesDe: r.notesDe,
    course: {
      id: r.courseId,
      slug: r.courseSlug,
      code: r.courseCode,
      level: r.courseLevel,
      titleEn: r.courseTitleEn,
      titleDe: r.courseTitleDe,
      imagePath: r.courseImage,
      requiresPlacement: r.courseRequiresPlacement,
    },
  };
}

export type CourseSummary = Course & { nextOffering: OfferingCard | null; openOfferings: number };

export async function getCourses(): Promise<CourseSummary[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(TAGS.courses, TAGS.offerings);
  const now = Date.now();
  const [list, offerings] = await Promise.all([
    db().select().from(courses).where(eq(courses.published, true)).orderBy(asc(courses.sortOrder), asc(courses.code)),
    upcomingOfferingRows(),
  ]);
  const cards = offerings.map((o) => toCard(o, now));
  return list.map((c) => {
    const mine = cards.filter((o) => o.course.id === c.id);
    const bookable = mine.filter((o) => o.state === "open" || o.state === "opens_soon");
    return { ...c, nextOffering: bookable[0] ?? mine[0] ?? null, openOfferings: bookable.length };
  });
}

function upcomingOfferingRows() {
  return db()
    .select(offeringColumns)
    .from(courseOfferings)
    .innerJoin(courses, eq(courses.id, courseOfferings.courseId))
    .where(
      and(
        eq(courses.published, true),
        inArray(courseOfferings.status, ["open", "closed"]),
        gte(courseOfferings.startsOn, sql`(current_date - interval '1 day')::date`),
      ),
    )
    .orderBy(asc(courseOfferings.startsOn), asc(courses.sortOrder));
}

export async function getUpcomingOfferings(): Promise<OfferingCard[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(TAGS.courses, TAGS.offerings);
  const now = Date.now();
  return (await upcomingOfferingRows()).map((o) => toCard(o, now));
}

export async function getCourseBySlug(slug: string) {
  "use cache";
  cacheLife("hours");
  cacheTag(TAGS.courses, TAGS.offerings);
  const course = await db().query.courses.findFirst({ where: and(eq(courses.slug, slug), eq(courses.published, true)) });
  if (!course) return null;
  const now = Date.now();
  const rows = await db()
    .select(offeringColumns)
    .from(courseOfferings)
    .innerJoin(courses, eq(courses.id, courseOfferings.courseId))
    .where(and(eq(courseOfferings.courseId, course.id), inArray(courseOfferings.status, ["open", "closed"]), gte(courseOfferings.startsOn, today())))
    .orderBy(asc(courseOfferings.startsOn));
  return { course, offerings: rows.map((r) => toCard(r, now)) };
}

export async function getCourseSlugs(): Promise<string[]> {
  "use cache";
  cacheLife("days");
  cacheTag(TAGS.courses);
  const rows = await db().select({ slug: courses.slug }).from(courses).where(eq(courses.published, true));
  return rows.map((r) => r.slug);
}

export async function getOffering(id: string): Promise<OfferingCard | null> {
  "use cache";
  cacheLife("minutes");
  cacheTag(TAGS.offerings, `offering:${id}`);
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const rows = await db()
    .select(offeringColumns)
    .from(courseOfferings)
    .innerJoin(courses, eq(courses.id, courseOfferings.courseId))
    .where(and(eq(courseOfferings.id, id), eq(courses.published, true), ne(courseOfferings.status, "draft")))
    .limit(1);
  return rows[0] ? toCard(rows[0], Date.now()) : null;
}

/* ------------------------------------------------------------------- events */

export type EventState = "open" | "full" | "closed" | "no_registration" | "external" | "past";

const publicEventColumns = {
  id: events.id,
  slug: events.slug,
  titleEn: events.titleEn,
  titleDe: events.titleDe,
  summaryEn: events.summaryEn,
  summaryDe: events.summaryDe,
  category: events.category,
  startsAt: events.startsAt,
  endsAt: events.endsAt,
  venue: events.venue,
  imagePath: events.imagePath,
  imageAlt: events.imageAlt,
  capacity: events.capacity,
  seatsTaken: events.seatsTaken,
  registrationMode: events.registrationMode,
  externalUrl: events.externalUrl,
  registrationClosesAt: events.registrationClosesAt,
  isFree: events.isFree,
  feePkr: events.feePkr,
  featured: events.featured,
  status: events.status,
};

// Only used to infer the row type of the public event queries.
const _eventSelect = () => db().select(publicEventColumns).from(events);
type EventRow = Awaited<ReturnType<typeof _eventSelect>>[number];

export type EventCard = Omit<EventRow, "seatsTaken" | "status"> & { seatsLeft: number | null; state: EventState; cancelled: boolean };

export function eventState(e: Pick<EventRow, "startsAt" | "endsAt" | "capacity" | "seatsTaken" | "registrationMode" | "registrationClosesAt">, now = Date.now()): EventState {
  const end = (e.endsAt ?? e.startsAt).getTime();
  if (end < now) return "past";
  if (e.registrationMode === "none") return "no_registration";
  if (e.registrationMode === "external") return "external";
  if (e.registrationClosesAt && e.registrationClosesAt.getTime() < now) return "closed";
  if (e.startsAt.getTime() < now) return "closed";
  if (e.capacity !== null && e.seatsTaken >= e.capacity) return "full";
  return "open";
}

function toEventCard(r: EventRow, now: number): EventCard {
  const { seatsTaken, status, ...rest } = r;
  return {
    ...rest,
    seatsLeft: r.capacity === null ? null : Math.max(0, r.capacity - seatsTaken),
    state: eventState(r, now),
    cancelled: status === "cancelled",
  };
}

export async function getUpcomingEvents(limit = 50): Promise<EventCard[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(TAGS.events);
  const now = Date.now();
  const rows = await db()
    .select(publicEventColumns)
    .from(events)
    .where(and(inArray(events.status, ["published", "cancelled"]), gte(sql`coalesce(${events.endsAt}, ${events.startsAt})`, new Date())))
    .orderBy(asc(events.startsAt))
    .limit(limit);
  return rows.map((r) => toEventCard(r, now));
}

export async function getPastEvents(limit = 24): Promise<EventCard[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(TAGS.events);
  const now = Date.now();
  const rows = await db()
    .select(publicEventColumns)
    .from(events)
    .where(and(eq(events.status, "published"), lt(sql`coalesce(${events.endsAt}, ${events.startsAt})`, new Date())))
    .orderBy(desc(events.startsAt))
    .limit(limit);
  return rows.map((r) => toEventCard(r, now));
}

export async function getEventBySlug(slug: string) {
  "use cache";
  cacheLife("hours");
  cacheTag(TAGS.events, `event:${slug}`);
  const row = await db().query.events.findFirst({
    where: and(eq(events.slug, slug), inArray(events.status, ["published", "cancelled"])),
  });
  if (!row) return null;
  const now = Date.now();
  return {
    ...row,
    seatsLeft: row.capacity === null ? null : Math.max(0, row.capacity - row.seatsTaken),
    state: eventState(row, now),
    cancelled: row.status === "cancelled",
  };
}

export async function getEventSlugs(): Promise<string[]> {
  "use cache";
  cacheLife("days");
  cacheTag(TAGS.events);
  const rows = await db().select({ slug: events.slug }).from(events).where(inArray(events.status, ["published", "cancelled"]));
  return rows.map((r) => r.slug);
}

/* --------------------------------------------------------- placement tests */

export type PlacementCard = {
  id: string;
  code: string;
  startsAt: Date;
  endsAt: Date;
  levels: string[];
  mode: "on_campus" | "online";
  venue: string;
  feePkr: number;
  seatsLeft: number;
  registrationDeadline: Date;
  state: "open" | "full" | "closed";
  notesEn: string;
  notesDe: string;
};

export async function getPlacementSessions(): Promise<PlacementCard[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(TAGS.placement);
  const now = Date.now();
  const rows = await db()
    .select()
    .from(placementSessions)
    .where(and(inArray(placementSessions.status, ["open", "closed"]), gte(placementSessions.startsAt, new Date())))
    .orderBy(asc(placementSessions.startsAt));
  return rows.map((r) => ({
    id: r.id,
    code: r.code,
    startsAt: r.startsAt,
    endsAt: r.endsAt,
    levels: r.levels,
    mode: r.mode,
    venue: r.venue,
    feePkr: r.feePkr,
    seatsLeft: Math.max(0, r.capacity - r.seatsTaken),
    registrationDeadline: r.registrationDeadline,
    state:
      r.status !== "open" || r.registrationDeadline.getTime() < now ? "closed" : r.seatsTaken >= r.capacity ? "full" : "open",
    notesEn: r.notesEn,
    notesDe: r.notesDe,
  }));
}

/* ------------------------------------------------------------------- exams */

export async function getExamDates() {
  "use cache";
  cacheLife("days");
  cacheTag(TAGS.exams);
  const rows = await db().select().from(examDates).where(eq(examDates.published, true)).orderBy(asc(examDates.examStartsOn));
  const t = today();
  return {
    upcoming: rows.filter((r) => (r.examEndsOn ?? r.examStartsOn) >= t),
    past: rows.filter((r) => (r.examEndsOn ?? r.examStartsOn) < t).reverse(),
  };
}

/* ------------------------------------------------------------------- posts */

export async function getPosts(limit = 30) {
  "use cache";
  cacheLife("hours");
  cacheTag(TAGS.posts);
  return db()
    .select({
      id: posts.id,
      slug: posts.slug,
      category: posts.category,
      titleEn: posts.titleEn,
      titleDe: posts.titleDe,
      excerptEn: posts.excerptEn,
      excerptDe: posts.excerptDe,
      imagePath: posts.imagePath,
      pinned: posts.pinned,
      publishedAt: posts.publishedAt,
    })
    .from(posts)
    .where(and(eq(posts.status, "published"), lt(posts.publishedAt, new Date())))
    .orderBy(desc(posts.pinned), desc(posts.publishedAt))
    .limit(limit);
}

export async function getPostBySlug(slug: string) {
  "use cache";
  cacheLife("hours");
  cacheTag(TAGS.posts, `post:${slug}`);
  return (
    (await db().query.posts.findFirst({
      where: and(eq(posts.slug, slug), eq(posts.status, "published"), lt(posts.publishedAt, new Date())),
    })) ?? null
  );
}

export async function getPostSlugs(): Promise<string[]> {
  "use cache";
  cacheLife("days");
  cacheTag(TAGS.posts);
  const rows = await db().select({ slug: posts.slug }).from(posts).where(eq(posts.status, "published"));
  return rows.map((r) => r.slug);
}

/* ------------------------------------------------------- gallery & partners */

export async function getGallery() {
  "use cache";
  cacheLife("days");
  cacheTag(TAGS.gallery);
  return db()
    .select({
      id: galleryItems.id,
      imagePath: galleryItems.imagePath,
      width: galleryItems.width,
      height: galleryItems.height,
      altEn: galleryItems.altEn,
      altDe: galleryItems.altDe,
      captionEn: galleryItems.captionEn,
      captionDe: galleryItems.captionDe,
      category: galleryItems.category,
      featured: galleryItems.featured,
    })
    .from(galleryItems)
    .where(eq(galleryItems.published, true))
    .orderBy(asc(galleryItems.sortOrder));
}

export async function getPartners() {
  "use cache";
  cacheLife("days");
  cacheTag(TAGS.partners);
  return db()
    .select({
      id: partners.id,
      slug: partners.slug,
      name: partners.name,
      categoryEn: partners.categoryEn,
      categoryDe: partners.categoryDe,
      descriptionEn: partners.descriptionEn,
      descriptionDe: partners.descriptionDe,
      url: partners.url,
      logoPath: partners.logoPath,
      logoWidth: partners.logoWidth,
      logoHeight: partners.logoHeight,
      showInMarquee: partners.showInMarquee,
    })
    .from(partners)
    .where(eq(partners.published, true))
    .orderBy(asc(partners.sortOrder));
}

/* ------------------------------------------------------------ home summary */

export async function getHomeStats() {
  "use cache";
  cacheLife("hours");
  cacheTag(TAGS.courses, TAGS.offerings, TAGS.events, TAGS.placement);
  const [[c], [o], [e]] = await Promise.all([
    db().select({ n: sql<number>`count(*)::int` }).from(courses).where(eq(courses.published, true)),
    db()
      .select({ n: sql<number>`count(*)::int` })
      .from(courseOfferings)
      .where(and(eq(courseOfferings.status, "open"), gte(courseOfferings.startsOn, today()))),
    db()
      .select({ n: sql<number>`count(*)::int` })
      .from(events)
      .where(and(eq(events.status, "published"), or(gte(events.startsAt, new Date()), gte(events.endsAt, new Date())))),
  ]);
  return { courses: c.n, openBatches: o.n, upcomingEvents: e.n };
}
