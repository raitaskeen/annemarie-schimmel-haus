"use server";

import { redirect } from "next/navigation";
import { and, count, eq, isNull, ne, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { authTokens, users } from "@/db/schema";
import { audit } from "@/lib/audit";
import { randomToken, sha256Hex } from "@/lib/auth/crypto";
import { roleLabels } from "@/lib/auth/permissions";
import type { SessionUser } from "@/lib/auth/session";
import { revokeUserSessions } from "@/lib/auth/session";
import { env } from "@/lib/env";
import { userInviteSchema, userUpdateSchema } from "@/lib/schemas/admin";
import { ActionError, adminAction, formObject, type ActionState } from "@/server/admin/action-utils";
import { dispatchAfterResponse, enqueue } from "@/server/notifications/outbox";

const uuid = z.string().uuid();
const INVITE_HOURS = 72;

/** Creates a single-use invite link (the token itself is only ever in the email/link). */
async function issueInvite(actor: SessionUser, user: { id: string; name: string; email: string; role: keyof typeof roleLabels }) {
  await db()
    .update(authTokens)
    .set({ usedAt: new Date() })
    .where(and(eq(authTokens.userId, user.id), eq(authTokens.purpose, "invite"), isNull(authTokens.usedAt)));
  const token = randomToken(32);
  await db().insert(authTokens).values({ userId: user.id, purpose: "invite", tokenHash: sha256Hex(token), expiresAt: new Date(Date.now() + INVITE_HOURS * 3600_000) });
  const url = `${env().APP_URL}/admin/invite/${token}`;
  const ids = await enqueue({
    template: "auth.invite",
    locale: "en",
    email: user.email,
    related: { type: "user", id: user.id },
    payload: { name: user.name.split(" ")[0], url, inviter: actor.name, role: roleLabels[user.role], hours: INVITE_HOURS },
  });
  dispatchAfterResponse(ids);
  return url;
}

export async function inviteUserAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return adminAction("users:manage", async (actor) => {
    const input = userInviteSchema.parse(formObject(formData));
    const [exists] = await db().select({ id: users.id }).from(users).where(eq(sql`lower(${users.email})`, input.email)).limit(1);
    if (exists) return { error: "A staff account with this email already exists.", fieldErrors: { email: "Already in use." } };
    const [user] = await db().insert(users).values({ ...input, status: "invited" }).returning({ id: users.id });
    const url = await issueInvite(actor, { id: user.id, ...input });
    await audit(actor, { action: "user.invite", entityType: "user", entityId: user.id, summary: `Invited ${input.email} as ${roleLabels[input.role]}` });
    // The link is shown once so it can be shared manually if email is not connected yet.
    return { ok: true, message: `Invitation created for ${input.email}.`, data: { inviteUrl: url, userId: user.id } };
  });
}

export async function resendInviteAction(id: string, _prev: ActionState, _formData: FormData): Promise<ActionState> {
  return adminAction("users:manage", async (actor) => {
    const [user] = await db().select().from(users).where(eq(users.id, uuid.parse(id))).limit(1);
    if (!user) throw new ActionError("User not found.");
    if (user.status !== "invited") throw new ActionError("This account is already activated.");
    const url = await issueInvite(actor, user);
    await audit(actor, { action: "user.invite_resent", entityType: "user", entityId: user.id, summary: `Re-sent invitation to ${user.email}` });
    return { ok: true, message: "A new invitation link was created. The old one no longer works.", data: { inviteUrl: url } };
  });
}

/** At least one active administrator must always remain. */
async function assertAnotherAdmin(exceptId: string) {
  const [{ n }] = await db()
    .select({ n: count() })
    .from(users)
    .where(and(eq(users.role, "admin"), eq(users.status, "active"), ne(users.id, exceptId)));
  if (n === 0) throw new ActionError("This is the last active administrator. Make someone else an administrator first.");
}

export async function updateUserAction(id: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  return adminAction("users:manage", async (actor) => {
    const input = userUpdateSchema.parse(formObject(formData));
    const [before] = await db().select().from(users).where(eq(users.id, uuid.parse(id))).limit(1);
    if (!before) throw new ActionError("User not found.");
    if (before.id === actor.id && (input.role !== before.role || input.status !== before.status)) throw new ActionError("You cannot change your own role or status. Ask another administrator.");
    if (before.role === "admin" && before.status === "active" && (input.role !== "admin" || input.status !== "active")) await assertAnotherAdmin(before.id);
    if (input.status === "active" && !before.passwordHash) throw new ActionError("This person has not set a password yet. Re-send the invitation instead.");
    if (input.status === "invited" && before.status !== "invited") throw new ActionError("An activated account cannot go back to “invited”.");

    await db().update(users).set(input).where(eq(users.id, before.id));
    // Role or status changes take effect immediately: existing sessions are ended.
    if (input.role !== before.role || input.status !== before.status) await revokeUserSessions(before.id);
    const changes: string[] = [];
    if (input.name !== before.name) changes.push("name");
    if (input.role !== before.role) changes.push(`role ${before.role} → ${input.role}`);
    if (input.status !== before.status) changes.push(`status ${before.status} → ${input.status}`);
    await audit(actor, { action: "user.update", entityType: "user", entityId: before.id, summary: `Updated ${before.email}: ${changes.join(", ") || "no changes"}` });
    return { ok: true, message: "Saved." };
  });
}

export async function resetUserTwoFactorAction(id: string, _prev: ActionState, _formData: FormData): Promise<ActionState> {
  return adminAction("users:manage", async (actor) => {
    const [user] = await db()
      .update(users)
      .set({ totpSecret: null, totpEnabledAt: null })
      .where(eq(users.id, uuid.parse(id)))
      .returning({ id: users.id, email: users.email });
    if (!user) throw new ActionError("User not found.");
    await revokeUserSessions(user.id);
    await audit(actor, { action: "user.2fa_reset", entityType: "user", entityId: user.id, summary: `Reset two-factor authentication for ${user.email}` });
    return { ok: true, message: "Two-factor authentication removed. They can set it up again after signing in." };
  });
}

export async function signOutUserAction(id: string, _prev: ActionState, _formData: FormData): Promise<ActionState> {
  return adminAction("users:manage", async (actor) => {
    const userId = uuid.parse(id);
    await revokeUserSessions(userId, userId === actor.id ? actor.sessionId : undefined);
    await audit(actor, { action: "user.sessions_revoked", entityType: "user", entityId: userId, summary: "Signed the user out on all devices" });
    return { ok: true, message: "Signed out everywhere." };
  });
}

export async function unlockUserAction(id: string, _prev: ActionState, _formData: FormData): Promise<ActionState> {
  return adminAction("users:manage", async (actor) => {
    const [user] = await db()
      .update(users)
      .set({ lockedUntil: null, failedLoginCount: 0 })
      .where(eq(users.id, uuid.parse(id)))
      .returning({ email: users.email });
    if (!user) throw new ActionError("User not found.");
    await audit(actor, { action: "user.unlock", entityType: "user", entityId: id, summary: `Unlocked ${user.email}` });
    return { ok: true, message: "Account unlocked." };
  });
}

export async function deleteInvitedUserAction(id: string, _prev: ActionState, _formData: FormData): Promise<ActionState> {
  const result = await adminAction("users:manage", async (actor) => {
    const [user] = await db()
      .delete(users)
      .where(and(eq(users.id, uuid.parse(id)), eq(users.status, "invited")))
      .returning({ email: users.email });
    if (!user) throw new ActionError("Only pending invitations can be deleted. Disable active accounts instead (their history stays in the audit log).");
    await audit(actor, { action: "user.invite_deleted", entityType: "user", entityId: id, summary: `Withdrew the invitation for ${user.email}` });
    return { ok: true };
  });
  if (result?.ok) redirect("/admin/users");
  return result;
}
