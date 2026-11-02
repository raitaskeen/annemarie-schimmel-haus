# Deploying on Cloudflare Workers (serverless)

The whole app — public website, admin, forms, uploads, emails, the assistant — runs as one
Cloudflare Worker built by [OpenNext](https://opennext.js.org/cloudflare). There is no server
to maintain. The Docker/Node deployment in [DEPLOYMENT.md](DEPLOYMENT.md) keeps working from
the same code; nothing is Cloudflare-only.

## What runs where

| Piece | Cloudflare product | Free allowance (2026) |
| --- | --- | --- |
| App (pages, admin, API, server actions) | Workers | 100,000 requests/day, **10 ms CPU per request** |
| Static files (`/_next/static`, images, fonts) | Workers static assets | Unlimited, not counted as requests |
| Database | **Postgres via Hyperdrive** (Neon, Supabase, any Postgres 15+) | Hyperdrive: 100,000 queries/day |
| Page and `use cache` entries | R2 | 10 GB, 1 M writes / 10 M reads per month |
| Cache tags (admin edits refresh pages) | D1 | 5 M reads/day |
| Background revalidation | Durable Objects (SQLite) | Included |
| Image resizing, upload re-encoding | Images binding | 5,000 transformations/month |
| Maintenance job every 10 minutes | Cron Triggers | Included |

### Which database?

Cloudflare's own databases are **D1** (SQLite), **Durable Objects** (SQLite per object), **KV**
(key-value) and **R2** (files). The app's data layer is PostgreSQL (transactions, row locks for
seat counting, `jsonb`, partial unique indexes), so it connects to a hosted Postgres through
**Hyperdrive**, Cloudflare's connection pooler. Nothing about the app changes.

Good free Postgres hosts: **Neon** (0.5 GB, scales to zero, region `aws-ap-south-1` Mumbai
is closest to Lahore) or **Supabase** (500 MB). D1 is used only for cache tags.

Application documents (photos, CNIC scans) are stored in Postgres, roughly 0.5 to 1 MB per
application (three re-encoded photos), so a 0.5 GB free database holds about 500 to 1,000. Upgrade the database
plan or archive old applications before it fills up.

### Free plan or $5/month?

The free plan's **10 ms CPU limit per request** is too tight for this app: rendering an admin
page, checking a password at sign-in (scrypt) or rendering a form page needs more. Requests
over the limit fail with error 1102. Cached public pages usually stay under it, so a free
account can serve the website, but sign-ins and the admin will fail at random.

**Workers Paid ($5/month)** fixes this (30 s CPU per request), includes 10 M requests/month,
lifts the Hyperdrive and D1 daily caps, and bills small overages instead of failing. The R2,
Images and Neon free tiers are plenty for a cultural centre. Expect **$5/month in total**.

## One-time setup

You need a Cloudflare account and a Postgres database (connection string with `sslmode=require`).

```bash
bunx wrangler login
bunx wrangler hyperdrive create ash-db --caching-disabled --connection-string="postgres://USER:PASSWORD@HOST/DB?sslmode=require"
bunx wrangler r2 bucket create annemarie-schimmel-haus-cache
bunx wrangler d1 create annemarie-schimmel-haus-tags
```

Hyperdrive query caching stays off: the app caches pages itself, and cached SQL results would
let a sign-out or an admin edit look ignored for up to a minute.

Copy the printed Hyperdrive `id` and D1 `database_id` into `wrangler.jsonc`, and set `APP_URL`
there to your domain.

Create the tables and the catalogue in the new database (once, from your computer):

```bash
DATABASE_URL="postgres://…" bun scripts/migrate.ts
DATABASE_URL="postgres://…" SEED_SAMPLES=false bun scripts/seed.ts
DATABASE_URL="postgres://…" APP_URL="https://www.schimmel.com.pk" bun scripts/create-admin.ts "Your Name" you@schimmel.com.pk
```

Store the secrets in Cloudflare (each command asks for the value):

```bash
bunx wrangler secret put DATABASE_URL     # same connection string (used if Hyperdrive is missing)
bunx wrangler secret put AUTH_SECRET      # openssl rand -base64 48
bunx wrangler secret put CRON_SECRET      # openssl rand -base64 32
# optional
bunx wrangler secret put GROQ_API_KEY     # or HF_TOKEN, for the assistant "Schimmel"
bunx wrangler secret put GMAIL_CLIENT_ID
bunx wrangler secret put GMAIL_CLIENT_SECRET
bunx wrangler secret put GMAIL_REFRESH_TOKEN
bunx wrangler secret put WHATSAPP_TOKEN
bunx wrangler secret put WHATSAPP_PHONE_NUMBER_ID
bunx wrangler secret put WHATSAPP_APP_SECRET
bunx wrangler secret put WHATSAPP_VERIFY_TOKEN
```

## Deploy

The build prerenders pages from the database, so it needs `DATABASE_URL` in the shell:

```bash
DATABASE_URL="postgres://…" AUTH_SECRET="…" bun run cf:deploy
```

Then add your domain under **Workers & Pages → annemarie-schimmel-haus → Settings → Domains**.
With Workers Builds (Git integration), use `bun run cf:build` as the build command,
`bunx opennextjs-cloudflare deploy` as the deploy command, and add `DATABASE_URL` and
`AUTH_SECRET` as build variables.

## Local preview in the Workers runtime

```bash
bun run local                     # local Postgres on 127.0.0.1:54777 (keep it running)
bun run cf:build
CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE="postgres://ash:PASSWORD@127.0.0.1:54777/ash" bun run cf:preview
```

`.dev.vars` (git-ignored) holds the preview's secrets, the same names as above, plus
`APP_URL=http://localhost:8787`.

## Known issue handled in this repo

Next.js 16 `use cache` deduplicates identical requests across visitors. On Workers a
waiting request could hang when the first one's cache write never finished
([opennextjs-cloudflare#1464](https://github.com/opennextjs/opennextjs-cloudflare/issues/1464)).
`patches/next@16.4.2.patch` turns that cross-request deduplication off **only on Workers**;
`bun install` applies it automatically. The page cache also uses R2 rather than KV, where
the hanging writes were reported. Remove the patch once the upstream fix ships.
