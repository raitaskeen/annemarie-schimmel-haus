import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft, Download, ExternalLink, Pencil } from "lucide-react";
import { BulkBar, RowCheck } from "@/components/admin/bulk-bar";
import { CheckInForm, RowStatusMenu } from "@/components/admin/programme-forms";
import { Toolbar } from "@/components/admin/toolbar";
import { buildQuery, DataTable, EmptyState, PageHeader, Panel, StatCard, StatusBadge } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/lib/auth/dal";
import { can } from "@/lib/auth/permissions";
import { formatClock, formatDate, formatDateTime } from "@/lib/format";
import { bulkRegistrationStatusAction, checkInAction, setRegistrationStatusAction } from "@/server/actions/programme";
import { getEventAdmin, listRegistrations } from "@/server/admin/programme";

export const metadata: Metadata = { title: "Event registrations" };

const STATUS_OPTIONS = [
  { value: "registered", label: "Registered (confirm seat)" },
  { value: "attended", label: "Checked in" },
  { value: "waitlisted", label: "Move to waitlist" },
  { value: "cancelled", label: "Cancel registration", danger: true },
];

export default async function EventRegistrationsPage(props: PageProps<"/admin/events/[id]">) {
  const user = await requireAdmin("submissions:read");
  const { id } = await props.params;
  const sp = await props.searchParams;
  const get = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined);
  const filters = { q: get("q"), status: get("status") };
  const event = await getEventAdmin(id);
  if (!event) notFound();
  const regs = await listRegistrations(event.id, filters);
  const all = filters.q || filters.status ? await listRegistrations(event.id, {}) : regs;
  const tally = (s: string) => all.filter((r) => r.status === s).reduce((n, r) => n + 1 + r.guests, 0);
  const writable = can(user.role, "submissions:write");

  return (
    <>
      <Link href="/admin/events" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> All events
      </Link>
      <PageHeader
        eyebrow={`${formatDate(event.startsAt, "en", { weekday: "long" })} · ${formatClock(event.startsAt, "en")}`}
        title={event.titleEn}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <StatusBadge status={event.status} /> {event.venue}
          </span>
        }
        actions={
          <>
            {can(user.role, "content:write") && (
              <Button asChild variant="outline" size="sm">
                <Link href={`/admin/events/${event.id}/edit`}>
                  <Pencil /> Edit event
                </Link>
              </Button>
            )}
            {event.status === "published" && (
              <Button asChild variant="outline" size="sm">
                <a href={`/en/events/${event.slug}`} target="_blank" rel="noreferrer">
                  <ExternalLink /> Website
                </a>
              </Button>
            )}
            {can(user.role, "submissions:export") && event.registrationMode === "internal" && (
              <Button asChild variant="outline" size="sm">
                <a href={buildQuery("/admin/export/registrations", { event: event.id })}>
                  <Download /> Guest list CSV
                </a>
              </Button>
            )}
          </>
        }
      />

      {event.registrationMode !== "internal" ? (
        <Panel>
          <EmptyState
            title={event.registrationMode === "external" ? "Registration happens on an external site" : "No registration needed"}
            description={event.registrationMode === "external" ? (event.externalUrl ?? undefined) : "Visitors just come. Switch registration to “On this website” to issue tickets."}
          />
        </Panel>
      ) : (
        <>
          <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Seats taken (incl. guests)" value={`${event.seatsTaken}${event.capacity ? `/${event.capacity}` : ""}`} tone="dark" hint={event.capacity ? `${Math.max(0, event.capacity - event.seatsTaken)} left` : "No seat limit"} />
            <StatCard label="Checked in" value={tally("attended")} tone="primary" />
            <StatCard label="Waitlist" value={tally("waitlisted")} href={buildQuery(`/admin/events/${event.id}`, { status: "waitlisted" })} />
            <StatCard label="Cancelled" value={tally("cancelled")} href={buildQuery(`/admin/events/${event.id}`, { status: "cancelled" })} />
          </div>

          {writable && (
            <Panel title="Door check-in" description="Scan the QR code on the ticket or type the ticket number. Guests are admitted together with the main registration." className="mb-6">
              <CheckInForm action={checkInAction.bind(null, event.id)} />
            </Panel>
          )}

          <Panel padded={false} title={`Registrations (${regs.length})`}>
            <Toolbar
              placeholder="Search name, email, phone or ticket…"
              filters={[{ name: "status", label: "Status", options: STATUS_OPTIONS.map((s) => ({ value: s.value, label: s.value })) }]}
            />
            {regs.length ? (
              <DataTable>
                <thead>
                  <tr>
                    {writable && <th className="w-0" aria-label="Select" />}
                    <th>Ticket</th>
                    <th data-primary>Guest</th>
                    <th>Contact</th>
                    <th>Party</th>
                    <th>Registered</th>
                    <th>Status</th>
                    {writable && <th className="w-0" />}
                  </tr>
                </thead>
                <tbody>
                  {regs.map((r) => (
                    <tr key={r.id}>
                      {writable && (
                        <td>
                          <RowCheck formId="bulk-registrations" value={r.id} label={`Select ${r.name}`} />
                        </td>
                      )}
                      <td className="font-mono text-xs font-semibold">{r.reference}</td>
                      <td>
                        <div className="font-medium">{r.name}</div>
                        {r.organization && <div className="text-xs text-muted-foreground">{r.organization}</div>}
                      </td>
                      <td className="text-xs">
                        <a href={`mailto:${r.email}`} className="hover:underline">
                          {r.email}
                        </a>
                        <div className="text-muted-foreground">
                          {r.phone}
                          {r.whatsappOptIn && " · WhatsApp"}
                        </div>
                      </td>
                      <td className="tabular">{r.guests ? `1 + ${r.guests}` : "1"}</td>
                      <td className="text-xs whitespace-nowrap text-muted-foreground">{formatDateTime(r.createdAt, "en")}</td>
                      <td>
                        <StatusBadge status={r.status} label={r.status === "attended" ? "checked in" : undefined} />
                        {r.checkedInAt && <div className="mt-1 text-[11px] text-muted-foreground">{formatClock(r.checkedInAt, "en")}</div>}
                      </td>
                      {writable && (
                        <td>
                          <RowStatusMenu action={setRegistrationStatusAction.bind(null, r.id)} current={r.status} options={STATUS_OPTIONS} />
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </DataTable>
            ) : (
              <EmptyState title={filters.q || filters.status ? "No matching registrations" : "No registrations yet"} description="Registrations from the website appear here instantly." />
            )}
            {writable && regs.length > 0 && (
              <div className="px-3 pb-3">
                <BulkBar
                  formId="bulk-registrations"
                  action={bulkRegistrationStatusAction}
                  noun="guests"
                  options={[
                    { value: "attended", label: "Check in" },
                    { value: "registered", label: "Confirm seat (from waitlist)" },
                    { value: "waitlisted", label: "Move to waitlist" },
                    { value: "cancelled", label: "Cancel", danger: true },
                  ]}
                />
              </div>
            )}
          </Panel>
        </>
      )}
    </>
  );
}
