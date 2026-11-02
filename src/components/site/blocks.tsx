import Link from "next/link";
import { ArrowRight, ChevronRight } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Star8 } from "./girih";

/** Eyebrow + display title + lead, used to open every section. */
export function SectionHeading({
  eyebrow,
  title,
  lead,
  align = "left",
  action,
  className,
  tone = "light",
}: {
  eyebrow?: string;
  title: ReactNode;
  lead?: ReactNode;
  align?: "left" | "center";
  action?: { label: string; href: string };
  className?: string;
  tone?: "light" | "dark";
}) {
  return (
    <div className={cn("flex flex-col gap-6 md:flex-row md:items-end md:justify-between", align === "center" && "items-center text-center md:flex-col md:items-center", className)}>
      <div className={cn("max-w-2xl", align === "center" && "mx-auto")}>
        {eyebrow && (
          <p className={cn("eyebrow mb-4 inline-flex items-center gap-2", tone === "dark" ? "text-lime" : "text-ash")}>
            <Star8 className="size-3" />
            {eyebrow}
          </p>
        )}
        <h2 className={cn("font-display text-4xl leading-[1.05] sm:text-5xl", tone === "dark" ? "text-white" : "text-forest")}>{title}</h2>
        {lead && <p className={cn("mt-4 text-lg leading-relaxed", tone === "dark" ? "text-white/70" : "text-stone")}>{lead}</p>}
      </div>
      {action && (
        <Link
          href={action.href}
          className={cn(
            "group inline-flex shrink-0 items-center gap-2 text-sm font-semibold",
            tone === "dark" ? "text-lime" : "text-pine",
          )}
        >
          <span className="link-underline">{action.label}</span>
          <span className={cn("grid size-8 place-items-center rounded-full transition-transform group-hover:translate-x-1", tone === "dark" ? "bg-lime text-forest" : "bg-forest text-white")}>
            <ArrowRight className="size-4" />
          </span>
        </Link>
      )}
    </div>
  );
}

export function DateBadge({ day, month, weekday, className, tone = "light" }: { day: string; month: string; weekday?: string; className?: string; tone?: "light" | "dark" | "lime" }) {
  return (
    <div
      className={cn(
        "grid w-16 shrink-0 place-items-center rounded-2xl py-2 text-center leading-none",
        tone === "dark" && "bg-forest text-white",
        tone === "light" && "bg-cream text-forest ring-1 ring-ink/10",
        tone === "lime" && "bg-lime text-forest",
        className,
      )}
    >
      {weekday && <span className="text-[11px] font-medium opacity-70">{weekday}</span>}
      <span className="font-display text-3xl tabular">{day}</span>
      <span className="text-xs font-medium">{month}</span>
    </div>
  );
}

const LEVEL_TONE: Record<string, string> = {
  A1: "bg-[#e4f1cc] text-[#2d5016]",
  A2: "bg-[#d6ebc0] text-[#2d5016]",
  B1: "bg-[#c9dcc3] text-[#173a2a]",
  B2: "bg-[#a9c9a4] text-[#10241c]",
  C1: "bg-[#477748] text-white",
  C2: "bg-[#1f5f39] text-white",
};

export function LevelBadge({ code, level, className, size = "md" }: { code: string; level: string; className?: string; size?: "sm" | "md" | "lg" }) {
  return (
    <span
      className={cn(
        "inline-grid shrink-0 place-items-center rounded-xl font-mono font-semibold tabular",
        LEVEL_TONE[level] ?? "bg-mint text-forest",
        size === "sm" && "h-7 min-w-9 px-1.5 text-xs",
        size === "md" && "h-10 min-w-12 px-2 text-sm",
        size === "lg" && "h-16 min-w-16 px-3 text-xl",
        className,
      )}
    >
      {code}
    </span>
  );
}

/** Seat availability bar with an honest label. */
export function SeatsMeter({ left, capacity, label, className }: { left: number; capacity: number; label: string; className?: string }) {
  const taken = Math.min(100, Math.round(((capacity - left) / Math.max(1, capacity)) * 100));
  const low = left <= Math.max(3, Math.round(capacity * 0.15));
  return (
    <div className={cn("grid gap-1.5", className)}>
      <div className="flex items-center justify-between text-xs">
        <span className={cn("font-semibold", low ? "text-warning" : "text-pine")}>{label}</span>
        <span className="text-stone tabular">
          {capacity - left}/{capacity}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-ink/10" role="presentation">
        <div className={cn("h-full rounded-full transition-[width] duration-700", low ? "bg-[#d98a1f]" : "bg-ash")} style={{ width: `${taken}%` }} />
      </div>
    </div>
  );
}

export function Breadcrumbs({ items, tone = "light" }: { items: { label: string; href?: string }[]; tone?: "light" | "dark" }) {
  return (
    <nav aria-label="Breadcrumb">
      <ol className={cn("flex flex-wrap items-center gap-1.5 text-xs font-medium", tone === "dark" ? "text-white/60" : "text-stone")}>
        {items.map((item, i) => (
          <li key={i} className="flex items-center gap-1.5">
            {i > 0 && <ChevronRight className="size-3 opacity-60" />}
            {item.href ? (
              <Link href={item.href} className={cn("hover:underline", tone === "dark" ? "hover:text-white" : "hover:text-forest")}>
                {item.label}
              </Link>
            ) : (
              <span aria-current="page" className={tone === "dark" ? "text-white" : "text-forest"}>
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function Pill({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn("inline-flex items-center gap-1.5 rounded-full bg-mist px-3 py-1 text-xs font-semibold text-pine", className)}>{children}</span>;
}
