# Annemarie-Schimmel-Haus — website & admin

The public website of the German cultural centre in Lahore (English and German) and the staff admin that runs it.

**Visitors can** browse the German courses (A1–C1) and their batches, apply online with documents, register for events and get a QR ticket, apply for the placement test, find the Goethe exam dates (registration is handed over to the Goethe-Institut Karachi webshop), contact the office and subscribe to the newsletter. Every request gets an application number (e.g. `ASH-E-7K3M9Q`) that can be tracked at `/track` with the phone number — no account needed — and the applicant is kept informed by email and, if they opt in, WhatsApp.

**Staff can** process applications (payment requests, seat confirmation, waitlists), manage batches and seats, check guests in at events by scanning tickets, enter placement test results, answer messages, and edit everything on the website: courses, events, exam dates, news, gallery, partners and institution settings. There are roles, an audit log, a notification outbox and optional two-factor authentication. Teacher and student portals can be added on top of the same accounts and roles.

**It runs itself as far as possible:** waitlists fill up automatically when seats free up, applicants get payment reminders, event/test/course reminders and status messages, unpaid seats are released, batches close and complete on their dates, applicants can report payments or cancel from the tracker, and the office gets a morning digest (all switchable under Admin → Settings → Automation).

**Installable:** the website and the admin ("ASH Admin") install as apps on Android, iPhone, Windows, macOS and Linux, and the website opens offline.

📘 **Complete guide** — pages, admin modules, roles, automation, every route and endpoint, security and 2FA, email/WhatsApp, deployment and free tiers: [docs/GUIDE.md](docs/GUIDE.md).

## Run it locally (Windows, macOS, Linux)

Requirements: [Bun 1.4](https://bun.sh) and Node.js 24. Nothing else — a real PostgreSQL 17 is downloaded and started automatically.

```bash
bun install
bun run local
```

- Website: <http://localhost:4000>
- Admin: <http://localhost:4000/admin>

The first start creates `.env.local` with random secrets and an administrator account; the sign-in email and password are in `.env.local` (`SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`). The database lives in `.data/postgres` and is filled with the real catalogue plus clearly synthetic sample applications (`@example.com`, fake phone/CNIC numbers).

| Command | What it does |
|---|---|
| `bun run local` | Postgres + migrations + seed + Next.js dev server (also runs the maintenance job every 10 minutes) |
| `bun run local:start` | Same, with a production build (`bun run build` first) |
| `bun run db` | Only start Postgres (port 54777) |
| `bun run db:reset-seed` | Wipe content and applications and load the seed again |
| `bun run check` | Type check, lint and unit tests |
| `bun run test` | Unit tests (Vitest) |
| `bun scripts/break-test.ts --url …` | Hostile-input probes (bad origins, traversal, scanners, forged webhooks, bursts) against a running site |
| `bun scripts/load-test.ts --url … --users 200` | Load test with a realistic page mix; prints latency percentiles per route |
| `bun scripts/email-assets.ts` | Rebuild the email images (wordmark, seal, watermark) in `public/email` |
| `ADMIN_PASSWORD='…' bun --env-file=.env.local scripts/local-admin.ts "Name" email` | Create/update a local administrator (refuses in production) |
| `bun scripts/create-admin.ts "Name" email` | Production: invite the first administrator (prints a one-time activation link) |

On machines with little memory, `NEXT_DEV_CACHE=off bun run local` turns off Turbopack's on-disk cache.

Email and WhatsApp are not sent locally until you add credentials — messages are recorded in **Admin → Notifications** as *skipped* and can be sent later with **Retry**.

## Stack

Next.js 16 (App Router, Cache Components, Server Actions) · React 19 · TypeScript · Tailwind CSS 4 · shadcn/ui (Radix) · Motion · React Hook Form + Zod · Zustand · Drizzle ORM · PostgreSQL 17 · Recharts · sharp. No third-party scripts, trackers or fonts from external CDNs.

```
src/app/[lang]/      public website (en, de)
src/app/admin/       staff admin (separate root layout)
src/app/api/         bot-quiz challenge, health, cron, WhatsApp webhook, media upload
src/server/          data access, Server Actions, submissions, notifications, jobs
src/lib/             auth, security, validation, formatting (pure helpers)
src/db/              schema, client, seed data
drizzle/             SQL migrations
tests/               unit tests
docs/                deployment, Gmail and WhatsApp set-up
```

## Going live

**Step-by-step launch on Cloudflare: [docs/GO_LIVE_CLOUDFLARE.md](docs/GO_LIVE_CLOUDFLARE.md).** Background and alternatives: [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) (Docker Compose, free-tier blueprint with Cloudflare, Cloudflare Workers notes, GitHub, backups, security model), [docs/GMAIL_SETUP.md](docs/GMAIL_SETUP.md) and [docs/WHATSAPP_TEMPLATES.md](docs/WHATSAPP_TEMPLATES.md). CI runs on every push (`.github/workflows/ci.yml`).

Before publishing, the institute should review: the privacy notice and terms (`/privacy`, `/terms`), fees and dates of the sample batches and events (marked as samples in the seed), payment instructions (**Admin → Settings**) and partner logos/permissions.
