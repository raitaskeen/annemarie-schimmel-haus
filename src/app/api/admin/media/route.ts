import { connection } from "next/server";
import { db } from "@/db";
import { mediaAssets } from "@/db/schema";
import { audit } from "@/lib/audit";
import { getSessionUser } from "@/lib/auth/dal";
import { can } from "@/lib/auth/permissions";
import { env } from "@/lib/env";
import { rateLimit } from "@/lib/security/rate-limit";
import { FileRejectedError, processUpload } from "@/server/files";

const MAX_BYTES = 12 * 1024 * 1024;

/** Admin image upload → re-encoded WebP stored in Postgres, served from /media/[id]. */
export async function POST(request: Request) {
  await connection();
  // CSRF: only same-origin browsers may upload.
  const originHost = URL.parse(request.headers.get("origin") ?? "")?.host;
  if (!originHost || (originHost !== new URL(env().APP_URL).host && originHost !== request.headers.get("host"))) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }
  const user = await getSessionUser();
  if (!user || user.mfaPending || !can(user.role, "content:write")) return Response.json({ error: "Forbidden" }, { status: 403 });
  if (!(await rateLimit("media-upload", user.id, { limit: 60, windowSeconds: 600 })).ok) return Response.json({ error: "Too many uploads, please wait." }, { status: 429 });

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return Response.json({ error: "No file uploaded" }, { status: 400 });

  try {
    const processed = await processUpload(file, { maxBytes: MAX_BYTES, allow: ["image/jpeg", "image/png", "image/webp", "image/avif"], maxDimension: 2400, quality: 84 });
    const [row] = await db()
      .insert(mediaAssets)
      .values({ fileName: file.name.slice(0, 160), contentType: processed.contentType, size: processed.size, width: processed.width, height: processed.height, sha256: processed.sha256, data: processed.data, createdBy: user.id })
      .returning({ id: mediaAssets.id });
    await audit(user, { action: "media.upload", entityType: "media", entityId: row.id, summary: `Uploaded ${file.name}` });
    return Response.json({ id: row.id, path: `/media/${row.id}`, width: processed.width, height: processed.height });
  } catch (error) {
    if (error instanceof FileRejectedError) return Response.json({ error: error.message === "too_large" ? "Image is larger than 12 MB." : "Please upload a JPG, PNG, WebP or AVIF image." }, { status: 415 });
    console.error("media upload failed", error);
    return Response.json({ error: "Upload failed." }, { status: 500 });
  }
}
