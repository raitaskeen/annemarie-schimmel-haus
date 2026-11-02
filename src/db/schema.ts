/**
 * Database schema (PostgreSQL 17, Drizzle ORM).
 *
 * Conventions
 * - Column names are camelCase in TypeScript and snake_case in SQL (`casing: "snake_case"`).
 * - Bilingual public content is stored as `*En` / `*De` pairs; German falls back to English.
 * - Money is stored as whole PKR integers.
 * - Every public submission carries a client idempotency key (unique) so double
 *   clicks and retries never create duplicates.
 */
import { sql } from "drizzle-orm";
import {
  bigserial,
  boolean,
  check,
  customType,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  time,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

/* ------------------------------------------------------------------ helpers */

const bytea = customType<{ data: Buffer; driverData: Buffer }>({
  dataType() {
    return "bytea";
  },
});

const timestamps = {
  createdAt: timestamp({ withTimezone: true, mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

const tstz = () => timestamp({ withTimezone: true, mode: "date" });

/* -------------------------------------------------------------------- enums */

export const userRole = pgEnum("user_role", ["admin", "editor", "support", "teacher", "student"]);
export const userStatus = pgEnum("user_status", ["active", "invited", "disabled"]);
export const authTokenPurpose = pgEnum("auth_token_purpose", ["invite", "password_reset"]);

export const cefrLevel = pgEnum("cefr_level", ["A1", "A2", "B1", "B2", "C1", "C2"]);
export const deliveryMode = pgEnum("delivery_mode", ["on_campus", "online"]);
export const offeringTrack = pgEnum("offering_track", ["standard", "intensive", "superintensive", "weekend"]);
export const offeringStatus = pgEnum("offering_status", ["draft", "open", "closed", "cancelled", "completed"]);
export const enrollmentStatus = pgEnum("enrollment_status", [
  "submitted",
  "payment_pending",
  "confirmed",
  "waitlisted",
  "rejected",
  "cancelled",
  "completed",
]);
export const educationLevel = pgEnum("education_level", [
  "matric",
  "intermediate",
  "bachelor",
  "master",
  "doctorate",
  "other",
]);
export const priorLearning = pgEnum("prior_learning", [
  "none",
  "ash_student",
  "goethe_certificate",
  "placement_test",
  "other",
]);

export const eventCategory = pgEnum("event_category", [
  "cultural",
  "language",
  "info_session",
  "exhibition",
  "music",
  "film",
  "literature",
  "workshop",
  "community",
]);
export const eventStatus = pgEnum("event_status", ["draft", "published", "cancelled"]);
export const registrationMode = pgEnum("registration_mode", ["internal", "external", "none"]);
export const eventRegistrationStatus = pgEnum("event_registration_status", [
  "registered",
  "waitlisted",
  "cancelled",
  "attended",
]);

export const placementSessionStatus = pgEnum("placement_session_status", [
  "draft",
  "open",
  "closed",
  "completed",
  "cancelled",
]);
export const placementStatus = pgEnum("placement_status", [
  "submitted",
  "confirmed",
  "attended",
  "no_show",
  "completed",
  "cancelled",
]);

export const postCategory = pgEnum("post_category", ["news", "announcement", "scholarship", "job", "press"]);
export const publishStatus = pgEnum("publish_status", ["draft", "published"]);

export const galleryCategory = pgEnum("gallery_category", [
  "courses",
  "campus",
  "exhibitions",
  "events",
  "community",
  "workshops",
  "performing_arts",
  "visitors",
]);

export const contactTopic = pgEnum("contact_topic", [
  "courses",
  "placement",
  "exams",
  "events",
  "partnership",
  "press",
  "other",
]);
export const messageStatus = pgEnum("message_status", ["new", "in_progress", "answered", "closed"]);
export const subscriberStatus = pgEnum("subscriber_status", ["pending", "active", "unsubscribed"]);

export const notificationChannel = pgEnum("notification_channel", ["email", "whatsapp"]);
export const notificationStatus = pgEnum("notification_status", ["queued", "sending", "sent", "failed", "skipped"]);

/* -------------------------------------------------------------- identity */

export const users = pgTable(
  "users",
  {
    id: uuid().primaryKey().defaultRandom(),
    email: text().notNull(),
    name: text().notNull(),
    role: userRole().notNull().default("editor"),
    status: userStatus().notNull().default("active"),
    passwordHash: text(),
    /** AES-256-GCM encrypted TOTP secret (see lib/auth/crypto). */
    totpSecret: text(),
    totpEnabledAt: tstz(),
    failedLoginCount: integer().notNull().default(0),
    lockedUntil: tstz(),
    lastLoginAt: tstz(),
    passwordChangedAt: tstz(),
    ...timestamps,
  },
  (t) => [uniqueIndex("users_email_key").on(sql`lower(${t.email})`)],
);

export const sessions = pgTable(
  "sessions",
  {
    /** SHA-256 of the session token; the token itself only lives in the cookie. */
    id: text().primaryKey(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /** Password verified but the second factor is still outstanding. */
    mfaPending: boolean().notNull().default(false),
    ip: text(),
    userAgent: text(),
    createdAt: tstz().notNull().defaultNow(),
    lastSeenAt: tstz().notNull().defaultNow(),
    expiresAt: tstz().notNull(),
  },
  (t) => [index("sessions_user_idx").on(t.userId)],
);

export const authTokens = pgTable(
  "auth_tokens",
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    purpose: authTokenPurpose().notNull(),
    tokenHash: text().notNull().unique(),
    expiresAt: tstz().notNull(),
    usedAt: tstz(),
    createdAt: tstz().notNull().defaultNow(),
  },
  (t) => [index("auth_tokens_user_idx").on(t.userId)],
);

/* --------------------------------------------------------------- courses */

export const courses = pgTable(
  "courses",
  {
    id: uuid().primaryKey().defaultRandom(),
    slug: text().notNull().unique(),
    /** Display code, e.g. "B2.1". */
    code: text().notNull().unique(),
    level: cefrLevel().notNull(),
    titleEn: text().notNull(),
    titleDe: text().notNull().default(""),
    taglineEn: text().notNull().default(""),
    taglineDe: text().notNull().default(""),
    summaryEn: text().notNull().default(""),
    summaryDe: text().notNull().default(""),
    descriptionEn: text().notNull().default(""),
    descriptionDe: text().notNull().default(""),
    outcomesEn: jsonb().$type<string[]>().notNull().default([]),
    outcomesDe: jsonb().$type<string[]>().notNull().default([]),
    /** Teaching units (45 min). */
    units: integer().notNull(),
    weeks: integer().notNull(),
    minutesPerDay: integer().notNull().default(150),
    feePkr: integer().notNull(),
    bookTitle: text(),
    bookFeePkr: integer(),
    /** Learners joining at this level from outside ASH need a placement test. */
    requiresPlacement: boolean().notNull().default(false),
    imagePath: text(),
    published: boolean().notNull().default(true),
    sortOrder: integer().notNull().default(0),
    ...timestamps,
  },
  (t) => [check("courses_fee_check", sql`${t.feePkr} >= 0`)],
);

export const courseOfferings = pgTable(
  "course_offerings",
  {
    id: uuid().primaryKey().defaultRandom(),
    courseId: uuid()
      .notNull()
      .references(() => courses.id, { onDelete: "restrict" }),
    code: text().notNull().unique(),
    mode: deliveryMode().notNull(),
    track: offeringTrack().notNull().default("standard"),
    startsOn: date({ mode: "string" }).notNull(),
    endsOn: date({ mode: "string" }),
    /** ISO weekdays, 1 = Monday … 7 = Sunday. */
    weekdays: integer().array().notNull().default(sql`'{1,2,3,4,5}'::integer[]`),
    startTime: time().notNull(),
    endTime: time().notNull(),
    capacity: integer().notNull(),
    seatsTaken: integer().notNull().default(0),
    registrationOpensAt: tstz(),
    registrationClosesAt: tstz(),
    /** Overrides the course fee for this batch when set. */
    feePkr: integer(),
    status: offeringStatus().notNull().default("draft"),
    notesEn: text().notNull().default(""),
    notesDe: text().notNull().default(""),
    ...timestamps,
  },
  (t) => [
    index("course_offerings_course_idx").on(t.courseId, t.startsOn),
    index("course_offerings_status_idx").on(t.status, t.startsOn),
    check("course_offerings_seats_check", sql`${t.seatsTaken} >= 0 AND ${t.capacity} >= 0`),
  ],
);

export const enrollments = pgTable(
  "enrollments",
  {
    id: uuid().primaryKey().defaultRandom(),
    reference: text().notNull().unique(),
    offeringId: uuid()
      .notNull()
      .references(() => courseOfferings.id, { onDelete: "restrict" }),
    status: enrollmentStatus().notNull().default("submitted"),
    /** Whether this enrollment currently holds a seat in the offering. */
    holdsSeat: boolean().notNull().default(false),
    locale: text().notNull().default("en"),
    firstName: text().notNull(),
    lastName: text().notNull(),
    guardianName: text().notNull(),
    cnic: text().notNull(),
    dateOfBirth: date({ mode: "string" }).notNull(),
    placeOfBirth: text().notNull(),
    email: text().notNull(),
    phone: text().notNull(),
    emergencyName: text().notNull(),
    emergencyPhone: text().notNull(),
    education: educationLevel().notNull(),
    occupation: text(),
    address: text().notNull(),
    city: text().notNull(),
    priorLearning: priorLearning().notNull().default("none"),
    priorDetails: text(),
    motivation: text().notNull(),
    whatsappOptIn: boolean().notNull().default(false),
    privacyConsentAt: tstz().notNull(),
    amountDuePkr: integer().notNull(),
    paymentRef: text(),
    paidAt: tstz(),
    staffNotes: text(),
    statusChangedAt: tstz().notNull().defaultNow(),
    idempotencyKey: text().notNull().unique(),
    ipHash: text(),
    userAgent: text(),
    ...timestamps,
  },
  (t) => [
    index("enrollments_offering_idx").on(t.offeringId, t.status),
    index("enrollments_status_idx").on(t.status, t.createdAt),
    index("enrollments_email_idx").on(sql`lower(${t.email})`),
    uniqueIndex("enrollments_active_cnic_key")
      .on(t.offeringId, t.cnic)
      .where(sql`${t.status} NOT IN ('cancelled', 'rejected')`),
  ],
);

/** Private uploads (identity documents, photos, certificates). Never publicly served. */
export const privateFiles = pgTable(
  "private_files",
  {
    id: uuid().primaryKey().defaultRandom(),
    ownerType: text().notNull(),
    ownerId: uuid().notNull(),
    kind: text().notNull(),
    fileName: text().notNull(),
    contentType: text().notNull(),
    size: integer().notNull(),
    sha256: text().notNull(),
    data: bytea().notNull(),
    createdAt: tstz().notNull().defaultNow(),
  },
  (t) => [index("private_files_owner_idx").on(t.ownerType, t.ownerId)],
);

/* ---------------------------------------------------------------- events */

export type AgendaItem = { time: string; titleEn: string; titleDe?: string; location?: string };
export type GuestDetail = { name: string; phone?: string | null; cnic?: string | null };

export const events = pgTable(
  "events",
  {
    id: uuid().primaryKey().defaultRandom(),
    slug: text().notNull().unique(),
    titleEn: text().notNull(),
    titleDe: text().notNull().default(""),
    summaryEn: text().notNull().default(""),
    summaryDe: text().notNull().default(""),
    bodyEn: text().notNull().default(""),
    bodyDe: text().notNull().default(""),
    category: eventCategory().notNull().default("cultural"),
    startsAt: tstz().notNull(),
    endsAt: tstz(),
    venue: text().notNull().default("Annemarie-Schimmel-Haus"),
    address: text().notNull().default("155 Scotch Corner, Street 3, Upper Mall, Lahore"),
    imagePath: text(),
    imageAlt: text(),
    /** Null means no seat limit. */
    capacity: integer(),
    seatsTaken: integer().notNull().default(0),
    registrationMode: registrationMode().notNull().default("internal"),
    externalUrl: text(),
    registrationClosesAt: tstz(),
    isFree: boolean().notNull().default(true),
    feePkr: integer(),
    requiresCnic: boolean().notNull().default(false),
    maxGuests: integer().notNull().default(0),
    agenda: jsonb().$type<AgendaItem[]>().notNull().default([]),
    collaborators: jsonb().$type<string[]>().notNull().default([]),
    status: eventStatus().notNull().default("draft"),
    featured: boolean().notNull().default(false),
    ...timestamps,
  },
  (t) => [
    index("events_status_starts_idx").on(t.status, t.startsAt),
    check("events_seats_check", sql`${t.seatsTaken} >= 0`),
  ],
);

export const eventRegistrations = pgTable(
  "event_registrations",
  {
    id: uuid().primaryKey().defaultRandom(),
    reference: text().notNull().unique(),
    eventId: uuid()
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    status: eventRegistrationStatus().notNull().default("registered"),
    locale: text().notNull().default("en"),
    name: text().notNull(),
    email: text().notNull(),
    phone: text().notNull(),
    cnic: text(),
    organization: text(),
    guests: integer().notNull().default(0),
    /** Who the accompanying guests are; `guests` is always its length for new registrations. */
    guestDetails: jsonb().$type<GuestDetail[]>().notNull().default([]),
    whatsappOptIn: boolean().notNull().default(false),
    privacyConsentAt: tstz().notNull(),
    checkedInAt: tstz(),
    idempotencyKey: text().notNull().unique(),
    ipHash: text(),
    ...timestamps,
  },
  (t) => [
    index("event_registrations_event_idx").on(t.eventId, t.status),
    uniqueIndex("event_registrations_active_email_key")
      .on(t.eventId, sql`lower(${t.email})`)
      .where(sql`${t.status} <> 'cancelled'`),
  ],
);

/* ------------------------------------------------------- placement tests */

export const placementSessions = pgTable(
  "placement_sessions",
  {
    id: uuid().primaryKey().defaultRandom(),
    code: text().notNull().unique(),
    startsAt: tstz().notNull(),
    endsAt: tstz().notNull(),
    levels: text().array().notNull().default(sql`'{A2,B1,B2}'::text[]`),
    mode: deliveryMode().notNull().default("on_campus"),
    venue: text().notNull().default("Annemarie-Schimmel-Haus, 155 Scotch Corner, Upper Mall, Lahore"),
    feePkr: integer().notNull(),
    capacity: integer().notNull(),
    seatsTaken: integer().notNull().default(0),
    registrationDeadline: tstz().notNull(),
    status: placementSessionStatus().notNull().default("draft"),
    notesEn: text().notNull().default(""),
    notesDe: text().notNull().default(""),
    ...timestamps,
  },
  (t) => [
    index("placement_sessions_status_idx").on(t.status, t.startsAt),
    check("placement_sessions_seats_check", sql`${t.seatsTaken} >= 0 AND ${t.capacity} >= 0`),
  ],
);

export const placementApplications = pgTable(
  "placement_applications",
  {
    id: uuid().primaryKey().defaultRandom(),
    reference: text().notNull().unique(),
    sessionId: uuid()
      .notNull()
      .references(() => placementSessions.id, { onDelete: "restrict" }),
    status: placementStatus().notNull().default("submitted"),
    locale: text().notNull().default("en"),
    firstName: text().notNull(),
    lastName: text().notNull(),
    email: text().notNull(),
    phone: text().notNull(),
    cnic: text().notNull(),
    dateOfBirth: date({ mode: "string" }).notNull(),
    targetLevel: cefrLevel().notNull(),
    priorLearning: text().notNull(),
    resultLevel: text(),
    resultScore: integer(),
    resultNotes: text(),
    whatsappOptIn: boolean().notNull().default(false),
    privacyConsentAt: tstz().notNull(),
    idempotencyKey: text().notNull().unique(),
    ipHash: text(),
    ...timestamps,
  },
  (t) => [
    index("placement_applications_session_idx").on(t.sessionId, t.status),
    uniqueIndex("placement_applications_active_cnic_key")
      .on(t.sessionId, t.cnic)
      .where(sql`${t.status} <> 'cancelled'`),
  ],
);

/* ----------------------------------------------------- Goethe exam dates */

export const examDates = pgTable(
  "exam_dates",
  {
    id: uuid().primaryKey().defaultRandom(),
    levels: text().array().notNull(),
    registrationOn: date({ mode: "string" }),
    examStartsOn: date({ mode: "string" }).notNull(),
    examEndsOn: date({ mode: "string" }),
    noteEn: text().notNull().default(""),
    noteDe: text().notNull().default(""),
    published: boolean().notNull().default(true),
    ...timestamps,
  },
  (t) => [index("exam_dates_starts_idx").on(t.examStartsOn)],
);

/* ------------------------------------------------------- editorial content */

export const posts = pgTable(
  "posts",
  {
    id: uuid().primaryKey().defaultRandom(),
    slug: text().notNull().unique(),
    category: postCategory().notNull().default("news"),
    titleEn: text().notNull(),
    titleDe: text().notNull().default(""),
    excerptEn: text().notNull().default(""),
    excerptDe: text().notNull().default(""),
    bodyEn: text().notNull().default(""),
    bodyDe: text().notNull().default(""),
    imagePath: text(),
    status: publishStatus().notNull().default("draft"),
    pinned: boolean().notNull().default(false),
    publishedAt: tstz(),
    ...timestamps,
  },
  (t) => [index("posts_status_published_idx").on(t.status, t.publishedAt)],
);

export const galleryItems = pgTable(
  "gallery_items",
  {
    id: uuid().primaryKey().defaultRandom(),
    imagePath: text().notNull(),
    width: integer().notNull(),
    height: integer().notNull(),
    altEn: text().notNull(),
    altDe: text().notNull().default(""),
    captionEn: text().notNull().default(""),
    captionDe: text().notNull().default(""),
    category: galleryCategory().notNull(),
    published: boolean().notNull().default(true),
    featured: boolean().notNull().default(false),
    sortOrder: integer().notNull().default(0),
    ...timestamps,
  },
  (t) => [index("gallery_items_category_idx").on(t.category, t.sortOrder)],
);

export const partners = pgTable("partners", {
  id: uuid().primaryKey().defaultRandom(),
  slug: text().notNull().unique(),
  name: text().notNull(),
  categoryEn: text().notNull().default(""),
  categoryDe: text().notNull().default(""),
  descriptionEn: text().notNull().default(""),
  descriptionDe: text().notNull().default(""),
  url: text(),
  logoPath: text().notNull(),
  logoWidth: integer().notNull(),
  logoHeight: integer().notNull(),
  published: boolean().notNull().default(true),
  showInMarquee: boolean().notNull().default(true),
  sortOrder: integer().notNull().default(0),
  ...timestamps,
});

/** Admin-uploaded public images, served from /media/[id]. */
export const mediaAssets = pgTable("media_assets", {
  id: uuid().primaryKey().defaultRandom(),
  fileName: text().notNull(),
  contentType: text().notNull(),
  size: integer().notNull(),
  width: integer().notNull(),
  height: integer().notNull(),
  sha256: text().notNull(),
  data: bytea().notNull(),
  createdBy: uuid().references(() => users.id, { onDelete: "set null" }),
  createdAt: tstz().notNull().defaultNow(),
});

export const siteSettings = pgTable("site_settings", {
  key: text().primaryKey(),
  value: jsonb().notNull(),
  updatedBy: uuid().references(() => users.id, { onDelete: "set null" }),
  updatedAt: tstz().notNull().defaultNow(),
});

/* -------------------------------------------------------------- inbound */

export const contactMessages = pgTable(
  "contact_messages",
  {
    id: uuid().primaryKey().defaultRandom(),
    reference: text().notNull().unique(),
    name: text().notNull(),
    email: text().notNull(),
    phone: text(),
    topic: contactTopic().notNull(),
    subject: text().notNull(),
    message: text().notNull(),
    locale: text().notNull().default("en"),
    status: messageStatus().notNull().default("new"),
    staffNotes: text(),
    idempotencyKey: text().notNull().unique(),
    ipHash: text(),
    ...timestamps,
  },
  (t) => [index("contact_messages_status_idx").on(t.status, t.createdAt)],
);

export const newsletterSubscribers = pgTable(
  "newsletter_subscribers",
  {
    id: uuid().primaryKey().defaultRandom(),
    email: text().notNull(),
    locale: text().notNull().default("en"),
    status: subscriberStatus().notNull().default("pending"),
    tokenHash: text(),
    consentAt: tstz().notNull(),
    confirmedAt: tstz(),
    unsubscribedAt: tstz(),
    createdAt: tstz().notNull().defaultNow(),
  },
  (t) => [uniqueIndex("newsletter_email_key").on(sql`lower(${t.email})`)],
);

/* ------------------------------------------------------------ messaging */

export const notifications = pgTable(
  "notifications",
  {
    id: uuid().primaryKey().defaultRandom(),
    channel: notificationChannel().notNull(),
    recipient: text().notNull(),
    template: text().notNull(),
    locale: text().notNull().default("en"),
    subject: text(),
    payload: jsonb().$type<Record<string, unknown>>().notNull().default({}),
    status: notificationStatus().notNull().default("queued"),
    attempts: integer().notNull().default(0),
    lastError: text(),
    providerMessageId: text(),
    nextAttemptAt: tstz().notNull().defaultNow(),
    sentAt: tstz(),
    relatedType: text(),
    relatedId: uuid(),
    ...timestamps,
  },
  (t) => [
    index("notifications_queue_idx").on(t.status, t.nextAttemptAt),
    index("notifications_related_idx").on(t.relatedType, t.relatedId),
    index("notifications_provider_idx").on(t.providerMessageId),
  ],
);

export const whatsappMessages = pgTable(
  "whatsapp_messages",
  {
    id: uuid().primaryKey().defaultRandom(),
    direction: text().notNull(),
    waId: text().notNull(),
    wamid: text().unique(),
    type: text().notNull(),
    body: text(),
    status: text(),
    createdAt: tstz().notNull().defaultNow(),
  },
  (t) => [index("whatsapp_messages_wa_idx").on(t.waId, t.createdAt)],
);

/* ---------------------------------------------------------- operations */

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: bigserial({ mode: "number" }).primaryKey(),
    actorId: uuid().references(() => users.id, { onDelete: "set null" }),
    actorEmail: text(),
    action: text().notNull(),
    entityType: text().notNull(),
    entityId: text(),
    summary: text().notNull(),
    changes: jsonb().$type<Record<string, unknown>>(),
    ip: text(),
    userAgent: text(),
    createdAt: tstz().notNull().defaultNow(),
  },
  (t) => [
    index("audit_logs_created_idx").on(t.createdAt),
    index("audit_logs_entity_idx").on(t.entityType, t.entityId),
  ],
);

export const rateLimits = pgTable("rate_limits", {
  key: text().primaryKey(),
  windowStart: tstz().notNull(),
  count: integer().notNull(),
});

/* ---------------------------------------------------------------- types */

export type User = typeof users.$inferSelect;
export type Course = typeof courses.$inferSelect;
export type CourseOffering = typeof courseOfferings.$inferSelect;
export type Enrollment = typeof enrollments.$inferSelect;
export type Event = typeof events.$inferSelect;
export type EventRegistration = typeof eventRegistrations.$inferSelect;
export type PlacementSession = typeof placementSessions.$inferSelect;
export type PlacementApplication = typeof placementApplications.$inferSelect;
export type ExamDate = typeof examDates.$inferSelect;
export type Post = typeof posts.$inferSelect;
export type GalleryItem = typeof galleryItems.$inferSelect;
export type Partner = typeof partners.$inferSelect;
export type ContactMessage = typeof contactMessages.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
export type AuditLog = typeof auditLogs.$inferSelect;
export type UserRole = (typeof userRole.enumValues)[number];
