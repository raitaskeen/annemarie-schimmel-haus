import Image from "next/image";
import { cn } from "@/lib/utils";

/** The ASH wordmark (original artwork). `inverse` renders it white for dark surfaces. */
export function Wordmark({ className, inverse = false, priority = false }: { className?: string; inverse?: boolean; priority?: boolean }) {
  return (
    <Image
      src="/brand/ash-wordmark.png"
      alt="Annemarie-Schimmel-Haus"
      width={1513}
      height={674}
      priority={priority}
      sizes="160px"
      quality={85}
      className={cn("h-10 w-auto select-none", inverse ? "brightness-0 invert" : "logo-adapt", className)}
    />
  );
}
