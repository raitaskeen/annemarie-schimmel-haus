"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { AnimatePresence, m, useMotionValueEvent, useScroll, useSpring } from "motion/react";
import { ArrowRight, CalendarClock, Check, Clock, Mouse, Wallet } from "lucide-react";
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

/** Same query as `.journey-track` in globals.css: room for a sticky stage and motion allowed. */
const SCROLL_QUERY = "(min-width: 1024px) and (min-height: 700px) and (prefers-reduced-motion: no-preference), (min-width: 768px) and (min-height: 960px) and (prefers-reduced-motion: no-preference)";

/**
 * Interactive CEFR path (A1 → C1) built on the WAI-ARIA tabs pattern.
 *
 * On tablets and desktops the section becomes a scroll story: the stage sticks under the
 * header and each stretch of scrolling advances one level, then the page continues. Phones,
 * short windows and reduced-motion visitors get the same tabs without the scroll binding.
 */
export function LevelJourney({
  levels,
  labels,
}: {
  levels: JourneyLevel[];
  labels: { cta: string; weeks: string; units: string; fee: string; next: string; scrollHint: string };
}) {
  // Direction of the last change (1 forward, -1 back) steers the slide of the panel.
  const [{ active, dir }, setNav] = useState({ active: 0, dir: 1 });
  const [scrollMode, setScrollMode] = useState(false);
  const id = useId();
  const track = useRef<HTMLDivElement>(null);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const current = levels[active];

  const { scrollYProgress } = useScroll({ target: track, offset: ["start start", "end end"] });
  // The connecting line follows the scroll continuously; springs smooth out wheel steps.
  const progress = useSpring(scrollYProgress, { stiffness: 140, damping: 26, mass: 0.4 });

  useEffect(() => {
    const mq = window.matchMedia(SCROLL_QUERY);
    const sync = () => setScrollMode(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const select = (i: number) => setNav((prev) => (i === prev.active ? prev : { active: i, dir: i > prev.active ? 1 : -1 }));

  useMotionValueEvent(scrollYProgress, "change", (v) => {
    if (!scrollMode) return;
    select(Math.min(levels.length - 1, Math.max(0, Math.floor(v * levels.length))));
  });

  /** In scroll mode a tab press scrolls to that level's stretch, so scroll and selection never disagree. */
  const goTo = (i: number) => {
    const el = track.current;
    if (!scrollMode || !el) return select(i);
    const travel = el.offsetHeight - window.innerHeight;
    const top = window.scrollY + el.getBoundingClientRect().top + (travel * (i + 0.5)) / levels.length;
    window.scrollTo({ top, behavior: "smooth" });
  };

  const onKey = (e: React.KeyboardEvent, i: number) => {
    const step = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!step && e.key !== "Home" && e.key !== "End") return;
    e.preventDefault();
    const nextIndex = e.key === "Home" ? 0 : e.key === "End" ? levels.length - 1 : (i + step + levels.length) % levels.length;
    goTo(nextIndex);
    tabs.current[nextIndex]?.focus();
  };

  return (
    <div ref={track} className="journey-track relative" style={{ "--steps": levels.length } as React.CSSProperties}>
      <div className="journey-stage py-8">
        <div className="container-site grid gap-8">
          <div
            role="tablist"
            aria-label="CEFR levels"
            className="relative -mx-4 flex snap-x snap-mandatory gap-2 overflow-x-auto scroll-px-4 px-4 pb-2 no-scrollbar sm:mx-0 sm:grid sm:grid-cols-6 sm:gap-0 sm:overflow-visible sm:px-0"
          >
            <div className="absolute top-[34px] right-[8%] left-[8%] hidden h-0.5 overflow-hidden rounded-full bg-ink/10 sm:block" aria-hidden>
              <m.div
                className="h-full origin-left bg-gradient-to-r from-ash to-lime"
                style={scrollMode ? { scaleX: progress } : undefined}
                animate={scrollMode ? undefined : { scaleX: active / Math.max(1, levels.length - 1) }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              />
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
                  onClick={() => goTo(i)}
                  onKeyDown={(e) => onKey(e, i)}
                  className="group relative flex min-w-24 snap-start flex-col items-center gap-3 rounded-2xl px-2 py-3 text-center sm:min-w-0"
                >
                  <span className="relative z-10 grid size-12 place-items-center">
                    {selected && (
                      <m.span
                        className="absolute -inset-1.5 rounded-full ring-2 ring-lime/70"
                        initial={{ opacity: 0, scale: 0.7 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                        aria-hidden
                      />
                    )}
                    <span
                      className={cn(
                        "grid size-12 place-items-center rounded-full font-mono text-sm font-semibold transition-[background-color,color,box-shadow,transform] duration-300",
                        selected
                          ? "scale-105 bg-forest text-lime shadow-[0_10px_30px_-10px_rgb(16_36_28/0.8)]"
                          : i < active
                            ? "bg-ash text-white"
                            : "bg-cream text-forest ring-1 ring-ink/15 group-hover:ring-ash",
                      )}
                    >
                      {i < active ? <Check className="size-5" /> : l.code}
                    </span>
                  </span>
                  <span className={cn("text-xs font-semibold transition-colors", selected ? "text-forest" : "text-stone")}>{l.title.split("·")[1]?.trim() ?? l.title}</span>
                </button>
              );
            })}
          </div>

          <div id={`${id}-panel`} role="tabpanel" aria-labelledby={`${id}-tab-${active}`} className="relative overflow-hidden rounded-[2rem] bg-forest text-white">
            {/* A faint level code watermark that changes with the level */}
            <AnimatePresence initial={false}>
              <m.span
                key={`mark-${current.code}`}
                aria-hidden
                className="pointer-events-none absolute -right-4 -bottom-10 font-display text-[11rem] leading-none text-white/[0.04] select-none sm:text-[15rem]"
                initial={{ opacity: 0, x: 40 * dir }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -40 * dir }}
                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              >
                {current.code}
              </m.span>
            </AnimatePresence>
            <AnimatePresence mode="wait" initial={false} custom={dir}>
              <m.div
                key={current.code}
                custom={dir}
                variants={{
                  enter: (dir: number) => ({ opacity: 0, y: 24 * dir }),
                  center: { opacity: 1, y: 0 },
                  exit: (dir: number) => ({ opacity: 0, y: -16 * dir }),
                }}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                className="relative grid gap-8 p-7 sm:p-10 lg:grid-cols-[1.2fr_1fr] lg:gap-14"
              >
                <div>
                  <p className="eyebrow text-lime">{current.code} · CEFR</p>
                  <h3 className="mt-3 font-display text-3xl leading-tight sm:text-4xl">{current.tagline}</h3>
                  <p className="mt-4 max-w-xl leading-relaxed text-white/75">{current.summary}</p>
                  <ul className="mt-6 grid gap-2.5">
                    {current.outcomes.map((o, i) => (
                      <m.li
                        key={o}
                        className="flex gap-3 text-sm text-white/85"
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.12 + i * 0.06, duration: 0.3 }}
                      >
                        <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-lime text-forest">
                          <Check className="size-3" />
                        </span>
                        {o}
                      </m.li>
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

          {scrollMode && (
            <p className="flex items-center justify-center gap-3 text-sm text-stone" aria-hidden>
              <Mouse className="size-4 text-ash motion-safe:animate-bounce" />
              {labels.scrollHint}
              <span className="font-mono text-xs tabular-nums text-pine">
                {String(active + 1).padStart(2, "0")} / {String(levels.length).padStart(2, "0")}
              </span>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function Fact({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div>
      <dt className="flex items-center gap-1.5 text-xs text-white/55">
        <Icon className="size-3.5 text-lime" />
        <span className="inline-block first-letter:uppercase">{label}</span>
      </dt>
      <dd className="mt-1 font-display text-xl text-white tabular-nums">{value}</dd>
    </div>
  );
}
