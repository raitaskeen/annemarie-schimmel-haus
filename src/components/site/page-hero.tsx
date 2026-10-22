import Image from "next/image";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Breadcrumbs } from "./blocks";
import { Girih, Star8 } from "./girih";

/** Inner-page hero: editorial title on the left, arch-framed photograph on the right. */
export function PageHero({
  eyebrow,
  title,
  lead,
  breadcrumbs,
  image,
  children,
  className,
}: {
  eyebrow?: string;
  title: ReactNode;
  lead?: ReactNode;
  breadcrumbs?: { label: string; href?: string }[];
  image?: { src: string; alt: string; width: number; height: number };
  children?: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("relative overflow-hidden border-b border-ink/10 bg-paper", className)}>
      <div className="bg-grid pointer-events-none absolute inset-0 [mask-image:linear-gradient(to_bottom,black,transparent_85%)]" aria-hidden />
      <div className="absolute -top-24 -left-24 size-72 text-ash/10" aria-hidden>
        <Girih size={46} />
      </div>
      <div className={cn("container-site relative grid items-center gap-10 py-12 sm:py-16 lg:py-20", image && "lg:grid-cols-[1.15fr_0.85fr]")}>
        <div className="animate-rise">
          {breadcrumbs && <Breadcrumbs items={breadcrumbs} />}
          {eyebrow && (
            <p className="eyebrow mt-6 inline-flex items-center gap-2 text-ash">
              <Star8 className="size-3" />
              {eyebrow}
            </p>
          )}
          <h1 className="mt-4 font-display text-5xl leading-[1.02] text-forest sm:text-6xl lg:text-7xl">{title}</h1>
          {lead && <p className="mt-6 max-w-2xl text-lg leading-relaxed text-stone sm:text-xl">{lead}</p>}
          {children && <div className="mt-8">{children}</div>}
        </div>
        {image && (
          <div className="relative mx-auto w-full max-w-md animate-rise [animation-delay:120ms] lg:max-w-none">
            <div className="arch absolute inset-0 translate-x-4 translate-y-4 bg-lime/40" aria-hidden />
            <div className="arch relative aspect-[4/5] overflow-hidden bg-mint shadow-[0_40px_80px_-40px_rgb(16_36_28/0.6)]">
              <Image src={image.src} alt={image.alt} fill priority sizes="(min-width: 1024px) 40vw, 90vw" className="object-cover" />
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
