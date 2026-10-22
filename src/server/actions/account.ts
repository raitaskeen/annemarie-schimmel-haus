"use server";

import { eq, sql } from "drizzle-orm";
import { encode } from "uqr";
import { z } from "zod";
import { db } from "@/db";
import { users } from "@/db/schema";
import { audit } from "@/lib/audit";
import { decrypt, deriveKey, encrypt } from "@/lib/auth/crypto";
import { hashPassword, passwordProblems, verifyPassword } from "@/lib/auth/password";
import { revokeSession, revokeUserSessions } from "@/lib/auth/session";
import { generateTotpSecret, otpauthUri, verifyTotp } from "@/lib/auth/totp";
import { env } from "@/lib/env";
import { rateLimit } from "@/lib/security/rate-limit";
import { ActionError, adminAction, type ActionState } from "@/server/admin/action-utils";

/** Self-service account actions. Every staff role may manage its own account. */
const SELF = "dashboard:view" as const;
const totpKey = () => deriveKey(env().AUTH_SECRET, "totp-secret");

export async function updateProfileAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return adminAction(SELF, async (user) => {
    const name = z.string().trim().min(2, "Enter your name.").max(120).parse(formData.get("name"));
    await db().update(users).set({ name }).where(eq(users.id, user.id));
    await audit(user, { action: "account.profile", entityType: "user", entityId: user.id, summary: "Updated own profile" });
    return { ok: true, message: "Profile saved." };
  });
}

export async function changePasswordAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return adminAction(SELF, async (user): Promise<ActionState> => {
    if (!(await rateLimit("change-password", user.id, { limit: 5, windowSeconds: 900 })).ok) throw new ActionError("Too many attempts. Please wait a few minutes.");
    const current = String(formData.get("current") ?? "");
    const next = String(formData.get("password") ?? "");
    const confirm = String(formData.get("confirm") ?? "");
    const [row] = await db().select({ passwordHash: users.passwordHash }).from(users).where(eq(users.id, user.id)).limit(1);
    if (!(await verifyPassword(current, row?.passwordHash))) return { error: "Your current password is not correct.", fieldErrors: { current: "Not correct." } };
    const problems = passwordProblems(next, [user.name, user.email.split("@")[0], "schimmel", "annemarie"]);
    if (next === current) problems.push("Choose a password you have not used here before.");
    if (next !== confirm) problems.push("The two passwords do not match.");
    if (problems.length) return { error: "Please choose a stronger password.", fieldErrors: { password: problems.join(" ") } };
    await db()
      .update(users)
      .set({ passwordHash: await hashPassword(next), passwordChangedAt: new Date() })
      .where(eq(users.id, user.id));
    await revokeUserSessions(user.id, user.sessionId);
    await audit(user, { action: "account.password", entityType: "user", entityId: user.id, summary: "Changed own password (other devices signed out)" });
    return { ok: true, message: "Password changed. You were signed out on all other devices." };
  });
}

/** Step 1: create a secret (stored encrypted, not yet active) and return the QR payload. */
export async function beginTwoFactorAction(): Promise<ActionState> {
  return adminAction(SELF, async (user) => {
    if (user.totpEnabled) throw new ActionError("Two-factor authentication is already on.");
    const secret = generateTotpSecret();
    await db()
      .update(users)
      .set({ totpSecret: encrypt(secret, totpKey()), totpEnabledAt: null })
      .where(eq(users.id, user.id));
    const uri = otpauthUri({ secret, account: user.email, issuer: "ASH Admin" });
    return { ok: true, data: { secret, qr: encode(uri, { ecc: "M", border: 2 }).data } };
  });
}

/** Step 2: prove the authenticator works, then switch it on. */
export async function confirmTwoFactorAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return adminAction(SELF, async (user) => {
    if (!(await rateLimit("totp-setup", user.id, { limit: 8, windowSeconds: 600 })).ok) throw new ActionError("Too many attempts. Please wait a few minutes.");
    const code = String(formData.get("code") ?? "").replace(/\s/g, "");
    const [row] = await db().select({ totpSecret: users.totpSecret }).from(users).where(eq(users.id, user.id)).limit(1);
    if (!row?.totpSecret) throw new ActionError("Start the setup again.");
    if (verifyTotp(decrypt(row.totpSecret, totpKey()), code) === null) return { error: "That code is not valid. Check the time on your phone and try again.", fieldErrors: { code: "Invalid code." } };
    await db().update(users).set({ totpEnabledAt: sql`now()` }).where(eq(users.id, user.id));
    await revokeUserSessions(user.id, user.sessionId);
    await audit(user, { action: "account.2fa_enabled", entityType: "user", entityId: user.id, summary: "Turned on two-factor authentication" });
    return { ok: true, message: "Two-factor authentication is on. You'll be asked for a code at every sign-in." };
  });
}

export async function disableTwoFactorAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return adminAction(SELF, async (user) => {
    if (!(await rateLimit("totp-disable", user.id, { limit: 5, windowSeconds: 900 })).ok) throw new ActionError("Too many attempts. Please wait a few minutes.");
    const [row] = await db().select({ passwordHash: users.passwordHash, totpSecret: users.totpSecret }).from(users).where(eq(users.id, user.id)).limit(1);
    const passwordOk = await verifyPassword(String(formData.get("password") ?? ""), row?.passwordHash);
    const codeOk = !!row?.totpSecret && verifyTotp(decrypt(row.totpSecret, totpKey()), String(formData.get("code") ?? "").replace(/\s/g, "")) !== null;
    if (!passwordOk || !codeOk) return { error: "Password or code not correct." };
    await db().update(users).set({ totpSecret: null, totpEnabledAt: null }).where(eq(users.id, user.id));
    await audit(user, { action: "account.2fa_disabled", entityType: "user", entityId: user.id, summary: "Turned off two-factor authentication" });
    return { ok: true, message: "Two-factor authentication is off." };
  });
}

export async function revokeMySessionAction(sessionId: string, _prev: ActionState, _formData: FormData): Promise<ActionState> {
  return adminAction(SELF, async (user) => {
    const id = z.string().regex(/^[0-9a-f]{64}$/).parse(sessionId);
    if (id === user.sessionId) throw new ActionError("Use “Sign out” to end this session.");
    await revokeSession(user.id, id);
    await audit(user, { action: "account.session_revoked", entityType: "user", entityId: user.id, summary: "Signed out another device" });
    return { ok: true, message: "Device signed out." };
  });
}

export async function revokeOtherSessionsAction(_prev: ActionState, _formData: FormData): Promise<ActionState> {
  return adminAction(SELF, async (user) => {
    await revokeUserSessions(user.id, user.sessionId);
    await audit(user, { action: "account.sessions_revoked", entityType: "user", entityId: user.id, summary: "Signed out all other devices" });
    return { ok: true, message: "All other devices were signed out." };
  });
}
