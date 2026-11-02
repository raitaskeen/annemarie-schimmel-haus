# Deployment & security

## What runs where

| Part | Technology |
|---|---|
| Website + admin | One Next.js 16 app (Node 24). Public pages are prerendered and cached; the admin and all forms are server-rendered per request. |
| Database | PostgreSQL 17. Stores content, applications, uploaded documents (encrypted at rest by your disk/provider), sessions, rate limits and the audit log. |
| Email | Gmail API (`docs/GMAIL_SETUP.md`) |
| WhatsApp | WhatsApp Business Cloud API (`docs/WHATSAPP_TEMPLATES.md`) |
| Scheduler | Anything that can `POST /api/cron/maintenance` every 10 minutes |

> The Docker files in this repository have not yet been built in this development environment (no Docker available). Build and smoke-test them once on the target server before going live.

## Single server with Docker Compose

```bash
cp .env.example .env.production        # fill in every value; AUTH_SECRET: openssl rand -base64 48
export POSTGRES_PASSWORD=$(openssl rand -base64 32)
docker compose up -d --build
docker compose exec web bun scripts/migrate.ts
docker compose exec -e SEED_SAMPLES=false web bun scripts/seed.ts     # real catalogue, no sample applicants
docker compose exec web bun scripts/create-admin.ts "Full Name" you@schimmel.com.pk
```

Open the printed activation link, choose a password, then **turn on two-factor authentication** under *My account*. Invite colleagues from **Admin → Users & roles**.

Put a TLS reverse proxy in front of `127.0.0.1:3000` (e.g. Caddy: `schimmel.com.pk { reverse_proxy 127.0.0.1:3000 }`). The app sends HSTS in production, so serve it over HTTPS only. Never expose port 3000 directly: rate limiting trusts the client address that **your** proxy appends to `X-Forwarded-For` (`TRUSTED_PROXY_HOPS`, default 1). Behind Cloudflare, set `IP_SOURCE=cf-connecting-ip` and firewall the server to Cloudflare's IP ranges.

Schedule the maintenance job (cron on the host):

```cron
*/10 * * * * curl -fsS -X POST -H "Authorization: Bearer $CRON_SECRET" https://www.schimmel.com.pk/api/cron/maintenance > /dev/null
```

It sends due notifications and retries failed ones, releases course seats whose payment window has passed (and tells the applicant), and deletes expired sessions, tokens, rate-limit counters and old WhatsApp messages.

### Backups

```bash
docker compose exec db pg_dump -U ash -Fc ash > ash-$(date +%F).dump        # daily, keep 30 days off-site
docker compose exec -T db pg_restore -U ash -d ash --clean < ash-2026-10-22.dump
```

Uploaded application documents live in the database, so the dump is complete. Test a restore at least once.

### Updates

```bash
git pull && docker compose up -d --build && docker compose exec web bun scripts/migrate.ts
```

### Before going live: break and load tests

Run both against the production build (staging or `bun run local:start`), never the dev server:

```bash
bun scripts/break-test.ts --url https://staging.example.com
bun scripts/load-test.ts --url https://staging.example.com --users 200 --seconds 60
```

Measured on a 4-core Windows laptop, one Node process, local Postgres (22 Oct 2026):

| Concurrent users | Throughput | p50 | p95 | p99 | Errors |
|---|---|---|---|---|---|
| 50 | 305 req/s | 142 ms | 256 ms | 471 ms | 0 |
| 200 | 391 req/s | 467 ms | 706 ms | 824 ms | 0 |
| 300 | 324 req/s | 809 ms | 1.19 s | 1.31 s | 0 |

Above ~350 req/s a single process is CPU-bound and latency rises evenly; nothing fails. Cloudflare's cache in front absorbs most anonymous page views, so real capacity is far higher. To scale further, run two or more `web` containers behind the proxy (sessions, rate limits and the outbox live in Postgres, so instances need no coordination) and raise `DATABASE_POOL_MAX` accordingly.

Hardening that came out of these tests: vulnerability-scanner URLs (`*.php`, `/.env`, `/wp-admin` …) get a 9-byte 404 from the proxy, and unknown pages are served from a prerendered not-found page (search engines still receive a real 404 status), so a flood of made-up URLs cannot starve real visitors.

**Email images** (wordmark, seal, watermark) load from `APP_URL/email/…`, so `APP_URL` must be the public `https://` address in production.

## Free-tier blueprint ($0 hosting)

| Piece | Free option | Notes |
|---|---|---|
| Server | Oracle Cloud *Always Free* Ampere VM (4 cores, 24 GB RAM) | Ubuntu + Docker; run the compose stack above |
| Edge, TLS, CDN, firewall | Cloudflare Free | DNS on Cloudflare, proxied (orange cloud) |
| No open ports | Cloudflare Tunnel (`cloudflared`) | Tunnel `https://www.schimmel.com.pk` → `http://127.0.0.1:3000` |
| Backups | Cloudflare R2 (10 GB free) | `rclone copy` the nightly `pg_dump` |
| CI | GitHub Actions | `.github/workflows/ci.yml` |
| Uptime alerts | UptimeRobot / Better Stack free | monitor `/api/health` |
| Email | Gmail API (Google Workspace) | no extra cost |
| WhatsApp | Meta Cloud API | per-message fees for business-initiated templates |

Cloudflare Tunnel in short:

```bash
cloudflared tunnel login
cloudflared tunnel create ash
cloudflared tunnel route dns ash www.schimmel.com.pk
cloudflared tunnel run --url http://127.0.0.1:3000 ash      # or install it as a service
```

Behind Cloudflare set `IP_SOURCE=cf-connecting-ip` so rate limits see the real visitor. In Cloudflare add a cache rule *Bypass cache* for `/admin*`, `/api/*` and `/files/*` (the app already sends `private, no-store` there; the rule is belt and braces).

## Cloudflare Workers

The app runs on Workers too (OpenNext adapter, Postgres through Hyperdrive, uploads re-encoded by the
Cloudflare Images binding, maintenance by Cron Trigger). Everything is in [CLOUDFLARE.md](CLOUDFLARE.md),
including why it needs Workers Paid ($5/month) rather than the free plan.

## GitHub

```bash
git init -b main
git add -A
git commit -m "Annemarie-Schimmel-Haus website and admin"
git remote add origin git@github.com:<org>/annemarie-schimmel-haus.git
git push -u origin main
```

`.gitignore` already excludes `.env*` (except `.env.example`), `.data/` (local database and logs), `.next/` and `node_modules/`. Pushing runs CI (lint, types, unit tests, migrations on PostgreSQL 17, production build). Enable branch protection on `main` (require the CI check) and keep Dependabot's weekly pull requests flowing.

## Security model (summary)

**Staff accounts**
- Invitation-only. Passwords are chosen by the person (never set or seen by an administrator), hashed with scrypt (N=2¹⁵, r=8, p=3). Policy: 12+ characters, three character classes, no names or common patterns.
- Optional TOTP two-factor authentication (RFC 6238); secrets encrypted with AES-256-GCM, codes single-use.
- Sessions: random 256-bit token in an `HttpOnly`, `SameSite=Lax`, `__Host-` cookie (production); only its SHA-256 is stored. 7-day absolute and 8-hour idle lifetime. Changing a password, a role or an account status, or turning on 2FA, signs out the other devices.
- Brute force: per-IP and per-account rate limits, progressive lockout after 5 failures, no account enumeration (identical messages and timing).
- Roles: Administrator, Editor, Course office (+ reserved Teacher/Student). Every Server Action and route handler re-checks the session and permission on the server; the last administrator cannot be removed.

**Public forms**
- Server-side validation of every field (zod), bot quiz (signed, single-use, minimum answer time), honeypot, per-IP rate limits and idempotency keys (double clicks never create duplicates).
- Uploaded documents: type sniffed from the file content (JPG/PNG/WebP/AVIF/PDF only), images re-encoded to WebP (strips metadata and any embedded payload), size-limited, stored privately and only served to signed-in staff with `files:read`, with a sandboxing CSP. Every view is logged.
- The application tracker requires the application number **and** the phone number plus the quiz, is rate-limited per IP and per reference, and only shows masked personal data.

**Platform**
- Strict security headers: CSP (no third-party scripts), HSTS, `X-Frame-Options: DENY`, COOP/CORP, Permissions-Policy, `nosniff`. Admin, API and file responses are `private, no-store` and `noindex`.
- No raw HTML is ever rendered from user input (Markdown without HTML; emails escape every value; CSV exports neutralise spreadsheet formulas; email headers strip line breaks).
- Server Actions are protected by Next.js' Origin check; the image upload API checks `Origin` explicitly; webhooks verify Meta's HMAC signature; the cron endpoint uses a constant-time bearer check and is disabled without a secret.
- Audit log of every change, export, document view and sign-in (no passwords, tokens or ID numbers are written to it).
- Secrets live only in environment variables on the server; nothing is exposed to the browser.

**Your responsibilities**
- Keep `AUTH_SECRET`, `CRON_SECRET`, the database password and API tokens secret and rotate them if a laptop is lost.
- Require 2FA for every administrator. Disable accounts of people who leave.
- Keep the server, Docker images and dependencies updated (`bun outdated`, `bun audit`).
- Real applicant data is personal data: restrict exports, delete old applications according to your retention policy, and publish the privacy notice at `/privacy` after legal review.
