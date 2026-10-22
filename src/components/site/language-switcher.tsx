"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { locales, type Locale } from "@/i18n/config";
import { cn } from "@/lib/utils";

/** Switches the first path segment between /en and /de, keeping the rest of the URL. */
export function LanguageSwitcher({ locale, label, className, tone = "light" }: { locale: Locale; label: string; className?: string; tone?: "light" | "dark" }) {
  const pathname = usePathname() ?? `/${locale}`;
  const rest = pathname.replace(/^\/(en|de)(?=\/|$)/, "");
  return (
    <nav aria-label={label} className={cn("flex items-center rounded-full p-0.5 text-xs font-semibold", tone === "dark" ? "bg-white/10" : "bg-ink/5", className)}>
      {locales.map((l) => {
        const active = l === locale;
        return (
          <Link
            key={l}
            href={`/${l}${rest}`}
            hrefLang={l}
            lang={l}
            aria-current={active ? "true" : undefined}
            className={cn(
              "rounded-full px-2.5 py-1 uppercase tracking-wider transition-colors",
              active
                ? tone === "dark"
                  ? "bg-lime text-forest"
                  : "bg-forest text-white"
                : tone === "dark"
                  ? "text-white/70 hover:text-white"
                  : "text-ink/60 hover:text-ink",
            )}
          >
            {l}
          </Link>
        );
      })}
    </nav>
  );
}

/** Static stand-in rendered in the prerendered shell (links to each locale's home). */
export function LanguageSwitcherFallback({ locale, className, tone = "light" }: { locale: Locale; className?: string; tone?: "light" | "dark" }) {
  return (
    <div className={cn("flex items-center rounded-full p-0.5 text-xs font-semibold", tone === "dark" ? "bg-white/10" : "bg-ink/5", className)}>
      {locales.map((l) => (
        <Link
          key={l}
          href={`/${l}`}
          hrefLang={l}
          className={cn(
            "rounded-full px-2.5 py-1 uppercase tracking-wider",
            l === locale ? (tone === "dark" ? "bg-lime text-forest" : "bg-forest text-white") : tone === "dark" ? "text-white/70" : "text-ink/60",
          )}
        >
          {l}
        </Link>
      ))}
    </div>
  );
}
