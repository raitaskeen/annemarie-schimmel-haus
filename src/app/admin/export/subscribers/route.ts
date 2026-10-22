import { connection } from "next/server";
import { getSessionUser } from "@/lib/auth/dal";
import { can } from "@/lib/auth/permissions";
import { audit } from "@/lib/audit";
import { csvResponse, toCsv } from "@/lib/csv";
import { exportSubscribers } from "@/server/admin/inbox";

export async function GET() {
  await connection();
  const user = await getSessionUser();
  if (!user || user.mfaPending || !can(user.role, "submissions:export")) return new Response("Forbidden", { status: 403 });
  const rows = await exportSubscribers();
  await audit(user, { action: "export.subscribers", entityType: "subscriber", summary: `Exported ${rows.length} active subscribers` });
  return csvResponse(toCsv(rows.map((r) => ({ ...r, confirmed_at: r.confirmed_at?.toISOString() ?? "" }))), `ash-newsletter-${new Date().toISOString().slice(0, 10)}.csv`);
}
