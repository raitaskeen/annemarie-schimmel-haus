#!/usr/bin/env bash
# One-shot server setup for Annemarie-Schimmel-Haus (Ubuntu 22.04/24.04, x86_64 or ARM, e.g. Oracle Always Free).
# Installs Docker, fetches the private repository, writes the production settings with fresh secrets,
# builds and starts the app and database, creates the first administrator, connects a Cloudflare
# Tunnel and schedules maintenance + nightly backups.
#
# Safe to run again: existing settings, data and accounts are kept; it updates the code and restarts.
# Usage (on the server):   bash server-setup.sh
# Or from Windows:         deploy\deploy.ps1   (uploads and runs this file for you)
set -euo pipefail

REPO="raitaskeen/annemarie-schimmel-haus"
DIR="$HOME/ash"
say() { printf '\n\033[1;32m==> %s\033[0m\n' "$*"; }
warn() { printf '\033[1;33m!! %s\033[0m\n' "$*"; }
ask() { local prompt=$1 default=${2:-} reply; read -r -p "$prompt${default:+ [$default]}: " reply </dev/tty; echo "${reply:-$default}"; }

[ "$(id -u)" -eq 0 ] && SUDO="" || SUDO="sudo"

say "A few questions (press Enter to accept the value in brackets)"
DOMAIN=$(ask "Public address of the website" "www.schimmel.com.pk")
ADMIN_NAME=$(ask "Your full name (first administrator)" "")
ADMIN_EMAIL=$(ask "Your email (first administrator)" "")
STAFF_EMAIL=$(ask "Office inbox for new-application alerts" "courses@schimmel.com.pk")
echo "Cloudflare Tunnel token: Cloudflare → Zero Trust → Networks → Tunnels → Create a tunnel → Cloudflared → copy the long token"
echo "from the install command (the part after 'service install'). Leave empty to skip and add it later."
TUNNEL_TOKEN=$(ask "Cloudflare Tunnel token" "")

say "1/8 System updates and tools"
export DEBIAN_FRONTEND=noninteractive
$SUDO apt-get update -y
$SUDO apt-get upgrade -y
$SUDO apt-get install -y ca-certificates curl git gh openssl
if ! command -v docker >/dev/null; then curl -fsSL https://get.docker.com | $SUDO sh; fi
$SUDO systemctl enable --now docker
# Small servers: add swap so the first build cannot run out of memory.
if [ "$(free -m | awk '/^Mem:/{print $2}')" -lt 6000 ] && ! swapon --show | grep -q .; then
  $SUDO fallocate -l 4G /swapfile && $SUDO chmod 600 /swapfile && $SUDO mkswap /swapfile >/dev/null && $SUDO swapon /swapfile
  echo '/swapfile none swap sw 0 0' | $SUDO tee -a /etc/fstab >/dev/null
fi
DC="$SUDO docker compose"

say "2/8 Code from GitHub"
if ! gh auth status >/dev/null 2>&1; then
  echo "Sign in to GitHub: choose GitHub.com → HTTPS → 'Login with a web browser', then open github.com/login/device on your laptop."
  gh auth login --hostname github.com --git-protocol https --web </dev/tty
fi
gh auth setup-git
if [ -d "$DIR/.git" ]; then git -C "$DIR" pull --ff-only; else gh repo clone "$REPO" "$DIR"; fi
cd "$DIR"

say "3/8 Production settings"
if [ ! -f .env ]; then
  printf 'POSTGRES_PASSWORD=%s\n' "$(openssl rand -hex 24)" > .env
fi
if [ ! -f .env.production ]; then
  cp .env.example .env.production
  set_env() { if grep -q "^$1=" .env.production; then sed -i "s|^$1=.*|$1=$2|" .env.production; else echo "$1=$2" >> .env.production; fi; }
  set_env APP_URL "https://$DOMAIN"
  set_env AUTH_SECRET "$(openssl rand -base64 48 | tr -d '\n')"
  set_env CRON_SECRET "$(openssl rand -hex 32)"
  set_env IP_SOURCE "cf-connecting-ip"
  set_env TRUSTED_PROXY_HOPS "1"
  set_env STAFF_NOTIFY_EMAIL "$STAFF_EMAIL"
  set_env SEED_SAMPLES "false"
  echo "Created .env.production with new secrets (Gmail/WhatsApp stay off until you add their keys)."
else
  echo "Keeping the existing .env.production."
fi
chmod 600 .env .env.production
CRON_SECRET=$(grep '^CRON_SECRET=' .env.production | cut -d= -f2-)

say "4/8 Build and start (the first build takes 5 to 10 minutes)"
$DC up -d --build
echo -n "Waiting for the app"
for i in $(seq 1 90); do
  if curl -fsS http://127.0.0.1:3000/api/health >/dev/null 2>&1; then echo " ready."; break; fi
  echo -n "."; sleep 4
  if [ "$i" -eq 90 ]; then echo; warn "The app did not start. Last log lines:"; $DC logs web --tail 60; exit 1; fi
done

say "5/8 Database: migrations and the real course catalogue (no sample people)"
$DC exec -T web bun scripts/migrate.ts
$DC exec -T -e SEED_SAMPLES=false web bun scripts/seed.ts

say "6/8 First administrator"
if [ -n "$ADMIN_NAME" ] && [ -n "$ADMIN_EMAIL" ]; then
  $DC exec -T web bun scripts/create-admin.ts "$ADMIN_NAME" "$ADMIN_EMAIL" || warn "No new invitation (the account may already be active)."
else
  warn "Skipped: no name/email given. Later: cd ~/ash && sudo docker compose exec web bun scripts/create-admin.ts \"Name\" email"
fi

say "7/8 Cloudflare Tunnel"
if [ -n "$TUNNEL_TOKEN" ]; then
  if ! command -v cloudflared >/dev/null; then
    ARCH=$(dpkg --print-architecture)
    curl -fsSL -o /tmp/cloudflared.deb "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-$ARCH.deb"
    $SUDO dpkg -i /tmp/cloudflared.deb && rm -f /tmp/cloudflared.deb
  fi
  if ! systemctl is-active --quiet cloudflared; then $SUDO cloudflared service install "$TUNNEL_TOKEN"; fi
  echo "Tunnel installed. In Cloudflare add the public hostname $DOMAIN → HTTP → localhost:3000 if you have not yet."
else
  warn "Skipped: no token. Run this script again with the token, or: sudo cloudflared service install <TOKEN>"
fi

say "8/8 Scheduled jobs: maintenance every 10 minutes, database backup every night (14 days kept)"
mkdir -p "$HOME/backups"
CRON_TMP=$(mktemp)
crontab -l 2>/dev/null | grep -v 'ash-maintenance\|ash-backup' > "$CRON_TMP" || true
cat >> "$CRON_TMP" <<EOF
*/10 * * * * curl -fsS -X POST -H "Authorization: Bearer $CRON_SECRET" http://127.0.0.1:3000/api/cron/maintenance > /dev/null # ash-maintenance
30 2 * * * cd $DIR && $DC exec -T db pg_dump -U ash -Fc ash > $HOME/backups/ash-\$(date +\%F).dump && find $HOME/backups -name 'ash-*.dump' -mtime +14 -delete # ash-backup
EOF
crontab "$CRON_TMP" && rm -f "$CRON_TMP"

say "Done"
echo "Health check:     $(curl -fsS http://127.0.0.1:3000/api/health)"
echo "Website:          https://$DOMAIN   (after the Cloudflare tunnel hostname is set)"
echo "Admin:            https://$DOMAIN/admin   (open the activation link printed above, then turn on 2FA)"
echo "Update later:     bash ~/ash/deploy/server-setup.sh   (pulls the latest code and restarts)"
echo "Logs:             cd ~/ash && sudo docker compose logs web --tail 100"
