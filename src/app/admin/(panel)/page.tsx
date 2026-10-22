import Link from "next/link";
import type { Metadata } from "next";
import { AlertTriangle, ArrowRight, Banknote, CalendarDays, ClipboardCheck, GraduationCap, Hourglass, Mail, Plus, Send, Users } from "lucide-react";
import { ActivityChart } from "@/components/admin/activity-chart";
import { EmptyState, PageHeader, Panel, StatCard, StatusBadge } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/lib/auth/dal";
import { can } from "@/lib/auth/permissions";
import { gmailConfigured, whatsappConfigured } from "@/lib/env";
import { formatDate, formatDateTime, formatPKR } from "@/lib/format";
import { dashboardData } from "@/server/admin/stats";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const user = await requireAdmin("dashboard:view");
  const data = await dashboardData();
  const { kpi } = data;
  const greeting = (() => {
    const h = Number(new Intl.DateTimeFormat("en-GB", { hour: "numeric", hourCycle: "h23", timeZone: "Asia/Karachi" }).format(new Date()));
    return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
  })();
  const integrations = [
    { name: "Gmail API", ok: gmailConfigured() },
    { name: "WhatsApp Business", ok: whatsappConfigured() },
  ];

  return (
    <>
      <PageHeader
        eyebrow="Overview"
        title={`${greeting}, ${user.name.split(" ")[0]}`}
        description="Here's what is happening at the Haus, applications waiting for you, batches filling up and upcoming events."
        actions={
          can(user.role, "content:write") && (
            <>
              <Button asChild variant="outline">
                <Link href="/admin/events/new">
                  <Plus /> Event
                </Link>
              </Button>
              <Button asChild className="bg-forest text-white hover:bg-pine dark:bg-primary dark:text-primary-foreground">
                <Link href="/admin/offerings/new">
                  <Plus /> Course batch
                </Link>
              </Button>
            </>
          )
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard tone="dark" label="New applications to review" value={kpi.pending} hint="Course applications with status “submitted”" icon={<GraduationCap className="size-4" />} href="/admin/enrollments?status=submitted" />
        <StatCard
          label="Awaiting payment"
          value={kpi.awaitingPayment}
          hint={kpi.reported ? `${kpi.reported} reported a payment, confirm now` : `${kpi.waitlisted} on waitlists`}
          tone={kpi.reported ? "warning" : "default"}
          icon={<Hourglass className="size-4" />}
          href={kpi.reported ? "/admin/enrollments?status=reported" : "/admin/enrollments?status=payment_pending"}
        />
        <StatCard label="Fees confirmed · 30 days" value={formatPKR(kpi.revenue30, "en")} hint={`${kpi.confirmed30} seats confirmed`} icon={<Banknote className="size-4" />} tone="primary" />
        <StatCard label="Event registrations · 30 days" value={kpi.eventRegistrations30} hint={`${kpi.subscribers} newsletter subscribers`} icon={<CalendarDays className="size-4" />} href="/admin/events" />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <Panel title="Activity" description="Submissions per day, last 30 days">
          <ActivityChart data={data.perDay} />
        </Panel>

        <Panel title="Upcoming batches" description="Seat occupancy" actions={<Link href="/admin/offerings" className="text-xs font-medium text-primary hover:underline">All batches</Link>}>
          {data.upcomingBatches.length ? (
            <ul className="grid gap-4">
              {data.upcomingBatches.map((b) => {
                const pct = Math.round((b.seatsTaken / Math.max(1, b.capacity)) * 100);
                return (
                  <li key={b.id}>
                    <Link href={`/admin/offerings/${b.id}`} className="group grid gap-1.5">
                      <div className="flex items-center justify-between gap-3 text-sm">
                        <span className="flex min-w-0 items-center gap-2">
                          <span className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-xs font-semibold">{b.courseCode}</span>
                          <span className="truncate font-medium group-hover:underline">{b.code}</span>
                        </span>
                        <span className="shrink-0 text-xs text-muted-foreground">{formatDate(b.startsOn, "en", { month: "short", year: undefined })}</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-muted">
                        <div className={`h-full rounded-full ${pct >= 90 ? "bg-[#d98a1f]" : "bg-primary"}`} style={{ width: `${Math.min(100, pct)}%` }} />
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {b.seatsTaken}/{b.capacity} seats · {b.mode === "online" ? "Online" : "On campus"} {b.status === "draft" && "· draft"}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <EmptyState title="No upcoming batches" action={<Button asChild size="sm"><Link href="/admin/offerings/new">Create a batch</Link></Button>} />
          )}
        </Panel>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <Panel title="Latest applications" padded={false} actions={<Link href="/admin/enrollments" className="text-xs font-medium text-primary hover:underline">View all</Link>}>
          {data.recentEnrollments.length ? (
            <ul className="divide-y">
              {data.recentEnrollments.map((e) => (
                <li key={e.id}>
                  <Link href={`/admin/enrollments/${e.id}`} className="flex items-center gap-4 px-5 py-3 hover:bg-muted/40">
                    <span className="grid size-9 shrink-0 place-items-center rounded-full bg-muted text-xs font-bold">
                      {e.firstName[0]}
                      {e.lastName[0]}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">
                        {e.firstName} {e.lastName}
                      </span>
                      <span className="block truncate font-mono text-xs text-muted-foreground">
                        {e.reference} · {e.code}
                      </span>
                    </span>
                    <span className="hidden text-xs text-muted-foreground sm:block">{formatDateTime(e.createdAt, "en")}</span>
                    <StatusBadge status={e.status} />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="No applications yet" />
          )}
        </Panel>

        <div className="grid content-start gap-6">
          <Panel title="Coming up">
            <ul className="grid gap-3">
              {data.nextPlacement && (
                <li>
                  <Link href={`/admin/placement/${data.nextPlacement.id}`} className="flex items-center gap-3 rounded-xl border p-3 hover:bg-muted/40">
                    <ClipboardCheck className="size-5 text-primary" />
                    <span className="flex-1 text-sm">
                      <span className="block font-medium">Placement test · {formatDate(data.nextPlacement.startsAt, "en", { month: "short", year: undefined })}</span>
                      <span className="text-xs text-muted-foreground">
                        {data.nextPlacement.seatsTaken}/{data.nextPlacement.capacity} registered
                      </span>
                    </span>
                    <ArrowRight className="size-4 text-muted-foreground" />
                  </Link>
                </li>
              )}
              {data.upcomingEvents.map((ev) => (
                <li key={ev.id}>
                  <Link href={`/admin/events/${ev.id}`} className="flex items-center gap-3 rounded-xl border p-3 hover:bg-muted/40">
                    <CalendarDays className="size-5 text-primary" />
                    <span className="min-w-0 flex-1 text-sm">
                      <span className="block truncate font-medium">{ev.titleEn}</span>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(ev.startsAt, "en", { month: "short", year: undefined })} · {ev.seatsTaken}
                        {ev.capacity ? `/${ev.capacity}` : ""} registered
                      </span>
                    </span>
                    {ev.status !== "published" && <StatusBadge status={ev.status} />}
                  </Link>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel title="Notifications · 30 days" actions={<Link href="/admin/notifications" className="text-xs font-medium text-primary hover:underline">Outbox</Link>}>
            <div className="grid grid-cols-3 gap-3 text-center">
              {[
                { k: "sent", label: "Sent", icon: Send },
                { k: "skipped", label: "Held", icon: Mail },
                { k: "failed", label: "Failed", icon: AlertTriangle },
              ].map(({ k, label, icon: Icon }) => (
                <div key={k} className="rounded-xl bg-muted/60 p-3">
                  <Icon className="mx-auto size-4 text-muted-foreground" />
                  <p className="mt-1 font-display text-2xl tabular">{data.notifications[k] ?? 0}</p>
                  <p className="text-xs text-muted-foreground">{label}</p>
                </div>
              ))}
            </div>
            <ul className="mt-4 grid gap-2 text-sm">
              {integrations.map((i) => (
                <li key={i.name} className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Users className="size-4 text-muted-foreground" /> {i.name}
                  </span>
                  <StatusBadge status={i.ok ? "active" : "skipped"} label={i.ok ? "Connected" : "Not configured"} />
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>
    </>
  );
}
