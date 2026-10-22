"use server";

import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { count, eq } from "drizzle-orm";
import { db } from "@/db";
import { courseOfferings, courses, enrollments } from "@/db/schema";
import { audit } from "@/lib/audit";
import { TAGS } from "@/lib/cache-tags";
import { courseSchema, offeringSchema } from "@/lib/schemas/admin";
import { ActionError, adminAction, formObject, fromPkt, type ActionState } from "@/server/admin/action-utils";
import { promoteCourseWaitlist } from "@/server/admin/enrollments";

function refreshCatalog(offeringId?: string) {
  updateTag(TAGS.courses);
  updateTag(TAGS.offerings);
  if (offeringId) updateTag(`offering:${offeringId}`);
}

/* ------------------------------------------------------------------ courses */

export async function saveCourseAction(id: string | null, _prev: ActionState, formData: FormData): Promise<ActionState> {
  let createdId: string | null = null;
  const result = await adminAction("content:write", async (user) => {
    const input = courseSchema.parse(formObject(formData));
    if (id) {
      const [before] = await db().select().from(courses).where(eq(courses.id, id)).limit(1);
      if (!before) throw new ActionError("Course not found.");
      await db().update(courses).set(input).where(eq(courses.id, id));
      await audit(user, { action: "course.update", entityType: "course", entityId: id, summary: `Updated course ${input.code}`, changes: diff(before, input) });
    } else {
      const [row] = await db().insert(courses).values(input).returning({ id: courses.id });
      createdId = row.id;
      await audit(user, { action: "course.create", entityType: "course", entityId: row.id, summary: `Created course ${input.code}` });
    }
    refreshCatalog();
    return { ok: true, message: "Course saved." };
  });
  if (createdId) redirect(`/admin/courses/${createdId}`);
  return result;
}

export async function deleteCourseAction(id: string, _prev: ActionState, _formData: FormData): Promise<ActionState> {
  const result = await adminAction("content:write", async (user) => {
    const [{ n }] = await db().select({ n: count() }).from(courseOfferings).where(eq(courseOfferings.courseId, id));
    if (n > 0) throw new ActionError("This course still has batches. Delete or move them first, or simply unpublish the course.");
    const [row] = await db().delete(courses).where(eq(courses.id, id)).returning({ code: courses.code });
    if (!row) throw new ActionError("Course not found.");
    await audit(user, { action: "course.delete", entityType: "course", entityId: id, summary: `Deleted course ${row.code}` });
    refreshCatalog();
    return { ok: true };
  });
  if (result?.ok) redirect("/admin/courses");
  return result;
}

/* ---------------------------------------------------------------- offerings */

export async function saveOfferingAction(id: string | null, _prev: ActionState, formData: FormData): Promise<ActionState> {
  let createdId: string | null = null;
  const result = await adminAction("content:write", async (user) => {
    const input = offeringSchema.parse(formObject(formData));
    const values = {
      ...input,
      registrationOpensAt: fromPkt(input.registrationOpensAt),
      registrationClosesAt: fromPkt(input.registrationClosesAt),
    };
    if (id) {
      const [before] = await db().select().from(courseOfferings).where(eq(courseOfferings.id, id)).limit(1);
      if (!before) throw new ActionError("Batch not found.");
      if (input.capacity < before.seatsTaken) throw new ActionError(`Capacity cannot be lower than the ${before.seatsTaken} seats already reserved.`);
      await db().update(courseOfferings).set(values).where(eq(courseOfferings.id, id));
      await audit(user, { action: "offering.update", entityType: "offering", entityId: id, summary: `Updated batch ${input.code}`, changes: diff(before, values) });
      // More seats (or a reopened batch) are offered to the waitlist straight away.
      await promoteCourseWaitlist(id);
      refreshCatalog(id);
    } else {
      const [row] = await db().insert(courseOfferings).values(values).returning({ id: courseOfferings.id });
      createdId = row.id;
      await audit(user, { action: "offering.create", entityType: "offering", entityId: row.id, summary: `Created batch ${input.code}` });
      refreshCatalog(row.id);
    }
    return { ok: true, message: "Batch saved." };
  });
  if (createdId) redirect(`/admin/offerings/${createdId}`);
  return result;
}

export async function duplicateOfferingAction(id: string, _prev: ActionState, _formData: FormData): Promise<ActionState> {
  let createdId: string | null = null;
  const result = await adminAction("content:write", async (user) => {
    const [o] = await db().select().from(courseOfferings).where(eq(courseOfferings.id, id)).limit(1);
    if (!o) throw new ActionError("Batch not found.");
    const { id: _id, createdAt: _c, updatedAt: _u, seatsTaken: _s, ...rest } = o;
    const [row] = await db()
      .insert(courseOfferings)
      .values({ ...rest, code: `${o.code}-COPY-${Math.random().toString(36).slice(2, 6).toUpperCase()}`, status: "draft", seatsTaken: 0 })
      .returning({ id: courseOfferings.id });
    createdId = row.id;
    await audit(user, { action: "offering.duplicate", entityType: "offering", entityId: row.id, summary: `Duplicated batch ${o.code}` });
    return { ok: true };
  });
  if (createdId) redirect(`/admin/offerings/${createdId}`);
  return result;
}

export async function deleteOfferingAction(id: string, _prev: ActionState, _formData: FormData): Promise<ActionState> {
  const result = await adminAction("content:write", async (user) => {
    const [{ n }] = await db().select({ n: count() }).from(enrollments).where(eq(enrollments.offeringId, id));
    if (n > 0) throw new ActionError(`This batch has ${n} application(s). Set its status to “cancelled” instead of deleting it.`);
    const [row] = await db().delete(courseOfferings).where(eq(courseOfferings.id, id)).returning({ code: courseOfferings.code });
    if (!row) throw new ActionError("Batch not found.");
    await audit(user, { action: "offering.delete", entityType: "offering", entityId: id, summary: `Deleted batch ${row.code}` });
    refreshCatalog(id);
    return { ok: true };
  });
  if (result?.ok) redirect("/admin/offerings");
  return result;
}

/** Only the changed, non-sensitive fields go into the audit log. */
function diff(before: Record<string, unknown>, after: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(after)) {
    const prev = before[k];
    const a = prev instanceof Date ? prev.toISOString() : JSON.stringify(prev);
    const b = v instanceof Date ? v.toISOString() : JSON.stringify(v);
    if (a !== b) out[k] = { from: prev, to: v };
  }
  return out;
}
