import type { Metadata } from "next";
import { lang } from "next/root-params";
import { Reveal, Stagger, StaggerItem } from "@/components/motion";
import { SectionHeading } from "@/components/site/blocks";
import { EventCard } from "@/components/site/cards";
import { OfferingExplorer } from "@/components/site/offering-explorer";
import { PageHero } from "@/components/site/page-hero";
import { eventsCopy } from "@/content/events";
import { commonDictionary } from "@/i18n/common";
import { hasLocale, href, type Locale } from "@/i18n/config";
import { getPastEvents, getUpcomingEvents } from "@/server/public/queries";

async function locale(): Promise<Locale> {
  const v = await lang();
  return hasLocale(v) ? v : "en";
}

export async function generateMetadata(): Promise<Metadata> {
  const l = await locale();
  const t = eventsCopy(l);
  return { title: t.metaTitle, description: t.metaDescription, alternates: { canonical: `/${l}/events`, languages: { en: "/en/events", de: "/de/events" } } };
}

export default async function EventsPage() {
  const l = await locale();
  const t = eventsCopy(l);
  const d = commonDictionary(l);
  const [upcoming, past] = await Promise.all([getUpcomingEvents(), getPastEvents(12)]);
  const [featured, ...rest] = upcoming;
  const categories = [...new Set(rest.map((e) => e.category))];

  return (
    <>
      <PageHero
        breadcrumbs={[{ label: d.nav.home, href: href(l) }, { label: d.nav.events }]}
        eyebrow={t.eyebrow}
        title={t.title}
        lead={t.lead}
        image={{ src: "/images/gallery/ash-fb-0024.webp", alt: l === "de" ? "Live-Musikabend im ASH" : "Live musical evening at ASH", width: 1024, height: 1024 }}
      />

      <section className="py-20 lg:py-28">
        <div className="container-site grid gap-12">
          <Reveal>
            <SectionHeading eyebrow={t.upcoming} title={t.upcoming === "Upcoming" ? "Coming up at the Haus" : "Demnächst im Haus"} />
          </Reveal>
          {featured ? (
            <>
              <Reveal>
                <EventCard e={featured} locale={l} variant="feature" />
              </Reveal>
              {rest.length > 0 && (
                <OfferingExplorer
                  allLabel={d.common.all}
                  emptyLabel={d.common.noResults}
                  filters={categories.map((c) => ({ value: c, label: d.eventCategories[c] }))}
                  items={rest.map((e) => ({ key: e.id, tags: [e.category], node: <EventCard e={e} locale={l} /> }))}
                />
              )}
            </>
          ) : (
            <p className="rounded-3xl bg-cream p-10 text-center text-stone ring-1 ring-ink/10">{t.none}</p>
          )}
        </div>
      </section>

      {past.length > 0 && (
        <section className="bg-mist py-20 lg:py-28">
          <div className="container-site grid gap-12">
            <Reveal>
              <SectionHeading eyebrow={d.common.past} title={t.past} lead={t.pastLead} />
            </Reveal>
            <Stagger className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {past.map((e) => (
                <StaggerItem key={e.id}>
                  <EventCard e={e} locale={l} className="opacity-90 saturate-[0.85] hover:opacity-100 hover:saturate-100" />
                </StaggerItem>
              ))}
            </Stagger>
          </div>
        </section>
      )}
    </>
  );
}
