import Image from "next/image";
import type { Metadata } from "next";
import { lang } from "next/root-params";
import { ArrowUpRight } from "lucide-react";
import { Stagger, StaggerItem } from "@/components/motion";
import { PageHero } from "@/components/site/page-hero";
import { commonDictionary } from "@/i18n/common";
import { hasLocale, href, pick, type Locale } from "@/i18n/config";
import { getPartners } from "@/server/public/queries";

async function locale(): Promise<Locale> {
  const v = await lang();
  return hasLocale(v) ? v : "en";
}

const COPY = {
  en: { meta: "Partners", title: "Connections that open conversations.", lead: "Our work is made possible by institutions in Germany and Pakistan that share our belief in language, education and cultural exchange." },
  de: { meta: "Partner", title: "Verbindungen, die Gespräche eröffnen.", lead: "Unsere Arbeit ermöglichen Institutionen in Deutschland und Pakistan, die unsere Überzeugung von Sprache, Bildung und kulturellem Austausch teilen." },
};

export async function generateMetadata(): Promise<Metadata> {
  const l = await locale();
  return { title: COPY[l].meta, description: COPY[l].lead, alternates: { canonical: `/${l}/partners` } };
}

export default async function PartnersPage() {
  const l = await locale();
  const d = commonDictionary(l);
  const partners = await getPartners();
  return (
    <>
      <PageHero breadcrumbs={[{ label: d.nav.home, href: href(l) }, { label: d.nav.partners }]} eyebrow={d.nav.partners} title={COPY[l].title} lead={COPY[l].lead} />
      <section className="py-16 lg:py-24">
        <div className="container-site">
          <Stagger className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {partners.map((p) => (
              <StaggerItem key={p.id}>
                <a
                  href={p.url ?? undefined}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex h-full flex-col rounded-3xl bg-cream p-7 ring-1 ring-ink/10 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_30px_60px_-35px_rgb(16_36_28/0.5)] hover:ring-ash/40"
                >
                  <div className="grid h-24 place-items-center rounded-2xl bg-white p-4">
                    <Image src={p.logoPath} alt={p.name} width={p.logoWidth} height={p.logoHeight} sizes="240px" className="logo-adapt-soft max-h-16 w-auto object-contain" style={{ width: "auto", height: "auto" }} />
                  </div>
                  <p className="eyebrow mt-6 text-ash">{pick(p, "category", l)}</p>
                  <p className="mt-2 font-display text-2xl text-forest">{p.name}</p>
                  <p className="mt-2 text-sm leading-relaxed text-stone">{pick(p, "description", l)}</p>
                  {p.url && (
                    <span className="mt-auto inline-flex items-center gap-1.5 pt-6 text-sm font-semibold text-pine">
                      {new URL(p.url).hostname.replace(/^www\./, "")} <ArrowUpRight className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                    </span>
                  )}
                </a>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>
    </>
  );
}
