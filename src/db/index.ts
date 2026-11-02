import "server-only";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { env } from "@/lib/env";
import { onCloudflareWorkers } from "@/lib/runtime";
import * as schema from "./schema";

export type Database = NodePgDatabase<typeof schema>;

/**
 * Node server: one pool per process. In development the module is re-evaluated on
 * every hot reload, so the pool is parked on globalThis to avoid leaking connections.
 */
const globalForDb = globalThis as unknown as { ashPool?: Pool; ashDb?: Database };

function createDb(): Database {
  const e = env();
  const pool =
    globalForDb.ashPool ??
    new Pool({
      connectionString: e.DATABASE_URL,
      max: e.DATABASE_POOL_MAX,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
      // Guard every statement; a runaway query must never pin a connection.
      statement_timeout: 15_000,
      // And guard the client too, so a silent network never leaves a request waiting.
      query_timeout: 20_000,
      application_name: "ash-web",
    });
  globalForDb.ashPool = pool;
  return drizzle({ client: pool, schema, casing: "snake_case" });
}

/**
 * Cloudflare Workers: sockets cannot be shared between requests (a reused connection
 * hangs or throws), so every request gets its own small pool through Hyperdrive, which
 * keeps the real connections to Postgres warm. Keyed by the request's ExecutionContext.
 */
const perRequest = new WeakMap<object, Database>();

function workersDb(): Database {
  const { env: bindings, ctx } = getCloudflareContext();
  const existing = perRequest.get(ctx);
  if (existing) return existing;
  const hyperdrive = (bindings as { HYPERDRIVE?: { connectionString: string } }).HYPERDRIVE;
  const pool = new Pool({
    connectionString: hyperdrive?.connectionString ?? env().DATABASE_URL,
    max: 4,
    idleTimeoutMillis: 5_000,
    connectionTimeoutMillis: 10_000,
    query_timeout: 15_000,
    application_name: "ash-web-cf",
  });
  const database = drizzle({ client: pool, schema, casing: "snake_case" });
  perRequest.set(ctx, database);
  return database;
}

export function db(): Database {
  if (onCloudflareWorkers) return workersDb();
  if (!globalForDb.ashDb) globalForDb.ashDb = createDb();
  return globalForDb.ashDb;
}

export { schema };
