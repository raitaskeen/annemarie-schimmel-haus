import type { Metadata } from "next";
import { Toolbar } from "@/components/admin/toolbar";
import { buildQuery, DataTable, EmptyState, PageHeader, Pagination, Panel } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/auth/dal";
import { formatDateTime } from "@/lib/format";
import { listAudit } from "@/server/admin/users";

export const metadata: Metadata = { title: "Audit log" };

export default async function AuditPage(props: PageProps<"/admin/audit">) {
  await requireAdmin("audit:read");
  const sp = await props.searchParams;
  const get = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined);
  const filters = { q: get("q"), entity: get("entity"), actor: get("actor"), page: get("page") };
  const { rows, total, page, pageCount, entities, actors } = await listAudit(filters);
  return (
    <>
      <PageHeader eyebrow="System" title="Audit log" description="Every change, export, file access and sign-in is recorded here and cannot be edited. Sensitive values (passwords, tokens, ID numbers) are never stored." />
      <Panel padded={false}>
        <Toolbar
          placeholder="Search summaries, actions or IDs…"
          filters={[
            { name: "entity", label: "Area", options: entities.map((e) => ({ value: e, label: e.replace(/_/g, " ") })) },
            { name: "actor", label: "Person", options: actors.map((a) => ({ value: a.id, label: a.name })) },
          ]}
        />
        {rows.length ? (
          <DataTable>
            <thead>
              <tr>
                <th>When</th>
                <th>Who</th>
                <th data-primary>What</th>
                <th>Action</th>
                <th>From</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="text-xs whitespace-nowrap text-muted-foreground">{formatDateTime(r.createdAt, "en")}</td>
                  <td className="text-xs">{r.actorEmail ?? "System"}</td>
                  <td className="max-w-lg">{r.summary}</td>
                  <td>
                    <code className="rounded bg-muted px-1.5 py-0.5 text-[11px]">{r.action}</code>
                  </td>
                  <td className="text-xs text-muted-foreground">{r.ip ?? "·"}</td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        ) : (
          <EmptyState title="Nothing found" />
        )}
        <Pagination page={page} pageCount={pageCount} total={total} buildHref={(p) => buildQuery("/admin/audit", { ...filters, page: p })} />
      </Panel>
    </>
  );
}
