import type { Metadata } from "next";
import { lang } from "next/root-params";
import { Suspense } from "react";
import { NewsletterConfirm } from "@/components/site/newsletter-confirm";
import { Girih } from "@/components/site/girih";
import { hasLocale, href, type Locale } from "@/i18n/config";

async function locale(): Promise<Locale> {
  const v = await lang();
  return hasLocale(v) ? v : "en";
}

const COPY = {
  en: { title: "Confirm your subscription", lead: "One click and you'll receive news about courses, events and scholarships.", button: "Yes, subscribe me", done: "You're subscribed, welcome!", doneLead: "Thank you for confirming. You can unsubscribe at any time.", failed: "This confirmation link is invalid or has already been used.", home: "Back to the homepage" },
  de: { title: "Abonnement bestätigen", lead: "Ein Klick, und Sie erhalten Neuigkeiten zu Kursen, Veranstaltungen und Stipendien.", button: "Ja, abonnieren", done: "Sie sind angemeldet, willkommen!", doneLead: "Danke für Ihre Bestätigung. Sie können sich jederzeit abmelden.", failed: "Dieser Bestätigungslink ist ungültig oder wurde bereits verwendet.", home: "Zur Startseite" },
};

export async function generateMetadata(): Promise<Metadata> {
  return { title: COPY[await locale()].title, robots: { index: false } };
}

export default async function ConfirmPage() {
  const l = await locale();
  return (
    <section className="relative overflow-hidden bg-forest">
      <Girih className="text-white/[0.05]" size={64} />
      <div className="container-site relative grid min-h-[70dvh] place-items-center py-20">
        <div className="w-full max-w-lg rounded-[2rem] bg-paper p-8 text-center shadow-2xl sm:p-12">
          <Suspense fallback={<div className="h-40 animate-pulse rounded-2xl bg-ink/5" />}>
            <NewsletterConfirm copy={COPY[l]} homeHref={href(l)} />
          </Suspense>
        </div>
      </div>
    </section>
  );
}
