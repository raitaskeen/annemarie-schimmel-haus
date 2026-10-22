# Going live on Cloudflare — step by step

This guide puts the website and admin online at **https://www.schimmel.com.pk** with Cloudflare in front (free plan: TLS, CDN, firewall, DDoS protection) and the app on one small Linux server. No port on the server is opened to the internet: Cloudflare Tunnel connects outwards.

Email (Gmail API) and WhatsApp stay **off** for now. Until their credentials are added, every message is recorded under **Admin → Notifications** as *skipped* and can be sent later with **Retry**. Add them after the director's review (section 10).

Plan about two hours for a first deployment. Do it on a staging address first (`staging.schimmel.com.pk`), then repeat the last step for `www`.

---

## 0. What you need

| Item | Notes |
|---|---|
| Access to the domain registrar of `schimmel.com.pk` | To point the nameservers to Cloudflare |
| A Cloudflare account | Free plan is enough |
| A Linux server | Ubuntu 24.04, 2 vCPU, 4 GB RAM, 40 GB disk. Free option: Oracle Cloud *Always Free* Ampere VM. Any VPS works. |
| The GitHub repository | `raitaskeen/annemarie-schimmel-haus` (private) |
| 30 minutes of the director's time | For the review checklist in section 9 |

> Why not Cloudflare Pages/Workers? The app uses native image processing, PostgreSQL with stored documents and password hashing that needs more CPU than the Workers free plan allows. See *Cloudflare Workers* in `DEPLOYMENT.md`. The server + Cloudflare setup below is the recommended, fully supported path.

## 1. Move DNS to Cloudflare (keep email working)

1. Cloudflare dashboard → **Add a domain** → `schimmel.com.pk` → Free plan.
2. Cloudflare scans the existing DNS records. **Check that the email records were copied** before continuing: `MX` records (Google Workspace: `smtp.google.com` or `aspmx.l.google.com` …), `TXT` records for SPF (`v=spf1 include:_spf.google.com ~all`), DKIM (`google._domainkey`) and DMARC (`_dmarc`). Missing these stops the office's email.
3. Set the mail-related records to **DNS only** (grey cloud).
4. At the registrar, replace the nameservers with the two Cloudflare shows you. Wait until Cloudflare says *Active* (minutes to 24 hours).

## 2. Prepare the server

```bash
# as a sudo user on the server
sudo apt update && sudo apt -y upgrade
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER && newgrp docker
sudo apt -y install git ufw
sudo ufw default deny incoming && sudo ufw allow OpenSSH && sudo ufw enable   # only SSH is open
```

Get the code (private repository — use a read-only deploy key):

```bash
ssh-keygen -t ed25519 -f ~/.ssh/ash_deploy -N ""
cat ~/.ssh/ash_deploy.pub    # GitHub → repo → Settings → Deploy keys → Add (read-only)
GIT_SSH_COMMAND="ssh -i ~/.ssh/ash_deploy" git clone git@github.com:raitaskeen/annemarie-schimmel-haus.git ash
cd ash
```

## 3. Configuration

```bash
cp .env.example .env.production
printf 'POSTGRES_PASSWORD=%s\n' "$(openssl rand -hex 24)" > .env    # read by docker compose
chmod 600 .env .env.production
openssl rand -base64 48   # → AUTH_SECRET
openssl rand -hex 32      # → CRON_SECRET
nano .env.production
```

Set these values in `.env.production` (leave the Gmail and WhatsApp lines empty for now):

| Variable | Value |
|---|---|
| `APP_URL` | `https://staging.schimmel.com.pk` (later `https://www.schimmel.com.pk`) — must be the public `https://` address, emails load their images from it |
| `AUTH_SECRET` | the 48-byte value from above |
| `CRON_SECRET` | the hex value from above |
| `IP_SOURCE` | `cf-connecting-ip` — the real visitor address from Cloudflare, used by all rate limits |
| `TRUSTED_PROXY_HOPS` | `1` |
| `STAFF_NOTIFY_EMAIL` | the office inbox for new-application alerts (used once Gmail is on) |
| `SEED_SAMPLES` | `false` — never load sample applicants on a live site |

`DATABASE_URL` is set by `docker-compose.yml`; you do not need to edit it.

## 4. Start the app

```bash
docker compose up -d --build
docker compose exec web bun scripts/migrate.ts
docker compose exec -e SEED_SAMPLES=false web bun scripts/seed.ts      # real catalogue, no sample people
docker compose exec web bun scripts/create-admin.ts "Full Name" director@schimmel.com.pk
curl -fsS http://127.0.0.1:3000/api/health   # → {"ok":true}
```

`create-admin.ts` prints a one-time activation link. Open it after step 5 (it uses `APP_URL`), choose a password and **turn on two-factor authentication** under *My account*.

## 5. Cloudflare Tunnel

1. Cloudflare dashboard → **Zero Trust → Networks → Tunnels → Create a tunnel** → *Cloudflared* → name `ash`.
2. Choose *Debian/Ubuntu*, copy the install command shown and run it on the server. The tunnel shows **Healthy**.
3. **Public hostname** → add:
   - Subdomain `staging`, domain `schimmel.com.pk`, service `HTTP` → `localhost:3000`.
4. Open https://staging.schimmel.com.pk — the website loads. Open `/admin` and activate the administrator account from step 4.

For the live site add a second public hostname `www` → `HTTP localhost:3000`, then:
- **Rules → Redirect rules** → *Redirect from root to www* (template) so `schimmel.com.pk` → `https://www.schimmel.com.pk`.
- Change `APP_URL` in `.env.production` to `https://www.schimmel.com.pk` and run `docker compose up -d`.

## 6. Cloudflare settings (free plan)

| Where | Setting |
|---|---|
| SSL/TLS → Overview | **Full** |
| SSL/TLS → Edge Certificates | *Always Use HTTPS* **on**, *Minimum TLS* **1.2**, *Automatic HTTPS Rewrites* **on** |
| Caching → Cache Rules | Rule *Bypass private areas*: if URI path starts with `/admin` **or** `/api/` **or** `/files/` → **Bypass cache** (the app already sends `private, no-store`; this is a second safety net) |
| Caching → Configuration | Browser cache TTL: **Respect existing headers** |
| Security → WAF | Managed rules **on** (Cloudflare Free Managed Ruleset) |
| Security → WAF → Rate limiting rules | Optional: `/admin/login` — 20 requests / 10 s per IP → Block 1 min (the app also limits sign-ins itself) |
| Security → Bots | *Bot Fight Mode* **on** for now. When WhatsApp is connected, add a WAF *Skip* rule for `/api/whatsapp/webhook` (Meta's servers must reach it). |
| Speed → Optimization | *Brotli* on. Leave *Rocket Loader* **off** (it breaks the app's scripts). |
| Network | *HTTP/3* on, *WebSockets* on |

## 7. Scheduled jobs and backups

```bash
crontab -e
```

```cron
# Maintenance every 10 minutes: reminders, waitlists, seat release, retries, clean-up (directly to the container, not via the internet)
*/10 * * * * curl -fsS -X POST -H "Authorization: Bearer <CRON_SECRET>" http://127.0.0.1:3000/api/cron/maintenance > /dev/null
# Nightly database backup at 02:30, keep 30 days (documents are inside the database)
30 2 * * * cd ~/ash && docker compose exec -T db pg_dump -U ash -Fc ash > ~/backups/ash-$(date +\%F).dump && find ~/backups -name 'ash-*.dump' -mtime +30 -delete
```

```bash
mkdir -p ~/backups
```

Copy backups off the server too, for example to Cloudflare R2 (10 GB free) with `rclone copy ~/backups r2:ash-backups`. **Test one restore** on staging before the launch:

```bash
docker compose exec -T db pg_restore -U ash -d ash --clean --if-exists < ~/backups/ash-YYYY-MM-DD.dump
```

Uptime alerts: create a free monitor (UptimeRobot or Better Stack) for `https://www.schimmel.com.pk/api/health`, alerting the office email and a phone.

## 8. Test the staging site

From your own computer, with the repository checked out:

```bash
bun scripts/break-test.ts --url https://staging.schimmel.com.pk
bun scripts/load-test.ts --url https://staging.schimmel.com.pk --users 100 --seconds 60
```

Both must finish with *All probes passed* and *unexpected responses 0*. (Load-test only staging, and not during office hours.)

Then click through by hand on a phone and a computer, in English and German, light and dark mode: apply for a course (with documents), register for an event, book a placement test, send a contact message, track each application, and process each one in the admin (request payment, confirm, publish a test result, check a guest in).

## 9. Director's review checklist (before switching `www` on)

- [ ] Texts on the homepage, *About*, *Our contribution* and course pages are correct
- [ ] Course fees, batch dates, events and placement test dates are real (delete or edit every seed entry marked as sample)
- [ ] Payment instructions and payment window under **Admin → Settings → Enrollment**
- [ ] Contact details, opening hours and social links under **Admin → Settings**
- [ ] Privacy notice (`/privacy`) and terms (`/terms`) reviewed by legal counsel
- [ ] Permission to show every partner logo and every photo of people in the gallery
- [ ] Every staff member has their own account (no shared logins) and two-factor authentication
- [ ] Automation switches under **Admin → Settings → Automation** set as the office wants

## 10. Later: email and WhatsApp

When the director approves:

1. **Gmail** — follow `docs/GMAIL_SETUP.md`, put the four `GMAIL_*` values into `.env.production`, `docker compose up -d`, then **Admin → Settings → Send test email to me**.
2. **WhatsApp** — follow `docs/WHATSAPP_TEMPLATES.md`: create the four templates (English and German) in Meta Business Manager and wait for approval, set the `WHATSAPP_*` values, register the webhook `https://www.schimmel.com.pk/api/whatsapp/webhook`, and add the Cloudflare WAF skip rule from section 6.
3. Open **Admin → Notifications**, filter *skipped* and use **Retry** for messages that should still go out.

## 11. Updates and rollback

```bash
cd ~/ash
git pull
docker compose up -d --build
docker compose exec web bun scripts/migrate.ts
```

Every push to `main` runs CI (lint, types, tests, migrations, production build) on GitHub — only deploy commits with a green check. To roll back: `git checkout <previous commit>`, `docker compose up -d --build`, and if a migration changed data, restore last night's backup.

## 12. If something goes wrong

| Symptom | Check |
|---|---|
| Cloudflare error 1033 / 502 | Tunnel not healthy: `sudo systemctl status cloudflared`; app down: `docker compose ps`, `docker compose logs web --tail 100` |
| `/api/health` returns 503 | Database down: `docker compose logs db --tail 50`, disk full: `df -h` |
| Everyone is rate-limited at once | `IP_SOURCE` is not `cf-connecting-ip`, so all visitors look like one address |
| Emails show no images | `APP_URL` is not the public `https://` address |
| Admin sign-in loops or "invalid origin" | The site is opened on an address other than `APP_URL`; always use the configured hostname |
