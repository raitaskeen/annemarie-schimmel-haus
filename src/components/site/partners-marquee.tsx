import Image from "next/image";
import type { Locale } from "@/i18n/config";
import { cn } from "@/lib/utils";
import { getPartners } from "@/server/public/queries";

type Partner = Awaited<ReturnType<typeof getPartners>>[number];

/** Repeats a row until it is long enough to cover wide screens without a visible gap. */
function fill(row: Partner[], min = 14) {
  let out = [...row];
  while (out.length < min) out = [...out, ...row];
  return out;
}

/**
 * Two infinite partner strips that drift in opposite directions. Pure CSS (no JavaScript):
 * each row is rendered twice and translated by -50%, so the loop is seamless. Rows pause on
 * hover/focus and stop for visitors who prefer reduced motion. Only the first copy of the
 * first row is exposed to assistive technology and keyboard users.
 */
export async function PartnersMarquee({ locale, title, className }: { locale: Locale; title: string; className?: string }) {
  const partners = (await getPartners()).filter((p) => p.showInMarquee);
  if (!partners.length) return null;
  const half = Math.ceil(partners.length / 2);
  // The second row starts halfway through the list so the same logo never lines up vertically.
  const rows = [fill(partners), fill([...partners.slice(half), ...partners.slice(0, half)])];
  const seconds = Math.max(32, rows[0].length * 5);

  return (
    <section aria-label={title} className={cn("relative overflow-hidden py-12 sm:py-14", className)}>
      <p className="eyebrow mb-8 text-center text-stone">{title}</p>
      <div className="marquee-mask grid gap-5 sm:gap-7">
        {rows.map((row, r) => (
          <div key={r} className="group flex overflow-hidden" aria-hidden={r === 1 || undefined}>
            <ul
              className={cn(
                "flex w-max shrink-0 animate-marquee items-center gap-12 pr-12 will-change-transform group-hover:[animation-play-state:paused] group-focus-within:[animation-play-state:paused] motion-reduce:animate-none sm:gap-20 sm:pr-20",
                r === 1 && "[animation-direction:reverse]",
              )}
              style={{ "--marquee-duration": `${r === 1 ? seconds * 1.25 : seconds}s` } as React.CSSProperties}
            >
              {[...row, ...row].map((p, i) => {
                const visible = r === 0 && i < partners.length;
                const ratio = p.logoWidth / p.logoHeight;
                const height = ratio > 2.5 ? 30 : ratio > 1.6 ? 40 : 50;
                return (
                  <li key={`${p.id}-${i}`} aria-hidden={visible ? undefined : true} className="shrink-0">
                    <a
                      href={p.url ?? undefined}
                      target="_blank"
                      rel="noopener noreferrer"
                      tabIndex={visible ? undefined : -1}
                      className="block rounded-xl px-2 py-1 opacity-55 grayscale transition-[filter,opacity] duration-300 hover:opacity-100 hover:grayscale-0 focus-visible:opacity-100 focus-visible:grayscale-0"
                      title={locale === "de" ? p.categoryDe || p.categoryEn : p.categoryEn}
                    >
                      <Image
                        src={p.logoPath}
                        alt={visible ? p.name : ""}
                        width={Math.round(height * ratio)}
                        height={height}
                        className="logo-adapt-soft w-auto object-contain"
                        style={{ height, width: "auto" }}
                      />
                    </a>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
