import { intlTag, TIME_ZONE, type Locale } from "@/i18n/config";

type DateInput = Date | string | number;

const toDate = (v: DateInput) => (v instanceof Date ? v : new Date(typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) ? `${v}T00:00:00+05:00` : v));

export function formatDate(value: DateInput, locale: Locale, opts: Intl.DateTimeFormatOptions = {}) {
  return new Intl.DateTimeFormat(intlTag[locale], {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: TIME_ZONE,
    ...opts,
  }).format(toDate(value));
}

export function formatShortDate(value: DateInput, locale: Locale) {
  return formatDate(value, locale, { month: "short", year: undefined });
}

export function formatWeekdayDate(value: DateInput, locale: Locale) {
  return formatDate(value, locale, { weekday: "long" });
}

export function formatDateTime(value: DateInput, locale: Locale) {
  return new Intl.DateTimeFormat(intlTag[locale], {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: TIME_ZONE,
  }).format(toDate(value));
}

export function formatClock(value: DateInput, locale: Locale) {
  return new Intl.DateTimeFormat(intlTag[locale], {
    hour: "numeric",
    minute: "2-digit",
    hour12: locale === "en",
    timeZone: TIME_ZONE,
  }).format(toDate(value));
}

/** "17:15:00" → "5:15 pm" (en) / "17:15" (de). */
export function formatTimeOfDay(time: string, locale: Locale) {
  const [h, m] = time.split(":").map(Number);
  return new Intl.DateTimeFormat(intlTag[locale], {
    hour: "numeric",
    minute: "2-digit",
    hour12: locale === "en",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(2000, 0, 1, h, m)));
}

export function formatTimeRange(start: string, end: string, locale: Locale) {
  return `${formatTimeOfDay(start, locale)}${locale === "de" ? " bis " : " to "}${formatTimeOfDay(end, locale)}${locale === "de" ? " Uhr" : ""}`;
}

export function formatPKR(amount: number, locale: Locale) {
  const n = new Intl.NumberFormat(intlTag[locale], { maximumFractionDigits: 0 }).format(amount);
  return locale === "de" ? `${n} PKR` : `Rs ${n}`;
}

export function formatNumber(value: number, locale: Locale) {
  return new Intl.NumberFormat(intlTag[locale]).format(value);
}

const DAY_NAMES: Record<Locale, string[]> = {
  en: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
  de: ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"],
};

/** [1,2,3,4,5] → "Mon to Fri"; [6,7] → "Sat, Sun". */
export function formatWeekdays(days: number[], locale: Locale) {
  const sorted = [...new Set(days)].sort((a, b) => a - b);
  if (!sorted.length) return "";
  const contiguous = sorted.every((d, i) => i === 0 || d === sorted[i - 1] + 1);
  const names = DAY_NAMES[locale];
  if (contiguous && sorted.length > 2) return `${names[sorted[0] - 1]}${locale === "de" ? " bis " : " to "}${names[sorted.at(-1)! - 1]}`;
  return sorted.map((d) => names[d - 1]).join(", ");
}

/** Whole days between now and a date (negative when in the past). */
export function daysUntil(value: DateInput, now = Date.now()) {
  return Math.ceil((toDate(value).getTime() - now) / 86_400_000);
}

export function relativeDays(value: DateInput, locale: Locale, now = Date.now()) {
  const rtf = new Intl.RelativeTimeFormat(intlTag[locale], { numeric: "auto" });
  return rtf.format(daysUntil(value, now), "day");
}

/** Parts for calendar-style date badges. */
export function dateParts(value: DateInput, locale: Locale) {
  const d = toDate(value);
  const fmt = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(intlTag[locale], { ...o, timeZone: TIME_ZONE }).format(d);
  return { day: fmt({ day: "2-digit" }), month: fmt({ month: "short" }).replace(".", ""), weekday: fmt({ weekday: "short" }).replace(".", ""), year: fmt({ year: "numeric" }) };
}
