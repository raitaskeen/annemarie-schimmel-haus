import { connection } from "next/server";
import { getSessionUser } from "@/lib/auth/dal";
import { can } from "@/lib/auth/permissions";
import { audit } from "@/lib/audit";
import { csvResponse, toCsv } from "@/lib/csv";
import { exportEnrollments } from "@/server/admin/enrollments";

export async function GET(request: Request) {
  await connection();
  const user = await getSessionUser();
  if (!user || user.mfaPending || !can(user.role, "submissions:export")) return new Response("Forbidden", { status: 403 });
  const sp = new URL(request.url).searchParams;
  const filters = { q: sp.get("q") ?? undefined, status: sp.get("status") ?? undefined, offering: sp.get("offering") ?? undefined, mode: sp.get("mode") ?? undefined };
  const rows = await exportEnrollments(filters);
  await audit(user, { action: "export.enrollments", entityType: "enrollment", summary: `Exported ${rows.length} enrollments`, changes: filters });
  return csvResponse(toCsv(rows), `ash-enrollments-${new Date().toISOString().slice(0, 10)}.csv`);
}
