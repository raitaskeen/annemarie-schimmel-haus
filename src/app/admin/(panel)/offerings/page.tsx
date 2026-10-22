import Link from "next/link";
import type { Metadata } from "next";
import { Plus } from "lucide-react";
import { Toolbar } from "@/components/admin/toolbar";
import { buildQuery, DataTable, EmptyState, PageHeader, Panel, StatusBadge } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/lib/auth/dal";
import { formatDate, formatPKR, formatTimeRange, formatWeekdays } from "@/lib/format";
import { cn } from "@/lib/utils";
import { courseOptions, listOfferingsAdmin } from "@/server/admin/catalog";

export const metadata: Metadata = { title: "Batches" };

export default async function OfferingsPage(props: PageProps<"/admin/offerings">) {
  await requireAdmin("content:write");
  const sp = await props.searchParams;
  const get = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined);
  const filters = { q: get("q"), course: get("course"), status: get("status"), period: get("period") ?? "upcoming" };
  const [rows, courses] = await Promise.all([listOfferingsAdmin(filters), courseOptions()]);

  return (
    <>
      <PageHeader
        eyebrow="Programme"
        title="Course batches"
        description="Each batch is one group with dates, times and a seat limit. Applications reserve seats automatically; when a batch is full new applicants join its waitlist."
        actions={
          <Button asChild className="bg-forest text-white hover:bg-pine dark:bg-primary dark:text-primary-foreground">
            <Link href="/admin/offerings/new">
              <Plus /> New batch
            </Link>
          </Button>
        }
      />
      <div className="mb-4 flex gap-2">
        {[
          { key: "upcoming", label: "Upcoming & running" },
          { key: "past", label: "Past" },
          { key: "all", label: "All" },
        ].map((p) => (
          <Link
            key={p.key}
            href={buildQuery("/admin/offerings", { ...filters, period: p.key })}
            className={cn("inline-flex h-9 items-center rounded-full border px-3.5 text-sm", filters.period === p.key ? "border-transparent bg-forest text-white dark:bg-primary dark:text-primary-foreground" : "bg-card hover:bg-muted")}
          >
            {p.label}
          </Link>
        ))}
      </div>
      <Panel padded={false}>
        <Toolbar
          placeholder="Search batch code or course…"
          filters={[
            { name: "course", label: "Course", options: courses.map((c) => ({ value: c.code, label: c.code })) },
            { name: "status", label: "Status", options: ["draft", "open", "closed", "cancelled", "completed"].map((s) => ({ value: s, label: s })) },
          ]}
        />
        {rows.length ? (
          <DataTable>
            <thead>
              <tr>
                <th>Batch</th>
                <th>Starts</th>
                <th>Schedule</th>
                <th>Seats</th>
                <th>To review</th>
                <th>Fee</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ o, courseCode, courseFee, pending, waitlisted }) => {
                const pct = Math.round((o.seatsTaken / Math.max(1, o.capacity)) * 100);
                return (
                  <tr key={o.id}>
                    <td>
                      <Link href={`/admin/offerings/${o.id}`} className="font-mono text-xs font-semibold hover:underline">
                        {o.code}
                      </Link>
                      <div className="text-xs text-muted-foreground">
                        {courseCode} · {o.mode === "online" ? "Online" : "On campus"} · {o.track}
                      </div>
                    </td>
                    <td className="whitespace-nowrap">{formatDate(o.startsOn, "en", { weekday: "short" })}</td>
                    <td className="text-xs text-muted-foreground">
                      {formatWeekdays(o.weekdays, "en")} · {formatTimeRange(o.startTime, o.endTime, "en")}
                    </td>
                    <td className="min-w-36">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                          <div className={cn("h-full rounded-full", pct >= 90 ? "bg-[#d98a1f]" : "bg-primary")} style={{ width: `${Math.min(100, pct)}%` }} />
                        </div>
                        <span className="text-xs tabular">
                          {o.seatsTaken}/{o.capacity}
                        </span>
                      </div>
                      {waitlisted > 0 && <span className="text-xs text-muted-foreground">+{waitlisted} waitlisted</span>}
                    </td>
                    <td>
                      {pending > 0 ? (
                        <Link href={`/admin/enrollments?offering=${o.id}`} className="font-semibold text-primary hover:underline">
                          {pending}
                        </Link>
                      ) : (
                        <span className="text-muted-foreground">0</span>
                      )}
                    </td>
                    <td className="tabular">{formatPKR(o.feePkr ?? courseFee, "en")}</td>
                    <td>
                      <StatusBadge status={o.status} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </DataTable>
        ) : (
          <EmptyState
            title="No batches found"
            action={
              <Button asChild size="sm">
                <Link href="/admin/offerings/new">Create a batch</Link>
              </Button>
            }
          />
        )}
      </Panel>
    </>
  );
}
