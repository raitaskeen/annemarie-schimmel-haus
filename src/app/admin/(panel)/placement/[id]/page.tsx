import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft, Download, Pencil } from "lucide-react";
import { BulkBar, RowCheck } from "@/components/admin/bulk-bar";
import { PlacementResultDialog } from "@/components/admin/programme-forms";
import { buildQuery, DataTable, EmptyState, PageHeader, Panel, StatCard, StatusBadge } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { commonDictionary } from "@/i18n/common";
import { requireAdmin } from "@/lib/auth/dal";
import { can } from "@/lib/auth/permissions";
import { formatClock, formatDate, formatDateTime, formatPKR } from "@/lib/format";
import { bulkPlacementStatusAction, updatePlacementApplicationAction } from "@/server/actions/programme";
import { getPlacementSessionAdmin } from "@/server/admin/programme";

export const metadata: Metadata = { title: "Placement test" };

export default async function PlacementSessionPage(props: PageProps<"/admin/placement/[id]">) {
  const user = await requireAdmin("submissions:read");
  const { id } = await props.params;
  const data = await getPlacementSessionAdmin(id);
  if (!data) notFound();
  const { s, apps } = data;
  const dict = commonDictionary("en");
  const writable = can(user.role, "submissions:write");
  const n = (st: string) => apps.filter((a) => a.status === st).length;

  return (
    <>
      <Link href="/admin/placement" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> All sessions
      </Link>
      <PageHeader
        eyebrow={`${formatDate(s.startsAt, "en", { weekday: "long" })} · ${formatClock(s.startsAt, "en")}-${formatClock(s.endsAt, "en")}`}
        title={`Placement test ${s.code}`}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <StatusBadge status={s.status} /> {s.levels.join(" · ")} · {formatPKR(s.feePkr, "en")} · {s.venue}
          </span>
        }
        actions={
          <>
            {can(user.role, "content:write") && (
              <Button asChild variant="outline" size="sm">
                <Link href={`/admin/placement/${s.id}/edit`}>
                  <Pencil /> Edit session
                </Link>
              </Button>
            )}
            {can(user.role, "submissions:export") && (
              <Button asChild variant="outline" size="sm">
                <a href={buildQuery("/admin/export/placement", { session: s.id })}>
                  <Download /> Candidate list CSV
                </a>
              </Button>
            )}
          </>
        }
      />
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Seats" value={`${s.seatsTaken}/${s.capacity}`} tone="dark" hint={`Deadline ${formatDateTime(s.registrationDeadline, "en")}`} />
        <StatCard label="New" value={n("submitted")} />
        <StatCard label="Confirmed" value={n("confirmed")} tone="primary" />
        <StatCard label="Tested" value={n("attended")} hint="Waiting for a result" />
        <StatCard label="Results published" value={n("completed")} />
      </div>
      <Panel padded={false} title={`Candidates (${apps.length})`} description="Results are shown to the candidate in the tracker and sent by email / WhatsApp.">
        {apps.length ? (
          <DataTable>
            <thead>
              <tr>
                {writable && <th className="w-0" aria-label="Select" />}
                <th>Reference</th>
                <th data-primary>Candidate</th>
                <th>Contact</th>
                <th>Aiming for</th>
                <th>Previous German</th>
                <th>Result</th>
                <th>Status</th>
                {writable && <th className="w-0" />}
              </tr>
            </thead>
            <tbody>
              {apps.map((a) => (
                <tr key={a.id}>
                  {writable && (
                    <td>
                      <RowCheck formId="bulk-placement" value={a.id} label={`Select ${a.firstName} ${a.lastName}`} />
                    </td>
                  )}
                  <td className="font-mono text-xs font-semibold">{a.reference}</td>
                  <td>
                    <div className="font-medium">
                      {a.firstName} {a.lastName}
                    </div>
                    <div className="font-mono text-xs text-muted-foreground">{a.cnic}</div>
                  </td>
                  <td className="text-xs">
                    <a href={`mailto:${a.email}`} className="hover:underline">
                      {a.email}
                    </a>
                    <div className="text-muted-foreground">
                      {a.phone}
                      {a.whatsappOptIn && " · WhatsApp"}
                    </div>
                  </td>
                  <td>
                    <span className="rounded-md bg-muted px-2 py-0.5 font-mono text-xs font-semibold">{a.targetLevel}</span>
                  </td>
                  <td className="max-w-64 text-xs text-muted-foreground"><span className="line-clamp-2" title={a.priorLearning}>{a.priorLearning}</span></td>
                  <td>
                    {a.resultLevel ? (
                      <span className="font-semibold">
                        {a.resultLevel}
                        {a.resultScore !== null && <span className="ml-1 text-xs font-normal text-muted-foreground">{a.resultScore}%</span>}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">·</span>
                    )}
                  </td>
                  <td>
                    <StatusBadge status={a.status} label={dict.status.placement[a.status]} />
                  </td>
                  {writable && (
                    <td>
                      <PlacementResultDialog action={updatePlacementApplicationAction.bind(null, a.id)} application={a} />
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </DataTable>
        ) : (
          <EmptyState title="No candidates yet" description={s.status === "open" ? "Registrations from the website appear here." : "Open the session to accept registrations."} />
        )}
        {writable && apps.length > 0 && (
          <div className="px-3 pb-3">
            <BulkBar
              formId="bulk-placement"
              action={bulkPlacementStatusAction}
              noun="candidates"
              options={[
                { value: "confirmed", label: "Confirm seat" },
                { value: "attended", label: "Mark as tested (attended)" },
                { value: "no_show", label: "Did not attend", danger: true },
                { value: "cancelled", label: "Cancel", danger: true },
              ]}
            />
          </div>
        )}
      </Panel>
    </>
  );
}
