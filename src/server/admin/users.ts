import "server-only";
import { and, count, desc, eq, gt, ilike, isNull, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { auditLogs, authTokens, sessions, users } from "@/db/schema";

export async function listUsers() {
  return db()
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      status: users.status,
      totpEnabledAt: users.totpEnabledAt,
      lastLoginAt: users.lastLoginAt,
      lockedUntil: users.lockedUntil,
      locked: sql<boolean>`coalesce(${users.lockedUntil} > now(), false)`,
      createdAt: users.createdAt,
      activeSessions: sql<number>`(select count(*)::int from sessions s where s.user_id = "users"."id" and s.mfa_pending = false and s.expires_at > now())`,
      pendingInvite: sql<boolean>`exists (select 1 from auth_tokens t where t.user_id = "users"."id" and t.purpose = 'invite' and t.used_at is null and t.expires_at > now())`,
    })
    .from(users)
    .orderBy(sql`case ${users.status} when 'active' then 0 when 'invited' then 1 else 2 end`, users.name);
}

export async function getUserAdmin(id: string) {
  if (!/^[0-9a-f-]{36}$/.test(id)) return null;
  const [u] = await db()
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      status: users.status,
      totpEnabledAt: users.totpEnabledAt,
      lastLoginAt: users.lastLoginAt,
      lockedUntil: users.lockedUntil,
      locked: sql<boolean>`coalesce(${users.lockedUntil} > now(), false)`,
      failedLoginCount: users.failedLoginCount,
      passwordChangedAt: users.passwordChangedAt,
      createdAt: users.createdAt,
      hasPassword: sql<boolean>`${users.passwordHash} is not null`,
    })
    .from(users)
    .where(eq(users.id, id))
    .limit(1);
  if (!u) return null;
  const [activity, [{ n: sessionCount }], [invite]] = await Promise.all([
    db().select().from(auditLogs).where(eq(auditLogs.actorId, id)).orderBy(desc(auditLogs.createdAt)).limit(15),
    db()
      .select({ n: count() })
      .from(sessions)
      .where(and(eq(sessions.userId, id), eq(sessions.mfaPending, false), gt(sessions.expiresAt, new Date()))),
    db()
      .select({ expiresAt: authTokens.expiresAt })
      .from(authTokens)
      .where(and(eq(authTokens.userId, id), eq(authTokens.purpose, "invite"), isNull(authTokens.usedAt), gt(authTokens.expiresAt, new Date())))
      .orderBy(desc(authTokens.createdAt))
      .limit(1),
  ]);
  return { u, activity, sessionCount, inviteExpiresAt: invite?.expiresAt ?? null };
}

/* ---------------------------------------------------------------- audit log */

export const AUDIT_PAGE_SIZE = 50;

export async function listAudit(f: { q?: string; entity?: string; actor?: string; page?: string }) {
  const parts: (SQL | undefined)[] = [];
  if (f.entity && /^[a-z_]{2,40}$/.test(f.entity)) parts.push(eq(auditLogs.entityType, f.entity));
  if (f.actor && /^[0-9a-f-]{36}$/.test(f.actor)) parts.push(eq(auditLogs.actorId, f.actor));
  if (f.q?.trim()) {
    const like = `%${f.q.trim()}%`;
    parts.push(or(ilike(auditLogs.summary, like), ilike(auditLogs.action, like), ilike(auditLogs.actorEmail, like), ilike(auditLogs.entityId, like)));
  }
  const where = parts.length ? and(...parts) : undefined;
  const page = Math.max(1, Math.min(2000, Number.parseInt(f.page ?? "1", 10) || 1));
  const [rows, [{ total }], entities, actors] = await Promise.all([
    db()
      .select()
      .from(auditLogs)
      .where(where)
      .orderBy(desc(auditLogs.createdAt))
      .limit(AUDIT_PAGE_SIZE)
      .offset((page - 1) * AUDIT_PAGE_SIZE),
    db().select({ total: count() }).from(auditLogs).where(where),
    db().selectDistinct({ entityType: auditLogs.entityType }).from(auditLogs).orderBy(auditLogs.entityType),
    db().select({ id: users.id, name: users.name }).from(users).orderBy(users.name),
  ]);
  return { rows, total, page, pageCount: Math.ceil(total / AUDIT_PAGE_SIZE), entities: entities.map((e) => e.entityType), actors };
}
