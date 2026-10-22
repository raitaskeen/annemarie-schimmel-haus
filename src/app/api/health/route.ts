import { sql } from "drizzle-orm";
import { connection } from "next/server";
import { db } from "@/db";

/** Liveness + database check for load balancers and the Docker healthcheck. Reveals nothing else. */
export async function GET() {
  await connection();
  try {
    await db().execute(sql`select 1`);
    return Response.json({ ok: true }, { headers: { "cache-control": "no-store" } });
  } catch {
    return Response.json({ ok: false }, { status: 503, headers: { "cache-control": "no-store" } });
  }
}
