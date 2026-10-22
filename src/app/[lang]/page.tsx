import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { lang } from "next/root-params";
import { ArrowRight, ArrowUpRight, Award, CalendarDays, ClipboardCheck, ExternalLink, FileSearch, GraduationCap, Laptop, MapPin } from "lucide-react";
import { Reveal, Stagger, StaggerItem } from "@/components/motion";
import { DateBadge, LevelBadge, SectionHeading } from "@/components/site/blocks";
import { EventCard, OfferingCard } from "@/components/site/cards";
import { Girih, Star8 } from "@/components/site/girih";
import { KineticWords } from "@/components/site/kinetic-words";
import { LevelJourney } from "@/components/site/level-journey";
import { OfferingExplorer } from "@/components/site/offering-explorer";
import { PartnersMarquee } from "@/components/site/partners-marquee";
import { homeCopy } from "@/content/home";
import { commonDictionary, seatsLabel } from "@/i18n/common";
import { hasLocale, href, pick, pickList, type Locale } from "@/i18n/config";
import { dateParts, formatClock, formatDate, formatNumber, formatPKR } from "@/lib/format";
import {
  getCourses,
  getExamDates,
  getGallery,
  getPlacementSessions,
  getPosts,
  getSettings,
  getUpcomingEvents,
  getUpcomingOfferings,
} from "@/server/public/queries";

/** Homepage mosaic, in slot order: wide hero tile, then a mix that shows courses, culture and campus life. */
const HOME_GALLERY = [
  { file: "ash-dslr-1358.webp", position: "50% 55%" }, // the Haus and its garden
  { file: "ash-fb-0121.webp", position: "50% 50%" }, // Lahore Literary Festival panel
  { file: "ash-fb-0130.webp", position: "50% 30%" }, // workshop certificates (portrait slot)
  { file: "ash-fb-0001.webp", position: "50% 40%" }, // teacher-training seminar
  { file: "ash-fb-0035.webp", position: "50% 55%" }, // European Classical Concert in the garden
  { file: "ash-fb-0142.webp", position: "50% 45%" }, // exhibition hall
  { file: "ash-fb-0045.webp", position: "50% 35%" }, // visiting students
];

async function locale(): Promise<Locale> {
  const v = await lang();
  return hasLocale(v) ? v : "en";
}

export async function generateMetadata(): Promise<Metadata> {
  const l = await locale();
  return { title: { absolute: `Annemarie-Schimmel-Haus Lahore: ${homeCopy(l).metaTitle}` }, alternates: { canonical: `/${l}`, languages: { en: "/en", de: "/de" } } };
}

export default async function HomePage() {
  const l = await locale();
  const t = homeCopy(l);
  const d = commonDictionary(l);
  const [courses, offerings, events, placement, exams, gallery, posts, settings] = await Promise.all([
    getCourses(),
    getUpcomingOfferings(),
    getUpcomingEvents(6),
    getPlacementSessions(),
    getExamDates(),
    getGallery(),
    getPosts(3),
    getSettings(),
  ]);

  const bookable = offerings.filter((o) => o.state === "open" || o.state === "opens_soon" || o.state === "full");
  const nextOffering = bookable.find((o) => o.state === "open") ?? bookable[0];
  const nextEvent = events.find((e) => !e.cancelled);
  const nextPlacement = placement.find((p) => p.state === "open") ?? placement[0];
  const nextExam = exams.upcoming[0];
  // Hand-picked photographs for the homepage (captions and alt texts still come from the
  // gallery in the admin). Each slot of the mosaic gets a picture whose shape suits it.
  const curated = HOME_GALLERY.map((c) => ({ ...c, item: gallery.find((g) => g.imagePath === `/images/gallery/${c.file}`) })).filter((c) => c.item);
  const mosaic =
    curated.length >= 7
      ? curated.slice(0, 7).map((c) => ({ ...c.item!, imagePath: `/images/polished/${c.file}`, position: c.position }))
      : [...gallery.filter((g) => g.featured), ...gallery.filter((g) => !g.featured && g.width > g.height)].slice(0, 7).map((g) => ({ ...g, position: "50% 50%" }));
  const heroAlt =
    l === "de"
      ? "Gespräch im Annemarie-Schimmel-Haus vor der deutschen und der pakistanischen Flagge"
      : "A meeting at Annemarie-Schimmel-Haus in front of the German and Pakistani flags";

  return (
    <>
      {/* ------------------------------------------------------------- HERO */}
      <section className="relative overflow-hidden">
        <div className="bg-grid pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_at_top_left,black_30%,transparent_75%)]" aria-hidden />
        <div className="absolute -right-32 bottom-0 hidden size-[560px] text-ash/[0.08] lg:block" aria-hidden>
          <Girih size={60} />
        </div>
        <div className="container-site relative grid items-center gap-14 pt-10 pb-24 lg:grid-cols-[0.95fr_1.05fr] lg:gap-12 lg:pt-16 lg:pb-32">
          <div>
            <p className="inline-flex animate-rise items-center gap-2 rounded-full bg-cream py-1.5 pr-4 pl-1.5 text-xs font-semibold text-pine ring-1 ring-ink/10">
              <span className="rounded-full bg-forest px-2.5 py-1 text-[10px] tracking-widest text-lime uppercase">{d.brand.since}</span>
              {t.heroEyebrow}
            </p>
            <h1 className="mt-7 font-display text-[3.4rem] leading-[0.95] text-forest sm:text-7xl lg:text-[5.6rem]">
              <span className="block animate-rise [animation-delay:80ms]">{t.heroTitleA}</span>
              <span className="relative block animate-rise italic [animation-delay:180ms]" style={{ fontVariationSettings: '"SOFT" 100, "WONK" 1' }}>
                <span className="text-ash">{t.heroTitleB}</span>
                <svg viewBox="0 0 320 18" preserveAspectRatio="none" aria-hidden className="absolute -bottom-2 left-0 h-3 w-[min(100%,26rem)] text-lime">
                  <path d="M2 12 C 80 2, 160 2, 318 10" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" className="[stroke-dasharray:340] [stroke-dashoffset:340] motion-safe:animate-[draw_1.2s_0.6s_ease-out_forwards] motion-reduce:[stroke-dashoffset:0]" />
                </svg>
              </span>
            </h1>
            <KineticWords lead={t.kineticLead} words={t.kineticWords} className="mt-8 animate-rise text-xl text-ink/80 [animation-delay:260ms] sm:text-2xl" />
            <p className="mt-5 max-w-xl animate-rise text-lg leading-relaxed text-stone [animation-delay:320ms]">{t.heroLead}</p>
            <div className="mt-9 flex animate-rise flex-wrap items-center gap-3 [animation-delay:400ms]">
              <Link
                href={href(l, "/courses")}
                className="group inline-flex h-14 items-center gap-2 rounded-full bg-forest pr-2 pl-7 text-base font-semibold text-white shadow-[0_18px_40px_-18px_rgb(16_36_28/0.9)] transition-all hover:bg-pine"
              >
                {t.heroPrimary}
                <span className="grid size-10 place-items-center rounded-full bg-lime text-forest transition-transform group-hover:translate-x-0.5">
                  <ArrowRight className="size-5" />
                </span>
              </Link>
              <Link href={href(l, "/events")} className="inline-flex h-14 items-center gap-2 rounded-full px-7 text-base font-semibold text-forest ring-1 ring-ink/15 transition-colors hover:bg-cream">
                <CalendarDays className="size-5 text-ash" />
                {t.heroSecondary}
              </Link>
            </div>
            <Link href={href(l, "/track")} className="mt-6 inline-flex animate-rise items-center gap-2 text-sm font-medium text-pine [animation-delay:460ms]">
              <FileSearch className="size-4" />
              <span className="link-underline">{t.heroTrack}</span>
            </Link>
            <div className="mt-10 flex animate-rise flex-wrap items-center gap-x-6 gap-y-3 border-t border-ink/10 pt-6 [animation-delay:520ms]">
              <Image src="/brand/partners/goethe.png" alt="Goethe-Institut" width={1169} height={568} sizes="96px" className="h-9 w-auto" />
              <span className="max-w-40 text-xs leading-snug text-stone">{d.brand.goethe}</span>
              <span className="hidden h-8 w-px bg-ink/10 sm:block" />
              {t.heroFacts.map((f) => (
                <span key={f} className="inline-flex items-center gap-1.5 text-sm font-semibold text-forest">
                  <Star8 className="size-3 text-lime" />
                  {f}
                </span>
              ))}
            </div>
          </div>

          {/* Visual: the German-Pakistani meeting photograph in full 3:2, with live floating cards */}
          <div className="relative mx-auto w-full max-w-[680px] lg:mr-0">
            <div className="absolute inset-x-0 top-0 aspect-[3/2] translate-x-4 translate-y-4 rounded-[2.25rem] bg-mint sm:translate-x-6 sm:translate-y-6" aria-hidden />
            <figure className="relative animate-rise overflow-hidden rounded-[2.25rem] bg-mint shadow-[0_50px_100px_-50px_rgb(16_36_28/0.75)] ring-1 ring-ink/10 [animation-delay:150ms]">
              <div className="relative aspect-[3/2]">
                <Image
                  src="/images/hero/meeting.webp"
                  alt={heroAlt}
                  fill
                  priority
                  fetchPriority="high"
                  sizes="(min-width: 1280px) 680px, (min-width: 1024px) 52vw, 94vw"
                  className="object-cover object-[50%_45%]"
                  quality={85}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-forest/55 via-forest/5 to-transparent" />
              </div>
              <figcaption className="absolute top-4 right-4 inline-flex items-center gap-2 rounded-full bg-forest/80 px-3 py-1.5 text-[11px] font-semibold tracking-wide text-white backdrop-blur">
                <span aria-hidden>🇩🇪</span>
                {l === "de" ? "Deutsch-pakistanischer Dialog" : "German-Pakistani dialogue"}
                <span aria-hidden>🇵🇰</span>
              </figcaption>
            </figure>

            {/* rotating seal */}
            <div className="absolute -top-6 -left-6 hidden size-32 sm:block" aria-hidden>
              <div className="relative size-full rounded-full bg-lime shadow-xl">
                <svg viewBox="0 0 100 100" className="absolute inset-0 size-full motion-safe:animate-[spin_24s_linear_infinite]">
                  <defs>
                    <path id="seal-circle" d="M50,50 m-36,0 a36,36 0 1,1 72,0 a36,36 0 1,1 -72,0" />
                  </defs>
                  <text className="fill-forest font-mono text-[8.4px] font-semibold tracking-[0.2em] uppercase">
                    <textPath href="#seal-circle">{t.ring}</textPath>
                  </text>
                </svg>
                <Star8 className="absolute top-1/2 left-1/2 size-9 -translate-x-1/2 -translate-y-1/2 text-forest" />
              </div>
            </div>

            {nextOffering && (
              <Link
                href={href(l, nextOffering.state === "open" ? `/enroll/${nextOffering.id}` : `/courses/${nextOffering.course.slug}`)}
                className="relative mx-auto -mt-8 flex w-[min(17rem,calc(100%-2rem))] animate-float sm:absolute sm:-bottom-8 sm:mx-0 sm:mt-0 sm:w-64 items-center gap-3 rounded-2xl bg-cream/95 p-3.5 shadow-[0_24px_50px_-20px_rgb(16_36_28/0.6)] ring-1 ring-ink/10 backdrop-blur transition-transform hover:scale-[1.03] sm:-left-12"
              >
                <LevelBadge code={nextOffering.course.code} level={nextOffering.course.level} />
                <span className="min-w-0">
                  <span className="eyebrow block text-ash">{t.floatingNext}</span>
                  <span className="block truncate text-sm font-semibold text-forest">{formatDate(nextOffering.startsOn, l, { year: undefined, weekday: "short" })}</span>
                  <span className="flex items-center gap-1 text-xs text-stone">
                    {nextOffering.mode === "online" ? <Laptop className="size-3" /> : <MapPin className="size-3" />}
                    {d.modes[nextOffering.mode]} · {seatsLabel(d, nextOffering.seatsLeft)}
                  </span>
                </span>
              </Link>
            )}
            {nextEvent && (
              <Link
                href={href(l, `/events/${nextEvent.slug}`)}
                className="absolute -top-6 -right-3 hidden w-72 sm:flex lg:-right-6 animate-float items-center gap-3 rounded-2xl bg-forest p-3.5 text-white shadow-[0_24px_50px_-20px_rgb(16_36_28/0.9)] transition-transform [animation-delay:-3s] hover:scale-[1.03] sm:-right-8"
              >
                <DateBadge {...dateParts(nextEvent.startsAt, l)} tone="lime" className="w-14" />
                <span className="min-w-0">
                  <span className="eyebrow block text-lime">{t.floatingEvent}</span>
                  <span className="line-clamp-2 text-sm leading-snug font-semibold">{pick(nextEvent, "title", l)}</span>
                </span>
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------- QUICK ACTIONS */}
      <section aria-label={t.quickTitle} className="relative z-10 -mt-6">
        <div className="container-site">
          <Stagger className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {t.quick.map((q, i) => {
              const Icon = [GraduationCap, ClipboardCheck, CalendarDays, Award][i];
              const external = i === 3;
              return (
                <StaggerItem key={q.title}>
                  <Link
                    href={href(l, q.href)}
                    className={`group relative flex h-full flex-col gap-4 overflow-hidden rounded-3xl p-6 transition-all duration-300 hover:-translate-y-1 ${i === 0 ? "bg-forest text-white" : "bg-cream ring-1 ring-ink/10 hover:ring-ash/50"} hover:shadow-[0_30px_60px_-35px_rgb(16_36_28/0.6)]`}
                  >
                    {i === 0 && <Girih className="text-white/[0.05]" size={44} />}
                    <span className={`relative grid size-12 place-items-center rounded-2xl ${i === 0 ? "bg-lime text-forest" : "bg-mint text-pine group-hover:bg-forest group-hover:text-lime"} transition-colors`}>
                      <Icon className="size-6" />
                    </span>
                    <span className="relative">
                      <span className={`block font-display text-2xl ${i === 0 ? "text-white" : "text-forest"}`}>{q.title}</span>
                      <span className={`mt-1 block text-sm ${i === 0 ? "text-white/70" : "text-stone"}`}>{q.text}</span>
                    </span>
                    <span className={`relative mt-auto inline-flex size-9 items-center justify-center rounded-full transition-transform group-hover:translate-x-1 ${i === 0 ? "bg-white/10 text-lime" : "bg-forest text-white"}`}>
                      {external ? <ArrowUpRight className="size-4" /> : <ArrowRight className="size-4" />}
                    </span>
                  </Link>
                </StaggerItem>
              );
            })}
          </Stagger>
        </div>
      </section>

      {/* --------------------------------------------------- LEVEL JOURNEY */}
      <section className="py-24 lg:py-32">
        <div className="container-site grid gap-12">
          <Reveal>
            <SectionHeading eyebrow={t.journeyEyebrow} title={t.journeyTitle} lead={t.journeyLead} action={{ label: t.journeyPlacement, href: href(l, "/placement-test") }} />
          </Reveal>
          <Reveal delay={0.1}>
            <LevelJourney
              labels={{ cta: t.journeyCta, weeks: d.common.duration, units: d.common.units, fee: d.common.fee, next: t.floatingNext }}
              levels={courses.map((c) => ({
                code: c.code,
                level: c.level,
                title: pick(c, "title", l),
                tagline: pick(c, "tagline", l),
                summary: pick(c, "summary", l),
                outcomes: pickList(c, "outcomes", l),
                weeks: `${c.weeks} ${d.common.weeks}`,
                units: formatNumber(c.units, l),
                fee: formatPKR(c.feePkr, l),
                next: c.nextOffering ? formatDate(c.nextOffering.startsOn, l, { month: "short", year: undefined }) : null,
                href: href(l, `/courses/${c.slug}`),
              }))}
            />
          </Reveal>
        </div>
      </section>

      {/* -------------------------------------------------- UPCOMING BATCHES */}
      <section className="relative bg-mist py-24 lg:py-32">
        <div className="container-site grid gap-12">
          <Reveal>
            <SectionHeading eyebrow={t.startingEyebrow} title={t.startingTitle} lead={t.startingLead} action={{ label: t.startingAll, href: href(l, "/courses") }} />
          </Reveal>
          <OfferingExplorer
            allLabel={t.filterAll}
            emptyLabel={d.common.noResults}
            filters={[
              { value: "on_campus", label: d.modes.on_campus },
              { value: "online", label: d.modes.online },
              ...[...new Set(bookable.map((o) => o.course.level))].map((lv) => ({ value: lv, label: lv })),
            ]}
            items={bookable.slice(0, 9).map((o) => ({ key: o.id, tags: [o.mode, o.course.level], node: <OfferingCard o={o} locale={l} /> }))}
          />
        </div>
      </section>

      {/* ------------------------------------------- PLACEMENT + EXAMS BAND */}
      <section className="py-24 lg:py-32">
        <div className="container-site grid gap-5 lg:grid-cols-2">
          <Reveal className="relative overflow-hidden rounded-[2rem] bg-forest p-8 text-white sm:p-12">
            <Girih className="text-white/[0.05]" size={56} />
            <div className="relative">
              <p className="eyebrow text-lime">{t.placementEyebrow}</p>
              <h2 className="mt-3 font-display text-4xl sm:text-5xl">{t.placementTitle}</h2>
              <p className="mt-4 max-w-md text-white/75">{t.placementText}</p>
              {nextPlacement ? (
                <div className="mt-8 flex flex-wrap items-center gap-5 rounded-3xl bg-white/[0.07] p-5 ring-1 ring-white/10">
                  <DateBadge {...dateParts(nextPlacement.startsAt, l)} tone="lime" />
                  <div className="grid gap-1 text-sm">
                    <span className="font-semibold">
                      {formatClock(nextPlacement.startsAt, l)}{l === "de" ? " bis " : " to "}{formatClock(nextPlacement.endsAt, l)} · {nextPlacement.levels.join(", ")}
                    </span>
                    <span className="text-white/70">
                      {d.common.fee}: {formatPKR(nextPlacement.feePkr, l)} · {d.common.deadline}: {formatDate(nextPlacement.registrationDeadline, l, { month: "short", year: undefined })}
                    </span>
                  </div>
                </div>
              ) : (
                <p className="mt-8 text-white/70">{t.placementNone}</p>
              )}
              <Link href={href(l, "/placement-test")} className="group mt-8 inline-flex h-12 items-center gap-2 rounded-full bg-lime px-6 font-semibold text-forest transition-colors hover:bg-white">
                {t.placementCta}
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          </Reveal>
          <Reveal delay={0.1} className="relative overflow-hidden rounded-[2rem] bg-cream p-8 ring-1 ring-ink/10 sm:p-12">
            <Image src="/brand/partners/goethe.png" alt="Goethe-Institut" width={1169} height={568} sizes="140px" className="h-12 w-auto" />
            <p className="eyebrow mt-8 text-ash">{t.examsEyebrow}</p>
            <h2 className="mt-3 font-display text-4xl text-forest sm:text-5xl">{t.examsTitle}</h2>
            <p className="mt-4 max-w-md text-stone">{t.examsText}</p>
            {nextExam ? (
              <div className="mt-8 flex items-center gap-5 rounded-3xl bg-mist p-5">
                <DateBadge {...dateParts(nextExam.examStartsOn, l)} tone="dark" />
                <div className="text-sm">
                  <p className="eyebrow text-ash">{t.examsNext}</p>
                  <p className="mt-1 font-semibold text-forest">Goethe-Zertifikat {nextExam.levels.join(" & ")}</p>
                </div>
              </div>
            ) : (
              <p className="mt-8 rounded-2xl bg-mist p-5 text-sm text-pine">{t.examsNone}</p>
            )}
            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href={settings.goethe.examPortalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex h-12 items-center gap-2 rounded-full bg-forest px-6 font-semibold text-white transition-colors hover:bg-pine"
              >
                {t.examsCta}
                <ExternalLink className="size-4" />
                <span className="sr-only">({d.common.externalLink})</span>
              </a>
              <Link href={href(l, "/exams")} className="inline-flex h-12 items-center rounded-full px-6 font-semibold text-forest ring-1 ring-ink/15 hover:bg-white">
                {t.examsMore}
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ------------------------------------------------------------ EVENTS */}
      <section className="relative overflow-hidden bg-sand/60 py-24 lg:py-32">
        <div className="container-site grid gap-12">
          <Reveal>
            <SectionHeading eyebrow={t.eventsEyebrow} title={t.eventsTitle} lead={t.eventsLead} action={{ label: t.eventsAll, href: href(l, "/events") }} />
          </Reveal>
          {nextEvent ? (
            <div className="grid gap-6">
              <Reveal>
                <EventCard e={nextEvent} locale={l} variant="feature" />
              </Reveal>
              <Reveal delay={0.1} className="grid gap-1 rounded-3xl bg-cream/70 p-3 ring-1 ring-ink/10 md:grid-cols-2">
                {events
                  .filter((e) => e.id !== nextEvent.id)
                  .slice(0, 4)
                  .map((e) => (
                    <EventCard key={e.id} e={e} locale={l} variant="row" />
                  ))}
              </Reveal>
            </div>
          ) : (
            <p className="rounded-3xl bg-cream p-10 text-center text-stone">{t.eventsEmpty}</p>
          )}
        </div>
      </section>

      {/* ----------------------------------------------------------- GALLERY */}
      {mosaic.length >= 7 && (
        <section className="py-24 lg:py-32">
          <div className="container-site grid gap-12">
            <Reveal>
              <SectionHeading eyebrow={t.galleryEyebrow} title={t.galleryTitle} action={{ label: t.galleryCta, href: href(l, "/gallery") }} />
            </Reveal>
            <Stagger className="grid grid-flow-dense auto-rows-[160px] grid-cols-2 gap-3 sm:auto-rows-[220px] lg:grid-cols-4">
              {mosaic.map((g, i) => (
                <StaggerItem
                  key={g.id}
                  className={["col-span-2 row-span-2", "", "row-span-2", "", "", "col-span-2", "col-span-2 lg:col-span-1"][i] ?? ""}
                >
                  <Link
                    href={href(l, "/gallery")}
                    className="group photo-frame relative block size-full overflow-hidden rounded-3xl bg-mint ring-1 ring-ink/10 transition-[transform,box-shadow] duration-500 hover:-translate-y-1 hover:shadow-[0_30px_60px_-30px_rgb(16_36_28/0.55)] focus-visible:-translate-y-1"
                  >
                    <Image
                      src={g.imagePath}
                      alt={pick(g, "alt", l)}
                      fill
                      sizes={i === 0 ? "(min-width: 1024px) 50vw, 100vw" : "(min-width: 1024px) 25vw, 50vw"}
                      style={{ objectPosition: g.position }}
                      className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04] group-focus-visible:scale-[1.04]"
                    />
                    {/* Caption: always readable on touch screens, revealed on hover where there is a pointer */}
                    <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-forest/90 via-forest/40 to-transparent p-4 pt-14 text-sm font-medium text-white transition-all duration-300 [@media(hover:hover)]:translate-y-2 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:translate-y-0 [@media(hover:hover)]:group-hover:opacity-100 [@media(hover:hover)]:group-focus-visible:translate-y-0 [@media(hover:hover)]:group-focus-visible:opacity-100">
                      <span className="line-clamp-2">{pick(g, "caption", l)}</span>
                    </span>
                  </Link>
                </StaggerItem>
              ))}
            </Stagger>
          </div>
        </section>
      )}

      {/* ------------------------------------------------------------ LEGACY */}
      <section className="relative overflow-hidden bg-forest py-24 text-white lg:py-32">
        <Girih className="text-white/[0.035]" size={80} />
        <div className="container-site relative grid items-center gap-14 lg:grid-cols-[1fr_1.1fr]">
          <Reveal className="relative mx-auto w-full max-w-md">
            <div className="arch relative aspect-[4/5] overflow-hidden bg-forest-2">
              <Image
                src="/images/polished/ash-dslr-1358.webp"
                alt={l === "de" ? "Das Gebäude des Annemarie-Schimmel-Hauses mit Garten an der Upper Mall, Lahore" : "The Annemarie-Schimmel-Haus building and garden on Upper Mall, Lahore"}
                fill
                sizes="(min-width: 1024px) 35vw, 90vw"
                className="object-cover object-[45%_50%]"
              />
            </div>
            <div className="absolute -right-4 -bottom-6 rounded-2xl bg-lime p-5 text-forest shadow-xl sm:-right-10">
              <p className="font-display text-5xl leading-none">2003</p>
              <p className="mt-1 text-xs font-semibold tracking-wider uppercase">{t.stats[0].label}</p>
            </div>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="eyebrow inline-flex items-center gap-2 text-lime">
              <Star8 className="size-3" />
              {t.legacyEyebrow}
            </p>
            <h2 className="mt-4 font-display text-4xl leading-[1.05] sm:text-6xl">{t.legacyTitle}</h2>
            <p className="mt-6 text-lg leading-relaxed text-white/75">{t.legacyText}</p>
            <p className="mt-4 leading-relaxed text-white/60">{t.legacyText2}</p>
            <dl className="mt-10 grid grid-cols-2 gap-6 border-t border-white/10 pt-8 sm:grid-cols-4">
              {t.stats.map((s) => (
                <div key={s.label} className="flex flex-col">
                  <dt className="text-xs text-white/55">{s.label}</dt>
                  <dd className="order-first font-display text-4xl text-lime">{s.value}</dd>
                </div>
              ))}
            </dl>
            <Link href={href(l, "/about")} className="group mt-10 inline-flex h-12 items-center gap-2 rounded-full bg-white px-6 font-semibold text-forest transition-colors hover:bg-lime">
              {t.legacyCta}
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </Reveal>
        </div>
      </section>

      {/* ---------------------------------------------------- CONTRIBUTION */}
      <section className="relative overflow-hidden py-24 lg:py-32" aria-labelledby="contribution-title">
        <div className="container-site grid gap-14">
          <Reveal className="grid gap-6 lg:grid-cols-[1fr_1fr] lg:items-end">
            <div>
              <p className="eyebrow inline-flex items-center gap-2 text-ash">
                <Star8 className="size-3" />
                {t.contribEyebrow}
              </p>
              <h2 id="contribution-title" className="mt-4 font-display text-4xl leading-[1.05] text-forest sm:text-5xl">
                {t.contribTitle}
              </h2>
            </div>
            <p className="text-lg leading-relaxed text-stone lg:pb-2">{t.contribLead}</p>
          </Reveal>
          <Stagger className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {t.contribPillars.map((p, i) => (
              <StaggerItem key={p.title}>
                <article className="group flex h-full flex-col overflow-hidden rounded-3xl bg-cream ring-1 ring-ink/10 transition-[transform,box-shadow] duration-500 hover:-translate-y-1.5 hover:shadow-[0_30px_60px_-34px_rgb(16_36_28/0.55)] hover:ring-ash/40">
                  <div className="photo-frame relative aspect-[4/3] overflow-hidden bg-mint">
                    <Image
                      src={p.image}
                      alt={p.alt}
                      fill
                      sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
                      style={{ objectPosition: p.position }}
                      className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.05]"
                    />
                    <span className="absolute top-4 left-4 grid size-9 place-items-center rounded-full bg-forest/85 font-display text-sm text-lime backdrop-blur">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                  </div>
                  <div className="flex flex-1 flex-col gap-3 p-6">
                    <h3 className="font-display text-xl leading-snug text-forest">{p.title}</h3>
                    <p className="text-sm leading-relaxed text-stone">{p.text}</p>
                    <span className="mt-auto h-0.5 w-10 rounded-full bg-lime transition-all duration-500 group-hover:w-20" aria-hidden />
                  </div>
                </article>
              </StaggerItem>
            ))}
          </Stagger>
          <Reveal>
            <figure className="mx-auto max-w-3xl text-center">
              <blockquote className="font-display text-2xl leading-snug text-forest italic sm:text-3xl">“{t.contribQuote}”</blockquote>
              <figcaption className="mt-3 text-sm tracking-wide text-stone">{t.contribQuoteBy}</figcaption>
            </figure>
          </Reveal>
        </div>
      </section>

      {/* -------------------------------------------------------------- NEWS */}
      {posts.length > 0 && (
        <section className="py-24 lg:py-32">
          <div className="container-site grid gap-12">
            <Reveal>
              <SectionHeading eyebrow={t.newsEyebrow} title={t.newsTitle} action={{ label: t.newsAll, href: href(l, "/news") }} />
            </Reveal>
            <Stagger className="grid gap-5 md:grid-cols-3">
              {posts.map((p) => (
                <StaggerItem key={p.id}>
                  <Link href={href(l, `/news/${p.slug}`)} className="group flex h-full flex-col overflow-hidden rounded-3xl bg-cream ring-1 ring-ink/10 transition-all hover:-translate-y-1 hover:shadow-[0_30px_60px_-35px_rgb(16_36_28/0.5)]">
                    <div className="relative aspect-[16/10] overflow-hidden bg-mint">
                      {p.imagePath ? (
                        <Image src={p.imagePath} alt="" fill sizes="(min-width: 768px) 33vw, 100vw" className="object-cover transition-transform duration-700 group-hover:scale-105" />
                      ) : (
                        <div className="absolute inset-0 text-ash/20">
                          <Girih size={40} />
                        </div>
                      )}
                      <span className="absolute top-4 left-4 rounded-full bg-cream/95 px-3 py-1 text-xs font-semibold text-pine">{d.postCategories[p.category]}</span>
                    </div>
                    <div className="flex flex-1 flex-col p-6">
                      <time className="text-xs font-medium text-stone">{p.publishedAt ? formatDate(p.publishedAt, l) : ""}</time>
                      <h3 className="mt-2 font-display text-xl leading-snug text-forest">{pick(p, "title", l)}</h3>
                      <p className="mt-2 line-clamp-2 text-sm text-stone">{pick(p, "excerpt", l)}</p>
                      <span className="mt-auto inline-flex items-center gap-1.5 pt-5 text-sm font-semibold text-pine">
                        {d.common.readMore} <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                      </span>
                    </div>
                  </Link>
                </StaggerItem>
              ))}
            </Stagger>
          </div>
        </section>
      )}

      {/* ---------------------------------------------------------- PARTNERS */}
      <div className="border-y border-ink/10 bg-cream">
        <PartnersMarquee locale={l} title={t.partnersTitle} />
      </div>
    </>
  );
}
