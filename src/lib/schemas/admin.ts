import { z } from "zod";

/** Admin form schemas. Inputs arrive as strings from FormData. */
const str = (max: number) => z.string().trim().max(max, `Maximum ${max} characters.`);
const req = (max: number, label = "This field") => z.string().trim().min(1, `${label} is required.`).max(max, `Maximum ${max} characters.`);
const bool = z.enum(["true", "false"]).transform((v) => v === "true");
const int = (min: number, max: number) => z.coerce.number({ error: "Enter a number." }).int("Whole numbers only.").min(min, `Minimum ${min}.`).max(max, `Maximum ${max}.`);
const optInt = (min: number, max: number) =>
  z
    .string()
    .trim()
    .transform((v) => (v === "" ? null : Number(v)))
    .refine((v) => v === null || (Number.isInteger(v) && v >= min && v <= max), `Whole number between ${min} and ${max}.`);
const slug = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Lowercase letters, numbers and dashes only.")
  .max(80);
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date.");
const optDate = z
  .string()
  .trim()
  .refine((v) => v === "" || /^\d{4}-\d{2}-\d{2}$/.test(v), "Pick a date.")
  .transform((v) => v || null);
const time = z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, "Pick a time.");
const dateTime = z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/, "Pick a date and time.");
const optDateTime = z
  .string()
  .trim()
  .refine((v) => v === "" || /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(v), "Pick a date and time.")
  .transform((v) => v || null);
/** Site-relative image path; no traversal, no external hosts. */
export const isSafeImagePath = (v: string) => /^\/(images|media|brand)\/[\w\-./]+$/.test(v) && !v.includes("..") && !v.includes("//");
const imagePath = z
  .string()
  .trim()
  .refine((v) => v === "" || isSafeImagePath(v), "Choose an image from the library.")
  .transform((v) => v || null);
const lines = z
  .string()
  .optional()
  .default("")
  .transform((v) =>
    v
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean)
      .slice(0, 12),
  );
const url = z
  .string()
  .trim()
  .refine((v) => v === "" || /^https:\/\/[^\s]+$/.test(v), "Use a full https:// address.")
  .transform((v) => v || null);

export const courseSchema = z.object({
  code: req(12, "Code"),
  slug,
  level: z.enum(["A1", "A2", "B1", "B2", "C1", "C2"]),
  titleEn: req(120, "English title"),
  titleDe: str(120),
  taglineEn: str(160),
  taglineDe: str(160),
  summaryEn: str(600),
  summaryDe: str(600),
  descriptionEn: str(8000),
  descriptionDe: str(8000),
  outcomesEn: lines,
  outcomesDe: lines,
  units: int(1, 1000),
  weeks: int(1, 104),
  minutesPerDay: int(15, 600),
  feePkr: int(0, 10_000_000),
  bookTitle: str(120).transform((v) => v || null),
  bookFeePkr: optInt(0, 1_000_000),
  requiresPlacement: bool,
  imagePath,
  published: bool,
  sortOrder: int(0, 999),
});

export const offeringSchema = z
  .object({
    courseId: z.string().uuid("Choose a course."),
    code: req(40, "Code").transform((v) => v.toUpperCase()),
    mode: z.enum(["on_campus", "online"]),
    track: z.enum(["standard", "intensive", "superintensive", "weekend"]),
    startsOn: date,
    endsOn: optDate,
    weekdays: z
      .string()
      .transform((v) => v.split(",").map(Number).filter((n) => n >= 1 && n <= 7))
      .refine((v) => v.length > 0, "Choose at least one weekday."),
    startTime: time,
    endTime: time,
    capacity: int(1, 500),
    feePkr: optInt(0, 10_000_000),
    registrationOpensAt: optDateTime,
    registrationClosesAt: optDateTime,
    status: z.enum(["draft", "open", "closed", "cancelled", "completed"]),
    notesEn: str(500),
    notesDe: str(500),
  })
  .refine((v) => v.endTime > v.startTime, { path: ["endTime"], message: "End time must be after the start time." })
  .refine((v) => !v.endsOn || v.endsOn >= v.startsOn, { path: ["endsOn"], message: "End date must be after the start date." });

export const eventSchema = z
  .object({
    slug,
    titleEn: req(160, "English title"),
    titleDe: str(160),
    summaryEn: str(400),
    summaryDe: str(400),
    bodyEn: str(10000),
    bodyDe: str(10000),
    category: z.enum(["cultural", "language", "info_session", "exhibition", "music", "film", "literature", "workshop", "community"]),
    startsAt: dateTime,
    endsAt: optDateTime,
    venue: req(160, "Venue"),
    address: req(200, "Address"),
    imagePath,
    imageAlt: str(240).transform((v) => v || null),
    capacity: optInt(1, 10000),
    registrationMode: z.enum(["internal", "external", "none"]),
    externalUrl: url,
    registrationClosesAt: optDateTime,
    isFree: bool,
    feePkr: optInt(0, 1_000_000),
    requiresCnic: bool,
    maxGuests: int(0, 5),
    agenda: z
      .string()
      .optional()
      .default("")
      .transform((v) =>
        v
          .split(/\r?\n/)
          .map((line) => line.trim())
          .filter(Boolean)
          .map((line) => {
            const [time, titleEn = "", titleDe = "", location = ""] = line.split("|").map((s) => s.trim());
            return { time, titleEn, ...(titleDe ? { titleDe } : {}), ...(location ? { location } : {}) };
          })
          .filter((a) => a.time && a.titleEn)
          .slice(0, 30),
      ),
    collaborators: z
      .string()
      .optional()
      .default("")
      .transform((v) =>
        v
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
          .slice(0, 10),
      ),
    status: z.enum(["draft", "published", "cancelled"]),
    featured: bool,
  })
  .refine((v) => v.registrationMode !== "external" || !!v.externalUrl, { path: ["externalUrl"], message: "Add the registration link." });

export const placementSessionSchema = z
  .object({
    code: req(40, "Code").transform((v) => v.toUpperCase()),
    startsAt: dateTime,
    endsAt: dateTime,
    levels: z
      .string()
      .transform((v) => v.split(",").filter((l) => ["A2", "B1", "B2", "C1"].includes(l)))
      .refine((v) => v.length > 0, "Choose at least one level."),
    mode: z.enum(["on_campus", "online"]),
    venue: req(200, "Venue"),
    feePkr: int(0, 100_000),
    capacity: int(1, 1000),
    registrationDeadline: dateTime,
    status: z.enum(["draft", "open", "closed", "completed", "cancelled"]),
    notesEn: str(1000),
    notesDe: str(1000),
  })
  .refine((v) => v.endsAt > v.startsAt, { path: ["endsAt"], message: "End must be after the start." });

export const examDateSchema = z.object({
  levels: z
    .string()
    .transform((v) => v.split(",").filter((l) => ["A1", "A2", "B1", "B2", "C1", "C2"].includes(l)))
    .refine((v) => v.length > 0, "Choose at least one level."),
  registrationOn: optDate,
  examStartsOn: date,
  examEndsOn: optDate,
  noteEn: str(300),
  noteDe: str(300),
  published: bool,
});

export const postSchema = z.object({
  slug,
  category: z.enum(["news", "announcement", "scholarship", "job", "press"]),
  titleEn: req(200, "English title"),
  titleDe: str(200),
  excerptEn: str(400),
  excerptDe: str(400),
  bodyEn: str(20000),
  bodyDe: str(20000),
  imagePath,
  status: z.enum(["draft", "published"]),
  pinned: bool,
  publishedAt: optDateTime,
});

export const partnerSchema = z.object({
  slug,
  name: req(120, "Name"),
  categoryEn: str(80),
  categoryDe: str(80),
  descriptionEn: str(600),
  descriptionDe: str(600),
  url,
  logoPath: z.string().trim().refine(isSafeImagePath, "Choose or upload a logo."),
  published: bool,
  showInMarquee: bool,
  sortOrder: int(0, 999),
});

export const galleryItemSchema = z.object({
  altEn: req(300, "Description (alt text)"),
  altDe: str(300),
  captionEn: str(300),
  captionDe: str(300),
  category: z.enum(["courses", "campus", "exhibitions", "events", "community", "workshops", "performing_arts", "visitors"]),
  published: bool,
  featured: bool,
  sortOrder: int(0, 9999),
});

export const userInviteSchema = z.object({
  name: req(120, "Name"),
  email: z.string().trim().toLowerCase().email("Enter a valid email."),
  role: z.enum(["admin", "editor", "support"]),
});

export const userUpdateSchema = z.object({
  name: req(120, "Name"),
  role: z.enum(["admin", "editor", "support", "teacher", "student"]),
  status: z.enum(["active", "invited", "disabled"]),
});

export const helpers = { bool, int, optInt, str, req };
