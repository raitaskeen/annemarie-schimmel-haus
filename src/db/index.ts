import "server-only";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { env } from "@/lib/env";
import * as schema from "./schema";

export type Database = NodePgDatabase<typeof schema>;

/**
 * One pool per server process. In development the module is re-evaluated on
 * every hot reload, so the pool is parked on globalThis to avoid leaking
 * connections.
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
      application_name: "ash-web",
    });
  globalForDb.ashPool = pool;
  return drizzle({ client: pool, schema, casing: "snake_case" });
}

export function db(): Database {
  if (!globalForDb.ashDb) globalForDb.ashDb = createDb();
  return globalForDb.ashDb;
}

export { schema };
