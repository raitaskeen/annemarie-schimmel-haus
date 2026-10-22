import Link from "next/link";
import type { Metadata } from "next";
import { GalleryCard, GalleryUpload } from "@/components/admin/content-forms";
import { buildQuery, EmptyState, PageHeader, Panel } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/auth/dal";
import { galleryCategoryOptions } from "@/lib/gallery";
import { cn } from "@/lib/utils";
import { addGalleryItemsAction, deleteGalleryItemAction, saveGalleryItemAction, toggleGalleryItemAction } from "@/server/actions/content";
import { listGalleryAdmin } from "@/server/admin/content";

export const metadata: Metadata = { title: "Gallery" };

export default async function GalleryAdminPage(props: PageProps<"/admin/gallery">) {
  await requireAdmin("content:write");
  const sp = await props.searchParams;
  const get = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined);
  const filters = { category: get("category"), state: get("state") };
  const { rows, totals } = await listGalleryAdmin(filters);
  const all = Object.values(totals).reduce((a, b) => a + b, 0);
  const chip = (active: boolean) => cn("inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs", active ? "border-transparent bg-forest text-white dark:bg-primary dark:text-primary-foreground" : "bg-card hover:bg-muted");

  return (
    <>
      <PageHeader
        eyebrow="Website"
        title="Gallery"
        description="Photos are optimised automatically (WebP, max 2400 px). New uploads stay hidden until you add a description, that keeps the gallery accessible."
        actions={<GalleryUpload add={addGalleryItemsAction} defaultCategory={filters.category ?? "events"} />}
      />
      <div className="mb-4 flex flex-wrap gap-2">
        <Link href={buildQuery("/admin/gallery", { state: filters.state })} className={chip(!filters.category)}>
          All <span className="opacity-70 tabular">{all}</span>
        </Link>
        {galleryCategoryOptions.map((c) => (
          <Link key={c.value} href={buildQuery("/admin/gallery", { ...filters, category: c.value })} className={chip(filters.category === c.value)}>
            {c.label} <span className="opacity-70 tabular">{totals[c.value] ?? 0}</span>
          </Link>
        ))}
        <span className="mx-1 w-px bg-border" aria-hidden />
        {[
          { key: undefined, label: "Any state" },
          { key: "hidden", label: "Hidden" },
          { key: "featured", label: "Featured" },
        ].map((s) => (
          <Link key={s.label} href={buildQuery("/admin/gallery", { ...filters, state: s.key })} className={chip(filters.state === s.key)}>
            {s.label}
          </Link>
        ))}
      </div>
      {rows.length ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
          {rows.map((item) => (
            <GalleryCard
              key={item.id}
              item={item}
              save={saveGalleryItemAction.bind(null, item.id)}
              toggle={toggleGalleryItemAction.bind(null, item.id)}
              remove={deleteGalleryItemAction.bind(null, item.id)}
            />
          ))}
        </div>
      ) : (
        <Panel>
          <EmptyState title="No photos here yet" description="Upload photos with the button above." />
        </Panel>
      )}
    </>
  );
}
