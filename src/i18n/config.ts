export const locales = ["en", "de"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "en";

export function hasLocale(value: string | undefined | null): value is Locale {
  return !!value && (locales as readonly string[]).includes(value);
}

export const localeLabels: Record<Locale, string> = { en: "English", de: "Deutsch" };

/** BCP 47 tags used for Intl formatting. */
export const intlTag: Record<Locale, string> = { en: "en-GB", de: "de-DE" };

export const TIME_ZONE = "Asia/Karachi";

/** Pick a localized field (`titleEn` / `titleDe`), falling back to English. */
export function pick<T extends Record<string, unknown>, K extends string>(
  row: T,
  field: K,
  locale: Locale,
): string {
  const de = row[`${field}De`];
  const en = row[`${field}En`];
  if (locale === "de" && typeof de === "string" && de.trim()) return de;
  return typeof en === "string" ? en : "";
}

export function pickList<T extends Record<string, unknown>>(row: T, field: string, locale: Locale): string[] {
  const de = row[`${field}De`];
  const en = row[`${field}En`];
  if (locale === "de" && Array.isArray(de) && de.length) return de as string[];
  return Array.isArray(en) ? (en as string[]) : [];
}

/** Prefixes an internal path with the locale. */
export function href(locale: Locale, path = "/"): string {
  if (/^https?:\/\//.test(path)) return path;
  const clean = path.startsWith("/") ? path : `/${path}`;
  return clean === "/" ? `/${locale}` : `/${locale}${clean}`;
}
