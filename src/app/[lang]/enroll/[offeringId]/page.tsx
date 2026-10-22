import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { lang } from "next/root-params";
import { Suspense } from "react";
import { BookOpen, CalendarDays, CircleCheck, Clock, Laptop, MapPin, ShieldCheck, Wallet } from "lucide-react";
import { Breadcrumbs, LevelBadge, SeatsMeter } from "@/components/site/blocks";
import { EnrollmentWizard } from "@/components/forms/enrollment-wizard";
import { Girih } from "@/components/site/girih";
import { enrollCopy } from "@/content/enroll";
import { formsCopy } from "@/content/forms";
import { commonDictionary, fill, seatsLabel } from "@/i18n/common";
import { hasLocale, href, pick, type Locale } from "@/i18n/config";
import { formatDate, formatPKR, formatTimeRange, formatWeekdays } from "@/lib/format";
import { getCourseBySlug, getOffering } from "@/server/public/queries";

async function locale(): Promise<Locale> {
  const v = await lang();
  return hasLocale(v) ? v : "en";
}

export async function generateMetadata(): Promise<Metadata> {
  return { title: enrollCopy(await locale()).metaTitle, robots: { index: false } };
}

export default function EnrollPage(props: PageProps<"/[lang]/enroll/[offeringId]">) {
  return (
    <Suspense fallback={<EnrollSkeleton />}>
      <EnrollContent params={props.params} />
    </Suspense>
  );
}

async function EnrollContent({ params }: { params: Promise<{ offeringId: string }> }) {
  const { offeringId } = await params;
  const l = await locale();
  const offering = await getOffering(offeringId);
  if (!offering) notFound();
  const detail = await getCourseBySlug(offering.course.slug);
  const course = detail?.course;
  const t = enrollCopy(l);
  const d = commonDictionary(l);
  const f = formsCopy(l);
  const title = pick(offering.course, "title", l);
  const bookable = offering.state === "open" || offering.state === "full";

  return (
    <section className="relative">
      <div className="absolute inset-x-0 top-0 h-[420px] overflow-hidden bg-forest" aria-hidden>
        <Girih className="text-white/[0.04]" size={64} />
      </div>
      <div className="container-site relative pt-10 pb-24">
        <Breadcrumbs
          tone="dark"
          items={[
            { label: d.nav.home, href: href(l) },
            { label: d.nav.courses, href: href(l, "/courses") },
            { label: offering.course.code, href: href(l, `/courses/${offering.course.slug}`) },
            { label: t.eyebrow },
          ]}
        />
        <div className="mt-6 max-w-3xl text-white">
          <p className="eyebrow text-lime">{t.eyebrow}</p>
          <h1 className="mt-3 font-display text-4xl leading-tight sm:text-6xl">{t.title}</h1>
          <p className="mt-4 text-lg text-white/70">{t.lead}</p>
        </div>

        <div className="mt-10 grid items-start gap-8 lg:grid-cols-[1fr_380px]">
          <div className="rounded-[2rem] bg-paper p-5 shadow-[0_40px_80px_-50px_rgb(16_36_28/0.6)] ring-1 ring-ink/10 sm:p-10">
            {bookable ? (
              <EnrollmentWizard
                locale={l}
                offering={{ id: offering.id, full: offering.state === "full", requiresPlacement: offering.course.requiresPlacement, title }}
                t={t}
                form={d.form}
                common={d.common}
                forms={f}
                links={{ placement: href(l, "/placement-test"), track: href(l, "/track"), privacy: href(l, "/privacy"), courses: href(l, "/courses") }}
              />
            ) : (
              <div className="grid gap-4 py-10 text-center">
                <p className="font-display text-3xl text-forest">
                  {offering.state === "opens_soon" && offering.registrationOpensAt
                    ? fill(t.unavailable.opens, { date: formatDate(offering.registrationOpensAt, l, { weekday: "long" }) })
                    : t.unavailable.closed}
                </p>
                <Link href={href(l, "/courses")} className="mx-auto inline-flex h-12 items-center rounded-full bg-forest px-6 font-semibold text-white hover:bg-pine">
                  {t.unavailable.other}
                </Link>
              </div>
            )}
          </div>

          <aside className="lg:sticky lg:top-24">
            <div className="overflow-hidden rounded-[2rem] bg-cream ring-1 ring-ink/10">
              {offering.course.imagePath && (
                <div className="relative aspect-[16/9] bg-mint">
                  <Image src={offering.course.imagePath} alt="" fill loading="eager" sizes="380px" className="object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-forest/70 to-transparent" />
                  <div className="absolute bottom-4 left-4 flex items-center gap-3">
                    <LevelBadge code={offering.course.code} level={offering.course.level} size="lg" className="shadow-lg" />
                  </div>
                </div>
              )}
              <div className="grid gap-5 p-6">
                <div>
                  <p className="eyebrow text-ash">{t.summary.title}</p>
                  <h2 className="mt-1 font-display text-2xl leading-tight text-forest">{title}</h2>
                  <p className="mt-1 font-mono text-xs text-stone">{offering.code}</p>
                </div>
                <dl className="grid gap-3 text-sm">
                  <SummaryRow icon={CalendarDays} label={t.summary.starts} value={formatDate(offering.startsOn, l, { weekday: "long" })} />
                  <SummaryRow icon={Clock} label={t.summary.schedule} value={`${formatWeekdays(offering.weekdays, l)} · ${formatTimeRange(offering.startTime, offering.endTime, l)}`} />
                  <SummaryRow icon={offering.mode === "online" ? Laptop : MapPin} label={t.summary.format} value={`${d.modes[offering.mode]}${offering.track !== "standard" ? ` · ${d.tracks[offering.track]}` : ""}`} />
                  {course && <SummaryRow icon={CircleCheck} label={t.summary.duration} value={`${course.weeks} ${d.common.weeks} · ${course.units} ${d.common.units}`} />}
                  {course?.bookTitle && <SummaryRow icon={BookOpen} label={t.summary.book} value={`${course.bookTitle}${course.bookFeePkr ? ` · ${formatPKR(course.bookFeePkr, l)}` : ""}`} />}
                </dl>
                <div className="flex items-end justify-between border-t border-dashed border-ink/15 pt-5">
                  <span className="flex items-center gap-2 text-sm text-stone">
                    <Wallet className="size-4 text-ash" /> {t.summary.fee}
                  </span>
                  <span className="font-display text-3xl text-forest tabular">{formatPKR(offering.feePkr, l)}</span>
                </div>
                {bookable && <SeatsMeter left={offering.seatsLeft} capacity={offering.capacity} label={offering.state === "full" ? d.common.full : seatsLabel(d, offering.seatsLeft)} />}
                <div className="rounded-2xl bg-mist p-4">
                  <p className="text-xs font-semibold text-pine">{t.summary.prepare}</p>
                  <ul className="mt-2 grid gap-1.5 text-sm text-ink/80">
                    {t.summary.prepareItems.map((i) => (
                      <li key={i} className="flex items-center gap-2">
                        <CircleCheck className="size-4 text-ash" /> {i}
                      </li>
                    ))}
                  </ul>
                </div>
                <p className="flex items-center gap-2 text-xs text-stone">
                  <ShieldCheck className="size-4 text-ash" /> {f.keepIt}
                </p>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}

function SummaryRow({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="mt-0.5 size-4 shrink-0 text-ash" />
      <div>
        <dt className="text-xs text-stone">{label}</dt>
        <dd className="font-medium text-ink">{value}</dd>
      </div>
    </div>
  );
}

function EnrollSkeleton() {
  return (
    <section className="relative">
      <div className="absolute inset-x-0 top-0 h-[420px] bg-forest" aria-hidden />
      <div className="container-site relative pt-10 pb-24">
        <div className="h-4 w-48 animate-pulse rounded bg-white/20" />
        <div className="mt-8 h-14 w-2/3 animate-pulse rounded-xl bg-white/15" />
        <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_380px]">
          <div className="h-[560px] animate-pulse rounded-[2rem] bg-paper" />
          <div className="h-[560px] animate-pulse rounded-[2rem] bg-cream" />
        </div>
      </div>
    </section>
  );
}
