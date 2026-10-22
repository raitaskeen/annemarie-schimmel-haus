import { connection } from "next/server";
import { getSessionUser } from "@/lib/auth/dal";
import { can } from "@/lib/auth/permissions";
import { audit } from "@/lib/audit";
import { csvResponse, toCsv } from "@/lib/csv";
import { formatDateTime } from "@/lib/format";
import { getEventAdmin, listRegistrations } from "@/server/admin/programme";

export async function GET(request: Request) {
  await connection();
  const user = await getSessionUser();
  if (!user || user.mfaPending || !can(user.role, "submissions:export")) return new Response("Forbidden", { status: 403 });
  const event = await getEventAdmin(new URL(request.url).searchParams.get("event") ?? "");
  if (!event) return new Response("Not found", { status: 404 });
  const regs = await listRegistrations(event.id, {});
  const rows = regs.map((r) => ({
    ticket: r.reference,
    status: r.status,
    name: r.name,
    email: r.email,
    phone: r.phone,
    organization: r.organization ?? "",
    guests: r.guests,
    cnic: event.requiresCnic ? (r.cnic ?? "") : "",
    whatsapp: r.whatsappOptIn ? "yes" : "no",
    registered_at: formatDateTime(r.createdAt, "en"),
    checked_in_at: r.checkedInAt ? formatDateTime(r.checkedInAt, "en") : "",
  }));
  await audit(user, { action: "export.event_registrations", entityType: "event", entityId: event.id, summary: `Exported ${rows.length} registrations for “${event.titleEn}”` });
  return csvResponse(toCsv(rows), `ash-guests-${event.slug}.csv`);
}
