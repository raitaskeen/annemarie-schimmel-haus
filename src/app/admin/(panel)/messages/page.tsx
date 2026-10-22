import Link from "next/link";
import type { Metadata } from "next";
import { Toolbar } from "@/components/admin/toolbar";
import { buildQuery, DataTable, EmptyState, PageHeader, Pagination, Panel, StatusBadge } from "@/components/admin/ui";
import { commonDictionary } from "@/i18n/common";
import { requireAdmin } from "@/lib/auth/dal";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { listMessages, MESSAGE_STATUSES, MESSAGE_TOPICS } from "@/server/admin/inbox";

export const metadata: Metadata = { title: "Messages" };

export default async function MessagesPage(props: PageProps<"/admin/messages">) {
  await requireAdmin("messages:manage");
  const sp = await props.searchParams;
  const get = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined);
  const filters = { q: get("q"), status: get("status"), topic: get("topic"), page: get("page") };
  const { rows, total, page, pageCount } = await listMessages(filters);
  const topics = commonDictionary("en").form.topics;

  return (
    <>
      <PageHeader eyebrow="Applications" title="Messages" description="Questions from the contact form. Reply from here, the answer is sent by email with the reference number, and the conversation is kept." />
      <div className="mb-4 flex flex-wrap gap-2">
        {[{ key: undefined, label: "Open" }, ...MESSAGE_STATUSES.map((s) => ({ key: s, label: s.replace("_", " ") }))].map((s) => (
          <Link
            key={s.label}
            href={buildQuery("/admin/messages", { ...filters, status: s.key, page: undefined })}
            className={cn("inline-flex h-9 items-center rounded-full border px-3.5 text-sm capitalize", filters.status === s.key ? "border-transparent bg-forest text-white dark:bg-primary dark:text-primary-foreground" : "bg-card hover:bg-muted")}
          >
            {s.label}
          </Link>
        ))}
      </div>
      <Panel padded={false}>
        <Toolbar placeholder="Search name, email, subject or reference…" filters={[{ name: "topic", label: "Topic", options: MESSAGE_TOPICS.map((t) => ({ value: t, label: topics[t] })) }]} />
        {rows.length ? (
          <DataTable>
            <thead>
              <tr>
                <th>From</th>
                <th>Subject</th>
                <th>Topic</th>
                <th>Received</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((m) => (
                <tr key={m.id} className={cn(m.status === "new" && "font-semibold")}>
                  <td>
                    <Link href={`/admin/messages/${m.id}`} className="hover:underline">
                      {m.name}
                    </Link>
                    <div className="text-xs font-normal text-muted-foreground">{m.email}</div>
                  </td>
                  <td className="max-w-md">
                    <Link href={`/admin/messages/${m.id}`} className="line-clamp-1 hover:underline">
                      {m.subject}
                    </Link>
                    <div className="line-clamp-1 text-xs font-normal text-muted-foreground">{m.message}</div>
                  </td>
                  <td className="text-xs font-normal">{topics[m.topic]}</td>
                  <td className="text-xs font-normal whitespace-nowrap text-muted-foreground">{formatDateTime(m.createdAt, "en")}</td>
                  <td>
                    <StatusBadge status={m.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        ) : (
          <EmptyState title={filters.status || filters.q ? "No matching messages" : "Inbox zero"} description={filters.status ? undefined : "All questions have been answered."} />
        )}
        <Pagination page={page} pageCount={pageCount} total={total} buildHref={(p) => buildQuery("/admin/messages", { ...filters, page: p })} />
      </Panel>
    </>
  );
}
