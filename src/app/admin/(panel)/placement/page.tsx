import Link from "next/link";
import type { Metadata } from "next";
import { Plus } from "lucide-react";
import { DataTable, EmptyState, PageHeader, Panel, StatusBadge } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/lib/auth/dal";
import { can } from "@/lib/auth/permissions";
import { formatClock, formatDate, formatPKR } from "@/lib/format";
import { cn } from "@/lib/utils";
import { listPlacementSessionsAdmin } from "@/server/admin/programme";

export const metadata: Metadata = { title: "Placement tests" };

export default async function PlacementAdminPage() {
  const user = await requireAdmin("submissions:read");
  const rows = await listPlacementSessionsAdmin();
  const editor = can(user.role, "content:write");

  return (
    <>
      <PageHeader
        eyebrow="Applications"
        title="Placement tests"
        description="Test sittings for learners who already know some German. Open a session to confirm candidates, mark attendance and publish results, candidates are notified and see the result in the tracker."
        actions={
          editor && (
            <Button asChild className="bg-forest text-white hover:bg-pine dark:bg-primary dark:text-primary-foreground">
              <Link href="/admin/placement/new">
                <Plus /> New session
              </Link>
            </Button>
          )
        }
      />
      <Panel padded={false}>
        {rows.length ? (
          <DataTable>
            <thead>
              <tr>
                <th>Session</th>
                <th>Date</th>
                <th>Levels</th>
                <th>Seats</th>
                <th>New</th>
                <th>Fee</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ s, submitted, past }) => {
                const pct = Math.round((s.seatsTaken / Math.max(1, s.capacity)) * 100);
                return (
                  <tr key={s.id} className={cn(past && "text-muted-foreground")}>
                    <td>
                      <Link href={`/admin/placement/${s.id}`} className="font-mono text-xs font-semibold hover:underline">
                        {s.code}
                      </Link>
                      <div className="text-xs text-muted-foreground">{s.mode === "online" ? "Online" : "On campus"}</div>
                    </td>
                    <td className="whitespace-nowrap">
                      {formatDate(s.startsAt, "en", { weekday: "short" })}
                      <div className="text-xs text-muted-foreground">
                        {formatClock(s.startsAt, "en")} · deadline {formatDate(s.registrationDeadline, "en")}
                      </div>
                    </td>
                    <td className="text-xs">{s.levels.join(" · ")}</td>
                    <td className="min-w-32">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                          <div className={cn("h-full rounded-full", pct >= 90 ? "bg-[#d98a1f]" : "bg-primary")} style={{ width: `${Math.min(100, pct)}%` }} />
                        </div>
                        <span className="text-xs tabular">
                          {s.seatsTaken}/{s.capacity}
                        </span>
                      </div>
                    </td>
                    <td>{submitted > 0 ? <span className="font-semibold text-primary">{submitted}</span> : <span className="text-muted-foreground">0</span>}</td>
                    <td className="tabular">{formatPKR(s.feePkr, "en")}</td>
                    <td>
                      <StatusBadge status={s.status} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </DataTable>
        ) : (
          <EmptyState
            title="No placement test sessions yet"
            action={
              editor && (
                <Button asChild size="sm">
                  <Link href="/admin/placement/new">Create a session</Link>
                </Button>
              )
            }
          />
        )}
      </Panel>
    </>
  );
}
