import "server-only";
import { sql } from "drizzle-orm";
import { db } from "@/db";

export type RateLimitResult = { ok: boolean; remaining: number; retryAfterSeconds: number };

/**
 * Fixed-window rate limiter backed by Postgres (atomic upsert), so limits hold
 * across server instances without extra infrastructure.
 * Fails closed for authentication and open for public reads (see `failOpen`).
 */
export async function rateLimit(
  bucket: string,
  identifier: string,
  { limit, windowSeconds, failOpen = false }: { limit: number; windowSeconds: number; failOpen?: boolean },
): Promise<RateLimitResult> {
  const key = `${bucket}:${identifier}`.slice(0, 200);
  try {
    const result = await db().execute<{ count: number; window_start: Date }>(sql`
      INSERT INTO rate_limits (key, window_start, count)
      VALUES (${key}, now(), 1)
      ON CONFLICT (key) DO UPDATE SET
        count = CASE WHEN rate_limits.window_start < now() - make_interval(secs => ${windowSeconds})
                     THEN 1 ELSE rate_limits.count + 1 END,
        window_start = CASE WHEN rate_limits.window_start < now() - make_interval(secs => ${windowSeconds})
                     THEN now() ELSE rate_limits.window_start END
      RETURNING count, window_start`);
    const row = result.rows[0];
    const count = Number(row.count);
    const elapsed = (Date.now() - new Date(row.window_start).getTime()) / 1000;
    return {
      ok: count <= limit,
      remaining: Math.max(0, limit - count),
      retryAfterSeconds: Math.max(1, Math.ceil(windowSeconds - elapsed)),
    };
  } catch (error) {
    console.error("rate limit check failed", error);
    return { ok: failOpen, remaining: 0, retryAfterSeconds: windowSeconds };
  }
}

/** Removes expired windows (called by the maintenance job). */
export async function pruneRateLimits() {
  await db().execute(sql`DELETE FROM rate_limits WHERE window_start < now() - interval '1 day'`);
}
