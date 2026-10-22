import Image from "next/image";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { lang } from "next/root-params";
import { Suspense } from "react";
import { AlertTriangle, CalendarDays, Clock, ExternalLink, Handshake, MapPin, Ticket, Users } from "lucide-react";
import { EventRegistrationForm } from "@/components/forms/event-registration-form";
import { Breadcrumbs, DateBadge } from "@/components/site/blocks";
import { Girih } from "@/components/site/girih";
import { Markdown } from "@/components/site/markdown";
import { eventsCopy } from "@/content/events";
import { formsCopy } from "@/content/forms";
import { commonDictionary, seatsLabel } from "@/i18n/common";
import { hasLocale, href, pick, type Locale } from "@/i18n/config";
import { dateParts, formatClock, formatDate, formatPKR } from "@/lib/format";
import { getEventBySlug, getEventSlugs, getSettings } from "@/server/public/queries";

async function locale(): Promise<Locale> {
  const v = await lang();
  return hasLocale(v) ? v : "en";
}

export async function generateStaticParams() {
  return (await getEventSlugs()).map((slug) => ({ slug }));
}

export async function generateMetadata(props: PageProps<"/[lang]/events/[slug]">): Promise<Metadata> {
  const [{ slug }, l] = await Promise.all([props.params, locale()]);
  const e = await getEventBySlug(slug);
  if (!e) return {};
  return {
    title: pick(e, "title", l),
    description: pick(e, "summary", l),
    alternates: { canonical: `/${l}/events/${slug}`, languages: { en: `/en/events/${slug}`, de: `/de/events/${slug}` } },
    openGraph: e.imagePath ? { images: [{ url: e.imagePath }] } : undefined,
  };
}

export default function EventPage(props: PageProps<"/[lang]/events/[slug]">) {
  return (
    <Suspense fallback={<div className="container-site h-[70dvh] animate-pulse py-20" />}>
      <EventContent params={props.params} />
    </Suspense>
  );
}

async function EventContent({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const l = await locale();
  const [e, settings] = await Promise.all([getEventBySlug(slug), getSettings()]);
  if (!e) notFound();
  const t = eventsCopy(l);
  const d = commonDictionary(l);
  const title = pick(e, "title", l);
  const parts = dateParts(e.startsAt, l);
  const time = `${formatClock(e.startsAt, l)}${e.endsAt ? `${l === "de" ? " bis " : " to "}${formatClock(e.endsAt, l)}` : ""}${l === "de" ? " Uhr" : ""}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: title,
    description: pick(e, "summary", l),
    startDate: e.startsAt.toISOString(),
    endDate: e.endsAt?.toISOString(),
    eventStatus: e.cancelled ? "https://schema.org/EventCancelled" : "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    location: { "@type": "Place", name: e.venue, address: e.address },
    image: e.imagePath ? [e.imagePath] : undefined,
    organizer: { "@type": "Organization", name: "Annemarie-Schimmel-Haus", url: "https://schimmel.com.pk" },
    isAccessibleForFree: e.isFree,
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <section className="relative overflow-hidden bg-forest text-white">
        {e.imagePath && <Image src={e.imagePath} alt="" fill priority sizes="100vw" className="object-cover opacity-25 blur-sm" />}
        <div className="absolute inset-0 bg-gradient-to-b from-forest/70 via-forest/90 to-forest" />
        <Girih className="text-white/[0.04]" size={64} />
        <div className="container-site relative grid items-end gap-10 py-12 lg:grid-cols-[1.2fr_0.8fr] lg:py-20">
          <div>
            <Breadcrumbs tone="dark" items={[{ label: d.nav.home, href: href(l) }, { label: d.nav.events, href: href(l, "/events") }, { label: title }]} />
            <div className="mt-8 flex items-center gap-4">
              <DateBadge {...parts} tone="lime" />
              <span className="eyebrow text-lime">{d.eventCategories[e.category]}</span>
            </div>
            <h1 className="mt-5 font-display text-4xl leading-[1.05] sm:text-6xl">{title}</h1>
            <p className="mt-5 max-w-2xl text-lg leading-relaxed text-white/75">{pick(e, "summary", l)}</p>
            {e.collaborators.length > 0 && (
              <p className="mt-6 flex flex-wrap items-center gap-2 text-sm text-white/70">
                <Handshake className="size-4 text-lime" /> {t.inCollaboration}: <span className="font-semibold text-white">{e.collaborators.join(" · ")}</span>
              </p>
            )}
          </div>
          {e.imagePath && (
            <div className="relative mx-auto aspect-[4/5] w-full max-w-sm overflow-hidden rounded-3xl bg-forest-2 shadow-2xl ring-1 ring-white/10">
              <Image src={e.imagePath} alt={e.imageAlt ?? ""} fill sizes="(min-width: 1024px) 30vw, 90vw" className="object-cover" />
            </div>
          )}
        </div>
      </section>

      <section className="py-14 lg:py-20">
        <div className="container-site grid items-start gap-10 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="grid gap-10">
            <dl className="grid gap-3 sm:grid-cols-2">
              {[
                { icon: CalendarDays, label: t.when, value: formatDate(e.startsAt, l, { weekday: "long" }) },
                { icon: Clock, label: d.common.time, value: time },
                { icon: MapPin, label: t.where, value: `${e.venue}, ${e.address}` },
                { icon: Ticket, label: t.admission, value: e.isFree ? d.common.free : e.feePkr ? formatPKR(e.feePkr, l) : "·" },
                ...(e.seatsLeft !== null && e.state === "open" ? [{ icon: Users, label: t.seats, value: seatsLabel(d, e.seatsLeft) }] : []),
              ].map((f) => (
                <div key={f.label} className="flex gap-3 rounded-2xl bg-cream p-4 ring-1 ring-ink/10">
                  <f.icon className="mt-0.5 size-5 shrink-0 text-ash" />
                  <div>
                    <dt className="text-xs text-stone">{f.label}</dt>
                    <dd className="font-semibold text-forest">{f.value}</dd>
                  </div>
                </div>
              ))}
            </dl>

            {pick(e, "body", l) && <Markdown>{pick(e, "body", l)}</Markdown>}

            {e.agenda.length > 0 && (
              <div>
                <h2 className="font-display text-3xl text-forest">{t.programme}</h2>
                <ol className="mt-6 grid gap-0 border-l-2 border-mint pl-6">
                  {e.agenda.map((a, i) => (
                    <li key={i} className="relative pb-6 last:pb-0">
                      <span className="absolute top-1.5 -left-[31px] size-3 rounded-full bg-ash ring-4 ring-paper" aria-hidden />
                      <p className="font-mono text-sm font-semibold text-ash">{a.time}</p>
                      <p className="mt-0.5 font-medium text-forest">{l === "de" && a.titleDe ? a.titleDe : a.titleEn}</p>
                      {a.location && <p className="text-xs text-stone">{a.location}</p>}
                    </li>
                  ))}
                </ol>
              </div>
            )}

            <a
              href={settings.contact.mapUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex w-fit items-center gap-2 text-sm font-semibold text-pine underline-offset-4 hover:underline"
            >
              <MapPin className="size-4" /> {t.directions}
            </a>
          </div>

          <aside className="lg:sticky lg:top-24">
            <div className="rounded-[2rem] bg-paper p-6 shadow-[0_30px_60px_-40px_rgb(16_36_28/0.6)] ring-1 ring-ink/10 sm:p-8">
              {e.cancelled ? (
                <Notice tone="alert" text={t.cancelled} />
              ) : e.state === "past" ? (
                <Notice text={t.pastEvent} />
              ) : e.state === "no_registration" ? (
                <Notice text={t.noRegistration} />
              ) : e.state === "external" && e.externalUrl ? (
                <a href={e.externalUrl} target="_blank" rel="noopener noreferrer" className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-full bg-forest font-semibold text-white hover:bg-pine">
                  {t.external} <ExternalLink className="size-4" />
                </a>
              ) : e.state === "closed" ? (
                <Notice text={t.closed} />
              ) : (
                <>
                  <h2 className="font-display text-3xl text-forest">{e.state === "full" ? t.waitlist : t.registerTitle}</h2>
                  <p className="mt-1 mb-6 text-sm text-stone">{e.state === "full" ? t.fullNote : t.registerLead}</p>
                  <EventRegistrationForm
                    locale={l}
                    event={{ id: e.id, requiresCnic: e.requiresCnic, maxGuests: e.maxGuests, full: e.state === "full" }}
                    form={d.form}
                    common={d.common}
                    forms={formsCopy(l)}
                    links={{ track: href(l, "/track"), privacy: href(l, "/privacy"), events: href(l, "/events") }}
                    labels={{ submit: t.register, waitlist: t.waitlist, cnicNote: t.cnicNote }}
                  />
                </>
              )}
            </div>
          </aside>
        </div>
      </section>
    </>
  );
}

function Notice({ text, tone }: { text: string; tone?: "alert" }) {
  return (
    <p className={`flex items-start gap-3 rounded-2xl p-5 text-sm font-medium ${tone === "alert" ? "bg-[#fdecea] text-[#8a1c12]" : "bg-mist text-pine"}`}>
      <AlertTriangle className="mt-0.5 size-4 shrink-0" /> {text}
    </p>
  );
}
