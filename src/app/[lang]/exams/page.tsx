import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { lang } from "next/root-params";
import { ArrowRight, CalendarDays, ExternalLink, GraduationCap, IdCard, Info, Phone } from "lucide-react";
import { Reveal, Stagger, StaggerItem } from "@/components/motion";
import { DateBadge, LevelBadge, SectionHeading } from "@/components/site/blocks";
import { Girih } from "@/components/site/girih";
import { PageHero } from "@/components/site/page-hero";
import { commonDictionary } from "@/i18n/common";
import { hasLocale, href, type Locale } from "@/i18n/config";
import { dateParts, formatDate } from "@/lib/format";
import { getExamDates, getSettings } from "@/server/public/queries";

async function locale(): Promise<Locale> {
  const v = await lang();
  return hasLocale(v) ? v : "en";
}

const LEVELS = {
  en: [
    { code: "A1", band: "Basic user", exam: "Start Deutsch 1 · Fit in Deutsch 1", text: "Understand and use familiar everyday expressions and very simple sentences." },
    { code: "A2", band: "Basic user", exam: "Goethe-Zertifikat A2 · Fit in Deutsch 2", text: "Communicate in simple, routine situations about familiar topics." },
    { code: "B1", band: "Independent user", exam: "Goethe-Zertifikat B1", text: "Understand the main points of clear standard language and handle most travel situations." },
    { code: "B2", band: "Independent user", exam: "Goethe-Zertifikat B2", text: "Understand complex texts and interact fluently and spontaneously with native speakers." },
    { code: "C1", band: "Proficient user", exam: "Goethe-Zertifikat C1", text: "Use the language flexibly and effectively for social, academic and professional purposes." },
    { code: "C2", band: "Proficient user", exam: "Goethe-Zertifikat C2: GDS", text: "Understand virtually everything heard or read and express yourself with precision." },
  ],
  de: [
    { code: "A1", band: "Elementare Sprachverwendung", exam: "Start Deutsch 1 · Fit in Deutsch 1", text: "Vertraute Alltagsausdrücke und ganz einfache Sätze verstehen und verwenden." },
    { code: "A2", band: "Elementare Sprachverwendung", exam: "Goethe-Zertifikat A2 · Fit in Deutsch 2", text: "Sich in einfachen, routinemäßigen Situationen zu vertrauten Themen verständigen." },
    { code: "B1", band: "Selbstständige Sprachverwendung", exam: "Goethe-Zertifikat B1", text: "Hauptpunkte klarer Standardsprache verstehen und die meisten Reisesituationen bewältigen." },
    { code: "B2", band: "Selbstständige Sprachverwendung", exam: "Goethe-Zertifikat B2", text: "Komplexe Texte verstehen und sich spontan und fließend verständigen." },
    { code: "C1", band: "Kompetente Sprachverwendung", exam: "Goethe-Zertifikat C1", text: "Die Sprache flexibel und wirksam in Gesellschaft, Studium und Beruf einsetzen." },
    { code: "C2", band: "Kompetente Sprachverwendung", exam: "Goethe-Zertifikat C2: GDS", text: "Praktisch alles mühelos verstehen und sich sehr präzise ausdrücken." },
  ],
};

const COPY = {
  en: {
    metaTitle: "Goethe-Institut exams in Lahore",
    metaDescription: "Goethe-Zertifikat exam dates in Lahore, CEFR levels explained, and how to register through the official Goethe-Institut portal.",
    eyebrow: "Goethe-Institut exams",
    title: "Certify your German, recognised worldwide.",
    lead: "Goethe-Zertifikat examinations follow the Common European Framework of Reference (CEFR) and are accepted by universities, employers and embassies in Germany and beyond.",
    portal: "Register on goethe.de",
    noticeTitle: "Registration is handled by the Goethe-Institut",
    notice: "From January 2026, exam registration is conducted by the Goethe-Institut Karachi via its official webshop portal. Annemarie-Schimmel-Haus does not take exam registrations or payments.",
    contact: "Goethe-Institut Karachi",
    datesEyebrow: "Exam calendar",
    datesTitle: "Exam dates in Lahore",
    datesLead: "Published dates for Goethe-Institut German exams. Always confirm on the official portal before registering.",
    registration: "Online registration",
    exam: "Exam",
    upcomingNone: "New exam dates will be announced by the Goethe-Institut. Please check the official portal for the latest schedule.",
    pastTitle: "Earlier this year",
    levelsEyebrow: "Levels",
    levelsTitle: "Which exam is right for you?",
    stepsTitle: "How to register",
    steps: [
      { title: "Choose your exam", text: "Select the level and date in the Goethe-Institut Pakistan exam portal." },
      { title: "Register & pay online", text: "Complete the registration and payment directly with the Goethe-Institut." },
      { title: "Get your confirmation", text: "You receive the exam invitation with time and venue by email." },
      { title: "Exam day", text: "Bring your original ID. Results are published by the Goethe-Institut." },
    ],
    prepareTitle: "Prepare with us",
    prepareText: "Our courses follow the Goethe-Institut curriculum and train every exam module, reading, listening, writing and speaking.",
    prepareCta: "Explore courses",
    idNote: "Bring your original identity document on exam day.",
  },
  de: {
    metaTitle: "Goethe-Prüfungen in Lahore",
    metaDescription: "Termine der Goethe-Zertifikat-Prüfungen in Lahore, die GER-Niveaus erklärt und die Anmeldung über das offizielle Portal des Goethe-Instituts.",
    eyebrow: "Goethe-Prüfungen",
    title: "Zertifizieren Sie Ihr Deutsch, weltweit anerkannt.",
    lead: "Die Goethe-Zertifikate folgen dem Gemeinsamen Europäischen Referenzrahmen (GER) und werden von Hochschulen, Arbeitgebern und Botschaften in Deutschland und darüber hinaus anerkannt.",
    portal: "Auf goethe.de anmelden",
    noticeTitle: "Die Anmeldung erfolgt über das Goethe-Institut",
    notice: "Seit Januar 2026 erfolgt die Prüfungsanmeldung über das offizielle Webshop-Portal des Goethe-Instituts Karachi. Das Annemarie-Schimmel-Haus nimmt keine Prüfungsanmeldungen oder Zahlungen entgegen.",
    contact: "Goethe-Institut Karachi",
    datesEyebrow: "Prüfungskalender",
    datesTitle: "Prüfungstermine in Lahore",
    datesLead: "Veröffentlichte Termine der Goethe-Prüfungen. Bitte prüfen Sie vor der Anmeldung immer das offizielle Portal.",
    registration: "Online-Anmeldung",
    exam: "Prüfung",
    upcomingNone: "Neue Prüfungstermine gibt das Goethe-Institut bekannt. Den aktuellen Plan finden Sie im offiziellen Portal.",
    pastTitle: "Bisher in diesem Jahr",
    levelsEyebrow: "Niveaus",
    levelsTitle: "Welche Prüfung passt zu Ihnen?",
    stepsTitle: "So melden Sie sich an",
    steps: [
      { title: "Prüfung wählen", text: "Wählen Sie Niveau und Termin im Prüfungsportal des Goethe-Instituts Pakistan." },
      { title: "Online anmelden & zahlen", text: "Anmeldung und Zahlung erfolgen direkt beim Goethe-Institut." },
      { title: "Bestätigung erhalten", text: "Die Einladung mit Uhrzeit und Ort kommt per E-Mail." },
      { title: "Prüfungstag", text: "Bringen Sie Ihren Original-Ausweis mit. Die Ergebnisse veröffentlicht das Goethe-Institut." },
    ],
    prepareTitle: "Mit uns vorbereiten",
    prepareText: "Unsere Kurse folgen dem Curriculum des Goethe-Instituts und trainieren alle Prüfungsmodule: Lesen, Hören, Schreiben und Sprechen.",
    prepareCta: "Kurse entdecken",
    idNote: "Bringen Sie am Prüfungstag Ihren Original-Ausweis mit.",
  },
};

export async function generateMetadata(): Promise<Metadata> {
  const l = await locale();
  return { title: COPY[l].metaTitle, description: COPY[l].metaDescription, alternates: { canonical: `/${l}/exams` } };
}

export default async function ExamsPage() {
  const l = await locale();
  const t = COPY[l];
  const d = commonDictionary(l);
  const [exams, settings] = await Promise.all([getExamDates(), getSettings()]);
  const portal = settings.goethe.examPortalUrl;

  return (
    <>
      <PageHero
        breadcrumbs={[{ label: d.nav.home, href: href(l) }, { label: d.nav.exams }]}
        eyebrow={t.eyebrow}
        title={t.title}
        lead={t.lead}
        image={{ src: "/images/gallery/ash-fb-0045.webp", alt: "", width: 1024, height: 768 }}
      >
        <div className="flex flex-wrap items-center gap-4">
          <a href={portal} target="_blank" rel="noopener noreferrer" className="inline-flex h-12 items-center gap-2 rounded-full bg-forest px-6 font-semibold text-white hover:bg-pine">
            {t.portal} <ExternalLink className="size-4" />
            <span className="sr-only">({d.common.externalLink})</span>
          </a>
          <Image src="/brand/partners/goethe.png" alt="Goethe-Institut" width={1169} height={568} sizes="120px" className="h-10 w-auto" />
        </div>
      </PageHero>

      <section className="pt-14">
        <div className="container-site">
          <Reveal className="flex flex-col gap-4 rounded-3xl bg-lime-soft p-6 ring-1 ring-lime/40 sm:flex-row sm:items-center">
            <Info className="size-7 shrink-0 text-pine" />
            <div className="flex-1">
              <p className="font-semibold text-forest">{t.noticeTitle}</p>
              <p className="mt-1 text-sm text-ink/80">{t.notice}</p>
            </div>
            <a href={`tel:${settings.goethe.karachiPhone.replace(/[^\d+]/g, "")}`} className="inline-flex shrink-0 items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-forest">
              <Phone className="size-4" /> {t.contact}: {settings.goethe.karachiPhone}
            </a>
          </Reveal>
        </div>
      </section>

      <section className="py-16 lg:py-24">
        <div className="container-site grid gap-10">
          <Reveal>
            <SectionHeading eyebrow={t.datesEyebrow} title={t.datesTitle} lead={t.datesLead} />
          </Reveal>
          {exams.upcoming.length ? (
            <Stagger className="grid gap-4 md:grid-cols-2">
              {exams.upcoming.map((e) => (
                <StaggerItem key={e.id} className="flex items-center gap-5 rounded-3xl bg-cream p-5 ring-1 ring-ink/10">
                  <DateBadge {...dateParts(e.examStartsOn, l)} tone="dark" />
                  <div className="flex-1">
                    <div className="flex flex-wrap gap-2">
                      {e.levels.map((lv) => (
                        <LevelBadge key={lv} code={lv} level={lv} size="sm" />
                      ))}
                    </div>
                    <p className="mt-2 font-semibold text-forest">
                      {t.exam}: {formatDate(e.examStartsOn, l, { year: undefined })}
                      {e.examEndsOn && e.examEndsOn !== e.examStartsOn ? `${l === "de" ? " bis " : " to "}${formatDate(e.examEndsOn, l)}` : ""}
                    </p>
                    {e.registrationOn && (
                      <p className="text-sm text-stone">
                        {t.registration}: {formatDate(e.registrationOn, l)}
                      </p>
                    )}
                  </div>
                </StaggerItem>
              ))}
            </Stagger>
          ) : (
            <Reveal className="flex flex-col items-start gap-4 rounded-3xl bg-cream p-8 ring-1 ring-ink/10 sm:flex-row sm:items-center">
              <CalendarDays className="size-8 text-ash" />
              <p className="flex-1 text-stone">{t.upcomingNone}</p>
              <a href={portal} target="_blank" rel="noopener noreferrer" className="inline-flex h-11 items-center gap-2 rounded-full bg-forest px-5 text-sm font-semibold text-white hover:bg-pine">
                {t.portal} <ExternalLink className="size-4" />
              </a>
            </Reveal>
          )}
          {exams.past.length > 0 && (
            <details className="group rounded-3xl bg-white/50 p-5 ring-1 ring-ink/10">
              <summary className="cursor-pointer list-none font-semibold text-forest marker:hidden">
                {t.pastTitle} ({exams.past.length})
              </summary>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[480px] text-sm">
                  <thead className="text-left text-xs text-stone">
                    <tr>
                      <th className="py-2 pr-4 font-medium">{d.common.level}</th>
                      <th className="py-2 pr-4 font-medium">{t.registration}</th>
                      <th className="py-2 font-medium">{t.exam}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {exams.past.map((e) => (
                      <tr key={e.id} className="border-t border-ink/10">
                        <td className="py-2.5 pr-4 font-semibold text-forest">{e.levels.join(" & ")}</td>
                        <td className="py-2.5 pr-4 text-stone">{e.registrationOn ? formatDate(e.registrationOn, l) : "·"}</td>
                        <td className="py-2.5 text-stone">
                          {formatDate(e.examStartsOn, l, { year: undefined })}
                          {e.examEndsOn ? `${l === "de" ? " bis " : " to "}${formatDate(e.examEndsOn, l)}` : ""}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          )}
        </div>
      </section>

      <section className="bg-mist py-16 lg:py-24">
        <div className="container-site grid gap-10">
          <Reveal>
            <SectionHeading eyebrow={t.levelsEyebrow} title={t.levelsTitle} />
          </Reveal>
          <Stagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {LEVELS[l].map((lv) => (
              <StaggerItem key={lv.code} className="flex h-full flex-col rounded-3xl bg-cream p-6 ring-1 ring-ink/10">
                <div className="flex items-center justify-between">
                  <LevelBadge code={lv.code} level={lv.code} size="lg" />
                  <span className="text-right text-xs font-semibold text-stone">{lv.band}</span>
                </div>
                <p className="mt-5 font-semibold text-forest">{lv.exam}</p>
                <p className="mt-2 text-sm leading-relaxed text-stone">{lv.text}</p>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      <section className="relative overflow-hidden bg-forest py-16 text-white lg:py-24">
        <Girih className="text-white/[0.04]" size={70} />
        <div className="container-site relative grid gap-12 lg:grid-cols-[1.3fr_0.7fr]">
          <div>
            <SectionHeading title={t.stepsTitle} tone="dark" />
            <ol className="mt-10 grid gap-4 sm:grid-cols-2">
              {t.steps.map((s, i) => (
                <li key={s.title} className="rounded-3xl bg-white/[0.06] p-6 ring-1 ring-white/10">
                  <span className="font-display text-5xl text-lime">0{i + 1}</span>
                  <p className="mt-3 text-lg font-semibold">{s.title}</p>
                  <p className="mt-1 text-sm text-white/70">{s.text}</p>
                </li>
              ))}
            </ol>
            <p className="mt-6 flex items-center gap-2 text-sm text-white/70">
              <IdCard className="size-4 text-lime" /> {t.idNote}
            </p>
          </div>
          <div className="self-end rounded-3xl bg-white p-7 text-forest">
            <GraduationCap className="size-9 text-ash" />
            <p className="mt-4 font-display text-3xl">{t.prepareTitle}</p>
            <p className="mt-2 text-sm text-stone">{t.prepareText}</p>
            <Link href={href(l, "/courses")} className="mt-6 inline-flex h-12 items-center gap-2 rounded-full bg-forest px-6 font-semibold text-white hover:bg-pine">
              {t.prepareCta} <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
