"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, CalendarCheck, ExternalLink, FileText, Info, Mail, X } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { SocialIcon } from "@/components/site/social-icons";
import { cn } from "@/lib/utils";

/**
 * Showcase build only: explains on arrival that this is an independent, unofficial
 * modernisation of schimmel.com.pk, previews the website and the staff admin, lists the stack
 * and how to reach the developer. Opens once per visit; the corner button reopens it.
 */

const SEEN_KEY = "ash-showcase-seen";
const PHONE = "923281842351";
const EMAIL = "raitaskeen.dev@gmail.com";
const MESSAGE =
  "Hi Taskeen, I just saw your Annemarie-Schimmel-Haus showcase and I'm interested in working with you on a website/project. Could we talk?";
const WHATSAPP = `https://wa.me/${PHONE}?text=${encodeURIComponent(MESSAGE)}`;
const MAILTO = `mailto:${EMAIL}?subject=${encodeURIComponent("Project enquiry from the ASH showcase")}&body=${encodeURIComponent(`${MESSAGE}\n\nName:\nCompany:\nWhat I need:\n`)}`;

const SHOTS = [
  { src: "/showcase/site-home.webp", title: "Homepage", group: "Website" },
  { src: "/showcase/site-courses.webp", title: "Course catalogue with live seats", group: "Website" },
  { src: "/showcase/site-enroll.webp", title: "Five-step online application", group: "Website" },
  { src: "/showcase/site-event.webp", title: "Event page with registration", group: "Website" },
  { src: "/showcase/admin-dashboard.webp", title: "Admin dashboard", group: "Admin" },
  { src: "/showcase/admin-applications.webp", title: "Applications inbox", group: "Admin" },
  { src: "/showcase/admin-application.webp", title: "Application detail and workflow", group: "Admin" },
  { src: "/showcase/admin-events.webp", title: "Events and check-in", group: "Admin" },
] as const;

const STACK = [
  "Next.js 16 (App Router, Server Actions)",
  "React 19",
  "TypeScript",
  "Tailwind CSS 4",
  "shadcn/ui + Radix",
  "PostgreSQL 17",
  "Drizzle ORM",
  "Zod + React Hook Form",
  "Bun",
  "Vitest",
  "Gmail API",
  "WhatsApp Cloud API",
  "Cloudflare Workers",
  "GitHub Actions CI",
];

const ADMIN_POINTS = [
  "Every application (course, event, placement test, message) lands in one inbox with a reference number.",
  "Staff request payment, confirm seats, manage waitlists and publish placement results in a few clicks.",
  "Applicants get each step by branded email and WhatsApp, and can track status or report a payment themselves.",
  "Seats, waitlists, reminders and unpaid-seat release run automatically on a schedule.",
  "Roles and permissions, two-factor sign-in, an audit log of every change and encrypted documents.",
];

const LINKS: { label: string; href: string; icon?: "linkedin-in" | "x-twitter" }[] = [
  { label: "LinkedIn", href: "https://www.linkedin.com/in/raitaskeen", icon: "linkedin-in" },
  { label: "X", href: "https://x.com/raitaskeen786", icon: "x-twitter" },
  { label: "Hugging Face", href: "https://huggingface.co/raitaskeen" },
  { label: "HackerRank", href: "https://www.hackerrank.com/profile/raitaskeen" },
  { label: "Bluesky", href: "https://bsky.app/profile/raitaskeen" },
  { label: "Reddit", href: "https://www.reddit.com/user/taskeenhaider/" },
];

/** GitHub mark (Simple Icons, CC0). */
function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={cn("size-4 fill-current", className)}>
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    </svg>
  );
}

export function ShowcaseIntro() {
  const [open, setOpen] = useState(false);
  const [zoom, setZoom] = useState<number | null>(null);

  useEffect(() => {
    let seen = false;
    try {
      seen = sessionStorage.getItem(SEEN_KEY) === "1";
    } catch {
      /* storage blocked: show it anyway */
    }
    if (seen) return;
    const t = setTimeout(() => setOpen(true), 400);
    return () => clearTimeout(t);
  }, []);

  const close = (next: boolean) => {
    setOpen(next);
    if (!next) {
      setZoom(null);
      try {
        sessionStorage.setItem(SEEN_KEY, "1");
      } catch {
        /* ignore */
      }
    }
  };

  const shot = zoom === null ? null : SHOTS[zoom];

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-4 left-4 z-40 inline-flex items-center gap-2 rounded-full bg-forest px-4 py-2.5 text-sm font-semibold text-white shadow-[0_14px_40px_-12px_rgb(16_36_28/0.7)] ring-1 ring-white/10 transition-colors hover:bg-pine"
      >
        <Info className="size-4 text-lime" /> About this showcase
      </button>

      <Dialog open={open} onOpenChange={close}>
        <DialogContent showCloseButton={false} className="max-h-[92dvh] w-[min(100vw-1.5rem,64rem)] max-w-none gap-0 overflow-y-auto rounded-2xl border-0 bg-paper p-0 sm:max-w-none">
          {/* Header */}
          <div className="relative bg-forest px-6 pt-6 pb-7 text-white sm:px-10 sm:pt-8">
            <button
              type="button"
              onClick={() => close(false)}
              aria-label="Close"
              className="absolute top-4 right-4 grid size-9 place-items-center rounded-full bg-white/10 text-white/80 hover:bg-white/20 hover:text-white"
            >
              <X className="size-4" />
            </button>
            <span className="inline-flex items-center gap-2 rounded-full bg-lime px-3 py-1 text-xs font-bold tracking-wide text-forest uppercase">
              Showcase · Not the official website
            </span>
            <DialogTitle className="mt-4 max-w-3xl font-display text-3xl leading-tight font-normal sm:text-4xl">
              A modernised Annemarie-Schimmel-Haus website, with a full staff admin
            </DialogTitle>
            <DialogDescription className="mt-3 max-w-3xl text-base leading-relaxed text-white/75">
              This is an independent showcase of how <strong className="text-white">schimmel.com.pk</strong> could look and work today. It is not
              affiliated with or operated by Annemarie-Schimmel-Haus. The content uses the public course catalogue and sample data; forms here are demos and
              nothing you enter is stored or sent.
            </DialogDescription>
          </div>

          <div className="grid gap-10 px-6 py-8 sm:px-10">
            {/* Previews */}
            <section aria-labelledby="sc-previews">
              <h3 id="sc-previews" className="font-display text-2xl text-forest">
                Website and admin, as built
              </h3>
              <p className="mt-1 text-sm text-stone">Click a preview to enlarge it.</p>
              <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
                {SHOTS.map((s, i) => (
                  <button
                    key={s.src}
                    type="button"
                    onClick={() => setZoom(i)}
                    className="group overflow-hidden rounded-xl bg-cream text-left ring-1 ring-ink/10 transition-all hover:-translate-y-0.5 hover:ring-ash/60 hover:shadow-[0_18px_40px_-24px_rgb(16_36_28/0.6)]"
                  >
                    <span className="relative block aspect-[16/10] overflow-hidden bg-mint">
                      <Image src={s.src} alt={`${s.group}: ${s.title}`} fill sizes="(min-width: 768px) 240px, 45vw" className="object-cover object-top transition-transform duration-500 group-hover:scale-[1.03]" />
                    </span>
                    <span className="block px-3 py-2">
                      <span className="block text-[11px] font-semibold tracking-wide text-ash uppercase">{s.group}</span>
                      <span className="block text-sm leading-snug font-medium text-forest">{s.title}</span>
                    </span>
                  </button>
                ))}
              </div>
            </section>

            <div className="grid gap-10 lg:grid-cols-2">
              {/* Admin */}
              <section aria-labelledby="sc-admin">
                <h3 id="sc-admin" className="font-display text-2xl text-forest">
                  The admin portal, and how it works
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-stone">
                  Staff sign in to a separate, private admin (not part of this public showcase) that runs the whole application workflow:
                </p>
                <ul className="mt-3 grid gap-2 text-sm leading-relaxed text-ink">
                  {ADMIN_POINTS.map((p) => (
                    <li key={p} className="flex gap-2.5">
                      <span className="mt-2 size-1.5 shrink-0 rounded-full bg-ash" aria-hidden />
                      {p}
                    </li>
                  ))}
                </ul>
              </section>

              {/* Stack */}
              <section aria-labelledby="sc-stack">
                <h3 id="sc-stack" className="font-display text-2xl text-forest">
                  Stack and tools
                </h3>
                <ul className="mt-3 flex flex-wrap gap-2">
                  {STACK.map((s) => (
                    <li key={s} className="rounded-full bg-cream px-3 py-1.5 text-xs font-semibold text-forest ring-1 ring-ink/10">
                      {s}
                    </li>
                  ))}
                </ul>
                <p className="mt-4 text-sm leading-relaxed text-stone">
                  Bilingual (English/German), installable as an app, accessible, tested for security and load. This showcase runs entirely on
                  Cloudflare&apos;s global network.
                </p>
              </section>
            </div>

            {/* Contact */}
            <section aria-labelledby="sc-contact" className="rounded-2xl bg-cream p-6 ring-1 ring-ink/10 sm:p-8">
              <p className="text-xs font-semibold tracking-wide text-ash uppercase">Built by</p>
              <h3 id="sc-contact" className="mt-1 font-display text-2xl text-forest">
                Taskeen Haider, Software Engineer
              </h3>
              <p className="mt-1 text-sm text-stone">Full-stack, backend and AI automation · Lahore, Pakistan · Available for selected work</p>
              <div className="mt-5 flex flex-wrap gap-3">
                <a
                  href={WHATSAPP}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-11 items-center gap-2 rounded-full bg-[#1f7a43] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#186236]"
                >
                  <SocialIcon network="whatsapp" className="size-4" /> WhatsApp me
                </a>
                <a href={MAILTO} className="inline-flex h-11 items-center gap-2 rounded-full bg-forest px-5 text-sm font-semibold text-white transition-colors hover:bg-pine">
                  <Mail className="size-4" /> {EMAIL}
                </a>
                <a
                  href="https://cal.com/raitaskeen"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-11 items-center gap-2 rounded-full px-5 text-sm font-semibold text-forest ring-1 ring-ink/15 transition-colors hover:bg-paper"
                >
                  <CalendarCheck className="size-4" /> Book a call
                </a>
              </div>
              <ul className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm">
                <li>
                  <a href="https://raitaskeen.me" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 font-semibold text-forest hover:underline">
                    raitaskeen.me <ExternalLink className="size-3.5" />
                  </a>
                </li>
                <li>
                  <a href="https://github.com/raitaskeen" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-forest hover:underline">
                    <GitHubIcon /> GitHub
                  </a>
                </li>
                {LINKS.map((l) => (
                  <li key={l.href}>
                    <a href={l.href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-forest hover:underline">
                      {l.icon ? <SocialIcon network={l.icon} /> : <ExternalLink className="size-3.5 text-ash" />} {l.label}
                    </a>
                  </li>
                ))}
                <li>
                  <a href="https://raitaskeen.me/assets/Taskeen_Haider_Resume.pdf" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-forest hover:underline">
                    <FileText className="size-3.5 text-ash" /> Résumé
                  </a>
                </li>
              </ul>
            </section>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-stone">Content about Annemarie-Schimmel-Haus belongs to its respective owners. Shown for demonstration only.</p>
              <button
                type="button"
                onClick={() => close(false)}
                className="inline-flex h-11 items-center gap-2 rounded-full bg-lime px-6 text-sm font-semibold text-forest transition-colors hover:bg-lime/85"
              >
                Explore the showcase <ArrowRight className="size-4" />
              </button>
            </div>
          </div>

          {/* Enlarged preview */}
          {shot && zoom !== null && (
            <div className="fixed inset-0 z-[60] flex flex-col bg-forest/95 p-3 sm:p-6" role="dialog" aria-label={shot.title}>
              <div className="flex items-center justify-between gap-3 pb-3 text-white">
                <p className="text-sm">
                  <span className="text-lime">{shot.group}</span> · {shot.title}
                </p>
                <div className="flex gap-2">
                  <button type="button" aria-label="Previous" onClick={() => setZoom((zoom + SHOTS.length - 1) % SHOTS.length)} className="grid size-9 place-items-center rounded-full bg-white/10 hover:bg-white/20">
                    <ArrowLeft className="size-4" />
                  </button>
                  <button type="button" aria-label="Next" onClick={() => setZoom((zoom + 1) % SHOTS.length)} className="grid size-9 place-items-center rounded-full bg-white/10 hover:bg-white/20">
                    <ArrowRight className="size-4" />
                  </button>
                  <button type="button" aria-label="Close preview" onClick={() => setZoom(null)} className="grid size-9 place-items-center rounded-full bg-white/10 hover:bg-white/20">
                    <X className="size-4" />
                  </button>
                </div>
              </div>
              <div className="relative min-h-0 flex-1 overflow-auto rounded-xl bg-white">
                {/* eslint-disable-next-line @next/next/no-img-element -- full-resolution screenshot, scrollable */}
                <img src={shot.src} alt={`${shot.group}: ${shot.title}`} className="block w-full" />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
