import Link from "next/link";
import type { Metadata } from "next";
import { Pin, Plus } from "lucide-react";
import { Toolbar } from "@/components/admin/toolbar";
import { DataTable, EmptyState, PageHeader, Panel, StatusBadge } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/lib/auth/dal";
import { formatDateTime } from "@/lib/format";
import { listPostsAdmin } from "@/server/admin/content";

export const metadata: Metadata = { title: "News" };

const CATEGORY: Record<string, string> = { news: "News", announcement: "Announcement", scholarship: "Scholarship", job: "Job opening", press: "Press" };

export default async function NewsAdminPage(props: PageProps<"/admin/news">) {
  await requireAdmin("content:write");
  const sp = await props.searchParams;
  const get = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined);
  const rows = await listPostsAdmin({ q: get("q"), status: get("status"), category: get("category") });
  return (
    <>
      <PageHeader
        eyebrow="Website"
        title="News & announcements"
        description="Articles, scholarships and job openings. Schedule an article by giving it a future publish date."
        actions={
          <Button asChild className="bg-forest text-white hover:bg-pine dark:bg-primary dark:text-primary-foreground">
            <Link href="/admin/news/new">
              <Plus /> New article
            </Link>
          </Button>
        }
      />
      <Panel padded={false}>
        <Toolbar
          placeholder="Search headlines…"
          filters={[
            { name: "status", label: "Status", options: [{ value: "published", label: "Published" }, { value: "draft", label: "Draft" }] },
            { name: "category", label: "Category", options: Object.entries(CATEGORY).map(([value, label]) => ({ value, label })) },
          ]}
        />
        {rows.length ? (
          <DataTable>
            <thead>
              <tr>
                <th>Headline</th>
                <th>Category</th>
                <th>Publish date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => {
                const scheduled = p.scheduled;
                return (
                  <tr key={p.id}>
                    <td>
                      <Link href={`/admin/news/${p.id}`} className="inline-flex items-center gap-1.5 font-medium hover:underline">
                        {p.pinned && <Pin className="size-3.5 text-brass" aria-label="Pinned" />}
                        {p.titleEn}
                      </Link>
                      {p.excerptEn && <div className="line-clamp-1 max-w-xl text-xs text-muted-foreground">{p.excerptEn}</div>}
                    </td>
                    <td className="text-xs">{CATEGORY[p.category]}</td>
                    <td className="text-xs whitespace-nowrap text-muted-foreground">{p.publishedAt ? formatDateTime(p.publishedAt, "en") : "—"}</td>
                    <td>
                      <StatusBadge status={scheduled ? "queued" : p.status} label={scheduled ? "scheduled" : undefined} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </DataTable>
        ) : (
          <EmptyState title="No articles found" />
        )}
      </Panel>
    </>
  );
}
