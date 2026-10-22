"use server";

import { updateTag } from "next/cache";
import { db } from "@/db";
import { siteSettings } from "@/db/schema";
import { audit } from "@/lib/audit";
import { TAGS } from "@/lib/cache-tags";
import { gmailConfigured } from "@/lib/env";
import { formatDateTime } from "@/lib/format";
import { rateLimit } from "@/lib/security/rate-limit";
import { siteSettingsSchema } from "@/lib/site-settings-schema";
import { ActionError, adminAction, formObject, type ActionState } from "@/server/admin/action-utils";
import { dispatch, enqueue } from "@/server/notifications/outbox";

/** Turns flat "section.field" form names into the nested settings object. */
function unflatten(flat: Record<string, string>) {
  const out: Record<string, Record<string, unknown>> = {};
  for (const [key, raw] of Object.entries(flat)) {
    const [section, field, ...rest] = key.split(".");
    if (!section || !field || rest.length || !(section in siteSettingsSchema.shape)) continue;
    let value: unknown = raw;
    if (raw === "true" || raw === "false") value = raw === "true";
    if (key === "hours.days") value = raw.split(",").filter(Boolean).map(Number);
    if (/(Hours|Days)$/.test(field)) value = Number(raw);
    (out[section] ??= {})[field] = value;
  }
  return out;
}

export async function saveSettingsAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return adminAction("settings:manage", async (user) => {
    const value = siteSettingsSchema.parse(unflatten(formObject(formData)));
    if (value.hours.closes <= value.hours.opens) throw new ActionError("Closing time must be after opening time.");
    await db()
      .insert(siteSettings)
      .values({ key: "site", value, updatedBy: user.id })
      .onConflictDoUpdate({ target: siteSettings.key, set: { value, updatedBy: user.id, updatedAt: new Date() } });
    await audit(user, { action: "settings.update", entityType: "settings", entityId: "site", summary: "Updated website settings", changes: value as unknown as Record<string, unknown> });
    updateTag(TAGS.settings);
    return { ok: true, message: "Settings saved, the website updates immediately." };
  });
}

/** Sends a test email to the signed-in user and waits for the result. */
export async function sendTestEmailAction(): Promise<ActionState> {
  return adminAction("settings:manage", async (user) => {
    if (!gmailConfigured()) throw new ActionError("Gmail is not connected yet. Add the GMAIL_* variables (see README) and restart.");
    if (!(await rateLimit("test-email", user.id, { limit: 3, windowSeconds: 600 })).ok) throw new ActionError("Please wait a few minutes before sending another test.");
    const ids = await enqueue({ template: "staff.test", locale: "en", email: user.email, payload: { name: user.name.split(" ")[0], sentAt: formatDateTime(new Date(), "en") } });
    const { sent } = await dispatch({ ids });
    await audit(user, { action: "settings.test_email", entityType: "settings", summary: `Sent a test email to ${user.email}` });
    if (!sent) throw new ActionError("The test email could not be sent. Open Notifications for the error message.");
    return { ok: true, message: `Test email sent to ${user.email}.` };
  });
}

