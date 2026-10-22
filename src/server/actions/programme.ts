"use server";

import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { count, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { eventRegistrations, events, placementApplications, placementSessions } from "@/db/schema";
import { audit } from "@/lib/audit";
import { TAGS } from "@/lib/cache-tags";
import { eventSchema, placementSessionSchema } from "@/lib/schemas/admin";
import { ActionError, adminAction, formObject, fromPkt, type ActionState } from "@/server/admin/action-utils";
import { changeRegistrationStatus, checkInByReference, promoteEventWaitlist, updatePlacementApplication } from "@/server/admin/programme";

/* ------------------------------------------------------------------- events */

export async function saveEventAction(id: string | null, _prev: ActionState, formData: FormData): Promise<ActionState> {
  let createdId: string | null = null;
  const result = await adminAction("content:write", async (user) => {
    const input = eventSchema.parse(formObject(formData));
    const startsAt = fromPkt(input.startsAt)!;
    const values = {
      ...input,
      startsAt,
      endsAt: fromPkt(input.endsAt),
      registrationClosesAt: fromPkt(input.registrationClosesAt),
      feePkr: input.isFree ? null : input.feePkr,
    };
    if (values.endsAt && values.endsAt < startsAt) throw new ActionError("The event cannot end before it starts.");
    if (id) {
      const [before] = await db().select({ seatsTaken: events.seatsTaken, slug: events.slug }).from(events).where(eq(events.id, id)).limit(1);
      if (!before) throw new ActionError("Event not found.");
      if (values.capacity !== null && values.capacity < before.seatsTaken) throw new ActionError(`Capacity cannot be lower than the ${before.seatsTaken} seats already taken.`);
      await db().update(events).set(values).where(eq(events.id, id));
      await audit(user, { action: "event.update", entityType: "event", entityId: id, summary: `Updated event “${input.titleEn}”` });
      await promoteEventWaitlist(id);
      updateTag(`event:${before.slug}`);
    } else {
      const [row] = await db().insert(events).values(values).returning({ id: events.id });
      createdId = row.id;
      await audit(user, { action: "event.create", entityType: "event", entityId: row.id, summary: `Created event “${input.titleEn}”` });
    }
    updateTag(TAGS.events);
    updateTag(`event:${input.slug}`);
    return { ok: true, message: "Event saved." };
  });
  if (createdId) redirect(`/admin/events/${createdId}`);
  return result;
}

export async function deleteEventAction(id: string, _prev: ActionState, _formData: FormData): Promise<ActionState> {
  const result = await adminAction("content:write", async (user) => {
    const [{ n }] = await db().select({ n: count() }).from(eventRegistrations).where(eq(eventRegistrations.eventId, id));
    if (n > 0) throw new ActionError(`This event has ${n} registration(s). Set it to “cancelled” instead — registrants can then be informed.`);
    const [row] = await db().delete(events).where(eq(events.id, id)).returning({ titleEn: events.titleEn, slug: events.slug });
    if (!row) throw new ActionError("Event not found.");
    await audit(user, { action: "event.delete", entityType: "event", entityId: id, summary: `Deleted event “${row.titleEn}”` });
    updateTag(TAGS.events);
    updateTag(`event:${row.slug}`);
    return { ok: true };
  });
  if (result?.ok) redirect("/admin/events");
  return result;
}

const regStatus = z.object({ status: z.enum(["registered", "waitlisted", "cancelled", "attended"]), notify: z.enum(["true", "false"]).optional().default("true") });

export async function setRegistrationStatusAction(id: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  return adminAction("submissions:write", async (user) => {
    const input = regStatus.parse(formObject(formData));
    const r = await changeRegistrationStatus(user, id, input.status, input.notify === "true");
    updateTag(TAGS.events);
    return { ok: true, message: `${r.reference} → ${r.status}` };
  });
}

export async function checkInAction(eventId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  return adminAction("submissions:write", async (user) => {
    const ref = z.string().trim().min(6).max(20).parse(formData.get("reference"));
    const { already, r } = await checkInByReference(user, eventId, ref);
    updateTag(TAGS.events);
    return { ok: true, message: already ? `${r.name} was already checked in.` : `Welcome, ${r.name}${r.guests ? ` (+${r.guests})` : ""}!` };
  });
}

/* ------------------------------------------------------- placement sessions */

export async function savePlacementSessionAction(id: string | null, _prev: ActionState, formData: FormData): Promise<ActionState> {
  let createdId: string | null = null;
  const result = await adminAction("content:write", async (user) => {
    const input = placementSessionSchema.parse(formObject(formData));
    const values = { ...input, startsAt: fromPkt(input.startsAt)!, endsAt: fromPkt(input.endsAt)!, registrationDeadline: fromPkt(input.registrationDeadline)! };
    if (values.registrationDeadline > values.startsAt) throw new ActionError("The registration deadline must be before the test starts.");
    if (id) {
      const [before] = await db().select({ seatsTaken: placementSessions.seatsTaken }).from(placementSessions).where(eq(placementSessions.id, id)).limit(1);
      if (!before) throw new ActionError("Session not found.");
      if (input.capacity < before.seatsTaken) throw new ActionError(`Capacity cannot be lower than the ${before.seatsTaken} registered candidates.`);
      await db().update(placementSessions).set(values).where(eq(placementSessions.id, id));
      await audit(user, { action: "placement_session.update", entityType: "placement_session", entityId: id, summary: `Updated placement test ${input.code}` });
    } else {
      const [row] = await db().insert(placementSessions).values(values).returning({ id: placementSessions.id });
      createdId = row.id;
      await audit(user, { action: "placement_session.create", entityType: "placement_session", entityId: row.id, summary: `Created placement test ${input.code}` });
    }
    updateTag(TAGS.placement);
    return { ok: true, message: "Placement test saved." };
  });
  if (createdId) redirect(`/admin/placement/${createdId}`);
  return result;
}

export async function deletePlacementSessionAction(id: string, _prev: ActionState, _formData: FormData): Promise<ActionState> {
  const result = await adminAction("content:write", async (user) => {
    const [{ n }] = await db().select({ n: count() }).from(placementApplications).where(eq(placementApplications.sessionId, id));
    if (n > 0) throw new ActionError("This session has applications. Cancel it instead of deleting.");
    await db().delete(placementSessions).where(eq(placementSessions.id, id));
    await audit(user, { action: "placement_session.delete", entityType: "placement_session", entityId: id, summary: "Deleted placement test session" });
    updateTag(TAGS.placement);
    return { ok: true };
  });
  if (result?.ok) redirect("/admin/placement");
  return result;
}

const appInput = z.object({
  status: z.enum(["submitted", "confirmed", "attended", "no_show", "completed", "cancelled"]),
  resultLevel: z
    .string()
    .trim()
    .refine((v) => v === "" || ["A1", "A2", "B1", "B2", "C1"].includes(v), "Choose a level.")
    .transform((v) => v || null),
  resultScore: z
    .string()
    .trim()
    .transform((v) => (v === "" ? null : Number(v)))
    .refine((v) => v === null || (Number.isInteger(v) && v >= 0 && v <= 100), "Score 0–100."),
  resultNotes: z
    .string()
    .trim()
    .max(500)
    .transform((v) => v || null),
  notify: z.enum(["true", "false"]).optional().default("true"),
});

export async function updatePlacementApplicationAction(id: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  return adminAction("submissions:write", async (user) => {
    const input = appInput.parse(formObject(formData));
    const a = await updatePlacementApplication(user, id, { ...input, notify: input.notify === "true" });
    updateTag(TAGS.placement);
    return { ok: true, message: `${a.reference} saved.` };
  });
}

const bulkRegInput = z.object({
  ids: z.array(z.string().uuid()).min(1).max(200),
  status: z.enum(["registered", "waitlisted", "cancelled", "attended"]),
  notify: z.enum(["true", "false"]).optional().default("true"),
});

export async function bulkRegistrationStatusAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return adminAction("submissions:write", async (user) => {
    const input = bulkRegInput.parse({ ids: formData.getAll("ids"), status: formData.get("status"), notify: formData.get("notify") ?? undefined });
    let done = 0;
    const skipped: string[] = [];
    for (const id of new Set(input.ids)) {
      try {
        await changeRegistrationStatus(user, id, input.status, input.notify === "true", "bulk update");
        done++;
      } catch (error) {
        skipped.push(error instanceof Error ? error.message : "failed");
      }
    }
    updateTag(TAGS.events);
    if (!done) return { error: `Nothing changed. ${[...new Set(skipped)].slice(0, 2).join(" ")}` };
    return { ok: true, message: `${done} registration(s) updated${skipped.length ? `, ${skipped.length} skipped` : ""}.` };
  });
}

const bulkPlacementInput = z.object({
  ids: z.array(z.string().uuid()).min(1).max(200),
  status: z.enum(["confirmed", "attended", "no_show", "cancelled"]),
  notify: z.enum(["true", "false"]).optional().default("true"),
});

export async function bulkPlacementStatusAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return adminAction("submissions:write", async (user) => {
    const input = bulkPlacementInput.parse({ ids: formData.getAll("ids"), status: formData.get("status"), notify: formData.get("notify") ?? undefined });
    let done = 0;
    const skipped: string[] = [];
    for (const id of new Set(input.ids)) {
      try {
        await updatePlacementApplication(user, id, { status: input.status, notify: input.notify === "true" });
        done++;
      } catch (error) {
        skipped.push(error instanceof Error ? error.message : "failed");
      }
    }
    updateTag(TAGS.placement);
    if (!done) return { error: `Nothing changed. ${[...new Set(skipped)].slice(0, 2).join(" ")}` };
    return { ok: true, message: `${done} candidate(s) updated${skipped.length ? `, ${skipped.length} skipped` : ""}.` };
  });
}
