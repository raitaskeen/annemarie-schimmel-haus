import "server-only";
import { and, asc, count, desc, eq, gte, ilike, lt, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { courseOfferings, courses, enrollments, galleryItems, mediaAssets } from "@/db/schema";

export async function listCoursesAdmin() {
  const rows = await db()
    .select({
      course: courses,
      batches: sql<number>`(select count(*)::int from course_offerings o where o.course_id = "courses"."id")`,
      openBatches: sql<number>`(select count(*)::int from course_offerings o where o.course_id = "courses"."id" and o.status = 'open' and o.starts_on >= current_date)`,
      applications: sql<number>`(select count(*)::int from enrollments e join course_offerings o on o.id = e.offering_id where o.course_id = "courses"."id")`,
    })
    .from(courses)
    .orderBy(asc(courses.sortOrder), asc(courses.code));
  return rows;
}

export async function getCourseAdmin(id: string) {
  if (!/^[0-9a-f-]{36}$/.test(id)) return null;
  const [course] = await db().select().from(courses).where(eq(courses.id, id)).limit(1);
  if (!course) return null;
  const offerings = await db().select().from(courseOfferings).where(eq(courseOfferings.courseId, id)).orderBy(desc(courseOfferings.startsOn));
  return { course, offerings };
}

export async function courseOptions() {
  return db().select({ id: courses.id, code: courses.code, titleEn: courses.titleEn, feePkr: courses.feePkr }).from(courses).orderBy(asc(courses.sortOrder));
}

export type OfferingFilters = { q?: string; course?: string; status?: string; period?: string };

export async function listOfferingsAdmin(f: OfferingFilters) {
  const parts: (SQL | undefined)[] = [];
  if (f.course) parts.push(eq(courses.code, f.course));
  if (f.status && ["draft", "open", "closed", "cancelled", "completed"].includes(f.status)) parts.push(eq(courseOfferings.status, f.status as "open"));
  if (f.period === "past") parts.push(lt(courseOfferings.startsOn, sql`current_date`));
  else if (f.period !== "all") parts.push(gte(sql`coalesce(${courseOfferings.endsOn}, ${courseOfferings.startsOn})`, sql`current_date`));
  if (f.q?.trim()) parts.push(or(ilike(courseOfferings.code, `%${f.q.trim()}%`), ilike(courses.titleEn, `%${f.q.trim()}%`)));
  return db()
    .select({
      o: courseOfferings,
      courseCode: courses.code,
      level: courses.level,
      courseFee: courses.feePkr,
      pending: sql<number>`(select count(*)::int from enrollments e where e.offering_id = "course_offerings"."id" and e.status in ('submitted','payment_pending'))`,
      waitlisted: sql<number>`(select count(*)::int from enrollments e where e.offering_id = "course_offerings"."id" and e.status = 'waitlisted')`,
    })
    .from(courseOfferings)
    .innerJoin(courses, eq(courses.id, courseOfferings.courseId))
    .where(parts.length ? and(...parts) : undefined)
    .orderBy(f.period === "past" ? desc(courseOfferings.startsOn) : asc(courseOfferings.startsOn))
    .limit(200);
}

export async function getOfferingAdmin(id: string) {
  if (!/^[0-9a-f-]{36}$/.test(id)) return null;
  const [row] = await db().select({ o: courseOfferings, c: courses }).from(courseOfferings).innerJoin(courses, eq(courses.id, courseOfferings.courseId)).where(eq(courseOfferings.id, id)).limit(1);
  if (!row) return null;
  const byStatus = await db().select({ status: enrollments.status, n: count() }).from(enrollments).where(eq(enrollments.offeringId, id)).groupBy(enrollments.status);
  return { ...row, byStatus: Object.fromEntries(byStatus.map((s) => [s.status, s.n])) as Record<string, number> };
}

/** Images offered by the image picker: the photo library and admin uploads. */
export async function pickerImages() {
  const [gallery, uploads] = await Promise.all([
    db().select({ path: galleryItems.imagePath, label: galleryItems.captionEn, alt: galleryItems.altEn }).from(galleryItems).orderBy(asc(galleryItems.sortOrder)),
    db().select({ id: mediaAssets.id, fileName: mediaAssets.fileName }).from(mediaAssets).orderBy(desc(mediaAssets.createdAt)).limit(200),
  ]);
  return [
    ...uploads.map((u) => ({ path: `/media/${u.id}`, label: `Upload · ${u.fileName}` })),
    ...gallery.map((g) => ({ path: g.path, label: g.label || g.alt })),
  ];
}
