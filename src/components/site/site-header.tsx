import { commonDictionary } from "@/i18n/common";
import { href, pick, type Locale } from "@/i18n/config";
import { formatDate } from "@/lib/format";
import { getUpcomingOfferings } from "@/server/public/queries";
import { HeaderClient } from "./header-client";
import { Wordmark } from "./logo";

export async function SiteHeader({ locale }: { locale: Locale }) {
  const dict = commonDictionary(locale);
  const offerings = await getUpcomingOfferings();
  const next = offerings.find((o) => o.state === "open");

  return (
    <>
      <a href="#main" className="sr-only z-50 rounded-md bg-forest px-4 py-2 text-white focus:not-sr-only focus:fixed focus:top-3 focus:left-3">
        {dict.nav.skip}
      </a>
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
