"use server";

import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { examDates, galleryItems, partners, posts } from "@/db/schema";
import { audit } from "@/lib/audit";
import { TAGS } from "@/lib/cache-tags";
import { examDateSchema, galleryItemSchema, partnerSchema, postSchema } from "@/lib/schemas/admin";
import { ActionError, adminAction, formObject, fromPkt, type ActionState } from "@/server/admin/action-utils";
import { GALLERY_CATEGORIES } from "@/lib/gallery";
import { imageSize, mediaSizes } from "@/server/admin/content";

const uuid = z.string().uuid();

/* -------------------------------------------------------------- exam dates */

export async function saveExamDateAction(id: string | null, _prev: ActionState, formData: FormData): Promise<ActionState> {
  return adminAction("content:write", async (user) => {
    const input = examDateSchema.parse(formObject(formData));
    if (input.examEndsOn && input.examEndsOn < input.examStartsOn) throw new ActionError("The exam cannot end before it starts.");
    if (input.registrationOn && input.registrationOn > input.examStartsOn) throw new ActionError("Registration must open before the exam.");
    const summary = `${input.levels.join("/")} on ${input.examStartsOn}`;
    if (id) {
      const [row] = await db().update(examDates).set(input).where(eq(examDates.id, uuid.parse(id))).returning({ id: examDates.id });
      if (!row) throw new ActionError("Exam date not found.");
      await audit(user, { action: "exam_date.update", entityType: "exam_date", entityId: id, summary: `Updated Goethe exam ${summary}` });
    } else {
      const [row] = await db().insert(examDates).values(input).returning({ id: examDates.id });
      await audit(user, { action: "exam_date.create", entityType: "exam_date", entityId: row.id, summary: `Added Goethe exam ${summary}` });
    }
    updateTag(TAGS.exams);
    return { ok: true, message: "Exam date saved." };
  });
}

export async function deleteExamDateAction(id: string, _prev: ActionState, _formData: FormData): Promise<ActionState> {
  return adminAction("content:write", async (user) => {
    const [row] = await db().delete(examDates).where(eq(examDates.id, uuid.parse(id))).returning({ examStartsOn: examDates.examStartsOn });
    if (!row) throw new ActionError("Exam date not found.");
    await audit(user, { action: "exam_date.delete", entityType: "exam_date", entityId: id, summary: `Deleted Goethe exam on ${row.examStartsOn}` });
    updateTag(TAGS.exams);
    return { ok: true, message: "Exam date deleted." };
  });
}

/* -------------------------------------------------------------------- news */

export async function savePostAction(id: string | null, _prev: ActionState, formData: FormData): Promise<ActionState> {
  let createdId: string | null = null;
  const result = await adminAction("content:write", async (user) => {
    const input = postSchema.parse(formObject(formData));
    // Publishing without a date stamps "now"; a future date schedules the post.
    const publishedAt = fromPkt(input.publishedAt) ?? (input.status === "published" ? new Date() : null);
    const values = { ...input, publishedAt };
    if (id) {
      const [before] = await db().select({ slug: posts.slug }).from(posts).where(eq(posts.id, uuid.parse(id))).limit(1);
      if (!before) throw new ActionError("Post not found.");
      await db().update(posts).set(values).where(eq(posts.id, id));
      await audit(user, { action: "post.update", entityType: "post", entityId: id, summary: `Updated “${input.titleEn}” (${input.status})` });
      updateTag(`post:${before.slug}`);
    } else {
      const [row] = await db().insert(posts).values(values).returning({ id: posts.id });
      createdId = row.id;
      await audit(user, { action: "post.create", entityType: "post", entityId: row.id, summary: `Created “${input.titleEn}” (${input.status})` });
    }
    updateTag(TAGS.posts);
    updateTag(`post:${input.slug}`);
    return { ok: true, message: input.status === "published" ? "Saved and published." : "Draft saved." };
  });
  if (createdId) redirect(`/admin/news/${createdId}`);
  return result;
}

export async function deletePostAction(id: string, _prev: ActionState, _formData: FormData): Promise<ActionState> {
  const result = await adminAction("content:write", async (user) => {
    const [row] = await db().delete(posts).where(eq(posts.id, uuid.parse(id))).returning({ titleEn: posts.titleEn, slug: posts.slug });
    if (!row) throw new ActionError("Post not found.");
    await audit(user, { action: "post.delete", entityType: "post", entityId: id, summary: `Deleted “${row.titleEn}”` });
    updateTag(TAGS.posts);
    updateTag(`post:${row.slug}`);
    return { ok: true };
  });
  if (result?.ok) redirect("/admin/news");
  return result;
}

/* ---------------------------------------------------------------- partners */

export async function savePartnerAction(id: string | null, _prev: ActionState, formData: FormData): Promise<ActionState> {
  let createdId: string | null = null;
  const result = await adminAction("content:write", async (user) => {
    const input = partnerSchema.parse(formObject(formData));
    const size = await imageSize(input.logoPath);
    const values = { ...input, logoWidth: size.width, logoHeight: size.height };
    if (id) {
      const [row] = await db().update(partners).set(values).where(eq(partners.id, uuid.parse(id))).returning({ id: partners.id });
      if (!row) throw new ActionError("Partner not found.");
      await audit(user, { action: "partner.update", entityType: "partner", entityId: id, summary: `Updated partner ${input.name}` });
    } else {
      const [row] = await db().insert(partners).values(values).returning({ id: partners.id });
      createdId = row.id;
      await audit(user, { action: "partner.create", entityType: "partner", entityId: row.id, summary: `Added partner ${input.name}` });
    }
    updateTag(TAGS.partners);
    return { ok: true, message: "Partner saved." };
  });
  if (createdId) redirect(`/admin/partners/${createdId}`);
  return result;
}

export async function deletePartnerAction(id: string, _prev: ActionState, _formData: FormData): Promise<ActionState> {
  const result = await adminAction("content:write", async (user) => {
    const [row] = await db().delete(partners).where(eq(partners.id, uuid.parse(id))).returning({ name: partners.name });
    if (!row) throw new ActionError("Partner not found.");
    await audit(user, { action: "partner.delete", entityType: "partner", entityId: id, summary: `Removed partner ${row.name}` });
    updateTag(TAGS.partners);
    return { ok: true };
  });
  if (result?.ok) redirect("/admin/partners");
  return result;
}

/** Saves the drag-and-drop order of the partner strip. */
export async function reorderPartnersAction(ids: string[]): Promise<ActionState> {
  return adminAction("content:write", async (user) => {
    const list = z.array(uuid).max(200).parse(ids);
    await db().transaction(async (tx) => {
      for (const [i, id] of list.entries()) await tx.update(partners).set({ sortOrder: (i + 1) * 10 }).where(eq(partners.id, id));
    });
    await audit(user, { action: "partner.reorder", entityType: "partner", summary: `Reordered ${list.length} partners` });
    updateTag(TAGS.partners);
    return { ok: true, message: "Order saved." };
  });
}

/* ----------------------------------------------------------------- gallery */

/** Adds freshly uploaded photos (already stored by /api/admin/media) to the gallery. */
export async function addGalleryItemsAction(input: { paths: string[]; category: string }): Promise<ActionState> {
  return adminAction("content:write", async (user) => {
    const { paths, category } = z
      .object({ paths: z.array(z.string().regex(/^\/media\/[0-9a-f-]{36}$/)).min(1).max(40), category: z.enum(GALLERY_CATEGORIES) })
      .parse(input);
    const sizes = await mediaSizes(paths.map((p) => p.slice("/media/".length)));
    const [{ max }] = await db().select({ max: sql<number>`coalesce(max(${galleryItems.sortOrder}), 0)::int` }).from(galleryItems);
    const values = paths
      .filter((p) => sizes.has(p.slice(7)))
      .map((p, i) => ({ imagePath: p, ...sizes.get(p.slice(7))!, altEn: "Photo at Annemarie-Schimmel-Haus", category, published: false, sortOrder: max + (i + 1) * 10 }));
    if (!values.length) throw new ActionError("The uploads could not be found.");
    await db().insert(galleryItems).values(values);
    await audit(user, { action: "gallery.add", entityType: "gallery_item", summary: `Added ${values.length} photo(s) to ${category} (hidden until described)` });
    updateTag(TAGS.gallery);
    return { ok: true, message: `${values.length} photo(s) added as hidden — add a description, then publish.` };
  });
}

export async function saveGalleryItemAction(id: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  return adminAction("content:write", async (user) => {
    const input = galleryItemSchema.parse(formObject(formData));
    const [row] = await db().update(galleryItems).set(input).where(eq(galleryItems.id, uuid.parse(id))).returning({ id: galleryItems.id });
    if (!row) throw new ActionError("Photo not found.");
    await audit(user, { action: "gallery.update", entityType: "gallery_item", entityId: id, summary: `Updated photo “${input.altEn.slice(0, 60)}”` });
    updateTag(TAGS.gallery);
    return { ok: true, message: "Photo saved." };
  });
}

export async function toggleGalleryItemAction(id: string, field: "published" | "featured", value: boolean): Promise<ActionState> {
  return adminAction("content:write", async (user) => {
    const f = z.enum(["published", "featured"]).parse(field);
    const [row] = await db()
      .update(galleryItems)
      .set({ [f]: z.boolean().parse(value) })
      .where(eq(galleryItems.id, uuid.parse(id)))
      .returning({ id: galleryItems.id });
    if (!row) throw new ActionError("Photo not found.");
    await audit(user, { action: `gallery.${f}`, entityType: "gallery_item", entityId: id, summary: `${f === "published" ? (value ? "Published" : "Hid") : value ? "Featured" : "Unfeatured"} a photo` });
    updateTag(TAGS.gallery);
    return { ok: true };
  });
}

export async function deleteGalleryItemAction(id: string, _prev: ActionState, _formData: FormData): Promise<ActionState> {
  return adminAction("content:write", async (user) => {
    const [row] = await db().delete(galleryItems).where(eq(galleryItems.id, uuid.parse(id))).returning({ altEn: galleryItems.altEn });
    if (!row) throw new ActionError("Photo not found.");
    await audit(user, { action: "gallery.delete", entityType: "gallery_item", entityId: id, summary: `Removed photo “${row.altEn.slice(0, 60)}”` });
    updateTag(TAGS.gallery);
    return { ok: true, message: "Photo removed from the gallery." };
  });
}
