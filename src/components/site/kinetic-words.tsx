"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, m, useReducedMotion } from "motion/react";

/** Rotates through words with a soft vertical slide. Screen readers get the full list once. */
export function KineticWords({ lead, words, className }: { lead: string; words: string[]; className?: string }) {
  const [index, setIndex] = useState(0);
  const reduce = useReducedMotion();

  useEffect(() => {
    if (reduce || words.length < 2) return;
    const id = window.setInterval(() => setIndex((i) => (i + 1) % words.length), 2600);
    return () => window.clearInterval(id);
  }, [reduce, words.length]);

  return (
    <p className={className}>
      <span className="sr-only">
        {lead} {words.join(", ")}
      </span>
      <span aria-hidden className="inline-flex items-baseline gap-2">
        <span>{lead}</span>
        <span className="relative inline-grid overflow-hidden align-bottom">
          {/* longest word reserves the width so the line never jumps */}
          <span className="invisible col-start-1 row-start-1 font-semibold">{words.reduce((a, b) => (b.length > a.length ? b : a), "")}</span>
          <AnimatePresence mode="popLayout" initial={false}>
            <m.span
              key={words[index]}
              className="col-start-1 row-start-1 font-semibold whitespace-nowrap text-pine"
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: "0%", opacity: 1 }}
              exit={{ y: "-100%", opacity: 0 }}
              transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            >
              {words[index]}
            </m.span>
          </AnimatePresence>
        </span>
      </span>
    </p>
  );
}
