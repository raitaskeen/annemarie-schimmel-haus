import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { lang } from "next/root-params";
import { ArrowRight, Pin } from "lucide-react";
import { Stagger, StaggerItem } from "@/components/motion";
import { Girih } from "@/components/site/girih";
import { PageHero } from "@/components/site/page-hero";
import { commonDictionary } from "@/i18n/common";
import { hasLocale, href, pick, type Locale } from "@/i18n/config";
import { formatDate } from "@/lib/format";
import { getPosts } from "@/server/public/queries";

async function locale(): Promise<Locale> {
  const v = await lang();
  return hasLocale(v) ? v : "en";
}

const COPY = {
  en: { meta: "News & updates", title: "News from the Haus.", lead: "Announcements, scholarships, job openings and updates on exams — straight from Annemarie-Schimmel-Haus.", empty: "No news yet." },
  de: { meta: "Aktuelles", title: "Neues aus dem Haus.", lead: "Ankündigungen, Stipendien, Stellenangebote und Neuigkeiten zu Prüfungen — direkt aus dem Annemarie-Schimmel-Haus.", empty: "Noch keine Neuigkeiten." },
};

export async function generateMetadata(): Promise<Metadata> {
  const l = await locale();
  return { title: COPY[l].meta, description: COPY[l].lead, alternates: { canonical: `/${l}/news` } };
}

export default async function NewsPage() {
  const l = await locale();
  const d = commonDictionary(l);
  const posts = await getPosts(60);
  return (
    <>
      <PageHero breadcrumbs={[{ label: d.nav.home, href: href(l) }, { label: d.nav.news }]} eyebrow={d.nav.news} title={COPY[l].title} lead={COPY[l].lead} />
      <section className="py-14 lg:py-20">
        <div className="container-site">
          {posts.length ? (
            <Stagger className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {posts.map((p) => (
                <StaggerItem key={p.id}>
                  <Link
                    href={href(l, `/news/${p.slug}`)}
                    className="group flex h-full flex-col overflow-hidden rounded-3xl bg-cream ring-1 ring-ink/10 transition-all hover:-translate-y-1 hover:shadow-[0_30px_60px_-35px_rgb(16_36_28/0.5)]"
                  >
                    <div className="relative aspect-[16/10] overflow-hidden bg-mint">
                      {p.imagePath ? (
                        <Image src={p.imagePath} alt="" fill sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw" className="object-cover transition-transform duration-700 group-hover:scale-105" />
                      ) : (
                        <div className="absolute inset-0 bg-forest text-white/10">
                          <Girih size={44} />
                        </div>
                      )}
                      <span className="absolute top-4 left-4 flex gap-2">
                        <span className="rounded-full bg-cream/95 px-3 py-1 text-xs font-semibold text-pine">{d.postCategories[p.category]}</span>
                        {p.pinned && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-lime px-2.5 py-1 text-xs font-semibold text-forest">
                            <Pin className="size-3" />
                          </span>
                        )}
                      </span>
                    </div>
                    <div className="flex flex-1 flex-col p-6">
                      <time className="text-xs font-medium text-stone">{p.publishedAt ? formatDate(p.publishedAt, l) : ""}</time>
                      <h2 className="mt-2 font-display text-xl leading-snug text-forest">{pick(p, "title", l)}</h2>
                      <p className="mt-2 line-clamp-3 text-sm text-stone">{pick(p, "excerpt", l)}</p>
                      <span className="mt-auto inline-flex items-center gap-1.5 pt-5 text-sm font-semibold text-pine">
                        {d.common.readMore} <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                      </span>
                    </div>
                  </Link>
                </StaggerItem>
              ))}
            </Stagger>
          ) : (
            <p className="rounded-3xl bg-cream p-10 text-center text-stone">{COPY[l].empty}</p>
          )}
        </div>
      </section>
    </>
  );
}
