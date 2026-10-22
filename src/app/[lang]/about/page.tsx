import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { lang } from "next/root-params";
import { ArrowRight, BookOpen, Globe, Languages, Piano } from "lucide-react";
import { Reveal, Stagger, StaggerItem } from "@/components/motion";
import { SectionHeading } from "@/components/site/blocks";
import { Girih, Star8 } from "@/components/site/girih";
import { PageHero } from "@/components/site/page-hero";
import { PartnersMarquee } from "@/components/site/partners-marquee";
import { commonDictionary } from "@/i18n/common";
import { hasLocale, href, type Locale } from "@/i18n/config";

async function locale(): Promise<Locale> {
  const v = await lang();
  return hasLocale(v) ? v : "en";
}

const COPY = {
  en: {
    meta: "About Annemarie-Schimmel-Haus",
    metaDescription: "The German cultural centre in Lahore since 2003, named after the scholar Annemarie Schimmel, a home for German language and German-Pakistani dialogue.",
    eyebrow: "About us",
    title: "A house for language and dialogue.",
    lead: "Since 2003, Annemarie-Schimmel-Haus has been Lahore's German cultural centre, a place where people learn German, meet each other and discover new perspectives.",
    storyEyebrow: "Our story",
    storyTitle: "Founded in Lahore, connected with Germany.",
    story: [
      "Annemarie-Schimmel-Haus (ASH) was set up in 2003 by its director, Naurin Ahmad-Zaki, who is also a permanent member of the Pak-German Society Lahore.",
      "As a cooperation partner of the Goethe-Institut, ASH teaches German from A1 to C1 and prepares learners for the Goethe-Zertifikat. We work closely with the German Embassy in Islamabad, the German Consulate in Karachi, the DAAD and our neighbours on Scotch Corner, the Alliance Française de Lahore.",
    ],
    legacyEyebrow: "The name",
    legacyTitle: "Annemarie Schimmel (1922 to 2003)",
    legacy:
      "Annemarie Schimmel was a German scholar of Islamic culture, mysticism and poetry. Her translations and studies of Jalaluddin Rumi and Muhammad Iqbal opened these worlds to German readers, and her lifelong affection for Pakistan made her a bridge between our two countries. The Haus carries her name as a promise: curiosity, respect and conversation across cultures.",
    pillarsTitle: "What we do",
    pillars: [
      { title: "Language", text: "German courses from A1 to C1, on campus and online, placement tests and preparation for Goethe-Institut exams." },
      { title: "Culture", text: "Concerts, film evenings, readings, exhibitions and festivals that bring German and Pakistani artists together." },
      { title: "Exchange", text: "Guidance on studying and working in Germany, Open Days with our partners and school networks such as PASCH." },
      { title: "Literature", text: "Writing workshops and readings with visiting authors, at the Haus and with partner universities in Lahore." },
    ],
    campusEyebrow: "Our campus",
    campusTitle: "Classrooms with a story.",
    campusLead: "Our classrooms carry the names of personalities who shaped European culture, from Johannes Gutenberg and Beethoven to Marlene Dietrich and Fatih Akin. Between them: a garden for breaks, conversation practice and summer events.",
    visit: "Plan your visit",
    partners: "Our partners",
    courses: "Explore our courses",
  },
  de: {
    meta: "Über das Annemarie-Schimmel-Haus",
    metaDescription: "Das deutsche Kulturzentrum in Lahore seit 2003, benannt nach der Gelehrten Annemarie Schimmel, ein Zuhause für die deutsche Sprache und den deutsch-pakistanischen Dialog.",
    eyebrow: "Über uns",
    title: "Ein Haus für Sprache und Dialog.",
    lead: "Seit 2003 ist das Annemarie-Schimmel-Haus das deutsche Kulturzentrum in Lahore, ein Ort, an dem Menschen Deutsch lernen, sich begegnen und neue Perspektiven entdecken.",
    storyEyebrow: "Unsere Geschichte",
    storyTitle: "Gegründet in Lahore, verbunden mit Deutschland.",
    story: [
      "Das Annemarie-Schimmel-Haus (ASH) wurde 2003 von seiner Direktorin Naurin Ahmad-Zaki gegründet, die zugleich ständiges Mitglied der Pak-German Society Lahore ist.",
      "Als Kooperationspartner des Goethe-Instituts unterrichtet ASH Deutsch von A1 bis C1 und bereitet auf das Goethe-Zertifikat vor. Wir arbeiten eng mit der Deutschen Botschaft in Islamabad, dem Deutschen Generalkonsulat in Karachi, dem DAAD und unseren Nachbarn am Scotch Corner, der Alliance Française de Lahore, zusammen.",
    ],
    legacyEyebrow: "Der Name",
    legacyTitle: "Annemarie Schimmel (1922 bis 2003)",
    legacy:
      "Annemarie Schimmel war eine deutsche Islamwissenschaftlerin, die sich der Kultur, Mystik und Dichtung der islamischen Welt widmete. Ihre Übersetzungen und Studien zu Dschalāl ad-Dīn Rūmī und Muhammad Iqbal öffneten diese Welten für deutsche Leserinnen und Leser, und ihre lebenslange Verbundenheit mit Pakistan machte sie zu einer Brücke zwischen unseren Ländern. Das Haus trägt ihren Namen als Versprechen: Neugier, Respekt und Gespräch über Kulturen hinweg.",
    pillarsTitle: "Was wir tun",
    pillars: [
      { title: "Sprache", text: "Deutschkurse von A1 bis C1, vor Ort und online, Einstufungstests und Vorbereitung auf Goethe-Prüfungen." },
      { title: "Kultur", text: "Konzerte, Filmabende, Lesungen, Ausstellungen und Festivals mit deutschen und pakistanischen Künstlerinnen und Künstlern." },
      { title: "Austausch", text: "Beratung zu Studium und Arbeit in Deutschland, Open Days mit unseren Partnern und Schulnetzwerke wie PASCH." },
      { title: "Literatur", text: "Schreibwerkstätten und Lesungen mit Gastautoren, im Haus und mit Partneruniversitäten in Lahore." },
    ],
    campusEyebrow: "Unser Campus",
    campusTitle: "Klassenräume mit Geschichte.",
    campusLead: "Unsere Klassenräume tragen die Namen von Persönlichkeiten, die die europäische Kultur geprägt haben, von Johannes Gutenberg und Beethoven bis Marlene Dietrich und Fatih Akin. Dazwischen: ein Garten für Pausen, Gesprächsübungen und Sommerveranstaltungen.",
    visit: "Besuch planen",
    partners: "Unsere Partner",
    courses: "Kurse entdecken",
  },
};

const ROOMS = [
  "ash-campus-learning-space-03.webp",
  "ash-campus-learning-space-05.webp",
  "ash-campus-learning-space-08.webp",
  "ash-campus-learning-space-07.webp",
  "ash-fb-0158.webp",
  "ash-fb-0153.webp",
];

export async function generateMetadata(): Promise<Metadata> {
  const l = await locale();
  return { title: COPY[l].meta, description: COPY[l].metaDescription, alternates: { canonical: `/${l}/about` } };
}

export default async function AboutPage() {
  const l = await locale();
  const t = COPY[l];
  const d = commonDictionary(l);
  const icons = [Languages, Piano, Globe, BookOpen];

  return (
    <>
      <PageHero
        breadcrumbs={[{ label: d.nav.home, href: href(l) }, { label: d.nav.about }]}
        eyebrow={t.eyebrow}
        title={t.title}
        lead={t.lead}
        image={{ src: "/images/gallery/ash-dslr-1358.webp", alt: l === "de" ? "Gebäude und Garten des ASH" : "The building and garden at ASH", width: 1536, height: 887 }}
      />

      <section className="py-20 lg:py-28">
        <div className="container-site grid items-center gap-12 lg:grid-cols-2">
          <Reveal>
            <SectionHeading eyebrow={t.storyEyebrow} title={t.storyTitle} />
            {t.story.map((p) => (
              <p key={p.slice(0, 20)} className="mt-5 text-lg leading-relaxed text-stone">
                {p}
              </p>
            ))}
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href={href(l, "/courses")} className="inline-flex h-12 items-center gap-2 rounded-full bg-forest px-6 font-semibold text-white hover:bg-pine">
                {t.courses} <ArrowRight className="size-4" />
              </Link>
              <Link href={href(l, "/partners")} className="inline-flex h-12 items-center rounded-full px-6 font-semibold text-forest ring-1 ring-ink/15 hover:bg-cream">
                {t.partners}
              </Link>
            </div>
          </Reveal>
          <Reveal delay={0.1} className="relative grid grid-cols-2 gap-4">
            <div className="arch-sm relative aspect-[3/4] overflow-hidden bg-mint">
              <Image src="/images/gallery/ash-dslr-1171.webp" alt="" fill sizes="(min-width: 1024px) 25vw, 45vw" className="object-cover" />
            </div>
            <div className="mt-12 grid gap-4">
              <div className="relative aspect-square overflow-hidden rounded-3xl bg-mint">
                <Image src="/images/gallery/ash-fb-0070.webp" alt="" fill sizes="(min-width: 1024px) 25vw, 45vw" className="object-cover" />
              </div>
              <div className="rounded-3xl bg-lime p-5 text-forest">
                <p className="font-display text-5xl leading-none">2003</p>
                <p className="mt-1 text-sm font-semibold">{l === "de" ? "Gegründet in Lahore" : "Founded in Lahore"}</p>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="relative overflow-hidden bg-forest py-20 text-white lg:py-28">
        <Girih className="text-white/[0.04]" size={76} />
        <div className="container-site relative mx-auto max-w-4xl text-center">
          <Reveal>
            <p className="eyebrow inline-flex items-center gap-2 text-lime">
              <Star8 className="size-3" /> {t.legacyEyebrow}
            </p>
            <h2 className="mt-4 font-display text-4xl sm:text-6xl">{t.legacyTitle}</h2>
            <p className="mt-8 font-display text-xl leading-relaxed text-white/85 italic sm:text-2xl" style={{ fontVariationSettings: '"SOFT" 100' }}>
              {t.legacy}
            </p>
          </Reveal>
        </div>
      </section>

      <section className="py-20 lg:py-28">
        <div className="container-site grid gap-12">
          <Reveal>
            <SectionHeading title={t.pillarsTitle} />
          </Reveal>
          <Stagger className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {t.pillars.map((p, i) => {
              const Icon = icons[i];
              return (
                <StaggerItem key={p.title} className="rounded-3xl bg-cream p-7 ring-1 ring-ink/10">
                  <span className="grid size-12 place-items-center rounded-2xl bg-mint text-pine">
                    <Icon className="size-6" />
                  </span>
                  <p className="mt-6 font-display text-2xl text-forest">{p.title}</p>
                  <p className="mt-2 text-sm leading-relaxed text-stone">{p.text}</p>
                </StaggerItem>
              );
            })}
          </Stagger>
        </div>
      </section>

      <section className="bg-mist py-20 lg:py-28">
        <div className="container-site grid gap-12">
          <Reveal>
            <SectionHeading eyebrow={t.campusEyebrow} title={t.campusTitle} lead={t.campusLead} action={{ label: t.visit, href: href(l, "/contact") }} />
          </Reveal>
          <Stagger className="grid grid-cols-2 gap-3 lg:grid-cols-3">
            {ROOMS.map((r) => (
              <StaggerItem key={r} className="relative aspect-[4/3] overflow-hidden rounded-3xl bg-mint">
                <Image src={`/images/gallery/${r}`} alt="" fill sizes="(min-width: 1024px) 33vw, 50vw" className="object-cover transition-transform duration-700 hover:scale-105" />
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      <div className="border-b border-ink/10 bg-cream">
        <PartnersMarquee locale={l} title={t.partners} />
      </div>
    </>
  );
}
