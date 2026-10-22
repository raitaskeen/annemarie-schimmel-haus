/**
 * Read-only SQL helper for local debugging:
 *   bun --env-file=.env.local scripts/sql.ts "select count(*) from enrollments"
 * Runs inside a READ ONLY transaction so it can never change data.
 */
import { Client } from "pg";

const query = process.argv[2];
if (!query) {
  console.error('Usage: bun --env-file=.env.local scripts/sql.ts "<select …>"');
  process.exit(1);
}
const client = new Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
try {
  await client.query("begin transaction read only");
  const result = await client.query(query);
  console.table(result.rows);
} finally {
  await client.query("rollback").catch(() => {});
  await client.end();
}
