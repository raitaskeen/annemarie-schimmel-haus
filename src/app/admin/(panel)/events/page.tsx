import Link from "next/link";
import type { Metadata } from "next";
import { Plus, Star } from "lucide-react";
import { Toolbar } from "@/components/admin/toolbar";
import { buildQuery, DataTable, EmptyState, PageHeader, Panel, StatusBadge } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/lib/auth/dal";
import { can } from "@/lib/auth/permissions";
import { formatClock, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { listEventsAdmin } from "@/server/admin/programme";

export const metadata: Metadata = { title: "Events" };

const MODE: Record<string, string> = { internal: "Tickets on site", external: "External link", none: "Open entry" };

export default async function EventsAdminPage(props: PageProps<"/admin/events">) {
  const user = await requireAdmin("submissions:read");
  const sp = await props.searchParams;
  const get = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined);
  const filters = { q: get("q"), period: get("period") ?? "upcoming" };
  const rows = await listEventsAdmin(filters);
  const editor = can(user.role, "content:write");

  return (
    <>
      <PageHeader
        eyebrow="Programme"
        title="Events"
        description="Cultural evenings, info sessions and open days. Registrations get a ticket number and QR code that you can scan at the door."
        actions={
          editor && (
            <Button asChild className="bg-forest text-white hover:bg-pine dark:bg-primary dark:text-primary-foreground">
              <Link href="/admin/events/new">
                <Plus /> New event
              </Link>
            </Button>
          )
        }
      />
      <div className="mb-4 flex gap-2">
        {[
          { key: "upcoming", label: "Upcoming" },
          { key: "past", label: "Past" },
          { key: "all", label: "All" },
        ].map((p) => (
          <Link
            key={p.key}
            href={buildQuery("/admin/events", { ...filters, period: p.key })}
            className={cn("inline-flex h-9 items-center rounded-full border px-3.5 text-sm", filters.period === p.key ? "border-transparent bg-forest text-white dark:bg-primary dark:text-primary-foreground" : "bg-card hover:bg-muted")}
          >
            {p.label}
          </Link>
        ))}
      </div>
      <Panel padded={false}>
        <Toolbar placeholder="Search events…" />
        {rows.length ? (
          <DataTable>
            <thead>
              <tr>
                <th>Date</th>
                <th data-primary>Event</th>
                <th>Registration</th>
                <th>Seats</th>
                <th>Checked in</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ e, registered, waitlisted, attended }) => (
                <tr key={e.id}>
                  <td className="whitespace-nowrap">
                    <div className="font-medium">{formatDate(e.startsAt, "en", { weekday: "short" })}</div>
                    <div className="text-xs text-muted-foreground">{formatClock(e.startsAt, "en")}</div>
                  </td>
                  <td className="min-w-64">
                    <Link href={`/admin/events/${e.id}`} className="inline-flex items-center gap-1.5 font-medium hover:underline">
                      {e.featured && <Star className="size-3.5 fill-brass text-brass" aria-label="Featured" />}
                      {e.titleEn}
                    </Link>
                    <div className="text-xs text-muted-foreground capitalize">
                      {e.category.replace("_", " ")} · {e.venue}
                    </div>
                  </td>
                  <td className="text-xs text-muted-foreground">{MODE[e.registrationMode]}</td>
                  <td className="tabular">
                    {e.registrationMode === "internal" ? (
                      <>
                        {e.seatsTaken}
                        {e.capacity ? `/${e.capacity}` : ""}
                        <span className="text-xs text-muted-foreground"> · {registered} tickets</span>
                        {waitlisted > 0 && <div className="text-xs text-muted-foreground">+{waitlisted} waitlisted</div>}
                      </>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="tabular">{e.registrationMode === "internal" ? attended : "—"}</td>
                  <td>
                    <StatusBadge status={e.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        ) : (
          <EmptyState
            title="No events found"
            description={filters.period === "upcoming" ? "Nothing scheduled yet." : undefined}
            action={
              editor && (
                <Button asChild size="sm">
                  <Link href="/admin/events/new">Create an event</Link>
                </Button>
              )
            }
          />
        )}
      </Panel>
    </>
  );
}
