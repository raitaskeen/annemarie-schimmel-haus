import Link from "next/link";
import type { Metadata } from "next";
import { BadgeCheck, Download } from "lucide-react";
import { BulkBar, RowCheck } from "@/components/admin/bulk-bar";
import { Toolbar } from "@/components/admin/toolbar";
import { buildQuery, DataTable, EmptyState, PageHeader, Pagination, Panel, StatusBadge } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/lib/auth/dal";
import { can } from "@/lib/auth/permissions";
import { formatDate, formatDateTime, formatPKR } from "@/lib/format";
import { bulkEnrollmentStatusAction } from "@/server/actions/enrollments";
import { ENROLLMENT_STATUSES, listEnrollments, offeringOptions } from "@/server/admin/enrollments";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Enrollments" };

export default async function EnrollmentsPage(props: PageProps<"/admin/enrollments">) {
  const user = await requireAdmin("submissions:read");
  const sp = await props.searchParams;
  const get = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined);
  const filters = { q: get("q"), status: get("status"), offering: get("offering"), course: get("course"), mode: get("mode"), page: Number(get("page") ?? 1) || 1 };
  const [data, offerings] = await Promise.all([listEnrollments(filters), offeringOptions()]);
  const total = Object.values(data.statusCounts).reduce((a, b) => a + b, 0);
  const writable = can(user.role, "submissions:write");

  return (
    <>
      <PageHeader
        eyebrow="Applications"
        title="Course enrollments"
        description="Every application submitted through the website. Open one to review documents, request payment or confirm the seat."
        actions={
          can(user.role, "submissions:export") && (
            <Button asChild variant="outline">
              <a href={buildQuery("/admin/export/enrollments", { ...filters, page: undefined })}>
                <Download /> Export CSV
              </a>
            </Button>
          )
        }
      />

      <div className="mb-4 -mx-1 flex gap-2 overflow-x-auto px-1 pr-10 pb-1 no-scrollbar [mask-image:linear-gradient(to_right,black_80%,transparent)] sm:pr-1 sm:[mask-image:none]">
        {[{ key: "all", label: "All", n: total }, ...(data.reported ? [{ key: "reported", label: "Payment reported", n: data.reported }] : []), ...ENROLLMENT_STATUSES.map((s) => ({ key: s, label: s.replace("_", " "), n: data.statusCounts[s] ?? 0 }))].map((s) => {
          const active = (filters.status ?? "all") === s.key;
          return (
            <Link
              key={s.key}
              href={buildQuery("/admin/enrollments", { ...filters, status: s.key, page: undefined })}
              className={cn("inline-flex h-9 shrink-0 items-center gap-2 rounded-full border px-3.5 text-sm capitalize transition-colors", active ? "border-transparent bg-forest text-white dark:bg-primary dark:text-primary-foreground" : "bg-card hover:bg-muted")}
            >
              {s.label}
              <span className={cn("rounded-full px-1.5 text-xs tabular", active ? "bg-white/20" : "bg-muted")}>{s.n}</span>
            </Link>
          );
        })}
      </div>

      <Panel padded={false}>
        <Toolbar
          placeholder="Search name, email, phone, CNIC or ASH-E-…"
          filters={[
            { name: "offering", label: "Batch", options: offerings.map((o) => ({ value: o.id, label: `${o.code} · ${formatDate(o.startsOn, "en", { month: "short", year: "2-digit" })}` })) },
            { name: "mode", label: "Format", options: [{ value: "on_campus", label: "On campus" }, { value: "online", label: "Online" }] },
          ]}
        />
        {data.rows.length ? (
          <DataTable>
            <thead>
              <tr>
                {writable && <th className="w-0" aria-label="Select" />}
                <th>Applicant</th>
                <th>Reference</th>
                <th>Batch</th>
                <th>Fee</th>
                <th>Submitted</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.map((r) => (
                <tr key={r.id} className="cursor-pointer">
                  {writable && (
                    <td>
                      <RowCheck formId="bulk-enrollments" value={r.id} label={`Select ${r.firstName} ${r.lastName}`} />
                    </td>
                  )}
                  <td>
                    <Link href={`/admin/enrollments/${r.id}`} className="font-medium hover:underline">
                      {r.firstName} {r.lastName}
                    </Link>
                    <div className="text-xs text-muted-foreground">{r.email}</div>
                  </td>
                  <td className="font-mono text-xs">{r.reference}</td>
                  <td>
                    <span className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-xs font-semibold">{r.courseCode}</span>{" "}
                    <span className="text-xs text-muted-foreground">
                      {r.offeringCode} · {r.mode === "online" ? "Online" : "Campus"}
                    </span>
                  </td>
                  <td className="tabular">{formatPKR(r.amountDuePkr, "en")}</td>
                  <td className="text-xs text-muted-foreground">{formatDateTime(r.createdAt, "en")}</td>
                  <td>
                    <StatusBadge status={r.status} />
                    {r.paymentRef && (r.status === "submitted" || r.status === "payment_pending") && (
                      <span className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-primary" title={`Transaction ID ${r.paymentRef}`}>
                        <BadgeCheck className="size-3.5" /> Payment reported
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        ) : (
          <EmptyState title="No applications match" description="Try another search or clear the filters." />
        )}
        {writable && data.rows.length > 0 && (
          <div className="px-3 pb-3">
            <BulkBar
              formId="bulk-enrollments"
              action={bulkEnrollmentStatusAction}
              noun="applications"
              options={[
                { value: "payment_pending", label: "Request payment" },
                { value: "confirmed", label: "Confirm payment & seat" },
                { value: "waitlisted", label: "Move to waitlist" },
                { value: "completed", label: "Mark course completed" },
                { value: "rejected", label: "Reject", danger: true },
                { value: "cancelled", label: "Cancel", danger: true },
              ]}
            />
          </div>
        )}
        <Pagination page={data.page} pageCount={data.pageCount} total={data.total} buildHref={(p) => buildQuery("/admin/enrollments", { ...filters, page: p })} />
      </Panel>
    </>
  );
}
