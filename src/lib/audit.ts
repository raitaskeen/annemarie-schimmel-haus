import "server-only";
import { db, type Database } from "@/db";
import { auditLogs } from "@/db/schema";
import type { SessionUser } from "@/lib/auth/session";
import { requestMeta } from "@/lib/security/request";

const SENSITIVE = /password|secret|token|cnic|totp|hash/i;

/** Removes secrets and personal identifiers before changes are written to the audit log. */
export function redact(value: Record<string, unknown> | undefined) {
  if (!value) return undefined;
  return Object.fromEntries(
    Object.entries(value).map(([k, v]) => [k, SENSITIVE.test(k) ? "[redacted]" : typeof v === "string" && v.length > 500 ? `${v.slice(0, 500)}…` : v]),
  );
}

export async function audit(
  actor: Pick<SessionUser, "id" | "email"> | null,
  entry: { action: string; entityType: string; entityId?: string | null; summary: string; changes?: Record<string, unknown> },
  tx: Pick<Database, "insert"> = db(),
) {
  const meta = await requestMeta().catch(() => ({ ip: null, userAgent: null }));
  await tx.insert(auditLogs).values({
    actorId: actor?.id ?? null,
    actorEmail: actor?.email ?? null,
    action: entry.action,
    entityType: entry.entityType,
    entityId: entry.entityId ?? null,
    summary: entry.summary,
    changes: redact(entry.changes) ?? null,
    ip: meta.ip,
    userAgent: meta.userAgent,
  });
}
