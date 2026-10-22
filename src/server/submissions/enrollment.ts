import "server-only";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { courseOfferings, courses, enrollments, privateFiles } from "@/db/schema";
import { env } from "@/lib/env";
import { commonDictionary } from "@/i18n/common";
import { pick, type Locale } from "@/i18n/config";
import { formatDate, formatPKR, formatTimeRange, formatWeekdays } from "@/lib/format";
import { newReference } from "@/lib/reference";
import { DOCUMENTS, enrollmentSchema, MAX_DOCUMENT_BYTES, type DocumentKind } from "@/lib/schemas/public-forms";
import { FileRejectedError, processUpload, type ProcessedFile } from "@/server/files";
import { dispatchAfterResponse, enqueue } from "@/server/notifications/outbox";
import { getSettings } from "@/server/public/queries";
import { fieldErrors, guard, uniqueViolation, type SubmitResult } from "./guard";

class ClosedError extends Error {}

export async function submitEnrollment(formData: FormData, locale: Locale): Promise<SubmitResult> {
  const raw = Object.fromEntries(
    [...formData.entries()].filter(([, v]) => typeof v === "string"),
  ) as Record<string, string>;
  const parsed = enrollmentSchema.safeParse({
    ...raw,
    whatsappOptIn: raw.whatsappOptIn === "true",
    privacyConsent: raw.privacyConsent === "true",
  });
  if (!parsed.success) return { ok: false, error: "validation", fieldErrors: fieldErrors(parsed.error) };
  const data = parsed.data;

  // Duplicate submit of the same form (double click, retry after timeout) → same answer.
  const existing = await db()
    .select({ reference: enrollments.reference, status: enrollments.status })
    .from(enrollments)
    .where(eq(enrollments.idempotencyKey, data.idempotencyKey))
    .limit(1);
  if (existing[0]) return { ok: true, reference: existing[0].reference, status: existing[0].status, duplicate: true };

  const g = await guard("enroll", data, { limit: 6, windowSeconds: 900 });
  if (!g.ok) return { ok: false, error: g.error };

  const settings = await getSettings();
  if (!settings.enrollment.acceptingApplications) return { ok: false, error: "closed" };

  // Documents are validated and normalised before the transaction starts.
  const files: { kind: DocumentKind; file: ProcessedFile; name: string }[] = [];
  const fileErrors: Record<string, string> = {};
  for (const [kind, rule] of Object.entries(DOCUMENTS) as [DocumentKind, (typeof DOCUMENTS)[DocumentKind]][]) {
    const value = formData.get(kind);
    if (!(value instanceof File) || value.size === 0) {
      if (rule.required) fileErrors[kind] = "required";
      continue;
    }
    try {
      files.push({ kind, name: value.name.slice(0, 120), file: await processUpload(value, { maxBytes: MAX_DOCUMENT_BYTES, allow: rule.accept, maxDimension: 2000 }) });
    } catch (e) {
      fileErrors[kind] = e instanceof FileRejectedError ? `file_${e.message}` : "file_type";
    }
  }
  if (Object.keys(fileErrors).length) return { ok: false, error: "files", fieldErrors: fileErrors };

  const dict = commonDictionary(locale);
  try {
    const result = await db().transaction(async (tx) => {
      const [offering] = await tx
        .select({
          id: courseOfferings.id,
          code: courseOfferings.code,
          status: courseOfferings.status,
          mode: courseOfferings.mode,
          startsOn: courseOfferings.startsOn,
          weekdays: courseOfferings.weekdays,
          startTime: courseOfferings.startTime,
          endTime: courseOfferings.endTime,
          fee: sql<number>`coalesce(${courseOfferings.feePkr}, ${courses.feePkr})`,
          opensAt: courseOfferings.registrationOpensAt,
          closesAt: courseOfferings.registrationClosesAt,
          titleEn: courses.titleEn,
          titleDe: courses.titleDe,
        })
        .from(courseOfferings)
        .innerJoin(courses, eq(courses.id, courseOfferings.courseId))
        .where(and(eq(courseOfferings.id, data.offeringId), eq(courses.published, true)))
        .for("update", { of: courseOfferings })
        .limit(1);

      const now = Date.now();
      if (
        !offering ||
        offering.status !== "open" ||
        (offering.opensAt && offering.opensAt.getTime() > now) ||
        (offering.closesAt && offering.closesAt.getTime() < now) ||
        new Date(`${offering.startsOn}T23:59:59+05:00`).getTime() < now
      ) {
        throw new ClosedError();
      }

      // Reserve a seat atomically; if none is left the applicant joins the waitlist.
      const reserved = await tx
        .update(courseOfferings)
        .set({ seatsTaken: sql`${courseOfferings.seatsTaken} + 1` })
        .where(and(eq(courseOfferings.id, offering.id), sql`${courseOfferings.seatsTaken} < ${courseOfferings.capacity}`))
        .returning({ id: courseOfferings.id });
      const holdsSeat = reserved.length === 1;
      // With "request payment automatically" on, a reserved seat goes straight to "awaiting payment".
      const status = holdsSeat ? (settings.automation.autoRequestPayment ? "payment_pending" : "submitted") : "waitlisted";

      const reference = newReference("enrollment");
      const [row] = await tx
        .insert(enrollments)
        .values({
          reference,
          offeringId: offering.id,
          status,
          holdsSeat,
          locale,
          firstName: data.firstName,
          lastName: data.lastName,
          guardianName: data.guardianName,
          cnic: data.cnic,
          dateOfBirth: data.dateOfBirth,
          placeOfBirth: data.placeOfBirth,
          email: data.email,
          phone: data.phone,
          emergencyName: data.emergencyName,
          emergencyPhone: data.emergencyPhone,
          education: data.education,
          occupation: data.occupation || null,
          address: data.address,
          city: data.city,
          priorLearning: data.priorLearning,
          priorDetails: data.priorDetails || null,
          motivation: data.motivation,
          whatsappOptIn: data.whatsappOptIn,
          privacyConsentAt: new Date(),
          amountDuePkr: offering.fee,
          idempotencyKey: data.idempotencyKey,
          ipHash: g.ipHash,
          userAgent: g.userAgent,
        })
        .returning({ id: enrollments.id });

      if (files.length) {
        await tx.insert(privateFiles).values(
          files.map((f) => ({
            ownerType: "enrollment",
            ownerId: row.id,
            kind: f.kind,
            fileName: `${reference}-${f.kind}.${f.file.extension}`,
            contentType: f.file.contentType,
            size: f.file.size,
            sha256: f.file.sha256,
            data: f.file.data,
          })),
        );
      }

      const course = pick(offering, "title", locale);
      const name = `${data.firstName} ${data.lastName}`;
      const trackUrl = `${env().APP_URL}/${locale}/track?ref=${reference}`;
      const ids = await enqueue(
        {
          template: "enrollment.received",
          locale,
          email: data.email,
          whatsapp: data.whatsappOptIn ? data.phone : null,
          related: { type: "enrollment", id: row.id },
          payload: {
            name: data.firstName,
            reference,
            trackUrl,
            course,
            batch: offering.code,
            schedule: `${formatWeekdays(offering.weekdays, locale)} · ${formatTimeRange(offering.startTime, offering.endTime, locale)}`,
            startsOn: formatDate(offering.startsOn, locale, { weekday: "long" }),
            mode: dict.modes[offering.mode],
            amount: formatPKR(offering.fee, locale),
            paymentInstructions: locale === "de" ? settings.enrollment.paymentInstructionsDe : settings.enrollment.paymentInstructionsEn,
            waitlisted: !holdsSeat,
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
            related: { type: "enrollment", id: row.id },
            payload: {
              kind: holdsSeat ? "Course application" : "Waitlist application",
              reference,
              name,
              summary: `${name} applied for ${offering.code} (${pick(offering, "title", "en")}). Documents: ${files.map((f) => f.kind).join(", ") || "none"}.`,
              adminUrl: `${env().APP_URL}/admin/enrollments/${row.id}`,
            },
          },
          tx,
        )),
      );
      return { reference, status, ids };
    });

    dispatchAfterResponse(result.ids);
    return { ok: true, reference: result.reference, status: result.status };
  } catch (error) {
    if (error instanceof ClosedError) return { ok: false, error: "closed" };
    if (uniqueViolation(error, "enrollments_active_cnic_key")) return { ok: false, error: "duplicate" };
    if (uniqueViolation(error, /idempotency/i)) {
      const again = await db().select({ reference: enrollments.reference, status: enrollments.status }).from(enrollments).where(eq(enrollments.idempotencyKey, data.idempotencyKey)).limit(1);
      if (again[0]) return { ok: true, reference: again[0].reference, status: again[0].status, duplicate: true };
    }
    console.error("enrollment failed", error);
    return { ok: false, error: "generic" };
  }
}
