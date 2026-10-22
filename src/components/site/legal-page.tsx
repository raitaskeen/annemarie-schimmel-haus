import type { LegalPage } from "@/content/legal";
import type { Locale } from "@/i18n/config";
import { commonDictionary } from "@/i18n/common";
import { href } from "@/i18n/config";
import { PageHero } from "./page-hero";

/** Shared layout for privacy, terms and guidelines: sticky table of contents + readable measure. */
export function LegalPageView({ page, locale }: { page: LegalPage; locale: Locale }) {
  const d = commonDictionary(locale);
  const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9äöüß]+/g, "-");
  return (
    <>
      <PageHero breadcrumbs={[{ label: d.nav.home, href: href(locale) }, { label: page.title }]} title={page.title} lead={page.lead} />
      <section className="py-14 lg:py-20">
        <div className="container-site grid gap-10 lg:grid-cols-[260px_1fr]">
          <nav aria-label={page.title} className="lg:sticky lg:top-28 lg:self-start">
            <p className="eyebrow text-stone">{page.updated}</p>
            <ol className="mt-4 grid gap-1 border-l border-ink/10 text-sm">
              {page.sections.map((s) => (
                <li key={s.heading}>
                  <a href={`#${slug(s.heading)}`} className="-ml-px block border-l-2 border-transparent py-1.5 pl-4 text-stone hover:border-ash hover:text-forest">
                    {s.heading}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
          <div className="prose-ash max-w-3xl">
            {page.sections.map((s) => (
              <section key={s.heading} id={slug(s.heading)} className="scroll-mt-28">
                <h2>{s.heading}</h2>
                {s.body.map((p) => (
                  <p key={p.slice(0, 32)}>{p}</p>
                ))}
              </section>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
