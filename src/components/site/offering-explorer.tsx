"use client";

import { useMemo, useState, type ReactNode } from "react";
import { AnimatePresence, m } from "motion/react";
import { cn } from "@/lib/utils";

/**
 * Client-side filter chips over server-rendered cards. Cards arrive as
 * pre-rendered nodes keyed by their filter values, so no data fetching or
 * re-rendering of card markup happens in the browser.
 */
export function OfferingExplorer({
  items,
  filters,
  allLabel,
  emptyLabel,
  className,
}: {
  items: { key: string; tags: string[]; node: ReactNode }[];
  filters: { value: string; label: string }[];
  allLabel: string;
  emptyLabel: string;
  className?: string;
}) {
  const [active, setActive] = useState<string>("all");
  const visible = useMemo(() => (active === "all" ? items : items.filter((i) => i.tags.includes(active))), [active, items]);

  return (
    <div className={cn("grid gap-8", className)}>
      <div role="group" aria-label="Filter" className="-mx-4 flex gap-2 overflow-x-auto px-4 no-scrollbar sm:mx-0 sm:flex-wrap sm:px-0">
        {[{ value: "all", label: allLabel }, ...filters].map((f) => (
          <button
            key={f.value}
            type="button"
            aria-pressed={active === f.value}
            onClick={() => setActive(f.value)}
            className={cn(
              "h-10 shrink-0 rounded-full px-4 text-sm font-semibold transition-colors",
              active === f.value ? "bg-forest text-white shadow-[0_8px_20px_-12px_rgb(16_36_28/0.9)]" : "bg-cream text-forest ring-1 ring-ink/10 hover:ring-ash",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>
      <m.ul layout className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <AnimatePresence mode="popLayout" initial={false}>
          {visible.map((i) => (
            <m.li
              key={i.key}
              layout
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{ duration: 0.3 }}
            >
              {i.node}
            </m.li>
          ))}
        </AnimatePresence>
      </m.ul>
      {!visible.length && <p className="rounded-3xl bg-cream p-10 text-center text-stone ring-1 ring-ink/10">{emptyLabel}</p>}
    </div>
  );
}
