import { commonDictionary } from "@/i18n/common";
import { href, pick, type Locale } from "@/i18n/config";
import { formatDate } from "@/lib/format";
import { getSettings, getUpcomingOfferings } from "@/server/public/queries";
import { AnnouncementBar } from "./announcement-bar";
import { HeaderClient } from "./header-client";
import { Wordmark } from "./logo";

export async function SiteHeader({ locale }: { locale: Locale }) {
  const dict = commonDictionary(locale);
  const [settings, offerings] = await Promise.all([getSettings(), getUpcomingOfferings()]);
  const next = offerings.find((o) => o.state === "open");
  const announcement = settings.announcement.enabled
    ? { text: locale === "de" ? settings.announcement.textDe || settings.announcement.textEn : settings.announcement.textEn, href: settings.announcement.href.startsWith("https://") ? settings.announcement.href : href(locale, settings.announcement.href || "/") }
    : null;

  return (
    <>
      <a href="#main" className="sr-only z-50 rounded-md bg-forest px-4 py-2 text-white focus:not-sr-only focus:fixed focus:top-3 focus:left-3">
        {dict.nav.skip}
      </a>
      {announcement?.text && <AnnouncementBar text={announcement.text} href={announcement.href} dismissLabel={dict.nav.close} />}
      <HeaderClient
        locale={locale}
        nav={dict.nav}
        brand={dict.brand}
        app={dict.app}
        logo={<Wordmark priority className="h-9 sm:h-10" />}
        featured={
          next
            ? {
                eyebrow: locale === "de" ? "Nächster Kursstart" : "Next course starts",
                title: pick(next.course, "title", locale).split("·")[0].trim(),
                meta: `${formatDate(next.startsOn, locale)} · ${dict.modes[next.mode]}`,
                href: href(locale, `/enroll/${next.id}`),
              }
            : null
        }
      />
    </>
  );
}
