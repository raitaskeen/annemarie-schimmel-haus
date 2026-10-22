import { connection } from "next/server";
import { getSessionUser } from "@/lib/auth/dal";
import { can } from "@/lib/auth/permissions";
import { audit } from "@/lib/audit";
import { csvResponse, toCsv } from "@/lib/csv";
import { formatDateTime } from "@/lib/format";
import { getPlacementSessionAdmin } from "@/server/admin/programme";

export async function GET(request: Request) {
  await connection();
  const user = await getSessionUser();
  if (!user || user.mfaPending || !can(user.role, "submissions:export")) return new Response("Forbidden", { status: 403 });
  const data = await getPlacementSessionAdmin(new URL(request.url).searchParams.get("session") ?? "");
  if (!data) return new Response("Not found", { status: 404 });
  const rows = data.apps.map((a) => ({
    reference: a.reference,
    status: a.status,
    first_name: a.firstName,
    last_name: a.lastName,
    cnic: a.cnic,
    date_of_birth: a.dateOfBirth,
    email: a.email,
    phone: a.phone,
    target_level: a.targetLevel,
    prior_learning: a.priorLearning,
    result_level: a.resultLevel ?? "",
    result_score: a.resultScore ?? "",
    registered_at: formatDateTime(a.createdAt, "en"),
  }));
  await audit(user, { action: "export.placement", entityType: "placement_session", entityId: data.s.id, summary: `Exported ${rows.length} candidates for ${data.s.code}` });
  return csvResponse(toCsv(rows), `ash-placement-${data.s.code}.csv`);
}
