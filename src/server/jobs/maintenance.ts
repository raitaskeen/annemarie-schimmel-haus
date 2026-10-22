import "server-only";
import { lt, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { authTokens, whatsappMessages } from "@/db/schema";
import { pruneSessions } from "@/lib/auth/session";
import { pruneRateLimits } from "@/lib/security/rate-limit";
import { dispatch } from "@/server/notifications/outbox";
import { autoCloseAndComplete, purgeOldDocuments, releaseUnpaidSeats, sendPaymentReminders, sendReminders, sendStaffDigest, sweepWaitlists } from "./automation";

/** Inbound WhatsApp messages are personal data; keep them only as long as needed. */
const WHATSAPP_RETENTION_DAYS = 180;

/**
 * Periodic housekeeping (run every 5 to 15 minutes by a scheduler). Each step is
 * idempotent and isolated, so one failing step never blocks the others.
 */
export async function runMaintenance() {
  const report: Record<string, number | string | boolean> = {};
  const step = async (name: string, fn: () => Promise<unknown>) => {
    try {
      const value = await fn();
      if (typeof value === "number" || typeof value === "boolean" || typeof value === "string") report[name] = value;
      else if (value && typeof value === "object") for (const [k, v] of Object.entries(value)) report[`${name}.${k}`] = v as number;
    } catch (error) {
      console.error(`maintenance step ${name} failed`, error);
      report[name] = "error";
    }
  };

  await step("released", releaseUnpaidSeats);
  await step("autoClose", autoCloseAndComplete);
  await step("promoted", sweepWaitlists);
  await step("paymentReminders", sendPaymentReminders);
  await step("reminders", sendReminders);
  await step("digest", () => sendStaffDigest());
  await step("notifications", async () => {
    const { claimed, sent } = await dispatch({ limit: 100 });
    return { claimed, sent };
  });
  await step("documentsPurged", purgeOldDocuments);
  await step("cleanup", async () => {
    await pruneSessions();
    await pruneRateLimits();
    const tokens = await db()
      .delete(authTokens)
      .where(or(lt(authTokens.expiresAt, new Date(Date.now() - 7 * 86400_000)), sql`${authTokens.usedAt} < now() - interval '7 days'`))
      .returning({ id: authTokens.id });
    const wa = await db()
      .delete(whatsappMessages)
      .where(lt(whatsappMessages.createdAt, new Date(Date.now() - WHATSAPP_RETENTION_DAYS * 86400_000)))
      .returning({ id: whatsappMessages.id });
    return { authTokens: tokens.length, whatsappMessages: wa.length };
  });
  return report;
}
