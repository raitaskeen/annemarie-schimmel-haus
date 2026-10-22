"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect } from "react";
import { RotateCcw } from "lucide-react";

const COPY = {
  en: {
    title: "Something went wrong",
    text: "Sorry — this page could not be loaded. Your data is safe. Please try again in a moment.",
    retry: "Try again",
    home: "Back to the homepage",
    ref: "Reference for our team",
  },
  de: {
    title: "Etwas ist schiefgelaufen",
    text: "Entschuldigung — diese Seite konnte nicht geladen werden. Ihre Daten sind sicher. Bitte versuchen Sie es gleich noch einmal.",
    retry: "Erneut versuchen",
    home: "Zur Startseite",
    ref: "Referenz für unser Team",
  },
};

export default function PublicError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { lang } = useParams<{ lang: string }>();
  const t = COPY[lang === "de" ? "de" : "en"];
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <section className="container-site grid min-h-[60vh] place-items-center py-20 text-center">
      <div className="max-w-md">
        <p className="eyebrow text-ash">Annemarie-Schimmel-Haus</p>
        <h1 className="mt-3 font-display text-4xl text-forest">{t.title}</h1>
        <p className="mt-3 text-stone">{t.text}</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <button type="button" onClick={reset} className="inline-flex h-12 items-center gap-2 rounded-full bg-forest px-6 font-semibold text-white hover:bg-pine">
            <RotateCcw className="size-4" /> {t.retry}
          </button>
          <Link href={`/${lang === "de" ? "de" : "en"}`} className="inline-flex h-12 items-center rounded-full px-6 font-semibold text-forest ring-1 ring-ink/15 hover:bg-white">
            {t.home}
          </Link>
        </div>
        {error.digest && (
          <p className="mt-6 text-xs text-stone">
            {t.ref}: <code className="font-mono">{error.digest}</code>
          </p>
        )}
      </div>
    </section>
  );
}
