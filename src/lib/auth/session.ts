import "server-only";
import { cookies } from "next/headers";
import { and, eq, lt, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { sessions, users, type User } from "@/db/schema";
import { isProduction } from "@/lib/env";
import { randomToken, sha256Hex } from "./crypto";

/**
 * Server-side sessions. The browser only holds a random 256-bit token in an
 * HttpOnly cookie; the database stores its SHA-256 hash, so a database leak
 * cannot be replayed. Sessions expire absolutely after 7 days and after 8 hours
 * of inactivity, and can be revoked individually or all at once.
 */
const ABSOLUTE_TTL_MS = 7 * 24 * 3600 * 1000;
const IDLE_TTL_MS = 8 * 3600 * 1000;
const MFA_PENDING_TTL_MS = 10 * 60 * 1000;
const TOUCH_INTERVAL_MS = 5 * 60 * 1000;

export const SESSION_COOKIE = () => (isProduction() ? "__Host-ash_session" : "ash_session");

export type SessionUser = Pick<User, "id" | "email" | "name" | "role" | "status"> & {
  sessionId: string;
  totpEnabled: boolean;
  mfaPending: boolean;
};

async function setCookie(token: string, maxAgeMs: number) {
  (await cookies()).set(SESSION_COOKIE(), token, {
    httpOnly: true,
    secure: isProduction(),
    sameSite: "lax",
    path: "/",
    maxAge: Math.floor(maxAgeMs / 1000),
    priority: "high",
  });
}

export async function createSession(
  userId: string,
  meta: { ip?: string; userAgent?: string },
  { mfaPending = false }: { mfaPending?: boolean } = {},
) {
  const token = randomToken(32);
  const ttl = mfaPending ? MFA_PENDING_TTL_MS : ABSOLUTE_TTL_MS;
  await db()
    .insert(sessions)
    .values({
      id: sha256Hex(token),
      userId,
      mfaPending,
      ip: meta.ip ?? null,
      userAgent: meta.userAgent?.slice(0, 300) ?? null,
      expiresAt: new Date(Date.now() + ttl),
    });
  await setCookie(token, ttl);
}

/** Reads and validates the session cookie. Returns null for missing, expired or idle sessions. */
export async function readSession(): Promise<SessionUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE())?.value;
  if (!token || token.length < 32 || token.length > 128) return null;
  const id = sha256Hex(token);

  const rows = await db()
    .select({
      sessionId: sessions.id,
      mfaPending: sessions.mfaPending,
      lastSeenAt: sessions.lastSeenAt,
      expiresAt: sessions.expiresAt,
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
      status: users.status,
      totpEnabledAt: users.totpEnabledAt,
    })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(eq(sessions.id, id))
    .limit(1);
  const row = rows[0];
  if (!row) return null;

  const now = Date.now();
  const expired = row.expiresAt.getTime() < now || (!row.mfaPending && now - row.lastSeenAt.getTime() > IDLE_TTL_MS);
  if (expired || row.status !== "active") {
    await db().delete(sessions).where(eq(sessions.id, id));
    return null;
  }
  if (now - row.lastSeenAt.getTime() > TOUCH_INTERVAL_MS) {
    await db().update(sessions).set({ lastSeenAt: new Date() }).where(eq(sessions.id, id));
  }
  return {
    sessionId: row.sessionId,
    mfaPending: row.mfaPending,
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    status: row.status,
    totpEnabled: !!row.totpEnabledAt,
  };
}

export async function destroyCurrentSession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE())?.value;
  if (token) await db().delete(sessions).where(eq(sessions.id, sha256Hex(token)));
  jar.delete(SESSION_COOKIE());
}

/** Signs a user out everywhere (password change, disable, role change). */
export async function revokeUserSessions(userId: string, exceptSessionId?: string) {
  await db()
    .delete(sessions)
    .where(exceptSessionId ? and(eq(sessions.userId, userId), sql`${sessions.id} <> ${exceptSessionId}`) : eq(sessions.userId, userId));
}

export async function revokeSession(userId: string, sessionId: string) {
  await db().delete(sessions).where(and(eq(sessions.userId, userId), eq(sessions.id, sessionId)));
}

export async function listSessions(userId: string) {
  return db()
    .select({ id: sessions.id, ip: sessions.ip, userAgent: sessions.userAgent, createdAt: sessions.createdAt, lastSeenAt: sessions.lastSeenAt })
    .from(sessions)
    .where(and(eq(sessions.userId, userId), eq(sessions.mfaPending, false)))
    .orderBy(sql`${sessions.lastSeenAt} desc`);
}

export async function pruneSessions() {
  await db()
    .delete(sessions)
    .where(or(lt(sessions.expiresAt, new Date()), lt(sessions.lastSeenAt, new Date(Date.now() - IDLE_TTL_MS))));
}
