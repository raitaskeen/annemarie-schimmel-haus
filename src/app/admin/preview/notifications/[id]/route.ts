import { connection } from "next/server";
import { getSessionUser } from "@/lib/auth/dal";
import { can } from "@/lib/auth/permissions";
import { env } from "@/lib/env";
import { getNotification } from "@/server/admin/inbox";
import { renderEmail, type TemplateKey } from "@/server/notifications/templates";

/** Renders a queued email exactly as the recipient sees it, in a locked-down sandbox. */
export async function GET(_request: Request, ctx: RouteContext<"/admin/preview/notifications/[id]">) {
  await connection();
  const user = await getSessionUser();
  if (!user || user.mfaPending || !can(user.role, "notifications:manage")) return new Response("Forbidden", { status: 403 });
  const { id } = await ctx.params;
  const n = await getNotification(id);
  if (!n || n.channel !== "email") return new Response("Not found", { status: 404 });
  let html: string;
  try {
    html = renderEmail(n.template as TemplateKey, n.payload as never, n.locale === "de" ? "de" : "en").html;
  } catch {
    return new Response("This template can no longer be rendered.", { status: 410 });
  }
  return new Response(html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "private, no-store",
      // No scripts, no forms, no outbound requests except images (including the brand images on
      // this site, also when it runs on plain http locally); opened in its own sandboxed origin.
      "content-security-policy": `default-src 'none'; img-src https: data: ${new URL(env().APP_URL).origin}; style-src 'unsafe-inline'; sandbox allow-popups allow-popups-to-escape-sandbox`,
      "x-content-type-options": "nosniff",
      "referrer-policy": "no-referrer",
    },
  });
}
