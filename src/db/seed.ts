/**
 * Seeds a fresh database with the institute's catalogue, events, gallery,
 * partners and settings, plus synthetic sample submissions (example.com
 * addresses, fictitious CNICs) so the admin dashboard has realistic data.
 *
 * Idempotent: content is only seeded when the courses table is empty. The
 * first administrator is created from SEED_ADMIN_* when no admin exists.
 * Never run with `force` against production, it truncates content tables.
 */
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { Client } from "pg";
import { count, eq, sql } from "drizzle-orm";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import * as s from "./schema";
import { seedCourses, seedOfferings } from "./seed-data/courses";
import {
  samplePeople,
  seedEvents,
  seedExamDates,
  seedPartners,
  seedPlacementSessions,
  seedPosts,
} from "./seed-data/content";
import { defaultSiteSettings } from "../lib/site-settings-schema";
import { generatePassword, hashPassword } from "../lib/auth/password";
import { newReference } from "../lib/reference";

type GalleryJson = {
  file: string;
  width: number;
  height: number;
  category: (typeof s.galleryCategory.enumValues)[number];
  altEn: string;
  altDe: string;
  captionEn: string;
  captionDe: string;
}[];

const log = (m: string) => console.log(`\x1b[32m[seed]\x1b[0m ${m}`);

/** Deterministic pseudo-random generator so sample data is stable between runs. */
function rng(seed: number) {
  let x = seed >>> 0;
  return () => {
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    return ((x >>> 0) % 1_000_000) / 1_000_000;
  };
}

function addDays(isoDate: string, days: number) {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

const hash = (v: string) => createHash("sha256").update(v).digest("hex");

export async function seed({ force = false }: { force?: boolean } = {}) {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  if (force && process.env.NODE_ENV === "production") throw new Error("Refusing to force-seed in production.");

  const client = new Client({ connectionString: url });
  await client.connect();
  const db = drizzle({ client, schema: s, casing: "snake_case" });

  try {
    await ensureAdmin(db);

    if (force) {
      log("Truncating content and submission tables …");
      await db.execute(sql`TRUNCATE TABLE
        enrollments, private_files, course_offerings, courses,
        event_registrations, events, placement_applications, placement_sessions,
        exam_dates, posts, gallery_items, partners, media_assets, site_settings,
        contact_messages, newsletter_subscribers, notifications, whatsapp_messages, rate_limits
        RESTART IDENTITY CASCADE`);
    }

    const [{ value: existing }] = await db.select({ value: count() }).from(s.courses);
    if (existing > 0) {
      log("Content already present, skipping catalogue seed.");
      return;
    }

    // SEED_SAMPLES=false loads only the real catalogue (courses, events, exams, news, gallery,
    // partners) without synthetic applicants, messages or subscribers - use this for production.
    const samples = process.env.SEED_SAMPLES !== "false";
    const random = rng(20261022);
    const pick = <T,>(items: readonly T[]) => items[Math.floor(random() * items.length)];
    const now = Date.now();
    const daysAgo = (max: number) => new Date(now - Math.floor(random() * max * 86_400_000) - 3_600_000);

    await db.transaction(async (tx) => {
      /* settings */
      await tx.insert(s.siteSettings).values({ key: "site", value: defaultSiteSettings });

      /* courses + offerings */
      const courseRows = await tx
        .insert(s.courses)
        .values(seedCourses.map((c, i) => ({ ...c, sortOrder: i + 1, published: true })))
        .returning({ id: s.courses.id, code: s.courses.code, feePkr: s.courses.feePkr, weeks: s.courses.weeks });
      const courseByCode = new Map(courseRows.map((c) => [c.code, c]));

      let person = 0;
      const nextPerson = () => samplePeople[person++ % samplePeople.length];
      let cnicCounter = 1;
      const fakeCnic = () => {
        const n = String(cnicCounter++).padStart(7, "0");
        return `35202-${n}-${(cnicCounter % 9) + 1}`;
      };
      const fakePhone = (i: number) => `+92300${String(1000000 + i * 7919).slice(-7)}`;

      for (const o of seedOfferings) {
        const course = courseByCode.get(o.courseCode);
        if (!course) throw new Error(`Unknown course ${o.courseCode}`);
        const weeks = o.weeks ?? course.weeks;
        const [offering] = await tx
          .insert(s.courseOfferings)
          .values({
            courseId: course.id,
            code: o.code,
            mode: o.mode,
            track: o.track,
            startsOn: o.startsOn,
            endsOn: addDays(o.startsOn, weeks * 7 - 3),
            startTime: o.startTime,
            endTime: o.endTime,
            capacity: o.capacity,
            seatsTaken: 0,
            status: o.status,
            registrationOpensAt: o.registrationOpensAt ? new Date(o.registrationOpensAt) : null,
            registrationClosesAt: o.registrationClosesAt ? new Date(o.registrationClosesAt) : null,
            notesEn: o.track === "superintensive" ? "Superintensive: three and a quarter hours a day for faster progress." : "",
            notesDe: o.track === "superintensive" ? "Superintensiv: täglich dreieinviertel Stunden für schnellen Fortschritt." : "",
          })
          .returning();

        const holding = samples ? o.sampleSeats : 0;
        const rows: (typeof s.enrollments.$inferInsert)[] = [];
        for (let i = 0; i < (samples ? holding + 2 : 0); i++) {
          const [first, last] = nextPerson();
          const isExtra = i >= holding;
          const status: (typeof s.enrollmentStatus.enumValues)[number] = isExtra
            ? pick(["cancelled", "waitlisted"] as const)
            : o.status === "closed"
              ? "confirmed"
              : pick(["submitted", "submitted", "payment_pending", "confirmed", "confirmed"] as const);
          if (isExtra && o.status === "open" && holding === 0) continue;
          const created = daysAgo(o.status === "closed" ? 40 : 21);
          const paid = status === "confirmed";
          rows.push({
            reference: newReference("enrollment"),
            offeringId: offering.id,
            status,
            holdsSeat: ["submitted", "payment_pending", "confirmed"].includes(status),
            locale: random() > 0.85 ? "de" : "en",
            firstName: first,
            lastName: last,
            guardianName: `${pick(["Muhammad", "Abdul", "Syed", "Tariq", "Javed", "Imran"])} ${last}`,
            cnic: fakeCnic(),
            dateOfBirth: `${1988 + Math.floor(random() * 18)}-0${1 + Math.floor(random() * 9)}-1${Math.floor(random() * 9)}`,
            placeOfBirth: pick(["Lahore", "Lahore", "Faisalabad", "Gujranwala", "Sialkot", "Multan", "Islamabad"]),
            email: `${first}.${last}${person}@example.com`.toLowerCase(),
            phone: fakePhone(person),
            emergencyName: `${pick(["Samina", "Rashid", "Nadia", "Kamran", "Shazia"])} ${last}`,
            emergencyPhone: fakePhone(person + 500),
            education: pick(["intermediate", "bachelor", "bachelor", "master", "master", "doctorate"] as const),
            occupation: pick(["Student", "Software engineer", "Nurse", "Doctor", "Architect", "Teacher", null]),
            address: `House ${10 + Math.floor(random() * 300)}, Block ${pick(["A", "B", "C", "D", "E"])}, ${pick(["Johar Town", "DHA Phase 5", "Model Town", "Gulberg III", "Garden Town"])}`,
            city: "Lahore",
            priorLearning: course.code === "A1" ? "none" : pick(["ash_student", "ash_student", "goethe_certificate", "placement_test"] as const),
            motivation: pick([
              "I am preparing for a Master's degree in Germany and want to reach B2 before applying.",
              "I work as a nurse and plan to have my qualification recognised in Germany.",
              "My family lives in Berlin and I would like to speak German with them.",
              "I love German literature and film and want to read Goethe in the original.",
              "I want to apply for vocational training (Ausbildung) in mechatronics.",
            ]),
            whatsappOptIn: random() > 0.3,
            privacyConsentAt: created,
            amountDuePkr: offering.feePkr ?? course.feePkr,
            paymentRef: paid ? `TRX${Math.floor(random() * 1e9)}` : null,
            paidAt: paid ? new Date(created.getTime() + 86_400_000) : null,
            // Payment requests are recent, so the maintenance job does not release them straight away.
            statusChangedAt: status === "payment_pending" ? new Date(Date.now() - (1 + random() * 18) * 3600_000) : created,
            idempotencyKey: randomUUID(),
            createdAt: created,
            updatedAt: created,
          });
        }
        if (rows.length) await tx.insert(s.enrollments).values(rows);
        const seats = rows.filter((r) => r.holdsSeat).length;
        await tx.update(s.courseOfferings).set({ seatsTaken: seats }).where(eq(s.courseOfferings.id, offering.id));
      }
      log(`Courses: ${seedCourses.length}, batches: ${seedOfferings.length}`);

      /* events + registrations */
      for (const e of seedEvents) {
        const isPast = new Date(e.endsAt ?? e.startsAt).getTime() < now;
        const [event] = await tx
          .insert(s.events)
          .values({
            slug: e.slug,
            titleEn: e.titleEn,
            titleDe: e.titleDe,
            summaryEn: e.summaryEn,
            summaryDe: e.summaryDe,
            bodyEn: e.bodyEn,
            bodyDe: e.bodyDe,
            category: e.category,
            startsAt: new Date(e.startsAt),
            endsAt: e.endsAt ? new Date(e.endsAt) : null,
            venue: e.venue ?? "Annemarie-Schimmel-Haus",
            imagePath: e.imagePath,
            imageAlt: e.imageAlt,
            capacity: e.capacity,
            registrationMode: e.capacity === null && !e.requiresCnic ? "none" : "internal",
            registrationClosesAt: new Date(new Date(e.startsAt).getTime() - 2 * 3_600_000),
            requiresCnic: e.requiresCnic ?? false,
            maxGuests: e.maxGuests ?? 0,
            agenda: e.agenda ?? [],
            collaborators: e.collaborators ?? [],
            status: "published",
            featured: e.featured ?? false,
          })
          .returning();

        const regs: (typeof s.eventRegistrations.$inferInsert)[] = [];
        let seats = 0;
        for (let i = 0; i < (samples ? e.sampleRegistrations : 0); i++) {
          const [first, last] = samplePeople[(i * 7 + e.slug.length) % samplePeople.length];
          const guests = e.maxGuests ? Math.floor(random() * (e.maxGuests + 1)) : 0;
          const created = daysAgo(isPast ? 30 : 14);
          const status = isPast ? (random() > 0.2 ? "attended" : "registered") : random() > 0.95 ? "cancelled" : "registered";
          if (status !== "cancelled") seats += 1 + guests;
          regs.push({
            reference: newReference("event"),
            eventId: event.id,
            status,
            name: `${first} ${last}`,
            email: `${first}.${last}.${i}@example.com`.toLowerCase(),
            phone: fakePhone(1000 + i + e.slug.length * 50),
            cnic: e.requiresCnic ? fakeCnic() : null,
            organization: random() > 0.6 ? pick(["University of the Punjab", "LUMS", "FCCU", "Kinnaird College", "UET Lahore"]) : null,
            guests,
            whatsappOptIn: random() > 0.4,
            privacyConsentAt: created,
            checkedInAt: status === "attended" ? new Date(e.startsAt) : null,
            idempotencyKey: randomUUID(),
            createdAt: created,
            updatedAt: created,
          });
        }
        if (regs.length) await tx.insert(s.eventRegistrations).values(regs);
        if (seats) await tx.update(s.events).set({ seatsTaken: seats }).where(eq(s.events.id, event.id));
      }
      log(`Events: ${seedEvents.length}`);

      /* placement tests */
      for (const p of seedPlacementSessions) {
        const [session] = await tx
          .insert(s.placementSessions)
          .values({
            code: p.code,
            startsAt: new Date(p.startsAt),
            endsAt: new Date(p.endsAt),
            levels: ["A2", "B1", "B2"],
            feePkr: 1100,
            capacity: p.capacity,
            registrationDeadline: new Date(p.deadline),
            status: p.status,
            notesEn:
              "For external learners who have not studied at ASH before and do not hold a Goethe-Institut certificate of that level. Bring your original CNIC, you will not be admitted without it. The test fee is non-refundable.",
            notesDe:
              "Für externe Lernende, die noch nicht bei ASH gelernt haben und kein Goethe-Zertifikat des Niveaus besitzen. Bitte bringen Sie Ihre Original-CNIC mit, ohne sie ist keine Teilnahme möglich. Die Testgebühr wird nicht erstattet.",
          })
          .returning();
        const apps: (typeof s.placementApplications.$inferInsert)[] = [];
        for (let i = 0; i < (samples ? p.sample : 0); i++) {
          const [first, last] = samplePeople[(i * 11 + p.code.length) % samplePeople.length];
          const created = daysAgo(p.status === "closed" ? 25 : 10);
          const target = pick(["A2", "B1", "B1", "B2"] as const);
          const done = p.status === "closed";
          const status = done ? pick(["completed", "completed", "attended", "no_show"] as const) : pick(["submitted", "confirmed", "confirmed"] as const);
          apps.push({
            reference: newReference("placement"),
            sessionId: session.id,
            status,
            firstName: first,
            lastName: last,
            email: `${first}.${last}.pt${i}@example.com`.toLowerCase(),
            phone: fakePhone(3000 + i * 3 + p.sample),
            cnic: fakeCnic(),
            dateOfBirth: `199${Math.floor(random() * 10)}-0${1 + Math.floor(random() * 9)}-2${Math.floor(random() * 8)}`,
            targetLevel: target,
            priorLearning: pick([
              "Self-study with online courses for one year.",
              "A1 and A2 at a language school in Islamabad.",
              "Studied German at university as an elective.",
              "Lived in Germany for six months.",
            ]),
            resultLevel: status === "completed" ? pick(["A2", "B1", "B1", "B2"]) : null,
            resultScore: status === "completed" ? 55 + Math.floor(random() * 40) : null,
            whatsappOptIn: random() > 0.3,
            privacyConsentAt: created,
            idempotencyKey: randomUUID(),
            createdAt: created,
            updatedAt: created,
          });
        }
        if (apps.length) await tx.insert(s.placementApplications).values(apps);
        const seats = apps.filter((a) => a.status !== "cancelled").length;
        await tx.update(s.placementSessions).set({ seatsTaken: seats }).where(eq(s.placementSessions.id, session.id));
      }
      log(`Placement sessions: ${seedPlacementSessions.length}`);

      /* exam dates, posts, partners, gallery */
      await tx.insert(s.examDates).values(seedExamDates);
      await tx.insert(s.posts).values(
        seedPosts.map((p) => ({ ...p, status: "published" as const, publishedAt: new Date(p.publishedAt) })),
      );
      await tx.insert(s.partners).values(seedPartners.map((p, i) => ({ ...p, sortOrder: i + 1 })));

      const gallery = JSON.parse(
        readFileSync(path.join(import.meta.dirname, "seed-data", "gallery.json"), "utf8"),
      ) as GalleryJson;
      const featured = new Set([
        "ash-dslr-1358.webp",
        "ash-fb-0184.webp",
        "ash-fb-0078.webp",
        "ash-fb-0123.webp",
        "ash-dslr-1171.webp",
        "ash-fb-0038.webp",
        "ash-fb-0098.webp",
        "ash-campus-learning-space-05.webp",
      ]);
      await tx.insert(s.galleryItems).values(
        gallery.map((g, i) => ({
          imagePath: `/images/gallery/${g.file}`,
          width: g.width,
          height: g.height,
          altEn: g.altEn,
          altDe: g.altDe,
          captionEn: g.captionEn,
          captionDe: g.captionDe,
          category: g.category,
          featured: featured.has(g.file),
          sortOrder: i + 1,
        })),
      );
      log(`Gallery: ${gallery.length} photographs, partners: ${seedPartners.length}`);

      /* inbox samples */
      if (samples) {
      const topics = ["courses", "placement", "exams", "events", "partnership"] as const;
      const subjects = [
        "Evening batch for working professionals?",
        "Can I take the placement test online?",
        "Goethe B1 exam registration",
        "Group booking for the Winter Concert",
        "University partnership for German classes",
      ];
      await tx.insert(s.contactMessages).values(
        subjects.map((subject, i) => {
          const [first, last] = samplePeople[(i * 5 + 3) % samplePeople.length];
          const created = daysAgo(9);
          return {
            reference: newReference("message"),
            name: `${first} ${last}`,
            email: `${first}.${last}.msg@example.com`.toLowerCase(),
            phone: fakePhone(9000 + i),
            topic: topics[i],
            subject,
            message: `Hello, ${subject.toLowerCase()} Could you please share more details? Thank you.`,
            status: i < 3 ? ("new" as const) : ("answered" as const),
            idempotencyKey: randomUUID(),
            createdAt: created,
            updatedAt: created,
          };
        }),
      );
      await tx.insert(s.newsletterSubscribers).values(
        samplePeople.slice(0, 12).map(([first, last], i) => ({
          email: `${first}.${last}.news@example.com`.toLowerCase(),
          locale: i % 4 === 0 ? "de" : "en",
          status: i % 6 === 5 ? ("pending" as const) : ("active" as const),
          tokenHash: hash(randomBytes(16).toString("hex")),
          consentAt: daysAgo(60),
          confirmedAt: i % 6 === 5 ? null : daysAgo(50),
        })),
      );
      }

      await tx.insert(s.auditLogs).values({
        action: "system.seed",
        entityType: "system",
        summary: samples ? "Initial catalogue and sample data seeded" : "Initial catalogue seeded (no sample data)",
      });
    });
    log("Seed complete.");
  } finally {
    await client.end();
  }
}

async function ensureAdmin(db: NodePgDatabase<typeof s>) {
  const [{ value: admins }] = await db.select({ value: count() }).from(s.users).where(eq(s.users.role, "admin"));
  if (admins > 0) return;
  if (process.env.NODE_ENV === "production") {
    log('No administrator yet, create one by invitation: bun scripts/create-admin.ts "Name" email@…');
    return;
  }

  const email = (process.env.SEED_ADMIN_EMAIL ?? "admin@schimmel.local").toLowerCase();
  const name = process.env.SEED_ADMIN_NAME ?? "Site Administrator";
  let password = process.env.SEED_ADMIN_PASSWORD;
  let generated = false;
  if (!password) {
    password = generatePassword(20);
    generated = true;
  }
  await db.insert(s.users).values({
    email,
    name,
    role: "admin",
    status: "active",
    passwordHash: await hashPassword(password),
    passwordChangedAt: new Date(),
  });
  log(`Created administrator ${email}${generated ? ` with password: ${password}` : " (password from SEED_ADMIN_PASSWORD in .env.local)"}`);
}
