import "server-only";
import { and, asc, count, desc, eq, ilike, inArray, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { auditLogs, courseOfferings, courses, enrollments, notifications, privateFiles, type Enrollment } from "@/db/schema";
import { commonDictionary } from "@/i18n/common";
import { pick, type Locale } from "@/i18n/config";
import { audit } from "@/lib/audit";
import type { SessionUser } from "@/lib/auth/session";
import { env } from "@/lib/env";
import { formatDate, formatPKR, formatTimeRange, formatWeekdays } from "@/lib/format";
import { ActionError } from "@/server/admin/action-utils";
import { dispatchAfterResponse, enqueue } from "@/server/notifications/outbox";
import { getSettings } from "@/server/public/queries";

export const ENROLLMENT_STATUSES = ["submitted", "payment_pending", "confirmed", "waitlisted", "rejected", "cancelled", "completed"] as const;
export type EnrollmentStatus = (typeof ENROLLMENT_STATUSES)[number];
const HOLDING: EnrollmentStatus[] = ["submitted", "payment_pending", "confirmed", "completed"];

/** Allowed next steps for each status (the UI only offers these; the server enforces them). */
export const TRANSITIONS: Record<EnrollmentStatus, EnrollmentStatus[]> = {
  submitted: ["payment_pending", "confirmed", "waitlisted", "rejected", "cancelled"],
  payment_pending: ["confirmed", "submitted", "waitlisted", "cancelled", "rejected"],
  confirmed: ["completed", "cancelled"],
  waitlisted: ["payment_pending", "submitted", "cancelled", "rejected"],
  rejected: ["submitted"],
  cancelled: ["submitted"],
  completed: ["confirmed"],
};

export type EnrollmentFilters = { q?: string; status?: string; offering?: string; course?: string; mode?: string; page?: number };
const PAGE_SIZE = 25;

function where(f: EnrollmentFilters): SQL | undefined {
  const parts: (SQL | undefined)[] = [];
  if (f.status && (ENROLLMENT_STATUSES as readonly string[]).includes(f.status)) parts.push(eq(enrollments.status, f.status as EnrollmentStatus));
  // "reported": the applicant entered a transaction ID in the tracker and is waiting for confirmation.
  if (f.status === "reported") parts.push(and(inArray(enrollments.status, ["submitted", "payment_pending"]), sql`${enrollments.paymentRef} is not null`));
  if (f.offering && /^[0-9a-f-]{36}$/.test(f.offering)) parts.push(eq(enrollments.offeringId, f.offering));
  if (f.course) parts.push(eq(courses.code, f.course));
  if (f.mode === "online" || f.mode === "on_campus") parts.push(eq(courseOfferings.mode, f.mode));
  const q = f.q?.trim();
  if (q) {
    const like = `%${q.replace(/[%_\\]/g, "\\$&")}%`;
    parts.push(
      or(
        ilike(enrollments.reference, like),
        ilike(enrollments.email, like),
        ilike(enrollments.phone, like),
        ilike(enrollments.cnic, like),
        ilike(sql`${enrollments.firstName} || ' ' || ${enrollments.lastName}`, like),
      ),
    );
  }
  return parts.length ? and(...parts) : undefined;
}

export async function listEnrollments(f: EnrollmentFilters) {
  const page = Math.max(1, f.page ?? 1);
  const w = where(f);
  const base = db()
    .select({
      id: enrollments.id,
      reference: enrollments.reference,
      status: enrollments.status,
      firstName: enrollments.firstName,
      lastName: enrollments.lastName,
      email: enrollments.email,
      phone: enrollments.phone,
      createdAt: enrollments.createdAt,
      amountDuePkr: enrollments.amountDuePkr,
      paymentRef: enrollments.paymentRef,
      offeringCode: courseOfferings.code,
      mode: courseOfferings.mode,
      startsOn: courseOfferings.startsOn,
      courseCode: courses.code,
    })
    .from(enrollments)
    .innerJoin(courseOfferings, eq(courseOfferings.id, enrollments.offeringId))
    .innerJoin(courses, eq(courses.id, courseOfferings.courseId));
  const [rows, [{ total }], statusCounts] = await Promise.all([
    base.where(w).orderBy(desc(enrollments.createdAt)).limit(PAGE_SIZE).offset((page - 1) * PAGE_SIZE),
    db()
      .select({ total: count() })
      .from(enrollments)
      .innerJoin(courseOfferings, eq(courseOfferings.id, enrollments.offeringId))
      .innerJoin(courses, eq(courses.id, courseOfferings.courseId))
      .where(w),
    db().select({ status: enrollments.status, n: count() }).from(enrollments).groupBy(enrollments.status),
  ]);
  const [{ reported }] = await db()
    .select({ reported: count() })
    .from(enrollments)
    .where(and(inArray(enrollments.status, ["submitted", "payment_pending"]), sql`${enrollments.paymentRef} is not null`));
  return {
    rows,
    total,
    page,
    pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    statusCounts: Object.fromEntries(statusCounts.map((s) => [s.status, s.n])) as Record<string, number>,
    reported,
  };
}

export async function exportEnrollments(f: EnrollmentFilters) {
  return db()
    .select({
      reference: enrollments.reference,
      status: enrollments.status,
      createdAt: enrollments.createdAt,
      course: courses.code,
      batch: courseOfferings.code,
      startsOn: courseOfferings.startsOn,
      firstName: enrollments.firstName,
      lastName: enrollments.lastName,
      guardianName: enrollments.guardianName,
      cnic: enrollments.cnic,
      dateOfBirth: enrollments.dateOfBirth,
      email: enrollments.email,
      phone: enrollments.phone,
      city: enrollments.city,
      education: enrollments.education,
      priorLearning: enrollments.priorLearning,
      amountDuePkr: enrollments.amountDuePkr,
      paymentRef: enrollments.paymentRef,
      paidAt: enrollments.paidAt,
    })
    .from(enrollments)
    .innerJoin(courseOfferings, eq(courseOfferings.id, enrollments.offeringId))
    .innerJoin(courses, eq(courses.id, courseOfferings.courseId))
    .where(where(f))
    .orderBy(asc(courseOfferings.startsOn), asc(enrollments.createdAt))
    .limit(10_000);
}

export async function getEnrollment(id: string) {
  if (!/^[0-9a-f-]{36}$/.test(id)) return null;
  const [row] = await db()
    .select({ e: enrollments, o: courseOfferings, c: courses })
    .from(enrollments)
    .innerJoin(courseOfferings, eq(courseOfferings.id, enrollments.offeringId))
    .innerJoin(courses, eq(courses.id, courseOfferings.courseId))
    .where(eq(enrollments.id, id))
    .limit(1);
  if (!row) return null;
  const [files, messages, history] = await Promise.all([
    db()
      .select({ id: privateFiles.id, kind: privateFiles.kind, contentType: privateFiles.contentType, size: privateFiles.size, createdAt: privateFiles.createdAt })
      .from(privateFiles)
      .where(and(eq(privateFiles.ownerType, "enrollment"), eq(privateFiles.ownerId, id))),
    db().select().from(notifications).where(and(eq(notifications.relatedType, "enrollment"), eq(notifications.relatedId, id))).orderBy(desc(notifications.createdAt)).limit(30),
    db().select().from(auditLogs).where(and(eq(auditLogs.entityType, "enrollment"), eq(auditLogs.entityId, id))).orderBy(desc(auditLogs.createdAt)).limit(30),
  ]);
  return { ...row, files, messages, history };
}

/**
 * Moves an application to a new status, keeping the batch's seat count exact.
 * Seats are reserved or released inside the same transaction (row lock on the batch).
 */
/** Staff member, or null for automatic jobs (e.g. releasing unpaid seats). */
export type Actor = Pick<SessionUser, "id" | "email" | "name"> | null;

export async function changeEnrollmentStatus(
  user: Actor,
  id: string,
  next: EnrollmentStatus,
  opts: { paymentRef?: string | null; note?: string | null; notify: boolean },
) {
  const result = await db().transaction(async (tx) => {
    const [current] = await tx.select().from(enrollments).where(eq(enrollments.id, id)).for("update").limit(1);
    if (!current) throw new ActionError("Application not found.");
    if (current.status === next) throw new ActionError("The application already has this status.");
    if (!TRANSITIONS[current.status].includes(next)) throw new ActionError(`Cannot move from “${current.status}” to “${next}”.`);

    const wantsSeat = HOLDING.includes(next);
    let holdsSeat = current.holdsSeat;
    if (wantsSeat && !current.holdsSeat) {
      const reserved = await tx
        .update(courseOfferings)
        .set({ seatsTaken: sql`${courseOfferings.seatsTaken} + 1` })
        .where(and(eq(courseOfferings.id, current.offeringId), sql`${courseOfferings.seatsTaken} < ${courseOfferings.capacity}`))
        .returning({ id: courseOfferings.id });
      if (!reserved.length) throw new ActionError("This batch is full. Increase its capacity first or keep the applicant on the waitlist.");
      holdsSeat = true;
    } else if (!wantsSeat && current.holdsSeat) {
      await tx
        .update(courseOfferings)
        .set({ seatsTaken: sql`greatest(${courseOfferings.seatsTaken} - 1, 0)` })
        .where(eq(courseOfferings.id, current.offeringId));
      holdsSeat = false;
    }

    const [updated] = await tx
      .update(enrollments)
      .set({
        status: next,
        holdsSeat,
        statusChangedAt: new Date(),
        ...(next === "confirmed" ? { paidAt: current.paidAt ?? new Date(), paymentRef: opts.paymentRef || current.paymentRef } : {}),
        ...(opts.note ? { staffNotes: [current.staffNotes, `[${new Date().toISOString().slice(0, 16).replace("T", " ")} ${user?.name ?? "System"}] ${opts.note}`].filter(Boolean).join("\n") } : {}),
      })
      .where(eq(enrollments.id, id))
      .returning();

    await audit(
      user,
      { action: "enrollment.status", entityType: "enrollment", entityId: id, summary: `${current.reference}: ${current.status} → ${next}`, changes: { from: current.status, to: next, note: opts.note ?? undefined } },
      tx,
    );

    let ids: string[] = [];
    if (opts.notify && next !== "submitted") ids = await enqueueStatusMessage(updated, tx);
    return { updated, ids, released: current.holdsSeat && !holdsSeat };
  });
  dispatchAfterResponse(result.ids);
  // A released seat is offered to the next person on the waitlist (never back to the one just moved).
  if (result.released) await promoteCourseWaitlist(result.updated.offeringId, result.updated.id);
  return result.updated;
}

/**
 * Offers free seats in a batch to waitlisted applicants, longest-waiting first: they move to
 * "awaiting payment" (seat reserved) and receive the payment instructions. Each offer then runs
 * through the normal payment window, so unpaid offers are released and passed on automatically.
 */
export async function promoteCourseWaitlist(offeringId: string, excludeId?: string) {
  const settings = await getSettings();
  if (!settings.automation.autoPromoteWaitlist) return 0;
  let promoted = 0;
  for (let i = 0; i < 100; i++) {
    const [o] = await db()
      .select({ status: courseOfferings.status, capacity: courseOfferings.capacity, seatsTaken: courseOfferings.seatsTaken, startsOn: courseOfferings.startsOn })
      .from(courseOfferings)
      .where(eq(courseOfferings.id, offeringId))
      .limit(1);
    // Only batches that are still bookable or running in their first week.
    const started = new Date(`${o?.startsOn}T00:00:00+05:00`).getTime() < Date.now() - 7 * 86_400_000;
    if (!o || !["open", "closed"].includes(o.status) || started || o.seatsTaken >= o.capacity) break;
    const [next] = await db()
      .select({ id: enrollments.id })
      .from(enrollments)
      .where(and(eq(enrollments.offeringId, offeringId), eq(enrollments.status, "waitlisted"), excludeId ? sql`${enrollments.id} <> ${excludeId}` : undefined))
      .orderBy(asc(enrollments.statusChangedAt), asc(enrollments.createdAt))
      .limit(1);
    if (!next) break;
    try {
      await changeEnrollmentStatus(null, next.id, "payment_pending", { notify: true, note: "A seat became free — offered automatically from the waitlist." });
      promoted++;
    } catch (error) {
      if (error instanceof ActionError) break; // batch filled up concurrently
      throw error;
    }
  }
  return promoted;
}

async function enqueueStatusMessage(e: Enrollment, tx: Parameters<typeof enqueue>[1]) {
  const locale = (e.locale === "de" ? "de" : "en") as Locale;
  const [o] = await db()
    .select({ code: courseOfferings.code, startsOn: courseOfferings.startsOn, weekdays: courseOfferings.weekdays, startTime: courseOfferings.startTime, endTime: courseOfferings.endTime, titleEn: courses.titleEn, titleDe: courses.titleDe })
    .from(courseOfferings)
    .innerJoin(courses, eq(courses.id, courseOfferings.courseId))
    .where(eq(courseOfferings.id, e.offeringId))
    .limit(1);
  const settings = await getSettings();
  const dict = commonDictionary(locale);
  return enqueue(
    {
      template: "enrollment.status",
      locale,
      email: e.email,
      whatsapp: e.whatsappOptIn ? e.phone : null,
      related: { type: "enrollment", id: e.id },
      payload: {
        name: e.firstName,
        reference: e.reference,
        trackUrl: `${env().APP_URL}/${locale}/track?ref=${e.reference}`,
        course: pick(o, "title", locale),
        status: e.status,
        statusLabel: dict.status.enrollment[e.status],
        startsOn: formatDate(o.startsOn, locale, { weekday: "long" }),
        schedule: `${formatWeekdays(o.weekdays, locale)} · ${formatTimeRange(o.startTime, o.endTime, locale)}`,
        amount: formatPKR(e.amountDuePkr, locale),
        paymentInstructions: locale === "de" ? settings.enrollment.paymentInstructionsDe : settings.enrollment.paymentInstructionsEn,
      },
    },
    tx,
  );
}

export async function saveStaffNotes(user: SessionUser, id: string, notes: string) {
  await db().update(enrollments).set({ staffNotes: notes.slice(0, 5000) || null }).where(eq(enrollments.id, id));
  await audit(user, { action: "enrollment.notes", entityType: "enrollment", entityId: id, summary: "Updated staff notes" });
}

export async function offeringOptions() {
  return db()
    .select({ id: courseOfferings.id, code: courseOfferings.code, startsOn: courseOfferings.startsOn })
    .from(courseOfferings)
    .where(inArray(courseOfferings.status, ["open", "closed", "draft"]))
    .orderBy(desc(courseOfferings.startsOn))
    .limit(200);
}
