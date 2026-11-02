import "server-only";
import path from "node:path";
import { and, asc, count, desc, eq, getTableColumns, ilike, inArray, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { examDates, galleryItems, mediaAssets, partners, posts } from "@/db/schema";
import { GALLERY_CATEGORIES } from "@/lib/gallery";
import { onCloudflareWorkers } from "@/lib/runtime";
import { isSafeImagePath } from "@/lib/schemas/admin";
import { ActionError } from "@/server/admin/action-utils";
import { publicImageSizeOnWorkers } from "@/server/files";

/** Pixel size of a library image (uploaded asset or file under /public). */
export async function imageSize(imagePath: string): Promise<{ width: number; height: number }> {
  if (!isSafeImagePath(imagePath)) throw new ActionError("Choose an image from the library.");
  const media = imagePath.match(/^\/media\/([0-9a-f-]{36})$/);
  if (media) {
    const [row] = await db().select({ width: mediaAssets.width, height: mediaAssets.height }).from(mediaAssets).where(eq(mediaAssets.id, media[1])).limit(1);
    if (!row) throw new ActionError("That uploaded image no longer exists.");
    return row;
  }
  if (onCloudflareWorkers) {
    const size = await publicImageSizeOnWorkers(imagePath);
    if (!size) throw new ActionError("That image could not be read.");
    return size;
  }
  const root = path.join(process.cwd(), "public");
  const file = path.normalize(path.join(root, imagePath));
  if (!file.startsWith(root + path.sep)) throw new ActionError("Choose an image from the library.");
  try {
    const { default: sharp } = await import("sharp");
    const meta = await sharp(file).metadata();
    if (!meta.width || !meta.height) throw new Error("no size");
    return { width: meta.width, height: meta.height };
  } catch {
    throw new ActionError("That image could not be read.");
  }
}

/* -------------------------------------------------------------- exam dates */

export async function listExamDatesAdmin() {
  return db().select().from(examDates).orderBy(desc(examDates.examStartsOn)).limit(300);
}

/* -------------------------------------------------------------------- news */

const postIsLive = sql<boolean>`${posts.status} = 'published' and ${posts.publishedAt} <= now()`;

export async function listPostsAdmin({ q, status, category }: { q?: string; status?: string; category?: string }) {
  const parts: (SQL | undefined)[] = [];
  if (status === "draft" || status === "published") parts.push(eq(posts.status, status));
  if (category && ["news", "announcement", "scholarship", "job", "press"].includes(category)) parts.push(eq(posts.category, category as "news"));
  if (q?.trim()) parts.push(or(ilike(posts.titleEn, `%${q.trim()}%`), ilike(posts.titleDe, `%${q.trim()}%`)));
  return db()
    .select({ ...getTableColumns(posts), live: postIsLive, scheduled: sql<boolean>`${posts.status} = 'published' and ${posts.publishedAt} > now()` })
    .from(posts)
    .where(parts.length ? and(...parts) : undefined)
    .orderBy(desc(posts.pinned), desc(posts.publishedAt), desc(posts.createdAt))
    .limit(300);
}

export async function getPostAdmin(id: string) {
  if (!/^[0-9a-f-]{36}$/.test(id)) return null;
  const [p] = await db().select({ ...getTableColumns(posts), live: postIsLive }).from(posts).where(eq(posts.id, id)).limit(1);
  return p ?? null;
}

/* ---------------------------------------------------------------- partners */

export async function listPartnersAdmin() {
  return db().select().from(partners).orderBy(asc(partners.sortOrder), asc(partners.name));
}

export async function getPartnerAdmin(id: string) {
  if (!/^[0-9a-f-]{36}$/.test(id)) return null;
  const [p] = await db().select().from(partners).where(eq(partners.id, id)).limit(1);
  return p ?? null;
}

/* ----------------------------------------------------------------- gallery */


export async function listGalleryAdmin({ category, state }: { category?: string; state?: string }) {
  const parts: (SQL | undefined)[] = [];
  if (category && (GALLERY_CATEGORIES as readonly string[]).includes(category)) parts.push(eq(galleryItems.category, category as "courses"));
  if (state === "hidden") parts.push(eq(galleryItems.published, false));
  if (state === "featured") parts.push(eq(galleryItems.featured, true));
  const [rows, totals] = await Promise.all([
    db()
      .select()
      .from(galleryItems)
      .where(parts.length ? and(...parts) : undefined)
      .orderBy(asc(galleryItems.sortOrder), desc(galleryItems.createdAt))
      .limit(500),
    db().select({ category: galleryItems.category, n: count() }).from(galleryItems).groupBy(galleryItems.category),
  ]);
  return { rows, totals: Object.fromEntries(totals.map((t) => [t.category, t.n])) as Record<string, number> };
}

export async function mediaSizes(ids: string[]) {
  if (!ids.length) return new Map<string, { width: number; height: number }>();
  const rows = await db().select({ id: mediaAssets.id, width: mediaAssets.width, height: mediaAssets.height }).from(mediaAssets).where(inArray(mediaAssets.id, ids));
  return new Map(rows.map((r) => [r.id, { width: r.width, height: r.height }]));
}

/** Logo choices: everything uploaded plus the bundled partner logos. */
export async function partnerLogoImages() {
  const [uploads, current] = await Promise.all([
    db().select({ id: mediaAssets.id, fileName: mediaAssets.fileName }).from(mediaAssets).orderBy(desc(mediaAssets.createdAt)).limit(200),
    db().select({ path: partners.logoPath, name: partners.name }).from(partners),
  ]);
  const seen = new Set<string>();
  return [...current.map((c) => ({ path: c.path, label: `Logo · ${c.name}` })), ...uploads.map((u) => ({ path: `/media/${u.id}`, label: `Upload · ${u.fileName}` }))].filter((i) => !seen.has(i.path) && seen.add(i.path));
}
