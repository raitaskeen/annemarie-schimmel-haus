import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { lang } from "next/root-params";
import { ArrowRight, BookOpen, CircleCheck, ClipboardCheck, Clock, FileText, Sparkles } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Reveal, Stagger, StaggerItem } from "@/components/motion";
import { LevelBadge, SectionHeading } from "@/components/site/blocks";
import { OfferingCard } from "@/components/site/cards";
import { Girih } from "@/components/site/girih";
import { OfferingExplorer } from "@/components/site/offering-explorer";
import { PageHero } from "@/components/site/page-hero";
import { coursesCopy } from "@/content/courses";
import { commonDictionary } from "@/i18n/common";
import { hasLocale, href, pick, type Locale } from "@/i18n/config";
import { formatDate, formatNumber, formatPKR } from "@/lib/format";
import { getCourses, getUpcomingOfferings } from "@/server/public/queries";

async function locale(): Promise<Locale> {
  const v = await lang();
  return hasLocale(v) ? v : "en";
}

export async function generateMetadata(): Promise<Metadata> {
  const l = await locale();
  const t = coursesCopy(l);
  return { title: t.metaTitle, description: t.metaDescription, alternates: { canonical: `/${l}/courses`, languages: { en: "/en/courses", de: "/de/courses" } } };
}

export default async function CoursesPage() {
  const l = await locale();
  const t = coursesCopy(l);
  const d = commonDictionary(l);
  const [courses, offerings] = await Promise.all([getCourses(), getUpcomingOfferings()]);
  const bookable = offerings.filter((o) => o.state !== "closed");

  return (
    <>
      <PageHero
        breadcrumbs={[{ label: d.nav.home, href: href(l) }, { label: d.nav.courses }]}
        eyebrow={t.eyebrow}
        title={t.title}
        lead={t.lead}
        image={{ src: "/images/gallery/ash-campus-learning-space-03.webp", alt: l === "de" ? "Klassenzimmer Johannes Gutenberg" : "Johannes Gutenberg classroom", width: 1536, height: 967 }}
      >
        <div className="flex flex-wrap gap-3">
          <a href="#batches" className="inline-flex h-12 items-center gap-2 rounded-full bg-forest px-6 font-semibold text-white hover:bg-pine">
            {t.batchesTitle} <ArrowRight className="size-4" />
          </a>
          <Link href={href(l, "/placement-test")} className="inline-flex h-12 items-center gap-2 rounded-full px-6 font-semibold text-forest ring-1 ring-ink/15 hover:bg-cream">
            <ClipboardCheck className="size-4 text-ash" /> {d.nav.placement}
          </Link>
        </div>
      </PageHero>

      {/* Levels */}
      <section className="py-20 lg:py-28">
        <div className="container-site grid gap-12">
          <Reveal>
            <SectionHeading eyebrow={t.levelsEyebrow} title={t.levelsTitle} lead={t.levelsLead} />
          </Reveal>
          <Stagger className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {courses.map((c) => (
              <StaggerItem key={c.id}>
                <Link
                  href={href(l, `/courses/${c.slug}`)}
                  className="group relative flex h-full flex-col overflow-hidden rounded-3xl bg-cream ring-1 ring-ink/10 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_30px_60px_-35px_rgb(16_36_28/0.55)] hover:ring-ash/40"
                >
                  <div className="relative aspect-[16/9] overflow-hidden bg-mint">
                    {c.imagePath && <Image src={c.imagePath} alt="" fill sizes="(min-width: 1024px) 30vw, (min-width: 640px) 50vw, 100vw" className="object-cover transition-transform duration-700 group-hover:scale-105" />}
                    <div className="absolute inset-0 bg-gradient-to-t from-forest/70 via-forest/10 to-transparent" />
                    <LevelBadge code={c.code} level={c.level} size="lg" className="absolute bottom-4 left-4 shadow-lg" />
                    <span className="absolute right-4 bottom-4 rounded-full bg-cream/95 px-3 py-1 text-xs font-semibold text-pine">
                      {c.nextOffering ? `${t.nextStart}: ${formatDate(c.nextOffering.startsOn, l, { month: "short", year: undefined })}` : t.noDates}
                    </span>
                  </div>
                  <div className="flex flex-1 flex-col p-6">
                    <h3 className="font-display text-2xl text-forest">{pick(c, "title", l)}</h3>
                    <p className="mt-1 text-sm font-medium text-ash">{pick(c, "tagline", l)}</p>
                    <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-stone">{pick(c, "summary", l)}</p>
                    <dl className="mt-5 grid grid-cols-3 gap-3 border-t border-dashed border-ink/15 pt-4 text-center">
                      <div>
                        <dt className="text-[11px] text-stone">{d.common.duration}</dt>
                        <dd className="font-semibold text-forest">
                          {c.weeks} {d.common.weeks}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-[11px] text-stone">{d.common.units}</dt>
                        <dd className="font-semibold text-forest">{c.units}</dd>
                      </div>
                      <div>
                        <dt className="text-[11px] text-stone">{d.common.fee}</dt>
                        <dd className="font-semibold text-forest">{formatPKR(c.feePkr, l)}</dd>
                      </div>
                    </dl>
                    <p className="mt-4 flex items-start gap-2 text-xs text-stone">
                      {c.requiresPlacement ? <ClipboardCheck className="size-4 shrink-0 text-ash" /> : <Sparkles className="size-4 shrink-0 text-ash" />}
                      {c.requiresPlacement ? t.requiresPlacement : t.beginnersWelcome}
                    </p>
                    <span className="mt-auto inline-flex items-center gap-1.5 pt-5 text-sm font-semibold text-pine">
                      {t.viewCourse} <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                    </span>
                  </div>
                </Link>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      {/* Batches */}
      <section id="batches" className="scroll-mt-28 bg-mist py-20 lg:py-28">
        <div className="container-site grid gap-12">
          <Reveal>
            <SectionHeading eyebrow={t.batchesEyebrow} title={t.batchesTitle} lead={t.batchesLead} />
          </Reveal>
          <OfferingExplorer
            allLabel={d.common.all}
            emptyLabel={d.common.noResults}
            filters={[
              { value: "on_campus", label: d.modes.on_campus },
              { value: "online", label: d.modes.online },
              ...courses.map((c) => ({ value: c.code, label: c.code })),
            ]}
            items={bookable.map((o) => ({ key: o.id, tags: [o.mode, o.course.code], node: <OfferingCard o={o} locale={l} /> }))}
          />
        </div>
      </section>

      {/* Fees */}
      <section id="fees" className="scroll-mt-28 py-20 lg:py-28">
        <div className="container-site grid gap-10">
          <Reveal>
            <SectionHeading eyebrow={t.feesEyebrow} title={t.feesTitle} lead={t.feesLead} />
          </Reveal>
          <Reveal className="overflow-hidden rounded-3xl bg-cream ring-1 ring-ink/10">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <caption className="sr-only">{t.feesTitle}</caption>
                <thead className="bg-forest text-white">
                  <tr>
                    <th scope="col" className="px-6 py-4 font-semibold">
                      {t.feesLevel}
                    </th>
                    <th scope="col" className="px-6 py-4 font-semibold">
                      {t.feesSchedule}
                    </th>
                    <th scope="col" className="px-6 py-4 font-semibold">
                      {t.feesCourse}
                    </th>
                    <th scope="col" className="px-6 py-4 font-semibold">
                      {t.feesBook}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {courses.map((c, i) => (
                    <tr key={c.id} className={i % 2 ? "bg-white/40" : ""}>
                      <th scope="row" className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <LevelBadge code={c.code} level={c.level} size="sm" />
                          <span className="font-semibold text-forest">{pick(c, "title", l).split("·")[1]?.trim() ?? c.code}</span>
                        </div>
                      </th>
                      <td className="px-6 py-4 text-stone">
                        {c.weeks} {d.common.weeks} · {t.feesMonFri} · {formatNumber(c.units, l)} {t.feesUnits} · {(c.minutesPerDay / 60).toLocaleString(l === "de" ? "de-DE" : "en-GB")} h/{l === "de" ? "Tag" : "day"}
                      </td>
                      <td className="px-6 py-4 font-display text-lg text-forest tabular">{formatPKR(c.feePkr, l)}</td>
                      <td className="px-6 py-4">
                        <span className="flex items-center gap-2 text-ink/80">
                          <BookOpen className="size-4 text-ash" />
                          {c.bookTitle?.replace(" (continued from B2.1)", "")} {c.bookFeePkr ? `· ${formatPKR(c.bookFeePkr, l)}` : <span className="text-stone">· {t.sameBook}</span>}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="border-t border-ink/10 px-6 py-4 text-xs text-stone">{t.courier}</p>
          </Reveal>
        </div>
      </section>

      {/* How it works */}
      <section className="relative overflow-hidden bg-forest py-20 text-white lg:py-28">
        <Girih className="text-white/[0.04]" size={72} />
        <div className="container-site relative grid gap-12 lg:grid-cols-[1.2fr_0.8fr]">
          <div>
            <SectionHeading eyebrow={t.howEyebrow} title={t.howTitle} tone="dark" />
            <Stagger className="mt-10 grid gap-4 sm:grid-cols-2">
              {t.how.map((s, i) => (
                <StaggerItem key={s.title} className="rounded-3xl bg-white/[0.06] p-6 ring-1 ring-white/10">
                  <span className="font-display text-5xl text-lime">0{i + 1}</span>
                  <p className="mt-3 text-lg font-semibold">{s.title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-white/70">{s.text}</p>
                </StaggerItem>
              ))}
            </Stagger>
          </div>
          <Reveal className="self-end rounded-3xl bg-white p-7 text-forest">
            <p className="flex items-center gap-2 font-semibold">
              <FileText className="size-5 text-ash" /> {t.docsTitle}
            </p>
            <ul className="mt-4 grid gap-2.5 text-sm">
              {t.docs.map((doc) => (
                <li key={doc} className="flex gap-2.5">
                  <CircleCheck className="mt-0.5 size-4 shrink-0 text-ash" />
                  {doc}
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </section>

      {/* Assessment */}
      <section className="py-20 lg:py-28">
        <div className="container-site grid gap-10">
          <Reveal>
            <SectionHeading eyebrow={t.rulesEyebrow} title={t.rulesTitle} action={{ label: t.guidelines, href: href(l, "/student-guidelines") }} />
          </Reveal>
          <Stagger className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {t.rules.map((r) => (
              <StaggerItem key={r.label} className="rounded-3xl bg-cream p-6 text-center ring-1 ring-ink/10">
                <p className="font-display text-5xl text-ash">{r.value}</p>
                <p className="mt-2 text-sm font-medium text-forest">{r.label}</p>
              </StaggerItem>
            ))}
          </Stagger>
          <p className="flex max-w-3xl items-start gap-2 text-sm text-stone">
            <Clock className="mt-0.5 size-4 shrink-0 text-ash" /> {t.rulesNote}
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-sand/50 py-20 lg:py-28">
        <div className="container-site grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
          <Reveal>
            <SectionHeading title={t.faqTitle} />
          </Reveal>
          <Reveal delay={0.1}>
            <Accordion type="single" collapsible className="rounded-3xl bg-cream px-6 ring-1 ring-ink/10">
              {t.faq.map((f) => (
                <AccordionItem key={f.q} value={f.q} className="border-ink/10">
                  <AccordionTrigger className="py-5 text-left text-base font-semibold text-forest hover:no-underline">{f.q}</AccordionTrigger>
                  <AccordionContent className="text-base leading-relaxed text-stone">{f.a}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </Reveal>
        </div>
      </section>
    </>
  );
}
