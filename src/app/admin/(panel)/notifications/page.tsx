import Link from "next/link";
import type { Metadata } from "next";
import { Eye, Mail, MessageCircle, RotateCw } from "lucide-react";
import { ConfirmAction } from "@/components/admin/confirm-action";
import { Toolbar } from "@/components/admin/toolbar";
import { buildQuery, DataTable, EmptyState, PageHeader, Pagination, Panel, StatCard, StatusBadge } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/lib/auth/dal";
import { gmailConfigured, whatsappConfigured } from "@/lib/env";
import { formatDateTime } from "@/lib/format";
import { retryNotificationAction } from "@/server/actions/inbox";
import { listNotifications, NOTIFICATION_STATUSES } from "@/server/admin/inbox";

export const metadata: Metadata = { title: "Notifications" };

export default async function NotificationsPage(props: PageProps<"/admin/notifications">) {
  await requireAdmin("notifications:manage");
  const sp = await props.searchParams;
  const get = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined);
  const filters = { q: get("q"), status: get("status"), channel: get("channel"), page: get("page") };
  const { rows, total, page, pageCount, byStatus } = await listNotifications(filters);
  const gmail = gmailConfigured();
  const whatsapp = whatsappConfigured();

  return (
    <>
      <PageHeader
        eyebrow="System"
        title="Notifications"
        description="Every email and WhatsApp message goes through this outbox. Failed messages retry automatically with increasing delays; you can also retry by hand."
        actions={
          <Button asChild variant="outline">
            <Link href="/admin/settings#integrations">Integration settings</Link>
          </Button>
        }
      />
      {(!gmail || !whatsapp) && (
        <div className="mb-6 rounded-2xl border border-warning/40 bg-warning/[0.08] p-4 text-sm">
          <p className="font-semibold">Not connected yet: {[!gmail && "Gmail API", !whatsapp && "WhatsApp Business API"].filter(Boolean).join(" and ")}</p>
          <p className="mt-1 text-muted-foreground">Messages for unconnected channels are recorded as “skipped”. Add the credentials (see README → Notifications) and retry them — nothing is lost.</p>
        </div>
      )}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Sent" value={byStatus.sent ?? 0} tone="dark" href={buildQuery("/admin/notifications", { status: "sent" })} />
        <StatCard label="Queued" value={(byStatus.queued ?? 0) + (byStatus.sending ?? 0)} href={buildQuery("/admin/notifications", { status: "queued" })} />
        <StatCard label="Failed" value={byStatus.failed ?? 0} tone={byStatus.failed ? "warning" : "default"} href={buildQuery("/admin/notifications", { status: "failed" })} />
        <StatCard label="Skipped (not connected)" value={byStatus.skipped ?? 0} href={buildQuery("/admin/notifications", { status: "skipped" })} />
      </div>
      <Panel padded={false}>
        <Toolbar
          placeholder="Search recipient, subject or reference…"
          filters={[
            { name: "status", label: "Status", options: NOTIFICATION_STATUSES.map((s) => ({ value: s, label: s })) },
            { name: "channel", label: "Channel", options: [{ value: "email", label: "Email" }, { value: "whatsapp", label: "WhatsApp" }] },
          ]}
        />
        {rows.length ? (
          <DataTable>
            <thead>
              <tr>
                <th>Message</th>
                <th>Recipient</th>
                <th>Created</th>
                <th>Attempts</th>
                <th>Status</th>
                <th className="w-0" />
              </tr>
            </thead>
            <tbody>
              {rows.map((n) => (
                <tr key={n.id}>
                  <td className="max-w-sm">
                    <div className="flex items-center gap-2">
                      {n.channel === "email" ? <Mail className="size-3.5 shrink-0 text-muted-foreground" /> : <MessageCircle className="size-3.5 shrink-0 text-muted-foreground" />}
                      <span className="line-clamp-1 font-medium">{n.subject ?? n.template}</span>
                    </div>
                    <div className="font-mono text-[11px] text-muted-foreground">
                      {n.template} · {n.locale}
                    </div>
                    {n.lastError && n.status !== "sent" && <div className="line-clamp-1 text-xs text-destructive/80">{n.lastError}</div>}
                  </td>
                  <td className="text-xs">{n.recipient}</td>
                  <td className="text-xs whitespace-nowrap text-muted-foreground">
                    {formatDateTime(n.createdAt, "en")}
                    {n.sentAt && <div>sent {formatDateTime(n.sentAt, "en")}</div>}
                  </td>
                  <td className="tabular">{n.attempts}</td>
                  <td>
                    <StatusBadge status={n.status} />
                  </td>
                  <td>
                    <div className="flex gap-1">
                      {n.channel === "email" && (
                        <Button asChild variant="ghost" size="sm" className="size-8 p-0" title="Preview">
                          <a href={`/admin/preview/notifications/${n.id}`} target="_blank" rel="noreferrer" aria-label="Preview email">
                            <Eye className="size-4" />
                          </a>
                        </Button>
                      )}
                      {(n.status === "failed" || n.status === "skipped") && (
                        <ConfirmAction action={retryNotificationAction.bind(null, n.id)} title="Send this message again?" description={`To ${n.recipient}. Only retry after fixing the cause (e.g. connecting the channel).`} confirmLabel="Retry" variant="ghost">
                          <RotateCw className="size-4" />
                        </ConfirmAction>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        ) : (
          <EmptyState title="No notifications found" />
        )}
        <Pagination page={page} pageCount={pageCount} total={total} buildHref={(p) => buildQuery("/admin/notifications", { ...filters, page: p })} />
      </Panel>
    </>
  );
}
