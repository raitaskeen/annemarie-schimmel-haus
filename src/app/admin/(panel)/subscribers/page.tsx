import type { Metadata } from "next";
import { Download, Trash, UserMinus } from "lucide-react";
import { ConfirmAction } from "@/components/admin/confirm-action";
import { Toolbar } from "@/components/admin/toolbar";
import { buildQuery, DataTable, EmptyState, PageHeader, Pagination, Panel, StatCard, StatusBadge } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/lib/auth/dal";
import { formatDateTime } from "@/lib/format";
import { deleteSubscriberAction, unsubscribeAction } from "@/server/actions/inbox";
import { listSubscribers } from "@/server/admin/inbox";

export const metadata: Metadata = { title: "Subscribers" };

export default async function SubscribersPage(props: PageProps<"/admin/subscribers">) {
  await requireAdmin("submissions:export");
  const sp = await props.searchParams;
  const get = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined);
  const filters = { q: get("q"), status: get("status"), page: get("page") };
  const { rows, total, page, pageCount, byStatus } = await listSubscribers(filters);

  return (
    <>
      <PageHeader
        eyebrow="Website"
        title="Newsletter subscribers"
        description="Double opt-in: an address only becomes active after the visitor confirms it by email. Export active addresses for your newsletter tool."
        actions={
          <Button asChild variant="outline">
            <a href="/admin/export/subscribers" download>
              <Download /> Export active (CSV)
            </a>
          </Button>
        }
      />
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Active" value={byStatus.active ?? 0} tone="dark" href={buildQuery("/admin/subscribers", { status: "active" })} />
        <StatCard label="Waiting for confirmation" value={byStatus.pending ?? 0} href={buildQuery("/admin/subscribers", { status: "pending" })} />
        <StatCard label="Unsubscribed" value={byStatus.unsubscribed ?? 0} href={buildQuery("/admin/subscribers", { status: "unsubscribed" })} />
      </div>
      <Panel padded={false}>
        <Toolbar placeholder="Search email…" filters={[{ name: "status", label: "Status", options: ["active", "pending", "unsubscribed"].map((s) => ({ value: s, label: s })) }]} />
        {rows.length ? (
          <DataTable>
            <thead>
              <tr>
                <th>Email</th>
                <th>Language</th>
                <th>Signed up</th>
                <th>Confirmed</th>
                <th>Status</th>
                <th className="w-0" />
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => (
                <tr key={s.id}>
                  <td className="font-medium">{s.email}</td>
                  <td className="text-xs uppercase">{s.locale}</td>
                  <td className="text-xs whitespace-nowrap text-muted-foreground">{formatDateTime(s.createdAt, "en")}</td>
                  <td className="text-xs whitespace-nowrap text-muted-foreground">{s.confirmedAt ? formatDateTime(s.confirmedAt, "en") : "—"}</td>
                  <td>
                    <StatusBadge status={s.status === "pending" ? "queued" : s.status === "unsubscribed" ? "closed" : s.status} label={s.status} />
                  </td>
                  <td>
                    <div className="flex gap-1">
                      {s.status !== "unsubscribed" && (
                        <ConfirmAction action={unsubscribeAction.bind(null, s.id)} title="Unsubscribe this address?" description={`${s.email} will no longer be exported.`} confirmLabel="Unsubscribe" variant="ghost">
                          <UserMinus className="size-3.5" />
                        </ConfirmAction>
                      )}
                      <ConfirmAction action={deleteSubscriberAction.bind(null, s.id)} title="Erase this address?" description="Use this when someone asks for their data to be deleted. This cannot be undone." confirmLabel="Erase" destructive variant="ghost">
                        <Trash className="size-3.5" />
                      </ConfirmAction>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        ) : (
          <EmptyState title="No subscribers found" />
        )}
        <Pagination page={page} pageCount={pageCount} total={total} buildHref={(p) => buildQuery("/admin/subscribers", { ...filters, page: p })} />
      </Panel>
    </>
  );
}
