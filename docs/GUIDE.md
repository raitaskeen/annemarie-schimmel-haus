# Annemarie-Schimmel-Haus platform — complete guide

This guide covers the public website, the staff admin, every route and endpoint, security and sign-in, notifications, the automatic workflows, and running the platform in production. Setup details for the integrations are in [GMAIL_SETUP.md](GMAIL_SETUP.md), [WHATSAPP_TEMPLATES.md](WHATSAPP_TEMPLATES.md) and [DEPLOYMENT.md](DEPLOYMENT.md).

---

## 1. Quick start

```bash
bun install
bun run local          # Postgres + migrations + seed + website and admin on http://localhost:4000
```

| What | Where |
|---|---|
| Website (English / German) | <http://localhost:4000/en> · <http://localhost:4000/de> |
| Admin control panel | <http://localhost:4000/admin> (footer link “Staff”) |
| Seeded local administrator | `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` in `.env.local` |
| Add your own local administrator | `ADMIN_PASSWORD='…' bun --env-file=.env.local scripts/local-admin.ts "Your Name" you@example.com` |

On machines with 8 GB RAM or less use `NEXT_DEV_CACHE=off bun run local`. For a fast local preview of the production build: `bun run build` (with the database running: `bun run db`), then `bun run local:start`.

---

## 2. The website (for visitors)

| Page | What visitors do there |
|---|---|
| Home `/{lang}` | Overview, next course starts, featured event, placement test and Goethe exam teasers, partner logo strip |
| Courses `/{lang}/courses` | All CEFR levels A1–C1 with fees, books, durations; batch finder (format, track, start month) |
| Course `/{lang}/courses/{slug}` | Description, outcomes, all upcoming batches with live seats left, apply buttons |
| Apply `/{lang}/enroll/{batchId}` | 5-step application with photo/CNIC/degree upload, draft saved in the browser (identity numbers never stored locally) |
| Events `/{lang}/events`, `/{lang}/events/{slug}` | Programme, agenda, seats left, registration with guests; full events offer a waitlist |
| Placement test `/{lang}/placement-test` | Dates, fee, rules and registration for the next test sessions |
| Goethe exams `/{lang}/exams` | Exam dates and levels; registration is handed over to the Goethe-Institut Karachi webshop |
| Gallery, About, Partners, News | Editorial pages, all managed in the admin |
| Contact `/{lang}/contact` | Message form (gets a reference ASH-M-…), map, opening hours |
| Track `/{lang}/track` | Status of any application — see below |
| Privacy, Terms, Student guidelines | Legal and house rules |

**Never lost:** every form (course application, event, placement test, contact) keeps an unfinished draft on the visitor's own device for 14 days and shows "We restored what you entered …" when they come back; CNIC numbers, documents, quiz answers and consent are never stored. A resumed course application starts on step 1 and asks for the CNIC again. After a failed submit the page scrolls to the first problem; after success it scrolls to the confirmation. Application numbers made on the device are listed in the tracker ("Your applications on this device"). The site follows the device's light/dark setting, with a sun/moon switch in the header.

### Application numbers and the tracker
Every request gets a number: **ASH-E-…** (course), **ASH-V-…** (event ticket), **ASH-P-…** (placement test), **ASH-M-…** (message). It arrives by email and, when ticked, WhatsApp.

At `/{lang}/track` the visitor enters the number, the mobile number used when applying, and answers the small arithmetic “bot quiz”. No account is needed. The tracker shows:
- a timeline (submitted → reviewed → paid/confirmed → course start, or the event/test day),
- next steps, payment instructions and the amount due,
- the event ticket as a QR code and an “Add to calendar” file,
- the placement test result (recommended level and score) once published,
- **self-service**: **“I have paid”** (enter the bank/wallet transaction ID, the office is alerted) and **cancel/withdraw** (the seat goes straight to the next person on the waitlist). Paid course seats are cancelled through the office because of the refund policy.

Personal data is masked in the tracker, lookups are rate-limited per IP and per number, and the self-service buttons are authorised by a signed token that expires after 20 minutes.

### Install as an app
The website and the admin are both installable apps (PWA) with their own icons:
- **Android / Chrome / Edge / Samsung Internet / Windows / macOS / Linux / ChromeOS:** “Install the app” button in the footer and phone menu (or the browser's install icon). On phones a small banner offers it from the second page view.
- **iPhone / iPad (Safari):** Share → “Add to Home Screen” (the button shows these steps).
- **Mac (Safari 17+):** File → “Add to Dock”.
- **Staff:** “Install admin app” in the admin sidebar installs **ASH Admin** as a separate app that opens straight into the admin.

The installed website opens offline with the pages visited before (an offline page otherwise). Private data (admin, documents, tracker results) is never stored offline.

---

## 3. The admin control panel (for staff)

Sign in at `/admin/login`. After an invitation, staff set their own password at `/admin/invite/{token}`. Forgotten passwords: `/admin/forgot-password` (link valid 30 minutes).

### Daily routine
1. **Dashboard** — KPIs, activity chart, upcoming batches and events. An amber “Awaiting payment” card means applicants **reported a payment**: click it to confirm them.
2. **Enrollments** — filter by status (including **Payment reported**), batch and format; open an application to see documents (every view is logged), contact the applicant (email / WhatsApp / call) and move it on: *Request payment → Confirm payment & seat → Completed*, or *Waitlist / Reject / Cancel*. Tick several rows to apply one step to all (bulk bar at the bottom).
3. **Messages** — reply from the admin; the answer goes out as a branded email with the reference number.
4. **Events** — create/edit events, registrations with **door check-in** (scan the QR code or type the ticket number), bulk check-in, guest list CSV.
5. **Placement tests** — sessions, candidates, bulk confirm/attended, enter results (level + score) which are published to the candidate.

### Modules
| Module | Path | What it does | Permission |
|---|---|---|---|
| Dashboard | `/admin` | Overview and shortcuts | everyone |
| Enrollments | `/admin/enrollments` | Course applications, documents, payments, bulk actions, CSV export | submissions |
| Placement tests | `/admin/placement` | Sessions, candidates, results | submissions / content |
| Messages | `/admin/messages` | Contact inbox, replies, notes | messages |
| Courses & batches | `/admin/courses`, `/admin/offerings` | Levels, fees, books, batches, seats, schedules | content |
| Events | `/admin/events` | Events, agenda, registration rules, check-in, guest list | content / submissions |
| Goethe exams | `/admin/exams` | Exam dates shown on the website | content |
| News | `/admin/news` | Articles, scholarships, jobs (scheduling, pinning) | content |
| Gallery | `/admin/gallery` | Upload (auto WebP), descriptions, categories, featured | content |
| Partners | `/admin/partners` | Logos for the partners page and homepage strip, order | content |
| Subscribers | `/admin/subscribers` | Newsletter (double opt-in), export, unsubscribe/erase | export |
| Notifications | `/admin/notifications` | Every email/WhatsApp, status, preview, retry | notifications |
| Users & roles | `/admin/users` | Invite staff, roles, disable, reset 2FA, sign out devices | admin only |
| Audit log | `/admin/audit` | Every change, export, document view and sign-in | admin only |
| Settings | `/admin/settings` | Contact data, hours, announcement bar, payment instructions, **Automation**, integrations status, test email | admin only |
| My account | `/admin/account` | Name, password, two-factor authentication, signed-in devices | everyone |

### Roles
| Role | Can do |
|---|---|
| **Administrator** | Everything, including users, settings and the audit log |
| **Editor** | Website content and programme, applications, exports, messages, notifications |
| **Course office** (support) | Process applications, registrations, placement tests and messages; view documents |
| Teacher / Student | Reserved for the coming portals (no admin access yet) |

---

## 4. Automation (what runs by itself)

The maintenance job runs every 10 minutes (`/api/cron/maintenance`; locally `bun run local` triggers it). Every step is idempotent and recorded in the audit log / notification outbox. Each can be switched off under **Settings → Automation**.

| Workflow | When |
|---|---|
| Confirmation email + WhatsApp with application number | Immediately on every submission |
| Staff alert for new applications and reported payments | Immediately (to `STAFF_NOTIFY_EMAIL`) |
| **Waitlist promotion** | When a seat frees up (cancellation, capacity increase, released seat): events move the next guest up; courses offer the seat with payment instructions |
| **Payment reminder** | Halfway through the payment window (default 24 h) |
| **Release unpaid seats** | When the payment window ends — unless the applicant reported a payment |
| **Optional: request payment automatically** | On submission (skips manual review; off by default) |
| **Reminders** | Day before an event or placement test, 3 days before a course starts |
| **Auto-close / complete** | Batches close on their start date, test sessions after the deadline; finished batches and their students become *completed* |
| **Morning digest** | Working days after 08:00 — what needs attention today |
| **Retries** | Failed emails/WhatsApp messages retry with growing delays |
| **Data minimisation** | Uploaded documents deleted N days (default 365) after an application ended; expired sessions, tokens and old WhatsApp messages removed |

---

## 5. Email and WhatsApp

- **Email** uses the Gmail API from one Google Workspace mailbox (OAuth refresh token, send-only scope). Set `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, `GMAIL_REFRESH_TOKEN`, `GMAIL_SENDER`. Step by step: [GMAIL_SETUP.md](GMAIL_SETUP.md). Test from **Settings → Send test email to me**.
- **WhatsApp** uses the official WhatsApp Business Cloud API (Meta). Set `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_APP_SECRET`, `WHATSAPP_VERIFY_TOKEN`, register the webhook `https://<domain>/api/whatsapp/webhook`, and create the four templates exactly as described in [WHATSAPP_TEMPLATES.md](WHATSAPP_TEMPLATES.md). Reminders reuse the approved status template, so no extra approval is needed. Meta charges per business-initiated template message (utility messages cost a fraction of a US cent to a few cents depending on the country); email is free.

Until credentials are set, messages are recorded as *skipped* in **Notifications** and can be sent later with **Retry**.

---

## 6. Security, sign-in and two-factor authentication

- **Passwords**: chosen by each person via invitation (administrators never see or set them), scrypt hashing, at least 12 characters with three character classes, no names or common patterns.
- **Two-factor authentication (TOTP)**: **My account → Two-factor authentication → Set up**, scan the QR code with Google Authenticator, Microsoft Authenticator, 1Password etc., enter the code. From then on every sign-in asks for a 6-digit code (each code works once). Lost phone: another administrator uses **Users & roles → Reset 2FA**. Require it for all administrators.
- **Sessions**: secure `HttpOnly` cookie (`__Host-` in production), 7 days maximum, signed out after 8 hours of inactivity; password, role or status changes sign out other devices. **My account** lists devices and signs them out.
- **Brute force**: rate limits per IP and per account, progressive lock-out after 5 failed sign-ins, identical answers whether or not an account exists.
- **Public forms**: server-side validation, bot quiz (signed, single use, minimum answer time), honeypot, per-IP limits, idempotency (double clicks never duplicate).
- **Documents**: type checked from the file content, images re-encoded to WebP, stored privately, only visible to staff with document permission, every view logged.
- **Platform**: strict Content-Security-Policy, HSTS, clickjacking protection, no third-party scripts or fonts, private pages never cached, audit log of everything.

More detail and operator responsibilities: [DEPLOYMENT.md](DEPLOYMENT.md#security-model-summary).

---

## 7. Routes and endpoints

`{lang}` is `en` or `de`; `/` redirects to the visitor's language.

### Public pages
`/{lang}` · `/{lang}/courses` · `/{lang}/courses/{slug}` · `/{lang}/enroll/{batchId}` · `/{lang}/events` · `/{lang}/events/{slug}` · `/{lang}/placement-test` · `/{lang}/exams` · `/{lang}/gallery` · `/{lang}/about` · `/{lang}/partners` · `/{lang}/contact` · `/{lang}/news` · `/{lang}/news/{slug}` · `/{lang}/track` · `/{lang}/newsletter/confirm` · `/{lang}/privacy` · `/{lang}/terms` · `/{lang}/student-guidelines`

### Admin pages (sign-in required)
`/admin` · `/admin/enrollments[/{id}]` · `/admin/placement[/new|/{id}|/{id}/edit]` · `/admin/messages[/{id}]` · `/admin/courses[/new|/{id}]` · `/admin/offerings[/new|/{id}]` · `/admin/events[/new|/{id}|/{id}/edit]` · `/admin/exams` · `/admin/news[/new|/{id}]` · `/admin/gallery` · `/admin/partners[/new|/{id}]` · `/admin/subscribers` · `/admin/notifications` · `/admin/users[/{id}]` · `/admin/audit` · `/admin/settings` · `/admin/account`
Sign-in flow (public): `/admin/login` · `/admin/login/verify` (2FA) · `/admin/forgot-password` · `/admin/reset-password/{token}` · `/admin/invite/{token}` · `/admin/no-access`

### HTTP endpoints
| Method & path | Purpose | Protection |
|---|---|---|
| `GET /api/challenge` | New bot-quiz question (signed token) | public, no state |
| `GET /api/health` | Liveness + database check (`{ ok }`) | public, reveals nothing |
| `POST /api/cron/maintenance` | Runs all automation (section 4) | `Authorization: Bearer $CRON_SECRET`, disabled without secret |
| `GET /api/whatsapp/webhook` | Meta subscription handshake | `WHATSAPP_VERIFY_TOKEN` |
| `POST /api/whatsapp/webhook` | Delivery receipts and inbound messages | HMAC signature (`WHATSAPP_APP_SECRET`) |
| `POST /api/admin/media` | Image upload (re-encoded WebP) | staff session + content permission + same origin |
| `GET /media/{id}` | Public uploaded images | public, immutable cache |
| `GET /files/{id}` | Private application documents | staff session + document permission, logged, sandboxed |
| `GET /admin/export/enrollments` | CSV (respects list filters) | export permission, logged |
| `GET /admin/export/registrations?event={id}` | Guest list CSV | export permission, logged |
| `GET /admin/export/placement?session={id}` | Candidate list CSV | export permission, logged |
| `GET /admin/export/subscribers` | Active newsletter addresses | export permission, logged |
| `GET /admin/preview/notifications/{id}` | Email preview | notifications permission, sandboxed |
| `GET /site.webmanifest`, `GET /admin/app.webmanifest` | App manifests (website / ASH Admin) | public |
| `GET /sw.js`, `GET /offline.html` | Service worker and offline page | public |
| `GET /sitemap.xml`, `GET /robots.txt` | Search engines (admin excluded) | public |

### Server Actions (form submissions, not REST)
Public: apply for a course, register for an event, register for the placement test, contact, newsletter subscribe/confirm, track, cancel from tracker, report payment from tracker. Admin: every create/update/delete in the modules above, status changes (single and bulk), check-in, replies, invitations, account and 2FA, settings. Each re-checks the session and permission on the server; Next.js rejects cross-origin calls.

---

## 8. Environment variables

See [.env.example](../.env.example). Required in production: `DATABASE_URL`, `AUTH_SECRET` (32+ random bytes), `APP_URL`, `CRON_SECRET`. Optional: `STAFF_NOTIFY_EMAIL`, `GMAIL_*`, `WHATSAPP_*`, `IP_SOURCE` / `TRUSTED_PROXY_HOPS` (client address behind proxies), `SEED_SAMPLES=false` (production seed).

---

## 9. Deployment, free tiers and Cloudflare

**Recommended ($0 hosting):** one always-free VM (e.g. Oracle Cloud Always Free, 4 ARM cores / 24 GB) running `docker compose` (PostgreSQL 17 + app), with **Cloudflare (free)** in front for DNS, TLS, CDN, firewall and a Cloudflare Tunnel (no open ports). Backups to Cloudflare R2 (10 GB free). CI on GitHub Actions (free for public and generous for private repos). Cron from the VM. Total running cost: the domain, plus Meta's per-message WhatsApp fees.

**Managed alternatives:** Neon or Supabase free Postgres (0.5 GB, suspends when idle) plus a Node host. Free web tiers that sleep (Render) make the first visit slow; small paid instances (~$5–7/month: Railway, Fly.io, Hetzner) are steadier.

**Cloudflare Workers:** not supported as-is. This app is built for a Node server: it uses `sharp` (native image processing, not available on Workers), stores documents in Postgres, and hashes passwords with scrypt, which needs more CPU than the Workers **free** plan allows (10 ms per request). A Workers deployment needs the **Workers Paid plan ($5/month)**, the OpenNext Cloudflare adapter, Hyperdrive for the Postgres connection, R2 for documents and Cloudflare Images (or a WebAssembly codec) instead of `sharp`. Cache Components / partial prerendering support in the adapter should be verified at that time. Until then, use Cloudflare *in front of* the Node server — you still get Cloudflare's CDN, TLS, WAF and DDoS protection for free.

Full instructions: [DEPLOYMENT.md](DEPLOYMENT.md).

---

## 10. Maintenance

| Task | How |
|---|---|
| Health | `GET /api/health` from an uptime monitor (e.g. UptimeRobot or Better Stack free) |
| Backups | Daily `pg_dump` (documents included), keep 30 days off-site; test a restore |
| Updates | Dependabot opens weekly PRs; merge when CI is green, then redeploy and `bun scripts/migrate.ts` |
| Schema changes | Edit `src/db/schema.ts`, `bun run db:generate`, commit the new SQL in `drizzle/`, migrate on deploy |
| Failed messages | Admin → Notifications → filter *failed* → fix the cause → Retry |
| Lost 2FA device | Another administrator: Users & roles → person → Reset 2FA |
| New staff member | Users & roles → Invite → they receive a 72-hour link |
| Someone leaves | Users & roles → set status *Disabled* (history stays in the audit log) |

## 11. Troubleshooting

| Symptom | Fix |
|---|---|
| Emails show “skipped” | Gmail not configured — see GMAIL_SETUP.md, then Retry |
| WhatsApp “failed: template not found” | Create/approve the template with exactly the listed name and language |
| “Too many attempts” | Rate limit — wait 15 minutes or ask an administrator to unlock the account |
| Locked out after failed sign-ins | Administrator → Users & roles → Unlock, or wait for the lock to expire |
| Install button missing | Already installed, or the browser can't install apps (Firefox desktop) — see section 2 |
| Dev server out of memory (8 GB machines) | `NEXT_DEV_CACHE=off bun run local`; stop it before `bun run build` |
