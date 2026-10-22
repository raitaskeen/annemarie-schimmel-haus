import Image from "next/image";
import type { Locale } from "@/i18n/config";
import { cn } from "@/lib/utils";
import { getPartners } from "@/server/public/queries";

/**
 * Infinite partner logo strip. Pure CSS (no JavaScript): the list is rendered
 * twice and translated by -50%; it pauses on hover/focus and becomes a static,
 * wrapping row for visitors who prefer reduced motion.
 */
export async function PartnersMarquee({ locale, title, className }: { locale: Locale; title: string; className?: string }) {
  const partners = (await getPartners()).filter((p) => p.showInMarquee);
  if (!partners.length) return null;
  const loop = [...partners, ...partners];
  const duration = `${Math.max(28, partners.length * 6)}s`;

  return (
    <section aria-label={title} className={cn("relative overflow-hidden py-10", className)}>
      <p className="eyebrow mb-7 text-center text-stone">{title}</p>
      <div className="marquee-mask group relative">
        <ul
          className="flex w-max animate-marquee items-center gap-16 pr-16 group-hover:[animation-play-state:paused] group-focus-within:[animation-play-state:paused] motion-reduce:w-full motion-reduce:animate-none motion-reduce:flex-wrap motion-reduce:justify-center motion-reduce:gap-10 sm:gap-20 sm:pr-20"
          style={{ "--marquee-duration": duration } as React.CSSProperties}
        >
          {loop.map((p, i) => {
            const duplicate = i >= partners.length;
            const ratio = p.logoWidth / p.logoHeight;
            const height = ratio > 2.5 ? 34 : ratio > 1.6 ? 46 : 56;
            return (
              <li key={`${p.id}-${i}`} aria-hidden={duplicate || undefined} className={cn("shrink-0", duplicate && "motion-reduce:hidden")}>
                <a
                  href={p.url ?? undefined}
                  target="_blank"
                  rel="noopener noreferrer"
                  tabIndex={duplicate ? -1 : undefined}
                  className="block opacity-60 grayscale transition-[filter,opacity,transform] duration-300 hover:scale-105 hover:opacity-100 hover:grayscale-0 focus-visible:opacity-100 focus-visible:grayscale-0"
                  title={locale === "de" ? p.categoryDe || p.categoryEn : p.categoryEn}
                >
                  <Image
                    src={p.logoPath}
                    alt={duplicate ? "" : p.name}
                    width={Math.round(height * ratio)}
                    height={height}
                    sizes={`${Math.round(height * ratio * 2)}px`}
                    className="logo-adapt-soft w-auto object-contain"
                    style={{ height, width: "auto" }}
                  />
                </a>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
