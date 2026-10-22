"use server";

import { redirect } from "next/navigation";
import { and, eq, gt, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { authTokens, users } from "@/db/schema";
import { audit } from "@/lib/audit";
import { decrypt, deriveKey, randomToken, sha256Hex } from "@/lib/auth/crypto";
import { getSessionUser } from "@/lib/auth/dal";
import { hashPassword, needsRehash, passwordProblems, verifyPassword } from "@/lib/auth/password";
import { createSession, destroyCurrentSession, readSession, revokeUserSessions } from "@/lib/auth/session";
import { verifyTotp } from "@/lib/auth/totp";
import { env } from "@/lib/env";
import { rateLimit } from "@/lib/security/rate-limit";
import { requestMeta } from "@/lib/security/request";
import { dispatchAfterResponse, enqueue } from "@/server/notifications/outbox";

/**
 * Staff authentication.
 * - Generic error messages (no account enumeration), constant-time checks.
 * - Per-IP and per-account rate limits plus progressive account lockout.
 * - Optional TOTP second factor; sessions are rotated after each factor.
 */
export type FormState = { error?: string; message?: string; fieldErrors?: Record<string, string> } | null;

const MAX_FAILURES = 5;
const GENERIC = "Incorrect email or password.";

const safeNext = (value: FormDataEntryValue | null) => {
  const v = typeof value === "string" ? value : "";
  return /^\/admin(\/[\w\-/]*)?$/.test(v) && !v.startsWith("/admin/login") ? v : "/admin";
};

const totpKey = () => deriveKey(env().AUTH_SECRET, "totp-secret");

export async function loginAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = z
    .object({ email: z.string().trim().toLowerCase().email().max(160), password: z.string().min(1).max(256) })
    .safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) return { error: GENERIC };
  const { email, password } = parsed.data;
  const meta = await requestMeta();

  const [byIp, byAccount] = await Promise.all([
    rateLimit("login-ip", meta.ipHash, { limit: 20, windowSeconds: 900 }),
    rateLimit("login-acct", sha256Hex(email), { limit: 8, windowSeconds: 900 }),
  ]);
  if (!byIp.ok || !byAccount.ok) return { error: "Too many sign-in attempts. Please wait 15 minutes and try again." };

  const [user] = await db().select().from(users).where(eq(sql`lower(${users.email})`, email)).limit(1);
  const locked = user?.lockedUntil && user.lockedUntil.getTime() > Date.now();
  const valid = await verifyPassword(password, user?.passwordHash);

  if (!user || !valid || locked || user.status !== "active") {
    if (user && !valid && !locked) {
      const failures = user.failedLoginCount + 1;
      const lockMinutes = failures >= MAX_FAILURES ? Math.min(24 * 60, 15 * 2 ** (failures - MAX_FAILURES)) : 0;
      await db()
        .update(users)
        .set({ failedLoginCount: failures, lockedUntil: lockMinutes ? new Date(Date.now() + lockMinutes * 60_000) : null })
        .where(eq(users.id, user.id));
      if (lockMinutes) await audit({ id: user.id, email: user.email }, { action: "auth.locked", entityType: "user", entityId: user.id, summary: `Account locked for ${lockMinutes} minutes after ${failures} failed sign-ins` });
    }
    if (locked) return { error: "This account is temporarily locked after repeated failed sign-ins. Try again later or reset your password." };
    return { error: GENERIC };
  }

  await db()
    .update(users)
    .set({
      failedLoginCount: 0,
      lockedUntil: null,
      lastLoginAt: new Date(),
      ...(needsRehash(user.passwordHash!) ? { passwordHash: await hashPassword(password) } : {}),
    })
    .where(eq(users.id, user.id));

  const next = safeNext(formData.get("next"));
  if (user.totpEnabledAt && user.totpSecret) {
    await createSession(user.id, meta, { mfaPending: true });
    redirect(`/admin/login/verify?next=${encodeURIComponent(next)}`);
  }
  await createSession(user.id, meta);
  await audit({ id: user.id, email: user.email }, { action: "auth.login", entityType: "user", entityId: user.id, summary: "Signed in" });
  redirect(next);
}

export async function verifyTotpAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await readSession();
  if (!session?.mfaPending) redirect("/admin/login");
  const meta = await requestMeta();
  const rl = await rateLimit("totp", session.id, { limit: 6, windowSeconds: 300 });
  if (!rl.ok) return { error: "Too many attempts. Please sign in again in a few minutes." };

  const code = String(formData.get("code") ?? "").replace(/\s/g, "");
  const [user] = await db().select({ totpSecret: users.totpSecret, email: users.email }).from(users).where(eq(users.id, session.id)).limit(1);
  if (!user?.totpSecret) redirect("/admin/login");
  const step = verifyTotp(decrypt(user.totpSecret, totpKey()), code);
  if (step === null) return { error: "That code is not valid. Check the time on your phone and try again." };

  // Each code works once.
  const fresh = await db().execute(sql`INSERT INTO rate_limits (key, window_start, count) VALUES (${`totp-used:${session.id}:${step}`}, now(), 1) ON CONFLICT (key) DO NOTHING RETURNING key`);
  if (!fresh.rows.length) return { error: "This code was already used. Wait for the next one." };

  await destroyCurrentSession();
  await createSession(session.id, meta);
  await audit({ id: session.id, email: user.email }, { action: "auth.login", entityType: "user", entityId: session.id, summary: "Signed in with two-factor authentication" });
  redirect(safeNext(formData.get("next")));
}

export async function logoutAction() {
  const user = await getSessionUser();
  await destroyCurrentSession();
  if (user) await audit(user, { action: "auth.logout", entityType: "user", entityId: user.id, summary: "Signed out" });
  redirect("/admin/login");
}

export async function forgotPasswordAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const done: FormState = { message: "If an account exists for this address, we've sent a link to reset the password. It expires in 30 minutes." };
  const email = z.string().trim().toLowerCase().email().safeParse(formData.get("email"));
  if (!email.success) return { error: "Please enter a valid email address." };
  const meta = await requestMeta();
  const rl = await rateLimit("forgot", meta.ipHash, { limit: 5, windowSeconds: 3600 });
  if (!rl.ok) return done;

  const [user] = await db().select().from(users).where(and(eq(sql`lower(${users.email})`, email.data), eq(users.status, "active"))).limit(1);
  if (!user) return done;
  const token = randomToken(32);
  await db().insert(authTokens).values({ userId: user.id, purpose: "password_reset", tokenHash: sha256Hex(token), expiresAt: new Date(Date.now() + 30 * 60_000) });
  const ids = await enqueue({
    template: "auth.reset",
    locale: "en",
    email: user.email,
    payload: { name: user.name.split(" ")[0], url: `${env().APP_URL}/admin/reset-password/${token}`, minutes: 30 },
  });
  dispatchAfterResponse(ids);
  await audit({ id: user.id, email: user.email }, { action: "auth.reset_requested", entityType: "user", entityId: user.id, summary: "Password reset requested" });
  return done;
}

async function consumeToken(token: string, purpose: "invite" | "password_reset") {
  const [row] = await db()
    .select({ id: authTokens.id, userId: authTokens.userId })
    .from(authTokens)
    .where(and(eq(authTokens.tokenHash, sha256Hex(token)), eq(authTokens.purpose, purpose), isNull(authTokens.usedAt), gt(authTokens.expiresAt, new Date())))
    .limit(1);
  return row ?? null;
}

export async function setPasswordWithTokenAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const token = String(formData.get("token") ?? "");
  const purpose = formData.get("purpose") === "invite" ? "invite" : "password_reset";
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  if (!/^[A-Za-z0-9_-]{30,80}$/.test(token)) return { error: "This link is invalid or has expired." };
  const meta = await requestMeta();
  if (!(await rateLimit("set-password", meta.ipHash, { limit: 10, windowSeconds: 900 })).ok) return { error: "Too many attempts. Please wait a few minutes." };

  const row = await consumeToken(token, purpose);
  if (!row) return { error: "This link is invalid or has expired. Ask an administrator for a new one." };
  const [user] = await db().select().from(users).where(eq(users.id, row.userId)).limit(1);
  if (!user || user.status === "disabled") return { error: "This account cannot be activated." };

  const problems = passwordProblems(password, [user.name, user.email.split("@")[0], "schimmel", "annemarie"]);
  if (password !== confirm) problems.push("The two passwords do not match.");
  if (problems.length) return { fieldErrors: { password: problems.join(" ") } };

  await db().transaction(async (tx) => {
    await tx.update(authTokens).set({ usedAt: new Date() }).where(eq(authTokens.id, row.id));
    await tx
      .update(users)
      .set({ passwordHash: await hashPassword(password), passwordChangedAt: new Date(), status: "active", failedLoginCount: 0, lockedUntil: null })
      .where(eq(users.id, user.id));
  });
  await revokeUserSessions(user.id);
  await audit({ id: user.id, email: user.email }, { action: purpose === "invite" ? "auth.invite_accepted" : "auth.password_reset", entityType: "user", entityId: user.id, summary: purpose === "invite" ? "Invitation accepted" : "Password reset" });
  redirect("/admin/login?reset=1");
}
