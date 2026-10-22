import "server-only";
import { eq } from "drizzle-orm";
import { encode } from "uqr";
import { db } from "@/db";
import { courseOfferings, courses, enrollments, eventRegistrations, events, placementApplications, placementSessions } from "@/db/schema";
import { commonDictionary } from "@/i18n/common";
import { pick, type Locale } from "@/i18n/config";
import { formatClock, formatDate, formatPKR, formatTimeRange, formatWeekdays } from "@/lib/format";
import { buildIcs } from "@/lib/ics";
import { trackSchema } from "@/lib/schemas/public-forms";
import { maskEmail, maskPhone } from "@/lib/validators";
import { rateLimit } from "@/lib/security/rate-limit";
import { getSettings } from "@/server/public/queries";
import { fieldErrors, guard, type SubmissionError } from "./guard";
import { issueManageToken } from "./manage-token";

/**
 * Public application tracker: application number + phone number + human check.
 * No account needed. Responses never reveal whether a reference exists unless
 * the phone number matches, and personal data is masked.
 */
export type TimelineStep = { key: string; label: string; hint?: string; state: "done" | "current" | "upcoming" | "alert"; at?: string };

export type TrackResult = {
  kind: "enrollment" | "event" | "placement";
  reference: string;
  status: string;
  statusLabel: string;
  tone: "positive" | "pending" | "neutral" | "negative";
  title: string;
  subtitle: string;
  submittedAt: string;
  updatedAt: string;
  applicant: { name: string; email: string; phone: string };
  details: { label: string; value: string }[];
  timeline: TimelineStep[];
  nextSteps: string[];
  payment?: { amount: string; instructions: string };
  ticket?: { qr: boolean[][]; guests: number };
  calendar?: { ics: string; filename: string };
  result?: { level: string; score: number | null };
  contactEmail: string;
  /** Self-service: signed for 20 minutes after the phone + quiz check (see self-service.ts). */
  manage: { token: string; canCancel: boolean; canReportPayment: boolean; paymentReported: string | null };
};

export type TrackResponse = { ok: true; result: TrackResult } | { ok: false; error: SubmissionError | "not_found"; fieldErrors?: Record<string, string> };

const L = {
  en: {
    submitted: "Application submitted",
    reviewed: "Reviewed by the course office",
    paid: "Payment received · seat confirmed",
    starts: "Course begins",
    completed: "Course completed",
    waitlist: "Waitlist",
    rejected: "Not accepted",
    cancelled: "Cancelled",
    registered: "Registration confirmed",
    eventDay: "Event day",
    attended: "Attended",
    received: "Application received",
    confirmed: "Seat confirmed",
    testDay: "Test day",
    result: "Result published",
    noShow: "Did not attend",
    course: "Course",
    batch: "Batch",
    schedule: "Schedule",
    format: "Format",
    fee: "Course fee",
    when: "Date & time",
    venue: "Venue",
    guests: "Accompanying guests",
    level: "Target level",
    testFee: "Test fee",
    placementTitle: "ASH placement test",
    steps: {
      enrollmentSubmitted: "Our course office reviews applications on working days, usually within one to two days.",
      enrollmentPayment: "Pay the course fee using the details below and keep your transaction reference.",
      enrollmentConfirmed: "You're all set! Please arrive 10 minutes early on the first day and bring your CNIC.",
      enrollmentOnline: "You're all set! We'll email your Zoom link before the first class.",
      enrollmentWaitlisted: "We'll contact you by email and WhatsApp as soon as a seat becomes available.",
      enrollmentClosed: "If you have questions about this decision, please contact our course office.",
      eventRegistered: "Show this ticket (or your application number) at the entrance.",
      eventCnic: "Bring your original CNIC — entry is not possible without it.",
      eventWaitlisted: "You're on the waitlist. We'll notify you if a seat opens up.",
      placementSubmitted: "Pay the test fee at reception on the test day. Bring your original CNIC.",
      placementResult: "Your recommended level is shown below — you can now apply for a matching course.",
      contact: "Questions? Write to",
    },
  },
  de: {
    submitted: "Antrag eingereicht",
    reviewed: "Vom Kursbüro geprüft",
    paid: "Zahlung erhalten · Platz bestätigt",
    starts: "Kursbeginn",
    completed: "Kurs abgeschlossen",
    waitlist: "Warteliste",
    rejected: "Nicht angenommen",
    cancelled: "Storniert",
    registered: "Anmeldung bestätigt",
    eventDay: "Veranstaltungstag",
    attended: "Teilgenommen",
    received: "Antrag eingegangen",
    confirmed: "Platz bestätigt",
    testDay: "Testtag",
    result: "Ergebnis veröffentlicht",
    noShow: "Nicht erschienen",
    course: "Kurs",
    batch: "Gruppe",
    schedule: "Zeitplan",
    format: "Format",
    fee: "Kursgebühr",
    when: "Datum & Uhrzeit",
    venue: "Ort",
    guests: "Begleitpersonen",
    level: "Angestrebtes Niveau",
    testFee: "Testgebühr",
    placementTitle: "ASH-Einstufungstest",
    steps: {
      enrollmentSubmitted: "Unser Kursbüro prüft Anträge an Werktagen, meist innerhalb von ein bis zwei Tagen.",
      enrollmentPayment: "Bitte zahlen Sie die Kursgebühr mit den unten stehenden Angaben und bewahren Sie Ihre Transaktionsnummer auf.",
      enrollmentConfirmed: "Alles erledigt! Bitte kommen Sie am ersten Tag 10 Minuten früher und bringen Sie Ihre CNIC mit.",
      enrollmentOnline: "Alles erledigt! Den Zoom-Link senden wir Ihnen vor der ersten Stunde per E-Mail.",
      enrollmentWaitlisted: "Wir melden uns per E-Mail und WhatsApp, sobald ein Platz frei wird.",
      enrollmentClosed: "Bei Fragen zu dieser Entscheidung wenden Sie sich bitte an unser Kursbüro.",
      eventRegistered: "Zeigen Sie dieses Ticket (oder Ihre Antragsnummer) am Eingang vor.",
      eventCnic: "Bitte bringen Sie Ihre Original-CNIC mit — ohne sie ist kein Einlass möglich.",
      eventWaitlisted: "Sie stehen auf der Warteliste. Wir informieren Sie, sobald ein Platz frei wird.",
      placementSubmitted: "Die Testgebühr zahlen Sie am Testtag am Empfang. Bitte bringen Sie Ihre Original-CNIC mit.",
      placementResult: "Ihr empfohlenes Niveau sehen Sie unten — Sie können sich jetzt für einen passenden Kurs anmelden.",
      contact: "Fragen? Schreiben Sie an",
    },
  },
} as const;

const shortName = (first: string, last?: string) => (last ? `${first} ${last.charAt(0)}.` : first.split(" ").length > 1 ? `${first.split(" ")[0]} ${first.split(" ").at(-1)!.charAt(0)}.` : first);

export async function trackApplication(input: unknown, locale: Locale): Promise<TrackResponse> {
  const parsed = trackSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "validation", fieldErrors: fieldErrors(parsed.error) };
  const { reference, phone } = parsed.data;

  const g = await guard("track", parsed.data, { limit: 12, windowSeconds: 600 });
  if (!g.ok) return { ok: false, error: g.error };
  // Per-reference limit stops distributed guessing of the phone number.
  const perRef = await rateLimit("track-ref", reference, { limit: 6, windowSeconds: 3600 });
  if (!perRef.ok) return { ok: false, error: "rate_limited" };

  const kind = reference[4] === "E" ? "enrollment" : reference[4] === "V" ? "event" : reference[4] === "P" ? "placement" : null;
  if (!kind) return { ok: false, error: "not_found" };

  const result = await lookup(kind, reference, phone, locale);
  return result ? { ok: true, result } : { ok: false, error: "not_found" };
}

export const kindOf = (reference: string) => (reference[4] === "E" ? "enrollment" : reference[4] === "V" ? "event" : reference[4] === "P" ? "placement" : null);

async function lookup(kind: "enrollment" | "event" | "placement", reference: string, phone: string | null, locale: Locale) {
  const result =
    kind === "enrollment" ? await trackEnrollment(reference, phone, locale) : kind === "event" ? await trackEvent(reference, phone, locale) : await trackPlacement(reference, phone, locale);
  if (result) result.manage.token = issueManageToken(reference);
  return result;
}

/** Fresh tracker view after a self-service action (the caller already proved ownership with a signed token). */
export async function refreshTrack(reference: string, locale: Locale): Promise<TrackResult | null> {
  const kind = kindOf(reference);
  return kind ? lookup(kind, reference, null, locale) : null;
}

async function trackEnrollment(reference: string, phone: string | null, locale: Locale): Promise<TrackResult | null> {
  const [r] = await db()
    .select({
      e: enrollments,
      code: courseOfferings.code,
      mode: courseOfferings.mode,
      startsOn: courseOfferings.startsOn,
      weekdays: courseOfferings.weekdays,
      startTime: courseOfferings.startTime,
      endTime: courseOfferings.endTime,
      titleEn: courses.titleEn,
      titleDe: courses.titleDe,
    })
    .from(enrollments)
    .innerJoin(courseOfferings, eq(courseOfferings.id, enrollments.offeringId))
    .innerJoin(courses, eq(courses.id, courseOfferings.courseId))
    .where(eq(enrollments.reference, reference))
    .limit(1);
  if (!r || (phone !== null && r.e.phone !== phone)) return null;

  const t = L[locale];
  const dict = commonDictionary(locale);
  const settings = await getSettings();
  const s = r.e.status;
  const order = ["submitted", "payment_pending", "confirmed", "completed"];
  const idx = order.indexOf(s);
  const step = (key: string, label: string, i: number, at?: Date | null, hint?: string): TimelineStep => ({
    key,
    label,
    hint,
    at: at?.toISOString(),
    state: idx < 0 ? (i === 0 ? "done" : "upcoming") : i < idx ? "done" : i === idx ? (s === "completed" ? "done" : "current") : "upcoming",
  });
  const starts = formatDate(r.startsOn, locale, { weekday: "long" });
  const timeline: TimelineStep[] = [
    step("submitted", t.submitted, 0, r.e.createdAt),
    step("reviewed", t.reviewed, 1),
    step("confirmed", t.paid, 2, r.e.paidAt),
    step("completed", `${t.starts} · ${starts}`, 3),
  ];
  if (s === "waitlisted" || s === "rejected" || s === "cancelled") {
    timeline.splice(1, 3, { key: s, label: s === "waitlisted" ? t.waitlist : s === "rejected" ? t.rejected : t.cancelled, state: s === "waitlisted" ? "current" : "alert", at: r.e.statusChangedAt.toISOString() });
  }
  const nextSteps =
    s === "submitted"
      ? [t.steps.enrollmentSubmitted]
      : s === "payment_pending"
        ? [t.steps.enrollmentPayment]
        : s === "confirmed"
          ? [r.mode === "online" ? t.steps.enrollmentOnline : t.steps.enrollmentConfirmed]
          : s === "waitlisted"
            ? [t.steps.enrollmentWaitlisted]
            : s === "completed"
              ? []
              : [t.steps.enrollmentClosed];

  return {
    kind: "enrollment",
    reference,
    status: s,
    statusLabel: dict.status.enrollment[s],
    tone: s === "confirmed" || s === "completed" ? "positive" : s === "rejected" || s === "cancelled" ? "negative" : "pending",
    title: pick(r, "title", locale),
    subtitle: `${r.code} · ${dict.modes[r.mode]}`,
    submittedAt: r.e.createdAt.toISOString(),
    updatedAt: r.e.updatedAt.toISOString(),
    applicant: { name: shortName(r.e.firstName, r.e.lastName), email: maskEmail(r.e.email), phone: maskPhone(r.e.phone) },
    details: [
      { label: t.course, value: pick(r, "title", locale) },
      { label: t.batch, value: r.code },
      { label: dict.common.starts, value: starts },
      { label: t.schedule, value: `${formatWeekdays(r.weekdays, locale)} · ${formatTimeRange(r.startTime, r.endTime, locale)}` },
      { label: t.format, value: dict.modes[r.mode] },
      { label: t.fee, value: formatPKR(r.e.amountDuePkr, locale) },
    ],
    timeline,
    nextSteps,
    payment:
      s === "payment_pending" || s === "submitted"
        ? {
            amount: formatPKR(r.e.amountDuePkr, locale),
            instructions: locale === "de" ? settings.enrollment.paymentInstructionsDe : settings.enrollment.paymentInstructionsEn,
          }
        : undefined,
    contactEmail: settings.contact.coursesEmail,
    manage: {
      token: "",
      // Paid (confirmed) seats are cancelled through the office because of the refund policy.
      canCancel: ["submitted", "payment_pending", "waitlisted"].includes(s) && new Date(`${r.startsOn}T23:59:59+05:00`).getTime() > Date.now(),
      canReportPayment: s === "submitted" || s === "payment_pending",
      paymentReported: s === "submitted" || s === "payment_pending" ? r.e.paymentRef : null,
    },
  };
}

async function trackEvent(reference: string, phone: string | null, locale: Locale): Promise<TrackResult | null> {
  const [r] = await db()
    .select({ reg: eventRegistrations, ev: events })
    .from(eventRegistrations)
    .innerJoin(events, eq(events.id, eventRegistrations.eventId))
    .where(eq(eventRegistrations.reference, reference))
    .limit(1);
  if (!r || (phone !== null && r.reg.phone !== phone)) return null;

  const t = L[locale];
  const dict = commonDictionary(locale);
  const settings = await getSettings();
  const s = r.reg.status;
  const title = pick(r.ev, "title", locale);
  const when = `${formatDate(r.ev.startsAt, locale, { weekday: "long" })}, ${formatClock(r.ev.startsAt, locale)}${locale === "de" ? " Uhr" : ""}`;
  const past = (r.ev.endsAt ?? r.ev.startsAt).getTime() < Date.now();

  const timeline: TimelineStep[] =
    s === "cancelled" || s === "waitlisted"
      ? [
          { key: "submitted", label: t.submitted, state: "done", at: r.reg.createdAt.toISOString() },
          { key: s, label: s === "cancelled" ? t.cancelled : t.waitlist, state: s === "cancelled" ? "alert" : "current" },
          { key: "event", label: `${t.eventDay} · ${when}`, state: "upcoming" },
        ]
      : [
          { key: "registered", label: t.registered, state: "done", at: r.reg.createdAt.toISOString() },
          { key: "event", label: `${t.eventDay} · ${when}`, state: s === "attended" || past ? "done" : "current" },
          { key: "attended", label: t.attended, state: s === "attended" ? "done" : "upcoming", at: r.reg.checkedInAt?.toISOString() },
        ];

  const nextSteps =
    s === "registered" ? [t.steps.eventRegistered, ...(r.ev.requiresCnic ? [t.steps.eventCnic] : [])] : s === "waitlisted" ? [t.steps.eventWaitlisted] : [];

  return {
    kind: "event",
    reference,
    status: s,
    statusLabel: dict.status.event[s],
    tone: s === "registered" || s === "attended" ? "positive" : s === "cancelled" ? "negative" : "pending",
    title,
    subtitle: dict.eventCategories[r.ev.category],
    submittedAt: r.reg.createdAt.toISOString(),
    updatedAt: r.reg.updatedAt.toISOString(),
    applicant: { name: shortName(r.reg.name), email: maskEmail(r.reg.email), phone: maskPhone(r.reg.phone) },
    details: [
      { label: t.when, value: when },
      { label: t.venue, value: `${r.ev.venue}, ${r.ev.address}` },
      ...(r.reg.guests ? [{ label: t.guests, value: String(r.reg.guests) }] : []),
    ],
    timeline,
    nextSteps,
    ticket: s === "registered" && !past ? { qr: encode(reference, { ecc: "M", border: 1 }).data, guests: r.reg.guests } : undefined,
    calendar:
      s === "registered" && !past
        ? {
            filename: `${r.ev.slug}.ics`,
            ics: buildIcs({ uid: reference, title, description: reference, location: `${r.ev.venue}, ${r.ev.address}`, start: r.ev.startsAt, end: r.ev.endsAt }),
          }
        : undefined,
    contactEmail: settings.contact.programmeEmail,
    manage: { token: "", canCancel: (s === "registered" || s === "waitlisted") && r.ev.startsAt.getTime() > Date.now(), canReportPayment: false, paymentReported: null },
  };
}

async function trackPlacement(reference: string, phone: string | null, locale: Locale): Promise<TrackResult | null> {
  const [r] = await db()
    .select({ app: placementApplications, ses: placementSessions })
    .from(placementApplications)
    .innerJoin(placementSessions, eq(placementSessions.id, placementApplications.sessionId))
    .where(eq(placementApplications.reference, reference))
    .limit(1);
  if (!r || (phone !== null && r.app.phone !== phone)) return null;

  const t = L[locale];
  const dict = commonDictionary(locale);
  const settings = await getSettings();
  const s = r.app.status;
  const when = `${formatDate(r.ses.startsAt, locale, { weekday: "long" })}, ${formatClock(r.ses.startsAt, locale)} – ${formatClock(r.ses.endsAt, locale)}${locale === "de" ? " Uhr" : ""}`;
  const order = ["submitted", "confirmed", "attended", "completed"];
  const idx = order.indexOf(s);
  const mk = (key: string, label: string, i: number, at?: Date | null): TimelineStep => ({
    key,
    label,
    at: at?.toISOString(),
    state: idx < 0 ? (i === 0 ? "done" : "upcoming") : i < idx || (s === "completed" && i === idx) ? "done" : i === idx ? "current" : "upcoming",
  });
  let timeline = [mk("submitted", t.received, 0, r.app.createdAt), mk("confirmed", t.confirmed, 1), mk("attended", `${t.testDay} · ${when}`, 2), mk("completed", t.result, 3)];
  if (s === "cancelled" || s === "no_show") {
    timeline = [timeline[0], { key: s, label: s === "cancelled" ? t.cancelled : t.noShow, state: "alert" }];
  }

  const upcoming = r.ses.startsAt.getTime() > Date.now();
  return {
    kind: "placement",
    reference,
    status: s,
    statusLabel: dict.status.placement[s],
    tone: s === "completed" || s === "confirmed" ? "positive" : s === "cancelled" || s === "no_show" ? "negative" : "pending",
    title: t.placementTitle,
    subtitle: `${r.ses.code} · ${dict.modes[r.ses.mode]}`,
    submittedAt: r.app.createdAt.toISOString(),
    updatedAt: r.app.updatedAt.toISOString(),
    applicant: { name: shortName(r.app.firstName, r.app.lastName), email: maskEmail(r.app.email), phone: maskPhone(r.app.phone) },
    details: [
      { label: t.when, value: when },
      { label: t.venue, value: r.ses.venue },
      { label: t.level, value: r.app.targetLevel },
      { label: t.testFee, value: formatPKR(r.ses.feePkr, locale) },
    ],
    timeline,
    nextSteps: s === "completed" ? [t.steps.placementResult] : s === "submitted" || s === "confirmed" ? [t.steps.placementSubmitted] : [],
    result: s === "completed" && r.app.resultLevel ? { level: r.app.resultLevel, score: r.app.resultScore } : undefined,
    calendar:
      upcoming && (s === "submitted" || s === "confirmed")
        ? { filename: "ash-placement-test.ics", ics: buildIcs({ uid: reference, title: t.placementTitle, description: reference, location: r.ses.venue, start: r.ses.startsAt, end: r.ses.endsAt }) }
        : undefined,
    contactEmail: settings.contact.coursesEmail,
    manage: { token: "", canCancel: (s === "submitted" || s === "confirmed") && r.ses.startsAt.getTime() > Date.now() + 2 * 3600_000, canReportPayment: false, paymentReported: null },
  };
}

