import "server-only";
import { and, count, desc, eq, ilike, inArray, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { contactMessages, newsletterSubscribers, notifications } from "@/db/schema";

export const PAGE_SIZE = 25;
const page = (p?: string) => Math.max(1, Math.min(1000, Number.parseInt(p ?? "1", 10) || 1));

/* ---------------------------------------------------------------- messages */

export const MESSAGE_STATUSES = ["new", "in_progress", "answered", "closed"] as const;
export const MESSAGE_TOPICS = ["courses", "exams", "events", "placement", "partnership", "press", "other"] as const;

export async function listMessages(f: { q?: string; status?: string; topic?: string; page?: string }) {
  const parts: (SQL | undefined)[] = [];
  if (f.status && (MESSAGE_STATUSES as readonly string[]).includes(f.status)) parts.push(eq(contactMessages.status, f.status as "new"));
  else if (!f.status) parts.push(inArray(contactMessages.status, ["new", "in_progress"]));
  if (f.topic) parts.push(eq(contactMessages.topic, f.topic as "other"));
  if (f.q?.trim()) {
    const like = `%${f.q.trim()}%`;
    parts.push(or(ilike(contactMessages.name, like), ilike(contactMessages.email, like), ilike(contactMessages.subject, like), ilike(contactMessages.reference, like)));
  }
  const where = parts.length ? and(...parts) : undefined;
  const p = page(f.page);
  const [rows, [{ total }]] = await Promise.all([
    db()
      .select()
      .from(contactMessages)
      .where(where)
      .orderBy(sql`case ${contactMessages.status} when 'new' then 0 when 'in_progress' then 1 else 2 end`, desc(contactMessages.createdAt))
      .limit(PAGE_SIZE)
      .offset((p - 1) * PAGE_SIZE),
    db().select({ total: count() }).from(contactMessages).where(where),
  ]);
  return { rows, total, page: p, pageCount: Math.ceil(total / PAGE_SIZE) };
}

export async function getMessage(id: string) {
  if (!/^[0-9a-f-]{36}$/.test(id)) return null;
  const [m] = await db().select().from(contactMessages).where(eq(contactMessages.id, id)).limit(1);
  if (!m) return null;
  const sent = await db()
    .select()
    .from(notifications)
    .where(and(eq(notifications.relatedType, "contact_message"), eq(notifications.relatedId, m.id)))
    .orderBy(desc(notifications.createdAt));
  return { m, sent };
}

/* ------------------------------------------------------------- subscribers */

export async function listSubscribers(f: { q?: string; status?: string; page?: string }) {
  const parts: (SQL | undefined)[] = [];
  if (f.status && ["pending", "active", "unsubscribed"].includes(f.status)) parts.push(eq(newsletterSubscribers.status, f.status as "active"));
  if (f.q?.trim()) parts.push(ilike(newsletterSubscribers.email, `%${f.q.trim()}%`));
  const where = parts.length ? and(...parts) : undefined;
  const p = page(f.page);
  const [rows, [{ total }], byStatus] = await Promise.all([
    db().select().from(newsletterSubscribers).where(where).orderBy(desc(newsletterSubscribers.createdAt)).limit(PAGE_SIZE).offset((p - 1) * PAGE_SIZE),
    db().select({ total: count() }).from(newsletterSubscribers).where(where),
    db().select({ status: newsletterSubscribers.status, n: count() }).from(newsletterSubscribers).groupBy(newsletterSubscribers.status),
  ]);
  return { rows, total, page: p, pageCount: Math.ceil(total / PAGE_SIZE), byStatus: Object.fromEntries(byStatus.map((b) => [b.status, b.n])) as Record<string, number> };
}

export async function exportSubscribers() {
  return db()
    .select({ email: newsletterSubscribers.email, language: newsletterSubscribers.locale, confirmed_at: newsletterSubscribers.confirmedAt })
    .from(newsletterSubscribers)
    .where(eq(newsletterSubscribers.status, "active"))
    .orderBy(newsletterSubscribers.email);
}

/* ------------------------------------------------------------ notifications */

export const NOTIFICATION_STATUSES = ["queued", "sending", "sent", "failed", "skipped"] as const;

export async function listNotifications(f: { q?: string; status?: string; channel?: string; page?: string }) {
  const parts: (SQL | undefined)[] = [];
  if (f.status && (NOTIFICATION_STATUSES as readonly string[]).includes(f.status)) parts.push(eq(notifications.status, f.status as "sent"));
  if (f.channel === "email" || f.channel === "whatsapp") parts.push(eq(notifications.channel, f.channel));
  if (f.q?.trim()) {
    const like = `%${f.q.trim()}%`;
    parts.push(or(ilike(notifications.recipient, like), ilike(notifications.subject, like), ilike(notifications.template, like), sql`${notifications.payload}->>'reference' ilike ${like}`));
  }
  const where = parts.length ? and(...parts) : undefined;
  const p = page(f.page);
  const [rows, [{ total }], byStatus] = await Promise.all([
    db().select().from(notifications).where(where).orderBy(desc(notifications.createdAt)).limit(PAGE_SIZE).offset((p - 1) * PAGE_SIZE),
    db().select({ total: count() }).from(notifications).where(where),
    db().select({ status: notifications.status, n: count() }).from(notifications).groupBy(notifications.status),
  ]);
  return { rows, total, page: p, pageCount: Math.ceil(total / PAGE_SIZE), byStatus: Object.fromEntries(byStatus.map((b) => [b.status, b.n])) as Record<string, number> };
}

export async function getNotification(id: string) {
  if (!/^[0-9a-f-]{36}$/.test(id)) return null;
  const [n] = await db().select().from(notifications).where(eq(notifications.id, id)).limit(1);
  return n ?? null;
}
