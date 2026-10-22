"use client";

import Link from "next/link";
import { useId, useRef, useState } from "react";
import { AnimatePresence, m } from "motion/react";
import { ArrowRight, CalendarClock, Check, Clock, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";

export type JourneyLevel = {
  code: string;
  level: string;
  title: string;
  tagline: string;
  summary: string;
  outcomes: string[];
  weeks: string;
  units: string;
  fee: string;
  next: string | null;
  href: string;
};

/** Interactive CEFR path (A1 → C1) built on the WAI-ARIA tabs pattern. */
export function LevelJourney({ levels, labels }: { levels: JourneyLevel[]; labels: { cta: string; weeks: string; units: string; fee: string; next: string } }) {
  const [active, setActive] = useState(0);
  const id = useId();
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const current = levels[active];

  const onKey = (e: React.KeyboardEvent, i: number) => {
    const dir = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!dir && e.key !== "Home" && e.key !== "End") return;
    e.preventDefault();
    const nextIndex = e.key === "Home" ? 0 : e.key === "End" ? levels.length - 1 : (i + dir + levels.length) % levels.length;
    setActive(nextIndex);
    tabs.current[nextIndex]?.focus();
  };

  return (
    <div className="grid gap-8">
      <div role="tablist" aria-label="CEFR levels" className="relative -mx-4 flex snap-x gap-2 overflow-x-auto px-4 pb-2 no-scrollbar sm:mx-0 sm:grid sm:grid-cols-6 sm:gap-0 sm:overflow-visible sm:px-0">
        <div className="absolute top-[34px] right-[8%] left-[8%] hidden h-0.5 bg-ink/10 sm:block" aria-hidden>
          <m.div className="h-full origin-left bg-ash" animate={{ scaleX: active / Math.max(1, levels.length - 1) }} transition={{ type: "spring", stiffness: 120, damping: 20 }} />
        </div>
        {levels.map((l, i) => {
          const selected = i === active;
          return (
            <button
              key={l.code}
              ref={(el) => {
                tabs.current[i] = el;
              }}
              role="tab"
              id={`${id}-tab-${i}`}
              aria-selected={selected}
              aria-controls={`${id}-panel`}
              tabIndex={selected ? 0 : -1}
              onClick={() => setActive(i)}
              onKeyDown={(e) => onKey(e, i)}
              className="group relative flex min-w-24 snap-start flex-col items-center gap-3 rounded-2xl px-2 py-3 text-center sm:min-w-0"
            >
              <span
                className={cn(
                  "relative z-10 grid size-12 place-items-center rounded-full font-mono text-sm font-semibold transition-all duration-300",
                  selected ? "scale-110 bg-forest text-lime shadow-[0_10px_30px_-10px_rgb(16_36_28/0.8)]" : i < active ? "bg-ash text-white" : "bg-cream text-forest ring-1 ring-ink/15 group-hover:ring-ash",
                )}
              >
                {i < active ? <Check className="size-5" /> : l.code}
              </span>
              <span className={cn("text-xs font-semibold transition-colors", selected ? "text-forest" : "text-stone")}>{l.title.split("·")[1]?.trim() ?? l.title}</span>
            </button>
          );
        })}
      </div>

      <div id={`${id}-panel`} role="tabpanel" aria-labelledby={`${id}-tab-${active}`} className="relative overflow-hidden rounded-[2rem] bg-forest text-white">
        <div className="absolute -top-24 -right-16 size-80 rounded-full bg-lime/15 blur-3xl" aria-hidden />
        <AnimatePresence mode="wait" initial={false}>
          <m.div
            key={current.code}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="relative grid gap-8 p-7 sm:p-10 lg:grid-cols-[1.2fr_1fr] lg:gap-14"
          >
            <div>
              <p className="eyebrow text-lime">{current.code} · CEFR</p>
              <h3 className="mt-3 font-display text-3xl leading-tight sm:text-4xl">{current.tagline}</h3>
              <p className="mt-4 max-w-xl leading-relaxed text-white/75">{current.summary}</p>
              <ul className="mt-6 grid gap-2.5">
                {current.outcomes.map((o) => (
                  <li key={o} className="flex gap-3 text-sm text-white/85">
                    <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-lime text-forest">
                      <Check className="size-3" />
                    </span>
                    {o}
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex flex-col justify-between gap-6 rounded-3xl bg-white/[0.06] p-6 ring-1 ring-white/10">
              <dl className="grid grid-cols-2 gap-5">
                <Fact icon={Clock} label={labels.weeks} value={current.weeks} />
                <Fact icon={CalendarClock} label={labels.units} value={current.units} />
                <Fact icon={Wallet} label={labels.fee} value={current.fee} />
                <Fact icon={ArrowRight} label={labels.next} value={current.next ?? "·"} />
              </dl>
              <Link href={current.href} className="group inline-flex h-12 items-center justify-center gap-2 rounded-full bg-lime px-6 font-semibold text-forest transition-colors hover:bg-white">
                {labels.cta}
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          </m.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

function Fact({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div>
      <dt className="flex items-center gap-1.5 text-xs text-white/55">
        <Icon className="size-3.5 text-lime" />
        {label}
      </dt>
      <dd className="mt-1 font-display text-xl text-white">{value}</dd>
    </div>
  );
}
