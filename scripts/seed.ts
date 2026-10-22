/**
 * Loads the initial catalogue into an empty database (does nothing if courses exist).
 *   SEED_SAMPLES=false DATABASE_URL=postgres://… bun scripts/seed.ts
 * SEED_SAMPLES=false skips all synthetic applicants — always use it for production.
 * In production no administrator is created here; use scripts/create-admin.ts.
 */
import { seed } from "../src/db/seed";

if (process.env.NODE_ENV === "production" && process.env.SEED_SAMPLES !== "false") {
  console.error("Refusing to load synthetic sample data in production. Set SEED_SAMPLES=false.");
  process.exit(1);
}
await seed({ force: false });
