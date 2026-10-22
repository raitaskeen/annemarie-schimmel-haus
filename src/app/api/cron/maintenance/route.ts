import { timingSafeEqual } from "node:crypto";
import { connection } from "next/server";
import { env } from "@/lib/env";
import { runMaintenance } from "@/server/jobs/maintenance";

/**
 * Scheduler entry point, e.g. every 10 minutes:
 *   curl -fsS -X POST -H "Authorization: Bearer $CRON_SECRET" https://…/api/cron/maintenance
 * Disabled (404) unless CRON_SECRET is set.
 */
export async function POST(request: Request) {
  await connection();
  const secret = env().CRON_SECRET;
  if (!secret) return new Response("Not found", { status: 404 });
  const given = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return new Response("Unauthorized", { status: 401 });
  const started = Date.now();
  const report = await runMaintenance();
  return Response.json({ ok: true, ms: Date.now() - started, ...report }, { headers: { "cache-control": "no-store" } });
}
