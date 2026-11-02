import { z } from "zod";
import { cleanText, normalizeCnic, normalizePhone, referencePattern } from "@/lib/validators";

/**
 * Public form schemas, shared by the browser (react-hook-form) and the server
 * actions, so both validate identically. Error messages are dictionary keys
 * (see i18n/common.ts → form.errors) and are translated in the UI.
 */
export type ErrorKey = "required" | "name" | "email" | "phone" | "samePhone" | "cnic" | "tooShort" | "tooLong" | "date" | "age" | "consent";

const text = (min: number, max: number) =>
  z
    .string({ error: "required" })
    .transform(cleanText)
    .pipe(z.string().min(1, "required").min(min, "tooShort").max(max, "tooLong"));

const optionalText = (max: number) =>
  z
    .string()
    .optional()
    .transform((v) => (v ? cleanText(v) : ""))
    .pipe(z.string().max(max, "tooLong"));

const name = text(2, 80).refine((v) => /^[\p{L}\p{M}][\p{L}\p{M}' .-]*$/u.test(v), "name");

export const emailField = z
  .string({ error: "required" })
  .trim()
  .toLowerCase()
  .min(1, "required")
  .max(160, "tooLong")
  .pipe(z.email("email"));

export const phoneField = z
  .string({ error: "required" })
  .min(1, "required")
  .transform((v, ctx) => {
    const n = normalizePhone(v);
    if (!n) {
      ctx.addIssue({ code: "custom", message: "phone" });
      return z.NEVER;
    }
    return n;
  });

export const cnicField = z
  .string({ error: "required" })
  .min(1, "required")
  .transform((v, ctx) => {
    const n = normalizeCnic(v);
    if (!n) {
      ctx.addIssue({ code: "custom", message: "cnic" });
      return z.NEVER;
    }
    return n;
  });

const birthDate = (minAge: number) =>
  z
    .string({ error: "required" })
    .regex(/^\d{4}-\d{2}-\d{2}$/, "date")
    .refine((v) => !Number.isNaN(Date.parse(v)), "date")
    .refine((v) => {
      const d = new Date(v);
      const now = new Date();
      let age = now.getFullYear() - d.getFullYear();
      if (now.getMonth() < d.getMonth() || (now.getMonth() === d.getMonth() && now.getDate() < d.getDate())) age--;
      return age >= minAge && age <= 100;
    }, "age");

const consent = z.literal(true, { error: "consent" });
const bool = z.boolean().default(false);

/** Anti-abuse fields carried by every public form. */
export const guardFields = {
  idempotencyKey: z.string().uuid(),
  humanToken: z.string().min(10).max(400),
  humanAnswer: z.string().max(6),
  /** Honeypot, invisible to people, must stay empty. */
  website: z.string().max(0).optional().default(""),
};

/* ----------------------------------------------------------- enrollment */

export const enrollmentSteps = {
  personal: ["firstName", "lastName", "guardianName", "cnic", "dateOfBirth", "placeOfBirth"],
  contact: ["email", "phone", "emergencyName", "emergencyPhone", "address", "city"],
  background: ["education", "occupation", "priorLearning", "priorDetails", "motivation"],
} as const;

export const enrollmentSchema = z
  .object({
    offeringId: z.string().uuid(),
    firstName: name,
    lastName: name,
    guardianName: name,
    cnic: cnicField,
    dateOfBirth: birthDate(14),
    placeOfBirth: text(2, 80),
    email: emailField,
    phone: phoneField,
    emergencyName: name,
    emergencyPhone: phoneField,
    address: text(10, 300),
    city: text(2, 80),
    education: z.enum(["matric", "intermediate", "bachelor", "master", "doctorate", "other"], { error: "required" }),
    occupation: optionalText(120),
    priorLearning: z.enum(["none", "ash_student", "goethe_certificate", "placement_test", "other"], { error: "required" }),
    priorDetails: optionalText(500),
    motivation: text(20, 1500),
    whatsappOptIn: bool,
    privacyConsent: consent,
    ...guardFields,
  })
  .superRefine((v, ctx) => {
    if (v.priorLearning !== "none" && v.priorLearning !== "ash_student" && v.priorDetails.length < 3) {
      ctx.addIssue({ code: "custom", path: ["priorDetails"], message: "required" });
    }
    if (v.emergencyPhone === v.phone) {
      ctx.addIssue({ code: "custom", path: ["emergencyPhone"], message: "samePhone" });
    }
  });

export type EnrollmentInput = z.input<typeof enrollmentSchema>;
export type EnrollmentData = z.output<typeof enrollmentSchema>;

export const DOCUMENTS = {
  photo: { required: true, accept: ["image/jpeg", "image/png", "image/webp"] },
  cnicFront: { required: true, accept: ["image/jpeg", "image/png", "image/webp", "application/pdf"] },
  cnicBack: { required: true, accept: ["image/jpeg", "image/png", "image/webp", "application/pdf"] },
  degree: { required: false, accept: ["image/jpeg", "image/png", "image/webp", "application/pdf"] },
} as const;
export type DocumentKind = keyof typeof DOCUMENTS;
export const MAX_DOCUMENT_BYTES = 5 * 1024 * 1024;

/* ------------------------------------------------------ event registration */

/** An accompanying guest: a name, and optionally a phone; the CNIC is checked against the event on the server. */
const eventGuestSchema = z.object({
  name: text(3, 120),
  phone: z
    .string()
    .optional()
    .transform((v, ctx) => {
      if (!v?.trim()) return null;
      const n = normalizePhone(v);
      if (!n) {
        ctx.addIssue({ code: "custom", message: "phone" });
        return z.NEVER;
      }
      return n;
    }),
  cnic: z
    .string()
    .optional()
    .transform((v, ctx) => {
      if (!v) return null;
      const n = normalizeCnic(v);
      if (!n) {
        ctx.addIssue({ code: "custom", message: "cnic" });
        return z.NEVER;
      }
      return n;
    }),
});

export const eventRegistrationSchema = z.object({
  eventId: z.string().uuid(),
  name: text(3, 120),
  email: emailField,
  phone: phoneField,
  cnic: z
    .string()
    .optional()
    .transform((v, ctx) => {
      if (!v) return null;
      const n = normalizeCnic(v);
      if (!n) {
        ctx.addIssue({ code: "custom", message: "cnic" });
        return z.NEVER;
      }
      return n;
    }),
  organization: optionalText(120),
  guestDetails: z.array(eventGuestSchema).max(5).default([]),
  whatsappOptIn: bool,
  privacyConsent: consent,
  ...guardFields,
});
export type EventRegistrationInput = z.input<typeof eventRegistrationSchema>;

/* -------------------------------------------------------- placement test */

export const placementSchema = z.object({
  sessionId: z.string().uuid(),
  firstName: name,
  lastName: name,
  email: emailField,
  phone: phoneField,
  cnic: cnicField,
  dateOfBirth: birthDate(14),
  targetLevel: z.enum(["A2", "B1", "B2", "C1"], { error: "required" }),
  priorLearning: text(10, 600),
  whatsappOptIn: bool,
  privacyConsent: consent,
  ...guardFields,
});
export type PlacementInput = z.input<typeof placementSchema>;

/* ------------------------------------------------------------- contact */

export const contactSchema = z.object({
  name: text(2, 120),
  email: emailField,
  phone: z
    .string()
    .optional()
    .transform((v, ctx) => {
      if (!v?.trim()) return null;
      const n = normalizePhone(v);
      if (!n) {
        ctx.addIssue({ code: "custom", message: "phone" });
        return z.NEVER;
      }
      return n;
    }),
  topic: z.enum(["courses", "placement", "exams", "events", "partnership", "press", "other"], { error: "required" }),
  subject: text(3, 150),
  message: text(15, 3000),
  privacyConsent: consent,
  ...guardFields,
});
export type ContactInput = z.input<typeof contactSchema>;

/* ---------------------------------------------------------- newsletter */

export const newsletterSchema = z.object({
  email: emailField,
  consent: consent,
  website: z.string().max(0).optional().default(""),
});

/* ----------------------------------------------------------- tracking */

export const trackSchema = z.object({
  reference: z
    .string({ error: "required" })
    .trim()
    .toUpperCase()
    .transform((v) => v.replace(/\s+/g, "").replace(/^ASH(?=[EVPM])/, "ASH-").replace(/^(ASH-[EVPM])(?=[^-])/, "$1-"))
    .pipe(z.string().regex(referencePattern, "required")),
  phone: phoneField,
  humanToken: guardFields.humanToken,
  humanAnswer: guardFields.humanAnswer,
  website: guardFields.website,
});
export type TrackInput = z.input<typeof trackSchema>;
