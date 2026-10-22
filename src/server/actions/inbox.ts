"use server";

import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { contactMessages, newsletterSubscribers } from "@/db/schema";
import { audit } from "@/lib/audit";
import { cleanText } from "@/lib/validators";
import { ActionError, adminAction, formObject, type ActionState } from "@/server/admin/action-utils";
import { MESSAGE_STATUSES } from "@/server/admin/inbox";
import { dispatchAfterResponse, enqueue, requeue } from "@/server/notifications/outbox";

const uuid = z.string().uuid();

/* ---------------------------------------------------------------- messages */

export async function setMessageStatusAction(id: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  return adminAction("messages:manage", async (user) => {
    const status = z.enum(MESSAGE_STATUSES).parse(formData.get("status"));
    const [row] = await db().update(contactMessages).set({ status }).where(eq(contactMessages.id, uuid.parse(id))).returning({ reference: contactMessages.reference });
    if (!row) throw new ActionError("Message not found.");
    await audit(user, { action: "message.status", entityType: "contact_message", entityId: id, summary: `${row.reference} → ${status}` });
    return { ok: true, message: `Marked as ${status.replace("_", " ")}.` };
  });
}

export async function saveMessageNotesAction(id: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  return adminAction("messages:manage", async (user) => {
    const notes = z.string().max(4000).parse(formData.get("notes") ?? "");
    await db()
      .update(contactMessages)
      .set({ staffNotes: cleanText(notes) || null })
      .where(eq(contactMessages.id, uuid.parse(id)));
    await audit(user, { action: "message.notes", entityType: "contact_message", entityId: id, summary: "Updated internal notes" });
    return { ok: true, message: "Notes saved." };
  });
}

const replySchema = z.object({
  body: z.string().trim().min(10, "Write at least a short reply.").max(8000),
  close: z.enum(["true", "false"]).optional().default("false"),
});

/** Sends a branded reply through the outbox (Gmail) and keeps a copy on the message. */
export async function replyToMessageAction(id: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  return adminAction("messages:manage", async (user) => {
    const input = replySchema.parse(formObject(formData));
    const ids = await db().transaction(async (tx) => {
      const [m] = await tx.select().from(contactMessages).where(eq(contactMessages.id, uuid.parse(id))).for("update").limit(1);
      if (!m) throw new ActionError("Message not found.");
      const queued = await enqueue(
        {
          template: "contact.reply",
          locale: m.locale === "de" ? "de" : "en",
          email: m.email,
          related: { type: "contact_message", id: m.id },
          payload: { name: m.name.split(" ")[0], reference: m.reference, subject: m.subject, body: cleanText(input.body), staffName: user.name },
        },
        tx,
      );
      await tx
        .update(contactMessages)
        .set({ status: input.close === "true" ? "closed" : "answered" })
        .where(eq(contactMessages.id, m.id));
      await audit(user, { action: "message.reply", entityType: "contact_message", entityId: m.id, summary: `Replied to ${m.reference}` }, tx);
      return queued;
    });
    dispatchAfterResponse(ids);
    return { ok: true, message: "Reply queued for sending." };
  });
}

/* ------------------------------------------------------------- subscribers */

export async function unsubscribeAction(id: string, _prev: ActionState, _formData: FormData): Promise<ActionState> {
  return adminAction("submissions:export", async (user) => {
    const [row] = await db()
      .update(newsletterSubscribers)
      .set({ status: "unsubscribed", unsubscribedAt: new Date(), tokenHash: null })
      .where(eq(newsletterSubscribers.id, uuid.parse(id)))
      .returning({ id: newsletterSubscribers.id });
    if (!row) throw new ActionError("Subscriber not found.");
    await audit(user, { action: "subscriber.unsubscribe", entityType: "subscriber", entityId: id, summary: "Unsubscribed a newsletter subscriber" });
    return { ok: true, message: "Unsubscribed." };
  });
}

/** Right to erasure: removes the address entirely. */
export async function deleteSubscriberAction(id: string, _prev: ActionState, _formData: FormData): Promise<ActionState> {
  return adminAction("submissions:export", async (user) => {
    const [row] = await db().delete(newsletterSubscribers).where(eq(newsletterSubscribers.id, uuid.parse(id))).returning({ id: newsletterSubscribers.id });
    if (!row) throw new ActionError("Subscriber not found.");
    await audit(user, { action: "subscriber.delete", entityType: "subscriber", entityId: id, summary: "Erased a newsletter subscriber" });
    return { ok: true, message: "Address erased." };
  });
}

/* ------------------------------------------------------------ notifications */

export async function retryNotificationAction(id: string, _prev: ActionState, _formData: FormData): Promise<ActionState> {
  return adminAction("notifications:manage", async (user) => {
    await requeue(uuid.parse(id));
    await audit(user, { action: "notification.retry", entityType: "notification", entityId: id, summary: "Retried a notification" });
    return { ok: true, message: "Queued again — check back in a moment." };
  });
}

