import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { lang } from "next/root-params";
import { Suspense } from "react";
import { ArrowLeft, ArrowRight, Award, BookOpen, CalendarClock, Check, ClipboardCheck, Clock, Wallet } from "lucide-react";
import { Reveal } from "@/components/motion";
import { Breadcrumbs, LevelBadge, SectionHeading } from "@/components/site/blocks";
import { OfferingCard } from "@/components/site/cards";
import { Girih } from "@/components/site/girih";
import { Markdown } from "@/components/site/markdown";
import { coursesCopy } from "@/content/courses";
import { commonDictionary } from "@/i18n/common";
import { hasLocale, href, pick, pickList, type Locale } from "@/i18n/config";
import { formatNumber, formatPKR } from "@/lib/format";
import { getCourseBySlug, getCourses, getCourseSlugs } from "@/server/public/queries";

async function locale(): Promise<Locale> {
  const v = await lang();
  return hasLocale(v) ? v : "en";
}

export async function generateStaticParams() {
  return (await getCourseSlugs()).map((slug) => ({ slug }));
}

export async function generateMetadata(props: PageProps<"/[lang]/courses/[slug]">): Promise<Metadata> {
  const [{ slug }, l] = await Promise.all([props.params, locale()]);
  const data = await getCourseBySlug(slug);
  if (!data) return {};
  return {
    title: pick(data.course, "title", l),
    description: pick(data.course, "summary", l),
    alternates: { canonical: `/${l}/courses/${slug}`, languages: { en: `/en/courses/${slug}`, de: `/de/courses/${slug}` } },
    openGraph: data.course.imagePath ? { images: [{ url: data.course.imagePath }] } : undefined,
  };
}

export default function CoursePage(props: PageProps<"/[lang]/courses/[slug]">) {
  return (
    <Suspense fallback={<div className="container-site h-[70dvh] animate-pulse py-20" />}>
      <CourseContent params={props.params} />
    </Suspense>
  );
}

async function CourseContent({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const l = await locale();
  const [data, all] = await Promise.all([getCourseBySlug(slug), getCourses()]);
  if (!data) notFound();
  const { course, offerings } = data;
  const d = commonDictionary(l);
  const t = coursesCopy(l);
  const index = all.findIndex((c) => c.id === course.id);
  const prev = all[index - 1];
  const next = all[index + 1];
  const title = pick(course, "title", l);
  const outcomes = pickList(course, "outcomes", l);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Course",
    name: title,
    description: pick(course, "summary", l),
    provider: { "@type": "EducationalOrganization", name: "Annemarie-Schimmel-Haus", sameAs: "https://schimmel.com.pk" },
    educationalLevel: course.code,
    inLanguage: "de",
    offers: { "@type": "Offer", price: course.feePkr, priceCurrency: "PKR", category: "Paid" },
    hasCourseInstance: offerings.map((o) => ({
      "@type": "CourseInstance",
      courseMode: o.mode === "online" ? "online" : "onsite",
      startDate: o.startsOn,
      endDate: o.endsOn ?? undefined,
      location: o.mode === "online" ? undefined : { "@type": "Place", name: "Annemarie-Schimmel-Haus", address: "155 Scotch Corner, Upper Mall, Lahore" },
    })),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <section className="relative overflow-hidden bg-forest text-white">
        <Girih className="text-white/[0.04]" size={64} />
        <div className="container-site relative grid gap-10 py-12 lg:grid-cols-[1.2fr_0.8fr] lg:py-20">
          <div>
            <Breadcrumbs tone="dark" items={[{ label: d.nav.home, href: href(l) }, { label: d.nav.courses, href: href(l, "/courses") }, { label: course.code }]} />
            <div className="mt-8 flex items-center gap-4">
              <LevelBadge code={course.code} level={course.level} size="lg" />
              <span className="eyebrow text-lime">CEFR · Goethe-Institut</span>
            </div>
            <h1 className="mt-5 font-display text-5xl leading-[1.02] sm:text-6xl">{title}</h1>
            <p className="mt-3 text-xl text-lime">{pick(course, "tagline", l)}</p>
            <p className="mt-5 max-w-2xl text-lg leading-relaxed text-white/75">{pick(course, "summary", l)}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href="#dates" className="inline-flex h-12 items-center gap-2 rounded-full bg-lime px-6 font-semibold text-forest hover:bg-white">
                {t.batchesTitle} <ArrowRight className="size-4" />
              </a>
              {course.requiresPlacement && (
                <Link href={href(l, "/placement-test")} className="inline-flex h-12 items-center gap-2 rounded-full px-6 font-semibold text-white ring-1 ring-white/25 hover:bg-white/10">
                  <ClipboardCheck className="size-4" /> {d.nav.placement}
                </Link>
              )}
            </div>
          </div>
          <dl className="grid grid-cols-2 gap-3 self-end">
            {[
              { icon: Clock, label: d.common.duration, value: `${course.weeks} ${d.common.weeks}` },
              { icon: CalendarClock, label: d.common.units, value: `${formatNumber(course.units, l)} · ${(course.minutesPerDay / 60).toLocaleString(l === "de" ? "de-DE" : "en-GB")} h/${l === "de" ? "Tag" : "day"}` },
              { icon: Wallet, label: d.common.fee, value: formatPKR(course.feePkr, l) },
              { icon: BookOpen, label: d.common.book, value: course.bookTitle?.replace(" (continued from B2.1)", "") ?? "—" },
            ].map((f) => (
              <div key={f.label} className="rounded-3xl bg-white/[0.07] p-5 ring-1 ring-white/10">
                <dt className="flex items-center gap-1.5 text-xs text-white/60">
                  <f.icon className="size-3.5 text-lime" /> {f.label}
                </dt>
                <dd className="mt-2 font-display text-xl">{f.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="py-16 lg:py-24">
        <div className="container-site grid gap-12 lg:grid-cols-[1.3fr_0.7fr]">
          <Reveal>
            <Markdown className="max-w-2xl text-lg">{pick(course, "description", l)}</Markdown>
          </Reveal>
          <Reveal delay={0.1} className="grid content-start gap-5">
            {course.imagePath && (
              <div className="arch relative aspect-[4/5] overflow-hidden bg-mint">
                <Image src={course.imagePath} alt="" fill sizes="(min-width: 1024px) 30vw, 90vw" className="object-cover" />
              </div>
            )}
            {outcomes.length > 0 && (
              <div className="rounded-3xl bg-cream p-6 ring-1 ring-ink/10">
                <p className="font-semibold text-forest">{l === "de" ? "Nach dem Kurs können Sie …" : "After this course you can …"}</p>
                <ul className="mt-4 grid gap-3 text-sm">
                  {outcomes.map((o) => (
                    <li key={o} className="flex gap-3">
                      <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-ash text-white">
                        <Check className="size-3" />
                      </span>
                      {o}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <Link href={href(l, "/exams")} className="group flex items-center gap-4 rounded-3xl bg-mist p-5 transition-colors hover:bg-mint">
              <Award className="size-8 text-pine" />
              <span className="text-sm">
                <span className="block font-semibold text-forest">Goethe-Zertifikat {course.level}</span>
                <span className="text-stone">{d.nav.examsHint}</span>
              </span>
              <ArrowRight className="ml-auto size-4 text-pine transition-transform group-hover:translate-x-1" />
            </Link>
          </Reveal>
        </div>
      </section>

      <section id="dates" className="scroll-mt-28 bg-mist py-16 lg:py-24">
        <div className="container-site grid gap-10">
          <SectionHeading eyebrow={t.batchesEyebrow} title={t.batchesTitle} lead={t.batchesLead} />
          {offerings.length ? (
            <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {offerings.map((o) => (
                <li key={o.id}>
                  <OfferingCard o={o} locale={l} />
                </li>
              ))}
            </ul>
          ) : (
            <div className="rounded-3xl bg-cream p-10 text-center ring-1 ring-ink/10">
              <p className="font-display text-2xl text-forest">{t.noDates}</p>
              <p className="mt-2 text-stone">{l === "de" ? "Abonnieren Sie unseren Newsletter oder schreiben Sie uns — wir informieren Sie über neue Termine." : "Subscribe to our newsletter or write to us — we'll let you know about new dates."}</p>
              <Link href={href(l, "/contact")} className="mt-6 inline-flex h-11 items-center rounded-full bg-forest px-6 text-sm font-semibold text-white hover:bg-pine">
                {d.nav.contact}
              </Link>
            </div>
          )}
        </div>
      </section>

      <nav aria-label="Levels" className="border-t border-ink/10">
        <div className="container-site grid gap-3 py-8 sm:grid-cols-2">
          {prev ? (
            <Link href={href(l, `/courses/${prev.slug}`)} className="group flex items-center gap-4 rounded-2xl p-4 hover:bg-cream">
              <ArrowLeft className="size-5 text-ash transition-transform group-hover:-translate-x-1" />
              <LevelBadge code={prev.code} level={prev.level} size="sm" />
              <span className="font-semibold text-forest">{pick(prev, "title", l)}</span>
            </Link>
          ) : (
            <span />
          )}
          {next && (
            <Link href={href(l, `/courses/${next.slug}`)} className="group flex items-center justify-end gap-4 rounded-2xl p-4 text-right hover:bg-cream">
              <span className="font-semibold text-forest">{pick(next, "title", l)}</span>
              <LevelBadge code={next.code} level={next.level} size="sm" />
              <ArrowRight className="size-5 text-ash transition-transform group-hover:translate-x-1" />
            </Link>
          )}
        </div>
      </nav>
    </>
  );
}
