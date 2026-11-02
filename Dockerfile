# Production image: Next.js on Node 24, plus Bun for the migration/seed scripts.
# Build:  docker build -t ash-web .
# Run:    see docker-compose.yml and docs/DEPLOYMENT.md

FROM oven/bun:1.4.2 AS deps
WORKDIR /app
COPY package.json bun.lock ./
# Local patches (patches/*.patch) are applied by bun install.
COPY patches ./patches
RUN bun install --frozen-lockfile

FROM node:24-slim AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN node node_modules/next/dist/bin/next build

FROM node:24-slim AS run
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000
COPY --from=oven/bun:1.4.2 /usr/local/bin/bun /usr/local/bin/bun
RUN groupadd --system --gid 1001 ash && useradd --system --uid 1001 --gid ash ash
COPY --from=build --chown=ash:ash /app/package.json /app/next.config.ts ./
COPY --from=build --chown=ash:ash /app/node_modules ./node_modules
COPY --from=build --chown=ash:ash /app/.next ./.next
COPY --from=build --chown=ash:ash /app/public ./public
COPY --from=build --chown=ash:ash /app/drizzle ./drizzle
COPY --from=build --chown=ash:ash /app/scripts ./scripts
COPY --from=build --chown=ash:ash /app/src ./src
USER ash
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "node_modules/next/dist/bin/next", "start", "--port", "3000"]
