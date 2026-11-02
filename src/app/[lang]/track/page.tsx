import type { Metadata } from "next";
import { lang } from "next/root-params";
import { Suspense } from "react";
import { CalendarDays, ClipboardCheck, GraduationCap, ShieldCheck } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { TrackForm } from "@/components/forms/track-form";
import { Breadcrumbs } from "@/components/site/blocks";
import { Girih, Star8 } from "@/components/site/girih";
import { formsCopy } from "@/content/forms";
import { trackCopy } from "@/content/track";
import { commonDictionary } from "@/i18n/common";
import { hasLocale, href, type Locale } from "@/i18n/config";

async function locale(): Promise<Locale> {
  const v = await lang();
  return hasLocale(v) ? v : "en";
}

export async function generateMetadata(): Promise<Metadata> {
  const l = await locale();
  return { title: trackCopy(l).metaTitle, description: trackCopy(l).lead, alternates: { canonical: `/${l}/track` } };
}

export default async function TrackPage() {
  const l = await locale();
  const t = trackCopy(l);
  const d = commonDictionary(l);
  const kinds = [
    { icon: GraduationCap, label: t.kinds.enrollment, code: "ASH-E" },
    { icon: CalendarDays, label: t.kinds.event, code: "ASH-V" },
    { icon: ClipboardCheck, label: t.kinds.placement, code: "ASH-P" },
  ];

  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden bg-forest" aria-hidden>
        <Girih className="text-white/[0.045]" size={70} />
      </div>
      <div className="container-site relative grid gap-10 pt-10 pb-24 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
        <div className="text-white lg:pt-6">
          <Breadcrumbs tone="dark" items={[{ label: d.nav.home, href: href(l) }, { label: t.metaTitle }]} />
          <p className="eyebrow mt-8 inline-flex items-center gap-2 text-lime">
            <Star8 className="size-3" />
            {t.eyebrow}
          </p>
          <h1 className="mt-4 font-display text-5xl leading-[1.02] sm:text-6xl">{t.title}</h1>
          <p className="mt-5 max-w-md text-lg text-white/70">{t.lead}</p>
          <ul className="mt-8 grid max-w-md gap-2">
            {kinds.map((k) => (
              <li key={k.code} className="flex items-center gap-3 rounded-2xl bg-white/[0.06] p-3 ring-1 ring-white/10">
                <span className="grid size-10 place-items-center rounded-xl bg-lime text-forest">
                  <k.icon className="size-5" />
                </span>
                <span className="text-sm font-medium">{k.label}</span>
                <span className="ml-auto font-mono text-xs text-lime">{k.code}-…</span>
              </li>
            ))}
          </ul>
          <p className="mt-6 flex items-center gap-2 text-xs text-white/60">
            <ShieldCheck className="size-4 text-lime" /> {t.privacy}
          </p>
        </div>

        <div className="grid gap-8">
          <div className="rounded-[2rem] bg-paper p-6 shadow-[0_40px_80px_-50px_rgb(16_36_28/0.7)] ring-1 ring-ink/10 sm:p-10">
            <Suspense fallback={<div className="h-[420px] animate-pulse rounded-2xl bg-ink/5" />}>
              <TrackForm locale={l} t={t} form={d.form} forms={formsCopy(l)} links={{ courses: href(l, "/courses") }} />
            </Suspense>
          </div>
          <div className="rounded-[2rem] bg-cream p-6 ring-1 ring-ink/10 sm:p-8">
            <h2 className="font-display text-2xl text-forest">{t.helpTitle}</h2>
            <Accordion type="single" collapsible className="mt-4">
              {t.help.map((h) => (
                <AccordionItem key={h.q} value={h.q} className="border-ink/10">
                  <AccordionTrigger className="text-left text-base font-semibold text-forest hover:no-underline">{h.q}</AccordionTrigger>
                  <AccordionContent className="text-stone">{h.a}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      </div>
    </section>
  );
}
