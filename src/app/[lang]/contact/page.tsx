import type { Metadata } from "next";
import { lang } from "next/root-params";
import { Clock, GraduationCap, Mail, MapPin, Palette, Phone } from "lucide-react";
import { ContactForm } from "@/components/forms/contact-form";
import { Reveal } from "@/components/motion";
import { ConsentMap } from "@/components/site/consent-map";
import { PageHero } from "@/components/site/page-hero";
import { SocialIcon } from "@/components/site/social-icons";
import { formsCopy } from "@/content/forms";
import { commonDictionary } from "@/i18n/common";
import { hasLocale, href, type Locale } from "@/i18n/config";
import { formatTimeOfDay } from "@/lib/format";
import { getSettings } from "@/server/public/queries";

async function locale(): Promise<Locale> {
  const v = await lang();
  return hasLocale(v) ? v : "en";
}

const COPY = {
  en: {
    meta: "Contact",
    title: "Let's begin a conversation.",
    lead: "Questions about courses, the placement test, events or partnerships? Write to us — or visit the Haus on Upper Mall.",
    formTitle: "Send us a message",
    formLead: "We usually reply within two working days.",
    departments: "Write directly",
    general: "General enquiries",
    courses: "Courses & placement test",
    programme: "Cultural programme",
    visit: "Visit the Haus",
    hours: "Opening hours",
    mapLoad: "Show map",
    mapNote: "Loads Google Maps. Google may set cookies.",
    whatsapp: "Chat on WhatsApp",
  },
  de: {
    meta: "Kontakt",
    title: "Beginnen wir ein Gespräch.",
    lead: "Fragen zu Kursen, Einstufungstest, Veranstaltungen oder Partnerschaften? Schreiben Sie uns — oder besuchen Sie das Haus an der Upper Mall.",
    formTitle: "Nachricht senden",
    formLead: "Wir antworten in der Regel innerhalb von zwei Werktagen.",
    departments: "Direkt schreiben",
    general: "Allgemeine Anfragen",
    courses: "Kurse & Einstufungstest",
    programme: "Kulturprogramm",
    visit: "Das Haus besuchen",
    hours: "Öffnungszeiten",
    mapLoad: "Karte anzeigen",
    mapNote: "Lädt Google Maps. Google kann Cookies setzen.",
    whatsapp: "Per WhatsApp schreiben",
  },
};

export async function generateMetadata(): Promise<Metadata> {
  const l = await locale();
  return { title: COPY[l].meta, description: COPY[l].lead, alternates: { canonical: `/${l}/contact` } };
}

export default async function ContactPage() {
  const l = await locale();
  const t = COPY[l];
  const d = commonDictionary(l);
  const s = await getSettings();
  const c = s.contact;
  const hours = `${formatTimeOfDay(s.hours.opens, l)} – ${formatTimeOfDay(s.hours.closes, l)}${l === "de" ? " Uhr" : ""}`;
  const departments = [
    { icon: Mail, label: t.general, email: c.generalEmail },
    { icon: GraduationCap, label: t.courses, email: c.coursesEmail },
    { icon: Palette, label: t.programme, email: c.programmeEmail },
  ];

  return (
    <>
      <PageHero breadcrumbs={[{ label: d.nav.home, href: href(l) }, { label: d.nav.contact }]} eyebrow={d.nav.contact} title={t.title} lead={t.lead} />

      <section className="py-14 lg:py-20">
        <div className="container-site grid items-start gap-8 lg:grid-cols-[1.15fr_0.85fr]">
          <Reveal className="rounded-[2rem] bg-paper p-6 shadow-[0_30px_60px_-40px_rgb(16_36_28/0.6)] ring-1 ring-ink/10 sm:p-10">
            <h2 className="font-display text-3xl text-forest sm:text-4xl">{t.formTitle}</h2>
            <p className="mt-1 mb-8 text-stone">{t.formLead}</p>
            <ContactForm locale={l} form={d.form} common={d.common} forms={formsCopy(l)} privacyHref={href(l, "/privacy")} />
          </Reveal>

          <div className="grid gap-5">
            <Reveal delay={0.05} className="rounded-3xl bg-forest p-7 text-white">
              <p className="eyebrow text-lime">{t.visit}</p>
              <p className="mt-3 flex gap-3 text-lg">
                <MapPin className="mt-1 size-5 shrink-0 text-lime" /> {c.address}
              </p>
              <a href={`tel:${c.phone.replace(/\s/g, "")}`} className="mt-4 flex items-center gap-3 font-display text-2xl hover:text-lime">
                <Phone className="size-5 text-lime" /> {c.phone}
              </a>
              <div className="mt-6 flex items-start gap-3 rounded-2xl bg-white/[0.07] p-4 text-sm">
                <Clock className="mt-0.5 size-4 shrink-0 text-lime" />
                <div>
                  <p className="font-semibold">{t.hours}</p>
                  <p className="text-white/75">
                    {d.footer.weekdays}: {hours}
                  </p>
                  <p className="text-white/55">
                    {d.footer.weekend}: {d.footer.closed}
                  </p>
                </div>
              </div>
              {c.whatsapp && (
                <a
                  href={`https://wa.me/${c.whatsapp}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-5 inline-flex h-11 items-center gap-2 rounded-full bg-[#25d366] px-5 text-sm font-semibold text-forest hover:bg-white"
                >
                  <SocialIcon network="whatsapp" /> {t.whatsapp}
                </a>
              )}
            </Reveal>

            <Reveal delay={0.1} className="rounded-3xl bg-cream p-7 ring-1 ring-ink/10">
              <p className="eyebrow text-ash">{t.departments}</p>
              <ul className="mt-4 grid gap-3">
                {departments.map((dep) => (
                  <li key={dep.email}>
                    <a href={`mailto:${dep.email}`} className="group flex items-center gap-4 rounded-2xl p-2 hover:bg-mist">
                      <span className="grid size-11 place-items-center rounded-xl bg-mint text-pine group-hover:bg-forest group-hover:text-lime">
                        <dep.icon className="size-5" />
                      </span>
                      <span>
                        <span className="block text-sm font-semibold text-forest">{dep.label}</span>
                        <span className="text-sm text-stone">{dep.email}</span>
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            </Reveal>

            <Reveal delay={0.15} className="aspect-[4/3]">
              <ConsentMap query={`Annemarie-Schimmel-Haus, ${c.address}`} labels={{ load: t.mapLoad, note: t.mapNote }} />
            </Reveal>
          </div>
        </div>
      </section>
    </>
  );
}
