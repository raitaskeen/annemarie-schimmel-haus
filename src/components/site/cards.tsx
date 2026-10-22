import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, CalendarDays, Clock, Laptop, MapPin, Users } from "lucide-react";
import { commonDictionary, seatsLabel } from "@/i18n/common";
import { href, pick, type Locale } from "@/i18n/config";
import { dateParts, formatClock, formatDate, formatPKR, formatTimeRange, formatWeekdays } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { EventCard as EventCardData, OfferingCard as OfferingData } from "@/server/public/queries";
import { DateBadge, LevelBadge, SeatsMeter } from "./blocks";

export function offeringCta(o: OfferingData, locale: Locale) {
  const d = commonDictionary(locale);
  if (o.state === "open") return { label: d.nav.enroll, href: href(locale, `/enroll/${o.id}`), disabled: false };
  if (o.state === "full") return { label: d.common.waitlist, href: href(locale, `/enroll/${o.id}`), disabled: false };
  if (o.state === "opens_soon" && o.registrationOpensAt)
    return { label: `${d.common.registrationOpens} ${formatDate(o.registrationOpensAt, locale, { month: "short", year: undefined })}`, href: href(locale, `/courses/${o.course.slug}`), disabled: true };
  return { label: d.common.registrationClosed, href: href(locale, `/courses/${o.course.slug}`), disabled: true };
}

/** A course batch with dates, schedule, seats and the primary enrol action. */
export function OfferingCard({ o, locale, className }: { o: OfferingData; locale: Locale; className?: string }) {
  const d = commonDictionary(locale);
  const parts = dateParts(o.startsOn, locale);
  const cta = offeringCta(o, locale);
  const title = pick(o.course, "title", locale);
  const [main, sub] = title.split("·").map((s) => s.trim());
  return (
    <article
      className={cn(
        "group relative flex h-full flex-col overflow-hidden rounded-3xl bg-cream ring-1 ring-ink/10 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_30px_60px_-35px_rgb(16_36_28/0.55)] hover:ring-ash/40",
        className,
      )}
    >
      <div className="flex items-start gap-4 p-5 pb-4">
        <DateBadge day={parts.day} month={parts.month} weekday={parts.weekday} tone={o.state === "open" ? "dark" : "light"} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <LevelBadge code={o.course.code} level={o.course.level} size="sm" />
            <span className="inline-flex items-center gap-1 rounded-full bg-mist px-2.5 py-1 text-[11px] font-semibold text-pine">
              {o.mode === "online" ? <Laptop className="size-3" /> : <MapPin className="size-3" />}
              {d.modes[o.mode]}
            </span>
            {o.track !== "standard" && <span className="rounded-full bg-lime-soft px-2.5 py-1 text-[11px] font-semibold text-[#2d5016]">{d.tracks[o.track]}</span>}
          </div>
          <h3 className="mt-2.5 font-display text-xl leading-tight text-forest">
            <Link href={href(locale, `/courses/${o.course.slug}`)} className="after:absolute after:inset-0 focus-visible:outline-none">
              {main}
            </Link>
          </h3>
          {sub && <p className="text-sm text-stone">{sub}</p>}
        </div>
      </div>
      <dl className="mx-5 grid gap-2 border-t border-dashed border-ink/15 pt-4 text-sm">
        <div className="flex items-center gap-2 text-ink/80">
          <CalendarDays className="size-4 text-ash" />
          <dt className="sr-only">{d.common.starts}</dt>
          <dd>{formatDate(o.startsOn, locale, { weekday: "short" })}</dd>
        </div>
        <div className="flex items-center gap-2 text-ink/80">
          <Clock className="size-4 text-ash" />
          <dt className="sr-only">{d.common.schedule}</dt>
          <dd>
            {formatWeekdays(o.weekdays, locale)} · {formatTimeRange(o.startTime, o.endTime, locale)}
          </dd>
        </div>
      </dl>
      <div className="mt-auto grid gap-4 p-5 pt-5">
        {o.state === "open" || o.state === "full" ? (
          <SeatsMeter left={o.seatsLeft} capacity={o.capacity} label={o.state === "full" ? d.common.full : seatsLabel(d, o.seatsLeft)} />
        ) : null}
        <div className="flex items-center justify-between gap-3">
          <p className="font-display text-2xl text-forest tabular">
            {formatPKR(o.feePkr, locale)}
            <span className="block font-sans text-[11px] font-medium tracking-wide text-stone uppercase">{d.common.perCourse}</span>
          </p>
          <Link
            href={cta.href}
            aria-disabled={cta.disabled || undefined}
            className={cn(
              "relative z-10 inline-flex h-11 items-center gap-1.5 rounded-full px-5 text-sm font-semibold transition-all",
              cta.disabled ? "bg-ink/5 text-stone" : o.state === "full" ? "bg-sand text-forest hover:bg-forest hover:text-white" : "bg-forest text-white hover:bg-pine",
            )}
          >
            {cta.label}
            {!cta.disabled && <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />}
          </Link>
        </div>
      </div>
    </article>
  );
}

/** Event card in three sizes: feature (large), card (grid) and row (compact list). */
export function EventCard({ e, locale, variant = "card", className }: { e: EventCardData; locale: Locale; variant?: "feature" | "card" | "row"; className?: string }) {
  const d = commonDictionary(locale);
  const parts = dateParts(e.startsAt, locale);
  const title = pick(e, "title", locale);
  const summary = pick(e, "summary", locale);
  const time = `${formatClock(e.startsAt, locale)}${e.endsAt ? `${locale === "de" ? " bis " : " to "}${formatClock(e.endsAt, locale)}` : ""}${locale === "de" ? " Uhr" : ""}`;
  const url = href(locale, `/events/${e.slug}`);
  const status =
    e.cancelled
      ? { label: locale === "de" ? "Abgesagt" : "Cancelled", tone: "bg-[#fde3df] text-[#8a1c12]" }
      : e.state === "full"
        ? { label: d.common.full, tone: "bg-sand text-forest" }
        : e.state === "open" && e.seatsLeft !== null && e.seatsLeft <= 15
          ? { label: d.common.fewSeats, tone: "bg-[#fdebd0] text-[#7a4a00]" }
          : e.state === "no_registration"
            ? { label: d.common.free, tone: "bg-mist text-pine" }
            : null;

  if (variant === "row") {
    return (
      <article className={cn("group relative flex items-center gap-4 rounded-2xl p-3 transition-colors hover:bg-cream", className)}>
        <DateBadge day={parts.day} month={parts.month} weekday={parts.weekday} />
        <div className="min-w-0 flex-1">
          <p className="eyebrow text-ash">{d.eventCategories[e.category]}</p>
          <h3 className="mt-1 line-clamp-3 font-display text-lg leading-snug text-forest">
            <Link href={url} className="after:absolute after:inset-0">
              {title}
            </Link>
          </h3>
          <p className="text-xs text-stone">
            {time} · {e.venue}
          </p>
        </div>
        <ArrowUpRight className="size-5 shrink-0 text-ash opacity-0 transition-all group-hover:opacity-100" />
      </article>
    );
  }

  const feature = variant === "feature";
  return (
    <article
      className={cn(
        "group relative flex h-full flex-col overflow-hidden rounded-3xl bg-cream ring-1 ring-ink/10 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_30px_60px_-35px_rgb(16_36_28/0.55)]",
        feature && "lg:grid lg:grid-cols-[1.25fr_1fr]",
        className,
      )}
    >
      <div className={cn("relative overflow-hidden bg-mint", feature ? "aspect-[4/3] lg:aspect-auto lg:min-h-[460px]" : "aspect-[16/10]")}>
        {e.imagePath && (
          <Image
            src={e.imagePath}
            alt={e.imageAlt ?? ""}
            fill
            sizes={feature ? "(min-width: 1024px) 45vw, 100vw" : "(min-width: 1024px) 30vw, (min-width: 640px) 50vw, 100vw"}
            className="object-cover transition-transform duration-700 group-hover:scale-105"
          />
        )}
        <div className="absolute top-4 left-4 flex gap-2">
          <DateBadge day={parts.day} month={parts.month} weekday={parts.weekday} tone="lime" className="shadow-lg" />
        </div>
        {status && <span className={cn("absolute top-4 right-4 rounded-full px-3 py-1 text-xs font-semibold shadow", status.tone)}>{status.label}</span>}
      </div>
      <div className={cn("flex flex-1 flex-col p-6", feature && "lg:p-10")}>
        <p className="eyebrow text-ash">{d.eventCategories[e.category]}</p>
        <h3 className={cn("mt-2 font-display leading-tight text-forest", feature ? "text-3xl sm:text-4xl" : "text-2xl")}>
          <Link href={url} className="after:absolute after:inset-0 focus-visible:outline-none">
            {title}
          </Link>
        </h3>
        <p className={cn("mt-3 text-stone", feature ? "text-base leading-relaxed" : "line-clamp-2 text-sm")}>{summary}</p>
        <div className="mt-auto grid gap-2 pt-6 text-sm text-ink/80">
          <span className="flex items-center gap-2">
            <CalendarDays className="size-4 text-ash" /> {formatDate(e.startsAt, locale, { weekday: "long" })}
          </span>
          <span className="flex items-center gap-2">
            <Clock className="size-4 text-ash" /> {time}
          </span>
          <span className="flex items-center gap-2">
            <MapPin className="size-4 text-ash" /> {e.venue}
          </span>
          {e.seatsLeft !== null && e.state === "open" && (
            <span className="flex items-center gap-2">
              <Users className="size-4 text-ash" /> {seatsLabel(d, e.seatsLeft)}
            </span>
          )}
        </div>
        {feature && (
          <span className="mt-8 inline-flex h-12 w-fit items-center gap-2 rounded-full bg-forest px-6 text-sm font-semibold text-white transition-colors group-hover:bg-pine">
            {e.state === "open" ? (locale === "de" ? "Jetzt kostenlos anmelden" : "Register for free") : d.common.details}
            <ArrowRight className="size-4" />
          </span>
        )}
      </div>
    </article>
  );
}
