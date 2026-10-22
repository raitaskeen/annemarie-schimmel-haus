import "server-only";
import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { courseOfferings, courses, enrollments, eventRegistrations, placementApplications } from "@/db/schema";
import type { Locale } from "@/i18n/config";
import { audit } from "@/lib/audit";
import { env } from "@/lib/env";
import { rateLimit } from "@/lib/security/rate-limit";
import { requestMeta } from "@/lib/security/request";
import { cleanText } from "@/lib/validators";
import { changeEnrollmentStatus } from "@/server/admin/enrollments";
import { changeRegistrationStatus, updatePlacementApplication } from "@/server/admin/programme";
import { dispatchAfterResponse, enqueue } from "@/server/notifications/outbox";
import { verifyManageToken } from "./manage-token";
import { refreshTrack, type TrackResult } from "./track";

/**
 * Applicant self-service from the public tracker, no account needed.
 * Every action requires the signed manage token (see manage-token.ts).
 */
export type ManageResult = { ok: true; result: TrackResult } | { ok: false; error: "expired" | "not_allowed" | "rate_limited" | "validation" | "generic" };

async function limited(reference: string) {
  const { ipHash } = await requestMeta();
  const [ip, ref] = await Promise.all([
    rateLimit("self-service-ip", ipHash, { limit: 20, windowSeconds: 3600 }),
    rateLimit("self-service-ref", reference, { limit: 8, windowSeconds: 3600 }),
  ]);
  return !ip.ok || !ref.ok;
}

/** Cancels an event registration, a placement test application or an unpaid course application. */
export async function cancelByApplicant(token: unknown, locale: Locale): Promise<ManageResult> {
  const reference = verifyManageToken(token);
  if (!reference) return { ok: false, error: "expired" };
  if (await limited(reference)) return { ok: false, error: "rate_limited" };
  const current = await refreshTrack(reference, locale);
  if (!current?.manage.canCancel) return { ok: false, error: "not_allowed" };
  const note = "cancelled by the applicant in the tracker";
  try {
    if (current.kind === "event") {
      const [r] = await db().select({ id: eventRegistrations.id }).from(eventRegistrations).where(eq(eventRegistrations.reference, reference)).limit(1);
      await changeRegistrationStatus(null, r.id, "cancelled", true, note);
    } else if (current.kind === "placement") {
      const [a] = await db().select({ id: placementApplications.id }).from(placementApplications).where(eq(placementApplications.reference, reference)).limit(1);
      await updatePlacementApplication(null, a.id, { status: "cancelled", notify: true });
    } else {
      const [e] = await db().select({ id: enrollments.id }).from(enrollments).where(eq(enrollments.reference, reference)).limit(1);
      await changeEnrollmentStatus(null, e.id, "cancelled", { notify: true, note: "Cancelled by the applicant in the online tracker." });
    }
    await audit(null, { action: "self_service.cancel", entityType: current.kind, entityId: reference, summary: `${reference} ${note}` });
    const result = await refreshTrack(reference, locale);
    return result ? { ok: true, result } : { ok: false, error: "generic" };
  } catch (error) {
    console.error("self-service cancel failed", error);
    return { ok: false, error: "generic" };
  }
}

const paymentSchema = z.object({
  paymentRef: z
    .string()
    .trim()
    .min(4)
    .max(60)
    .regex(/^[\p{L}\p{N}\s\-_/#.:]+$/u),
  note: z.string().trim().max(300).optional().default(""),
});

/** "I have paid": stores the transaction reference and alerts the course office to confirm the seat. */
export async function reportPayment(token: unknown, input: unknown, locale: Locale): Promise<ManageResult> {
  const reference = verifyManageToken(token);
  if (!reference) return { ok: false, error: "expired" };
  if (await limited(reference)) return { ok: false, error: "rate_limited" };
  const parsed = paymentSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "validation" };
  const paymentRef = cleanText(parsed.data.paymentRef);
  const note = cleanText(parsed.data.note);

  const ids = await db().transaction(async (tx) => {
    const [e] = await tx
      .select({ e: enrollments, code: courseOfferings.code, title: courses.titleEn, titleDe: courses.titleDe })
      .from(enrollments)
      .innerJoin(courseOfferings, eq(courseOfferings.id, enrollments.offeringId))
      .innerJoin(courses, eq(courses.id, courseOfferings.courseId))
      .where(and(eq(enrollments.reference, reference), inArray(enrollments.status, ["submitted", "payment_pending"])))
      .for("update", { of: enrollments })
      .limit(1);
    if (!e) return null;
    // A repeated report of the same reference (double tap, retry after a timeout) changes nothing.
    if (e.e.paymentRef === paymentRef) return [];
    const stamp = new Date().toISOString().slice(0, 16).replace("T", " ");
    await tx
      .update(enrollments)
      .set({
        paymentRef,
        staffNotes: [e.e.staffNotes, `[${stamp} applicant] Payment reported: ${paymentRef}${note ? `: ${note}` : ""}`].filter(Boolean).join("\n"),
      })
      .where(eq(enrollments.id, e.e.id));
    await audit(null, { action: "self_service.payment_reported", entityType: "enrollment", entityId: e.e.id, summary: `${reference}: applicant reported payment ${paymentRef}` }, tx);
    const appLocale = (e.e.locale === "de" ? "de" : "en") as Locale;
    const applicant = await enqueue(
      {
        template: "enrollment.payment_reported",
        locale: appLocale,
        email: e.e.email,
        whatsapp: e.e.whatsappOptIn ? e.e.phone : null,
        related: { type: "enrollment", id: e.e.id },
        payload: {
          name: e.e.firstName,
          reference,
          trackUrl: `${env().APP_URL}/${appLocale}/track?ref=${reference}`,
          course: appLocale === "de" ? e.titleDe : e.title,
          paymentRef,
        },
      },
      tx,
    );
    const staff = await enqueue(
      {
        template: "staff.submission",
        locale: "en",
        email: env().STAFF_NOTIFY_EMAIL,
        related: { type: "enrollment", id: e.e.id },
        payload: {
          kind: "Payment reported",
          reference,
          name: `${e.e.firstName} ${e.e.lastName}`,
          summary: `${e.e.firstName} ${e.e.lastName} reports paying for ${e.code} (${e.title}). Transaction reference: ${paymentRef}.${note ? ` Note: ${note}` : ""} Please check the bank statement and confirm the seat.`,
          adminUrl: `${env().APP_URL}/admin/enrollments/${e.e.id}`,
        },
      },
      tx,
    );
    return [...applicant, ...staff];
  });
  if (!ids) return { ok: false, error: "not_allowed" };
  dispatchAfterResponse(ids);
  const result = await refreshTrack(reference, locale);
  return result ? { ok: true, result } : { ok: false, error: "generic" };
}
