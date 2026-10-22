/**
 * Applies database migrations to DATABASE_URL (production / staging).
 *   DATABASE_URL=postgres://… bun scripts/migrate.ts
 * For local development `bun run local` does this automatically.
 */
import path from "node:path";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Client } from "pg";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set.");
  process.exit(1);
}

const client = new Client({ connectionString: url });
await client.connect();
try {
  await migrate(drizzle({ client, casing: "snake_case" }), { migrationsFolder: path.join(import.meta.dirname, "..", "drizzle") });
  console.log("Migrations applied.");
} finally {
  await client.end();
}
