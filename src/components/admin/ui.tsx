import { TableCardLabels } from "./table-cards";
import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronLeft, ChevronRight, Inbox } from "lucide-react";
import { cn } from "@/lib/utils";

export function PageHeader({ title, description, actions, eyebrow }: { title: string; description?: ReactNode; actions?: ReactNode; eyebrow?: string }) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && <p className="eyebrow mb-2 text-primary">{eyebrow}</p>}
        <h1 className="font-display text-3xl tracking-tight sm:text-4xl">{title}</h1>
        {description && <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Panel({ title, description, actions, children, className, padded = true }: { title?: ReactNode; description?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string; padded?: boolean }) {
  return (
    <section className={cn("rounded-2xl border bg-card text-card-foreground shadow-[0_1px_2px_rgb(16_36_28/0.04)]", className)}>
      {(title || actions) && (
        <header className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4">
          <div>
            {title && <h2 className="font-semibold">{title}</h2>}
            {description && <p className="text-xs text-muted-foreground">{description}</p>}
          </div>
          {actions}
        </header>
      )}
      <div className={cn(padded && "p-5")}>{children}</div>
    </section>
  );
}

export function StatCard({ label, value, hint, tone = "default", icon, href }: { label: string; value: ReactNode; hint?: ReactNode; tone?: "default" | "primary" | "warning" | "dark"; icon?: ReactNode; href?: string }) {
  const body = (
    <div
      className={cn(
        "group relative flex h-full flex-col gap-3 overflow-hidden rounded-2xl border p-5 transition-all",
        tone === "default" && "bg-card",
        tone === "primary" && "border-primary/30 bg-primary/[0.06]",
        tone === "warning" && "border-warning/30 bg-warning/[0.07]",
        tone === "dark" && "border-transparent bg-forest text-white",
        href && "hover:-translate-y-0.5 hover:shadow-md",
      )}
    >
      <div className="flex items-center justify-between">
        <span className={cn("text-xs font-medium", tone === "dark" ? "text-white/70" : "text-muted-foreground")}>{label}</span>
        {icon && <span className={cn("grid size-8 place-items-center rounded-lg", tone === "dark" ? "bg-white/10 text-lime" : "bg-muted text-primary")}>{icon}</span>}
      </div>
      <span className="font-display text-3xl tracking-tight tabular">{value}</span>
      {hint && <span className={cn("text-xs", tone === "dark" ? "text-white/60" : "text-muted-foreground")}>{hint}</span>}
    </div>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}

const BADGE: Record<string, string> = {
  submitted: "bg-[#fff4dc] text-[#7a4a00] dark:bg-[#3b2c0c] dark:text-[#f2c870]",
  new: "bg-[#fff4dc] text-[#7a4a00] dark:bg-[#3b2c0c] dark:text-[#f2c870]",
  payment_pending: "bg-[#e6f0fb] text-[#1c4f80] dark:bg-[#132a43] dark:text-[#9cc6f2]",
  in_progress: "bg-[#e6f0fb] text-[#1c4f80] dark:bg-[#132a43] dark:text-[#9cc6f2]",
  pending: "bg-[#e6f0fb] text-[#1c4f80] dark:bg-[#132a43] dark:text-[#9cc6f2]",
  queued: "bg-[#e6f0fb] text-[#1c4f80] dark:bg-[#132a43] dark:text-[#9cc6f2]",
  sending: "bg-[#e6f0fb] text-[#1c4f80] dark:bg-[#132a43] dark:text-[#9cc6f2]",
  confirmed: "bg-[#e3f3e7] text-[#13623a] dark:bg-[#123220] dark:text-[#8fdcaa]",
  registered: "bg-[#e3f3e7] text-[#13623a] dark:bg-[#123220] dark:text-[#8fdcaa]",
  published: "bg-[#e3f3e7] text-[#13623a] dark:bg-[#123220] dark:text-[#8fdcaa]",
  open: "bg-[#e3f3e7] text-[#13623a] dark:bg-[#123220] dark:text-[#8fdcaa]",
  active: "bg-[#e3f3e7] text-[#13623a] dark:bg-[#123220] dark:text-[#8fdcaa]",
  sent: "bg-[#e3f3e7] text-[#13623a] dark:bg-[#123220] dark:text-[#8fdcaa]",
  answered: "bg-[#e3f3e7] text-[#13623a] dark:bg-[#123220] dark:text-[#8fdcaa]",
  attended: "bg-[#dde8d5] text-[#173a2a] dark:bg-[#1e3328] dark:text-[#cfe3c2]",
  completed: "bg-[#dde8d5] text-[#173a2a] dark:bg-[#1e3328] dark:text-[#cfe3c2]",
  waitlisted: "bg-[#f1e8fb] text-[#5b2b86] dark:bg-[#2c1940] dark:text-[#d2b2f2]",
  closed: "bg-muted text-muted-foreground",
  draft: "bg-muted text-muted-foreground",
  skipped: "bg-muted text-muted-foreground",
  invited: "bg-muted text-muted-foreground",
  unsubscribed: "bg-muted text-muted-foreground",
  rejected: "bg-[#fdecea] text-[#8a1c12] dark:bg-[#3d1512] dark:text-[#f5a69c]",
  cancelled: "bg-[#fdecea] text-[#8a1c12] dark:bg-[#3d1512] dark:text-[#f5a69c]",
  failed: "bg-[#fdecea] text-[#8a1c12] dark:bg-[#3d1512] dark:text-[#f5a69c]",
  disabled: "bg-[#fdecea] text-[#8a1c12] dark:bg-[#3d1512] dark:text-[#f5a69c]",
  no_show: "bg-[#fdecea] text-[#8a1c12] dark:bg-[#3d1512] dark:text-[#f5a69c]",
};

export function StatusBadge({ status, label, className }: { status: string; label?: string; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap capitalize", BADGE[status] ?? "bg-muted text-muted-foreground", className)}>
      <span className="size-1.5 rounded-full bg-current opacity-70" />
      {label ?? status.replace(/_/g, " ")}
    </span>
  );
}

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="grid place-items-center gap-3 px-6 py-16 text-center">
      <span className="grid size-12 place-items-center rounded-2xl bg-muted text-muted-foreground">
        <Inbox className="size-6" />
      </span>
      <p className="font-semibold">{title}</p>
      {description && <p className="max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action}
    </div>
  );
}

/** Responsive data table frame: real table from 640px, stacked labelled cards on phones (see TableCardLabels). */
export function DataTable({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("overflow-x-auto", className)}>
      <TableCardLabels />
      <table className="w-full min-w-[720px] text-sm [&_tbody_tr]:border-t [&_tbody_tr:hover]:bg-muted/40 [&_td]:px-4 [&_td]:py-3 [&_th]:px-4 [&_th]:py-3 [&_th]:text-left [&_th]:text-xs [&_th]:font-medium [&_th]:text-muted-foreground">
        {children}
      </table>
    </div>
  );
}

export function Pagination({ page, pageCount, total, buildHref }: { page: number; pageCount: number; total: number; buildHref: (page: number) => string }) {
  if (pageCount <= 1) return <p className="px-5 py-3 text-xs text-muted-foreground">{total} total</p>;
  return (
    <nav aria-label="Pagination" className="flex items-center justify-between gap-3 border-t px-5 py-3 text-xs text-muted-foreground">
      <span>
        Page {page} of {pageCount} · {total} total
      </span>
      <div className="flex gap-1">
        <PageLink href={page > 1 ? buildHref(page - 1) : undefined} label="Previous page">
          <ChevronLeft className="size-4" />
        </PageLink>
        <PageLink href={page < pageCount ? buildHref(page + 1) : undefined} label="Next page">
          <ChevronRight className="size-4" />
        </PageLink>
      </div>
    </nav>
  );
}

function PageLink({ href, label, children }: { href?: string; label: string; children: ReactNode }) {
  return href ? (
    <Link href={href} aria-label={label} className="grid size-8 place-items-center rounded-lg border hover:bg-muted">
      {children}
    </Link>
  ) : (
    <span aria-hidden className="grid size-8 place-items-center rounded-lg border opacity-40">
      {children}
    </span>
  );
}

export function DefinitionList({ items, columns = 2 }: { items: { label: string; value: ReactNode; wide?: boolean }[]; columns?: 1 | 2 | 3 }) {
  return (
    <dl className={cn("grid gap-x-6 gap-y-4", columns === 2 && "sm:grid-cols-2", columns === 3 && "sm:grid-cols-3")}>
      {items.map((i) => (
        <div key={i.label} className={cn("min-w-0", i.wide && "sm:col-span-full")}>
          <dt className="text-xs text-muted-foreground">{i.label}</dt>
          <dd className="mt-0.5 text-sm font-medium break-words">{i.value ?? "—"}</dd>
        </div>
      ))}
    </dl>
  );
}

export function buildQuery(base: string, params: Record<string, string | number | undefined | null>) {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== "" && v !== "all") q.set(k, String(v));
  const s = q.toString();
  return s ? `${base}?${s}` : base;
}
