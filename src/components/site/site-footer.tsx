import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, Clock, Mail, MapPin, Phone } from "lucide-react";
import { commonDictionary } from "@/i18n/common";
import { href, type Locale } from "@/i18n/config";
import { formatTimeOfDay, formatWeekdays } from "@/lib/format";
import { getCurrentYear, getSettings } from "@/server/public/queries";
import { InstallButton } from "@/components/pwa/install-ui";
import { Girih } from "./girih";
import { Wordmark } from "./logo";
import { NewsletterForm } from "./newsletter-form";
import { SocialIcon, type SocialNetwork } from "./social-icons";

const SOCIAL: { key: "facebook" | "instagram" | "youtube" | "linkedin" | "tiktok" | "x"; icon: SocialNetwork; label: string }[] = [
  { key: "instagram", icon: "instagram", label: "Instagram" },
  { key: "facebook", icon: "facebook-f", label: "Facebook" },
  { key: "youtube", icon: "youtube", label: "YouTube" },
  { key: "linkedin", icon: "linkedin-in", label: "LinkedIn" },
  { key: "tiktok", icon: "tiktok", label: "TikTok" },
  { key: "x", icon: "x-twitter", label: "X" },
];

export async function SiteFooter({ locale }: { locale: Locale }) {
  const dict = commonDictionary(locale);
  const f = dict.footer;
  const [settings, year] = await Promise.all([getSettings(), getCurrentYear()]);
  const c = settings.contact;
  const hours = `${formatTimeOfDay(settings.hours.opens, locale)}${locale === "de" ? " bis " : " to "}${formatTimeOfDay(settings.hours.closes, locale)}${locale === "de" ? " Uhr" : ""}`;

  // Opening days come from Admin → Settings, so the footer never contradicts the office.
  const days = [...new Set(settings.hours.days)].sort((a, b) => a - b);
  const openDays = formatWeekdays(days, locale);
  const closed = [1, 2, 3, 4, 5, 6, 7].filter((d) => !days.includes(d));
  const closedDays = closed.length ? formatWeekdays(closed, locale) : "";

  const learn = [
    [dict.nav.courses, "/courses"],
    [dict.nav.placement, "/placement-test"],
    [dict.nav.exams, "/exams"],
    [dict.nav.fees, "/courses#fees"],
    [f.guidelines, "/student-guidelines"],
  ] as const;
  const institute = [
    [dict.nav.about, "/about"],
    [dict.nav.events, "/events"],
    [dict.nav.gallery, "/gallery"],
    [dict.nav.news, "/news"],
    [dict.nav.partners, "/partners"],
    [dict.nav.contact, "/contact"],
    [dict.nav.track, "/track"],
  ] as const;

  return (
    <footer className="relative mt-auto overflow-hidden bg-forest text-white">
      <Girih className="text-white/[0.035]" size={84} />

      <div className="container-site relative">
        {/* Call to action band */}
        <div className="flex flex-col items-start justify-between gap-6 border-b border-white/10 py-10 md:flex-row md:items-end lg:py-14">
          <div className="max-w-2xl">
            <p className="eyebrow text-lime">{dict.brand.tagline}</p>
            <p className="mt-3 font-display text-4xl leading-[1.05] text-balance sm:text-5xl">
              {locale === "de" ? (
                <>
                  Ihre Reise ins Deutsche <em className="text-lime not-italic">beginnt hier.</em>
                </>
              ) : (
                <>
                  Your German journey <em className="text-lime not-italic">starts here.</em>
                </>
              )}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href={href(locale, "/courses")}
              className="group inline-flex h-12 items-center gap-2 rounded-full bg-lime px-6 font-semibold text-forest transition-colors hover:bg-white"
            >
              {dict.nav.enroll}
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              href={href(locale, "/placement-test")}
              className="inline-flex h-12 items-center gap-2 rounded-full px-6 font-semibold text-white ring-1 ring-white/25 transition-colors hover:bg-white/10"
            >
              {dict.nav.placement}
            </Link>
          </div>
        </div>

        {/* Four balanced columns; two link lists share a row on phones to keep the footer short. */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-10 py-12 lg:grid-cols-[1.3fr_0.8fr_0.8fr_1.3fr] lg:gap-x-10">
          <div className="col-span-2 max-w-sm lg:col-span-1">
            <Wordmark inverse className="h-11" />
            <p className="mt-4 text-sm leading-relaxed text-white/70">{f.lead}</p>
            <ul className="mt-6 flex flex-wrap gap-2" aria-label={f.follow}>
              {SOCIAL.filter((s) => settings.social[s.key]).map((s) => (
                <li key={s.key}>
                  <a
                    href={settings.social[s.key]}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={s.label}
                    className="grid size-10 place-items-center rounded-full bg-white/[0.07] text-white/80 ring-1 ring-white/10 transition-colors hover:bg-lime hover:text-forest"
                  >
                    <SocialIcon network={s.icon} />
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <FooterList title={f.learn} items={learn.map(([l, p]) => [l, href(locale, p)])} />
          <FooterList title={f.institute} items={institute.map(([l, p]) => [l, href(locale, p)])} />

          <div className="col-span-2 lg:col-span-1">
            <p className="eyebrow mb-4 text-white/50">{f.visit}</p>
            <ul className="grid gap-3 text-sm text-white/80">
              <li className="flex gap-3">
                <MapPin className="mt-0.5 size-4 shrink-0 text-lime" />
                <a href={c.mapUrl || "#"} target="_blank" rel="noopener noreferrer" className="link-underline">
                  {c.address}
                </a>
              </li>
              <li className="flex gap-3">
                <Phone className="mt-0.5 size-4 shrink-0 text-lime" />
                <span>
                  <a href={`tel:${c.phone.replace(/s/g, "")}`} className="link-underline">
                    {c.phone}
                  </a>
                  {c.emergencyPhone && (
                    <span className="block text-xs text-white/50">
                      {f.emergency}: {c.emergencyPhone}
                    </span>
                  )}
                </span>
              </li>
              <li className="flex gap-3">
                <Mail className="mt-0.5 size-4 shrink-0 text-lime" />
                <span className="grid">
                  <a href={`mailto:${c.generalEmail}`} className="link-underline w-fit">
                    {c.generalEmail}
                  </a>
                  <a href={`mailto:${c.coursesEmail}`} className="link-underline w-fit">
                    {c.coursesEmail}
                  </a>
                </span>
              </li>
              <li className="flex gap-3">
                <Clock className="mt-0.5 size-4 shrink-0 text-lime" />
                <span>
                  {openDays}: <span className="tabular text-white">{hours}</span>
                  {closedDays && (
                    <span className="block text-xs text-white/50">
                      {closedDays}: {f.closed}
                    </span>
                  )}
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Newsletter and app side by side in one slim band */}
        <div className="grid gap-6 border-t border-white/10 py-8 lg:grid-cols-[1.3fr_1fr] lg:items-end lg:gap-12">
          <div className="grid max-w-xl gap-4">
            <div>
              <p className="font-display text-xl">{f.newsletterTitle}</p>
              <p className="mt-1 text-sm text-white/60">{f.newsletterText}</p>
            </div>
            <NewsletterForm
              locale={locale}
              copy={{
                placeholder: f.newsletterPlaceholder,
                button: f.newsletterButton,
                consent: f.newsletterConsent,
                success: f.newsletterSuccess,
                already: f.newsletterAlready,
                error: dict.form.errors.generic,
                invalid: `${dict.form.errors.email} ${dict.form.errors.consent}`,
              }}
            />
          </div>
          <div className="flex items-center justify-between gap-4 rounded-2xl bg-white/[0.06] p-4 ring-1 ring-white/10">
            <div className="min-w-0">
              <p className="font-display text-lg leading-tight">{dict.app.title}</p>
              <p className="mt-0.5 line-clamp-2 text-xs text-white/60">{dict.app.text}</p>
            </div>
            <InstallButton labels={dict.app} tone="dark" className="h-10 shrink-0 px-4 text-sm" />
          </div>
        </div>

        <div className="flex flex-col gap-5 border-t border-white/10 py-6 text-xs text-white/50 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <Image src="/brand/partners/goethe.png" alt="Goethe-Institut" width={1169} height={568} sizes="120px" className="h-9 w-auto" />
            <span className="max-w-48 leading-snug">{dict.brand.goethe}</span>
          </div>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <span>
              © {year} Annemarie-Schimmel-Haus · {locale === "de" ? "seit 2003" : "since 2003"}. {f.rights}
            </span>
            <Link href={href(locale, "/privacy")} className="hover:text-white">
              {f.privacy}
            </Link>
            <Link href={href(locale, "/terms")} className="hover:text-white">
              {f.terms}
            </Link>
            <Link href="/admin" className="inline-flex items-center gap-1 hover:text-white">
              Staff <ArrowUpRight className="size-3" />
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterList({ title, items }: { title: string; items: (readonly [string, string])[] }) {
  return (
    <div>
      <p className="eyebrow mb-4 text-white/50">{title}</p>
      <ul className="grid gap-2.5 text-sm">
        {items.map(([label, url]) => (
          <li key={url}>
            <Link href={url} className="link-underline text-white/80 hover:text-white">
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
