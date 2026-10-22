import { useId } from "react";
import { cn } from "@/lib/utils";

/**
 * Eight-point star lattice inspired by the girih tilework of Lahore's Mughal
 * monuments. Drawn with currentColor so it adapts to any surface.
 */
export function Girih({ className, size = 64, strokeWidth = 1 }: { className?: string; size?: number; strokeWidth?: number }) {
  const id = useId().replace(/:/g, "");
  const s = size;
  const h = s / 2;
  const q = s / 4;
  return (
    <svg aria-hidden className={cn("pointer-events-none absolute inset-0 h-full w-full", className)}>
      <defs>
        <pattern id={`girih-${id}`} width={s} height={s} patternUnits="userSpaceOnUse">
          <g fill="none" stroke="currentColor" strokeWidth={strokeWidth}>
            {/* eight-point star from two rotated squares */}
            <rect x={q} y={q} width={h} height={h} />
            <rect x={q} y={q} width={h} height={h} transform={`rotate(45 ${h} ${h})`} />
            <circle cx={h} cy={h} r={s * 0.09} />
            {/* connectors into the neighbouring tiles */}
            <path d={`M0 ${h} H${q} M${s - q} ${h} H${s} M${h} 0 V${q} M${h} ${s - q} V${s}`} />
          </g>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#girih-${id})`} />
    </svg>
  );
}

/** A single decorative eight-point star (used as bullets and section marks). */
export function Star8({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={cn("size-4", className)}>
      <path
        fill="currentColor"
        d="M12 1.5l2.47 4.06L19.07 4.9l-.66 4.6L22.5 12l-4.09 2.5.66 4.6-4.6-.66L12 22.5l-2.47-4.06-4.6.66.66-4.6L1.5 12l4.09-2.5-.66-4.6 4.6.66z"
      />
    </svg>
  );
}
