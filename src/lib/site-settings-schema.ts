import { z } from "zod";

/**
 * Editable institution-wide settings (stored as JSON in site_settings.key = 'site').
 * Shared by the admin form, the public site and the seed.
 */
const url = z.string().trim().url().or(z.literal(""));

export const siteSettingsSchema = z.object({
  contact: z.object({
    generalEmail: z.string().trim().email(),
    coursesEmail: z.string().trim().email(),
    programmeEmail: z.string().trim().email(),
    phone: z.string().trim().min(5).max(40),
    emergencyPhone: z.string().trim().max(40),
    whatsapp: z
      .string()
      .trim()
      .regex(/^\d{8,15}$/, "Digits only, in international format (e.g. 923104247822)")
      .or(z.literal("")),
    address: z.string().trim().min(5).max(200),
    mapUrl: url,
  }),
  hours: z.object({
    opens: z.string().regex(/^\d{2}:\d{2}$/),
    closes: z.string().regex(/^\d{2}:\d{2}$/),
    /** ISO weekdays (1 = Monday). */
    days: z.array(z.number().int().min(1).max(7)).min(1),
  }),
  social: z.object({
    facebook: url,
    instagram: url,
    youtube: url,
    linkedin: url,
    tiktok: url,
    x: url,
  }),
  announcement: z.object({
    enabled: z.boolean(),
    textEn: z.string().trim().max(160),
    textDe: z.string().trim().max(160),
    /** A path on this site ("/courses") or an https:// address, never javascript:, data: or protocol-relative. */
    href: z
      .string()
      .trim()
      .max(300)
      .refine((v) => v === "" || (/^\/(?!\/)[\w\-./?=&#%]*$/.test(v) && !v.includes("..")) || /^https:\/\/[^\s"'<>]+$/.test(v), "Use a page path like /courses or a full https:// address."),
  }),
  goethe: z.object({
    examPortalUrl: z.string().trim().url(),
    karachiPhone: z.string().trim().max(60),
  }),
  enrollment: z.object({
    /** Hours an applicant has to pay before the reserved seat is released. */
    paymentWindowHours: z.number().int().min(1).max(240),
    paymentInstructionsEn: z.string().trim().max(2000),
    paymentInstructionsDe: z.string().trim().max(2000),
    acceptingApplications: z.boolean(),
  }),
  /** Automatic workflows run by the maintenance job (every 10 minutes). Defaults keep older saved settings valid. */
  automation: z
    .object({
      /** Send payment instructions immediately when an application reserves a seat (skip manual review). */
      autoRequestPayment: z.boolean().default(false),
      /** When a seat frees up, offer it to the next person on the waitlist automatically. */
      autoPromoteWaitlist: z.boolean().default(true),
      /** Remind applicants halfway through the payment window. */
      paymentReminders: z.boolean().default(true),
      /** Remind registered guests the day before an event / placement test, and students 3 days before the course. */
      reminders: z.boolean().default(true),
      /** Close batches and test sessions when registration ends and mark finished courses completed. */
      autoClose: z.boolean().default(true),
      /** Morning email to the staff inbox with what needs attention today. */
      staffDigest: z.boolean().default(true),
      /** Uploaded CNIC/photo documents are deleted this many days after an application is closed. */
      documentRetentionDays: z.number().int().min(30).max(3650).default(365),
    })
    .prefault({}),
});

export type SiteSettings = z.infer<typeof siteSettingsSchema>;

export const defaultSiteSettings: SiteSettings = {
  contact: {
    generalEmail: "info@schimmel.com.pk",
    coursesEmail: "courses@schimmel.com.pk",
    programmeEmail: "programme@schimmel.com.pk",
    phone: "+92 42 111 150 111",
    emergencyPhone: "+92 310 4247822",
    whatsapp: "923104247822",
    address: "155 Scotch Corner, Street 3, Upper Mall, Lahore 54000, Pakistan",
    mapUrl: "https://maps.google.com/?q=Annemarie-Schimmel-Haus+Upper+Mall+Lahore",
  },
  hours: { opens: "09:00", closes: "16:30", days: [1, 2, 3, 4, 5] },
  social: {
    facebook: "https://www.facebook.com/schimmel.lhr",
    instagram: "https://www.instagram.com/germancentrelhr",
    youtube: "https://www.youtube.com/@germancentrelhr",
    linkedin: "https://www.linkedin.com/company/annemarie-schimmel-haus",
    tiktok: "https://www.tiktok.com/@annemarieschimmelhaus",
    x: "https://x.com/GermanCenterLHR",
  },
  announcement: {
    enabled: true,
    textEn: "Registration is open for November German courses, reserve your seat online.",
    textDe: "Die Anmeldung für die Deutschkurse im November ist geöffnet, sichern Sie sich Ihren Platz online.",
    href: "/courses",
  },
  goethe: {
    examPortalUrl: "https://www.goethe.de/ins/pk/en/spr/prf.html",
    karachiPhone: "+92 21 35141033-6",
  },
  enrollment: {
    paymentWindowHours: 24,
    paymentInstructionsEn:
      "Our course office reviews every application on working days. You will receive an email with the bank details and your amount due. Please pay within 24 hours of receiving it and reply with your transaction reference to confirm your seat.",
    paymentInstructionsDe:
      "Unser Kursbüro prüft jede Anmeldung an Werktagen. Sie erhalten eine E-Mail mit der Bankverbindung und dem fälligen Betrag. Bitte zahlen Sie innerhalb von 24 Stunden und antworten Sie mit Ihrer Transaktionsnummer, um Ihren Platz zu bestätigen.",
    acceptingApplications: true,
  },
  automation: {
    autoRequestPayment: false,
    autoPromoteWaitlist: true,
    paymentReminders: true,
    reminders: true,
    autoClose: true,
    staffDigest: true,
    documentRetentionDays: 365,
  },
};
