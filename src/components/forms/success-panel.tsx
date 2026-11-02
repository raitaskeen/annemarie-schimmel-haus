"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { m } from "motion/react";
import { ArrowRight, Check, Copy, FileSearch, Mail, MessageCircle } from "lucide-react";
import { rememberApplication } from "@/lib/client/device-memory";
import { cn } from "@/lib/utils";
import { bringIntoView } from "./form-kit";

/**
 * Confirmation shown after a successful submission: the application number
 * front and centre (copyable), what happens next, and the tracker link.
 */
export function SuccessPanel({
  title,
  lead,
  reference,
  referenceLabel,
  steps,
  trackHref,
  trackLabel,
  copyLabels,
  notice,
  tone = "success",
  secondary,
}: {
  title: string;
  lead: string;
  reference: string;
  referenceLabel: string;
  steps: { title: string; text: string }[];
  trackHref: string;
  trackLabel: string;
  copyLabels: { copy: string; copied: string };
  notice?: { email: string; whatsapp?: string | null };
  tone?: "success" | "waitlist";
  secondary?: { label: string; href: string };
}) {
  const [copied, setCopied] = useState(false);
  // Keep the number on this device so the tracker can list it later.
  useEffect(() => {
    rememberApplication(reference);
  }, [reference]);
  // Bring the confirmation into view wherever the form sat on the page, and move focus to it.
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = panel.current;
    if (!el) return;
    bringIntoView(el, "start");
    el.focus({ preventScroll: true });
  }, []);

  return (
    <m.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      ref={panel}
      tabIndex={-1}
      className="relative scroll-mt-28 overflow-hidden rounded-[2rem] bg-cream p-6 ring-1 ring-ink/10 outline-none sm:p-10"
      role="status"
      aria-live="polite"
    >
      <div className="relative">
        <m.span
          initial={{ scale: 0.4, rotate: -20 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 16, delay: 0.15 }}
          className={cn("grid size-16 place-items-center rounded-full text-white shadow-lg", tone === "success" ? "bg-ash" : "bg-[#b7791f]")}
        >
          <Check className="size-8" strokeWidth={3} />
        </m.span>
        <h2 className="mt-6 font-display text-4xl text-forest sm:text-5xl">{title}</h2>
        <p className="mt-3 max-w-2xl text-lg text-stone">{lead}</p>

        <div className="mt-8 flex flex-col gap-4 rounded-3xl bg-forest p-6 text-white sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="eyebrow text-lime">{referenceLabel}</p>
            <p className="mt-2 font-mono text-3xl font-bold tracking-[0.12em] sm:text-4xl">{reference}</p>
          </div>
          <button
            type="button"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(reference);
                setCopied(true);
                setTimeout(() => setCopied(false), 2200);
              } catch {
                /* clipboard unavailable */
              }
            }}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-white/10 px-5 text-sm font-semibold ring-1 ring-white/20 transition-colors hover:bg-lime hover:text-forest"
          >
            {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
            {copied ? copyLabels.copied : copyLabels.copy}
          </button>
        </div>

        {notice && (
          <p className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-stone">
            <span className="inline-flex items-center gap-1.5">
              <Mail className="size-4 text-ash" /> {notice.email}
            </span>
            {notice.whatsapp && (
              <span className="inline-flex items-center gap-1.5">
                <MessageCircle className="size-4 text-ash" /> {notice.whatsapp}
              </span>
            )}
          </p>
        )}

        <ol className="mt-8 grid gap-4 sm:grid-cols-3">
          {steps.map((s, i) => (
            <li key={s.title} className="rounded-2xl bg-white/70 p-5 ring-1 ring-ink/5">
              <span className="font-mono text-xs font-semibold text-ash">0{i + 1}</span>
              <p className="mt-2 font-semibold text-forest">{s.title}</p>
              <p className="mt-1 text-sm leading-relaxed text-stone">{s.text}</p>
            </li>
          ))}
        </ol>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link href={trackHref} className="group inline-flex h-12 items-center gap-2 rounded-full bg-forest px-6 font-semibold text-white hover:bg-pine">
            <FileSearch className="size-4" />
            {trackLabel}
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
          {secondary && (
            <Link href={secondary.href} className="inline-flex h-12 items-center rounded-full px-6 font-semibold text-forest ring-1 ring-ink/15 hover:bg-white">
              {secondary.label}
            </Link>
          )}
        </div>
      </div>
    </m.div>
  );
}
