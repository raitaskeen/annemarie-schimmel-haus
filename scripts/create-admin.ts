/**
 * Creates the first administrator by invitation — nobody ever sees or sets their password.
 *   DATABASE_URL=… APP_URL=https://… bun scripts/create-admin.ts "Name" name@schimmel.com.pk
 * Prints a single-use activation link (valid 72 hours). Open it and choose a password.
 */
import { createHash, randomBytes } from "node:crypto";
import { Client } from "pg";

const [name, emailArg] = process.argv.slice(2);
const email = emailArg?.trim().toLowerCase();
if (!name?.trim() || !email || !/^\S+@\S+\.\S+$/.test(email)) {
  console.error('Usage: bun scripts/create-admin.ts "Full Name" email@example.com');
  process.exit(1);
}
const url = process.env.DATABASE_URL;
const appUrl = (process.env.APP_URL ?? "http://localhost:4000").replace(/\/$/, "");
if (!url) {
  console.error("DATABASE_URL is not set.");
  process.exit(1);
}

const client = new Client({ connectionString: url });
await client.connect();
try {
  await client.query("begin");
  const existing = await client.query<{ id: string; status: string }>("select id, status from users where lower(email) = $1", [email]);
  let userId = existing.rows[0]?.id;
  if (existing.rows[0] && existing.rows[0].status !== "invited") {
    throw new Error(`${email} already has an active account. Use “Forgot password” on the login page instead.`);
  }
  if (!userId) {
    const inserted = await client.query<{ id: string }>("insert into users (email, name, role, status) values ($1, $2, 'admin', 'invited') returning id", [email, name.trim()]);
    userId = inserted.rows[0].id;
  }
  await client.query("update auth_tokens set used_at = now() where user_id = $1 and purpose = 'invite' and used_at is null", [userId]);
  const token = randomBytes(32).toString("base64url");
  await client.query("insert into auth_tokens (user_id, purpose, token_hash, expires_at) values ($1, 'invite', $2, now() + interval '72 hours')", [
    userId,
    createHash("sha256").update(token).digest("hex"),
  ]);
  await client.query("insert into audit_logs (action, entity_type, entity_id, summary) values ('user.invite', 'user', $1, $2)", [userId, `Administrator ${email} invited from the command line`]);
  await client.query("commit");
  console.log(`\nAdministrator invited: ${email}\nActivation link (single use, 72 hours):\n\n  ${appUrl}/admin/invite/${token}\n`);
} catch (error) {
  await client.query("rollback").catch(() => {});
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  await client.end();
}
