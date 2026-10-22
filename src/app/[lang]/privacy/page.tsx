import type { Metadata } from "next";
import { lang } from "next/root-params";
import { LegalPageView } from "@/components/site/legal-page";
import { legalPages } from "@/content/legal";
import { hasLocale, type Locale } from "@/i18n/config";

async function locale(): Promise<Locale> {
  const v = await lang();
  return hasLocale(v) ? v : "en";
}

export async function generateMetadata(): Promise<Metadata> {
  const l = await locale();
  return { title: legalPages.privacy[l].meta, description: legalPages.privacy[l].lead, alternates: { canonical: `/${l}/privacy` } };
}

export default async function Page() {
  const l = await locale();
  return <LegalPageView page={legalPages.privacy[l]} locale={l} />;
}
