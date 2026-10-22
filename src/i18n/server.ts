import { lang } from "next/root-params";
import { defaultLocale, hasLocale, type Locale } from "./config";

/** Current locale from the [lang] root segment (Server Components only). */
export async function getLocale(): Promise<Locale> {
  const value = await lang();
  return hasLocale(value) ? value : defaultLocale;
}
