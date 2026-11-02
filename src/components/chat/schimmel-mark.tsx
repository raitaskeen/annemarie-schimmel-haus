import { useId } from "react";
import { cn } from "@/lib/utils";

/**
 * Schimmel, the Haus guide: a medallion built on the eight-point Girih star of the ASH
 * visual language. A two-tone forest rosette with a fine lime inlay frames a cream face
 * that blinks now and then; while Schimmel thinks, the rosette turns and the eyes glance
 * around (animations live in globals.css, stilled for reduced motion).
 */
export function SchimmelMark({ className, thinking = false }: { className?: string; thinking?: boolean }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  return (
    <svg viewBox="0 0 64 64" aria-hidden className={cn("size-10", className)} data-thinking={thinking || undefined}>
      <defs>
        <linearGradient id={`${id}-body`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#2a7a4a" />
          <stop offset="0.55" stopColor="#1f5f39" />
          <stop offset="1" stopColor="#10241c" />
        </linearGradient>
        <radialGradient id={`${id}-face`} cx="0.4" cy="0.35" r="0.75">
          <stop offset="0" stopColor="#fffdf7" />
          <stop offset="1" stopColor="#ece5d2" />
        </radialGradient>
        <linearGradient id={`${id}-shine`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.35" />
          <stop offset="0.5" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* eight-point rosette: two rounded squares, the second turned 45° */}
      <g className="bot-rosette">
        <rect x="11" y="11" width="42" height="42" rx="9" fill={`url(#${id}-body)`} />
        <rect x="11" y="11" width="42" height="42" rx="9" fill={`url(#${id}-body)`} transform="rotate(45 32 32)" />
        {/* lime inlay following the star's outline */}
        <rect x="14.5" y="14.5" width="35" height="35" rx="7" fill="none" className="stroke-lime" strokeWidth="1.1" strokeOpacity="0.85" />
        <rect x="14.5" y="14.5" width="35" height="35" rx="7" fill="none" className="stroke-lime" strokeWidth="1.1" strokeOpacity="0.85" transform="rotate(45 32 32)" />
        {/* soft top light for depth */}
        <rect x="11" y="11" width="42" height="42" rx="9" fill={`url(#${id}-shine)`} transform="rotate(45 32 32)" />
        <circle cx="32" cy="4.6" r="1.6" className="fill-lime" />
      </g>

      {/* face */}
      <circle cx="32" cy="32" r="15.5" fill={`url(#${id}-face)`} />
      <circle cx="32" cy="32" r="15.5" fill="none" stroke="#10241c" strokeOpacity="0.12" strokeWidth="1" />
      <g className="bot-eyes">
        <rect className="bot-eye" x="24.6" y="26.4" width="4.2" height="6.6" rx="2.1" fill="#10241c" />
        <rect className="bot-eye" x="35.2" y="26.4" width="4.2" height="6.6" rx="2.1" fill="#10241c" />
        <circle cx="26.2" cy="28" r="0.9" fill="#fffdf7" />
        <circle cx="36.8" cy="28" r="0.9" fill="#fffdf7" />
      </g>
      <path d="M26.8 37.2c2.9 2.6 7.5 2.6 10.4 0" fill="none" className="stroke-pine" strokeWidth="2" strokeLinecap="round" />
      <circle cx="22.6" cy="35.4" r="1.7" className="fill-lime" fillOpacity="0.55" />
      <circle cx="41.4" cy="35.4" r="1.7" className="fill-lime" fillOpacity="0.55" />
    </svg>
  );
}
