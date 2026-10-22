import { connection } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { privateFiles } from "@/db/schema";
import { audit } from "@/lib/audit";
import { getSessionUser } from "@/lib/auth/dal";
import { can } from "@/lib/auth/permissions";

/**
 * Private applicant documents. Staff only (files:read), never cached, served
 * with a sandboxing CSP so a crafted PDF cannot run script in our origin.
 */
export async function GET(request: Request, ctx: RouteContext<"/files/[id]">) {
  await connection();
  const user = await getSessionUser();
  if (!user || user.mfaPending || !can(user.role, "files:read")) return new Response("Not found", { status: 404 });
  const { id } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/.test(id)) return new Response("Not found", { status: 404 });

  const [file] = await db().select().from(privateFiles).where(eq(privateFiles.id, id)).limit(1);
  if (!file) return new Response("Not found", { status: 404 });

  const download = new URL(request.url).searchParams.has("download") || file.contentType === "application/pdf";
  await audit(user, { action: "file.view", entityType: file.ownerType, entityId: file.ownerId, summary: `Opened document ${file.kind}` });
  return new Response(new Uint8Array(file.data), {
    headers: {
      "Content-Type": file.contentType,
      "Content-Length": String(file.size),
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${file.fileName.replace(/[^\w.-]/g, "_")}"`,
      "Cache-Control": "private, no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox",
      "Cross-Origin-Resource-Policy": "same-origin",
    },
  });
}
