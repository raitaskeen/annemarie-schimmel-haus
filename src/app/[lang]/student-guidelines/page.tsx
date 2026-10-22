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
  return { title: legalPages.guidelines[l].meta, description: legalPages.guidelines[l].lead, alternates: { canonical: `/${l}/student-guidelines` } };
}

export default async function Page() {
  const l = await locale();
  return <LegalPageView page={legalPages.guidelines[l]} locale={l} />;
}
