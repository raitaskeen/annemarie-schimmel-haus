/**
 * LOCAL DEVELOPMENT ONLY — creates or updates an administrator with a password.
 *   ADMIN_PASSWORD='…' bun --env-file=.env.local scripts/local-admin.ts "Full Name" you@example.com
 * The password is read from the environment (never from arguments, so it does not end
 * up in shell history listings), checked against the password policy and stored as a
 * scrypt hash. In production create administrators by invitation: scripts/create-admin.ts.
 */
import { Client } from "pg";
import { hashPassword, passwordProblems } from "../src/lib/auth/password";

if (process.env.NODE_ENV === "production") {
  console.error("Refusing to set passwords in production. Use scripts/create-admin.ts (invitation link) instead.");
  process.exit(1);
}
const [name, emailArg] = process.argv.slice(2);
const email = emailArg?.trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD ?? "";
if (!name?.trim() || !email || !/^\S+@\S+\.\S+$/.test(email) || !password) {
  console.error("Usage: ADMIN_PASSWORD='…' bun --env-file=.env.local scripts/local-admin.ts \"Full Name\" email@example.com");
  process.exit(1);
}
const problems = passwordProblems(password, [name, email.split("@")[0], "schimmel", "annemarie"]);
if (problems.length) {
  console.error(`Password rejected: ${problems.join(" ")}`);
  process.exit(1);
}

const client = new Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
try {
  const hash = await hashPassword(password);
  const res = await client.query<{ id: string; created: boolean }>(
    `insert into users (email, name, role, status, password_hash, password_changed_at)
     values ($1, $2, 'admin', 'active', $3, now())
     on conflict (lower(email)) do update set role = 'admin', status = 'active', name = excluded.name,
       password_hash = excluded.password_hash, password_changed_at = now(), failed_login_count = 0, locked_until = null
     returning id, (xmax = 0) as created`,
    [email, name.trim(), hash],
  );
  await client.query("delete from sessions where user_id = $1", [res.rows[0].id]);
  await client.query("insert into audit_logs (action, entity_type, entity_id, summary) values ('user.local_admin', 'user', $1, $2)", [
    res.rows[0].id,
    `Administrator ${email} ${res.rows[0].created ? "created" : "updated"} with the local helper script`,
  ]);
  console.log(`${res.rows[0].created ? "Created" : "Updated"} administrator ${email}. Sign in at ${process.env.APP_URL ?? "http://localhost:4000"}/admin/login`);
} finally {
  await client.end();
}
