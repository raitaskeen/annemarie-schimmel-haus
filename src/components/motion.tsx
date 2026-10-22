"use client";

import { Children, cloneElement, isValidElement, useEffect, useRef, type CSSProperties, type HTMLAttributes, type ReactElement, type ReactNode } from "react";
import { domAnimation, LazyMotion, MotionConfig } from "motion/react";
import { cn } from "@/lib/utils";

/**
 * Motion foundations.
 *
 * - MotionProvider: LazyMotion keeps Framer Motion's runtime small (~15 kB) for
 *   the interactive pieces (menus, filters, wizards, kinetic type).
 * - Reveal / Stagger: scroll-in animations implemented as progressive
 *   enhancement. Content is fully visible in the server HTML (search engines,
 *   no-JS, slow devices); only elements still below the fold are hidden after
 *   hydration and animated in by an IntersectionObserver. Reduced-motion
 *   preferences are respected.
 */
export function MotionProvider({ children }: { children: ReactNode }) {
  return (
    <LazyMotion features={domAnimation} strict>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </LazyMotion>
  );
}

function useReveal<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (el.getBoundingClientRect().top < window.innerHeight * 0.92) return; // already on screen
    el.dataset.reveal = "hidden";
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        el.dataset.reveal = "shown";
        io.disconnect();
      },
      { rootMargin: "0px 0px -8% 0px" },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      // Never leave content hidden if the component unmounts or re-runs mid-animation.
      if (el.dataset.reveal === "hidden") delete el.dataset.reveal;
    };
  }, []);
  return ref;
}

type DivProps = HTMLAttributes<HTMLDivElement> & { delay?: number };

export function Reveal({ children, delay = 0, className, style, ...props }: DivProps) {
  const ref = useReveal<HTMLDivElement>();
  return (
    <div ref={ref} className={cn("reveal", className)} style={{ ...style, "--reveal-delay": `${delay}s` } as CSSProperties} {...props}>
      {children}
    </div>
  );
}

/** Children appear one after another (each direct child should be a StaggerItem). */
export function Stagger({ children, className, gap = 0.08, ...props }: DivProps & { gap?: number }) {
  const ref = useReveal<HTMLDivElement>();
  let i = 0;
  return (
    <div ref={ref} className={cn("reveal-group", className)} {...props}>
      {Children.map(children, (child) => {
        if (!isValidElement(child)) return child;
        const el = child as ReactElement<{ style?: CSSProperties }>;
        return cloneElement(el, { style: { ...el.props.style, "--reveal-delay": `${(i++ * gap).toFixed(2)}s` } as CSSProperties });
      })}
    </div>
  );
}

export function StaggerItem({ children, className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("reveal-item", className)} {...props}>
      {children}
    </div>
  );
}
