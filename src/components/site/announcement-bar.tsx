"use client";

import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import { ArrowRight, X } from "lucide-react";
import { Star8 } from "./girih";

const noopSubscribe = () => () => {};

function readDismissed(key: string) {
  try {
    return sessionStorage.getItem(key) === "1";
  } catch {
    return false; // storage unavailable: keep showing
  }
}

/** Thin announcement strip; dismissal is remembered for the browser session. */
export function AnnouncementBar({ text, href, dismissLabel }: { text: string; href: string; dismissLabel: string }) {
  const key = `ash-announcement:${text.slice(0, 40)}`;
  const [closed, setClosed] = useState(false);
  // Read the dismissal after hydration so server and client render the same markup first.
  const dismissed = useSyncExternalStore(noopSubscribe, () => readDismissed(key), () => false);

  if (closed || dismissed) return null;
  return (
    <div className="relative bg-forest text-white">
      <div className="container-site flex min-h-10 items-center justify-center gap-3 py-2 pr-10 text-center text-[13px]">
        <Star8 className="size-3 shrink-0 text-lime" />
        <Link href={href} className="group inline-flex items-center gap-1.5 font-medium">
          <span>{text}</span>
          <ArrowRight className="size-3.5 text-lime transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>
      <button
        type="button"
        onClick={() => {
          setClosed(true);
          try {
            sessionStorage.setItem(key, "1");
          } catch {
            /* ignore */
          }
        }}
        className="absolute top-1/2 right-3 grid size-7 -translate-y-1/2 place-items-center rounded-full text-white/60 hover:bg-white/10 hover:text-white"
        aria-label={dismissLabel}
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}
