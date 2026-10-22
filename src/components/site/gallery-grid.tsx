"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, m } from "motion/react";
import { ChevronLeft, ChevronRight, Expand, X } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export type GalleryPhoto = { id: string; src: string; width: number; height: number; alt: string; caption: string; category: string };

/** Masonry gallery with category filters and an accessible, keyboard-friendly lightbox. */
export function GalleryGrid({ photos, categories, labels }: { photos: GalleryPhoto[]; categories: { value: string; label: string }[]; labels: { all: string; close: string; prev: string; next: string; open: string } }) {
  const [filter, setFilter] = useState("all");
  const [index, setIndex] = useState<number | null>(null);
  const visible = useMemo(() => (filter === "all" ? photos : photos.filter((p) => p.category === filter)), [filter, photos]);
  const current = index !== null ? visible[index] : null;

  const step = useCallback((dir: number) => setIndex((i) => (i === null ? i : (i + dir + visible.length) % visible.length)), [visible.length]);

  useEffect(() => {
    if (index === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") step(1);
      if (e.key === "ArrowLeft") step(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, step]);

  return (
    <div className="grid gap-8">
      <div role="group" aria-label="Filter" className="-mx-4 flex gap-2 overflow-x-auto px-4 no-scrollbar sm:mx-0 sm:flex-wrap sm:px-0">
        {[{ value: "all", label: labels.all }, ...categories].map((c) => {
          const count = c.value === "all" ? photos.length : photos.filter((p) => p.category === c.value).length;
          return (
            <button
              key={c.value}
              type="button"
              aria-pressed={filter === c.value}
              onClick={() => setFilter(c.value)}
              className={cn("h-10 shrink-0 rounded-full px-4 text-sm font-semibold transition-all", filter === c.value ? "bg-forest text-white" : "bg-cream text-forest ring-1 ring-ink/10 hover:ring-ash")}
            >
              {c.label} <span className="ml-1 text-xs opacity-60">{count}</span>
            </button>
          );
        })}
      </div>

      <m.ul layout className="columns-1 gap-4 sm:columns-2 lg:columns-3 [&>li]:mb-4">
        <AnimatePresence initial={false}>
          {visible.map((p, i) => (
            <m.li key={p.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="break-inside-avoid">
              <button
                type="button"
                onClick={() => setIndex(i)}
                className="group relative block w-full overflow-hidden rounded-3xl bg-mint text-left"
                aria-label={`${labels.open}: ${p.caption || p.alt}`}
              >
                <Image src={p.src} alt={p.alt} width={p.width} height={p.height} sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" className="h-auto w-full transition-transform duration-700 group-hover:scale-[1.04]" />
                <span className="absolute inset-0 flex items-end bg-gradient-to-t from-forest/80 via-transparent to-transparent p-4 opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-visible:opacity-100">
                  <span className="flex w-full items-end justify-between gap-3 text-sm font-medium text-white">
                    {p.caption}
                    <Expand className="size-4 shrink-0" />
                  </span>
                </span>
              </button>
            </m.li>
          ))}
        </AnimatePresence>
      </m.ul>

      <Dialog open={current !== null} onOpenChange={(o) => !o && setIndex(null)}>
        <DialogContent showCloseButton={false} className="max-h-[94dvh] w-[min(96vw,1200px)] max-w-none overflow-hidden border-0 bg-forest p-0 text-white sm:max-w-none">
          {current && (
            <>
              <DialogTitle className="sr-only">{current.caption || current.alt}</DialogTitle>
              <div className="relative flex max-h-[80dvh] items-center justify-center bg-black/40">
                <Image src={current.src} alt={current.alt} width={current.width} height={current.height} sizes="96vw" className="max-h-[80dvh] w-auto object-contain" priority />
                <button type="button" onClick={() => step(-1)} aria-label={labels.prev} className="absolute top-1/2 left-3 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-black/40 backdrop-blur hover:bg-black/60">
                  <ChevronLeft className="size-5" />
                </button>
                <button type="button" onClick={() => step(1)} aria-label={labels.next} className="absolute top-1/2 right-3 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-black/40 backdrop-blur hover:bg-black/60">
                  <ChevronRight className="size-5" />
                </button>
                <button type="button" onClick={() => setIndex(null)} aria-label={labels.close} className="absolute top-3 right-3 grid size-10 place-items-center rounded-full bg-black/40 backdrop-blur hover:bg-black/60">
                  <X className="size-5" />
                </button>
              </div>
              <div className="flex items-center justify-between gap-4 px-5 py-4 text-sm">
                <p>{current.caption || current.alt}</p>
                <span className="shrink-0 font-mono text-xs text-white/60">
                  {(index ?? 0) + 1} / {visible.length}
                </span>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
