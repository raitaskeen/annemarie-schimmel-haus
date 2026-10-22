"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import { CircleCheck, Download, Share, Smartphone, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useInstall, type Platform } from "./use-install";

export type InstallLabels = {
  install: string;
  installed: string;
  open: string;
  howTitle: string;
  ios: string;
  iosOther: string;
  mac: string;
  android: string;
  desktop: string;
  firefox: string;
  close: string;
  bannerTitle?: string;
  bannerText?: string;
  later?: string;
};

function steps(platform: Platform, l: InstallLabels): string[] {
  const all: Record<Platform, string[]> = {
    ios: [l.ios],
    "ios-other": [l.iosOther, l.ios],
    "mac-safari": [l.mac, l.desktop],
    android: [l.android],
    desktop: [l.desktop, l.mac],
    "firefox-desktop": [l.firefox, l.desktop],
  };
  return all[platform];
}

export function HowToDialog({ open, onOpenChange, labels, platform }: { open: boolean; onOpenChange: (o: boolean) => void; labels: InstallLabels; platform: Platform }) {
  const [first, ...more] = steps(platform, labels);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Smartphone className="size-5 text-ash" /> {labels.howTitle}
          </DialogTitle>
          <DialogDescription className="sr-only">{labels.howTitle}</DialogDescription>
        </DialogHeader>
        <p className="flex gap-3 rounded-2xl bg-mist p-4 text-sm leading-relaxed text-ink">
          {platform.startsWith("ios") ? <Share className="mt-0.5 size-5 shrink-0 text-pine" /> : <Download className="mt-0.5 size-5 shrink-0 text-pine" />}
          {first}
        </p>
        {more.map((s) => (
          <p key={s} className="text-xs leading-relaxed text-muted-foreground">
            {s}
          </p>
        ))}
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
          {labels.close}
        </Button>
      </DialogContent>
    </Dialog>
  );
}

/** Install button: native dialog where the browser offers one, instructions everywhere else. */
export function InstallButton({ labels, className, tone = "light" }: { labels: InstallLabels; className?: string; tone?: "light" | "dark" }) {
  const install = useInstall();
  const [help, setHelp] = useState(false);
  if (!install.ready) return null;
  if (install.standalone || install.installed) {
    return (
      <p className={cn("flex items-center gap-2 text-sm", tone === "dark" ? "text-white/70" : "text-muted-foreground", className)}>
        <CircleCheck className="size-4 text-lime" /> {install.standalone ? labels.open : labels.installed}
      </p>
    );
  }
  return (
    <>
      <Button
        type="button"
        onClick={async () => {
          if (!(await install.prompt())) setHelp(true);
        }}
        className={cn(
          "h-11 rounded-full font-semibold",
          tone === "dark" ? "bg-white text-forest hover:bg-lime" : "bg-forest text-white hover:bg-pine",
          className,
        )}
      >
        <Download /> {labels.install}
      </Button>
      <HowToDialog open={help} onOpenChange={setHelp} labels={labels} platform={install.platform} />
    </>
  );
}

const DISMISS_KEY = "ash-install-dismissed";
const VIEWS_KEY = "ash-page-views";
const noop = () => () => {};

/** Evaluated once per page load: not dismissed recently, and this is at least the second page view. */
let bannerState: { dismissed: boolean; returning: boolean } | null = null;
function readBannerState() {
  if (bannerState) return bannerState;
  try {
    const dismissed = Date.now() - Number(localStorage.getItem(DISMISS_KEY) ?? 0) < 30 * 86_400_000;
    const views = Number(sessionStorage.getItem(VIEWS_KEY) ?? 0) + 1;
    sessionStorage.setItem(VIEWS_KEY, String(views));
    bannerState = { dismissed, returning: views >= 2 };
  } catch {
    bannerState = { dismissed: true, returning: false };
  }
  return bannerState;
}
const SERVER_BANNER = { dismissed: true, returning: false };

/**
 * Small bottom banner on phones, from the second page view on, when installing is
 * possible (Android prompt or iPhone Safari). Dismissal is remembered for 30 days.
 */
export function InstallBanner({ labels }: { labels: InstallLabels }) {
  const install = useInstall();
  // Never cover a form: no banner where people apply, register, track or write to us.
  const onFormPage = /\/(enroll|track|contact|placement-test|events\/[^/]+)/.test(usePathname() ?? "");
  const banner = useSyncExternalStore(noop, readBannerState, () => SERVER_BANNER);
  const [lingered, setLingered] = useState(false);
  const [closed, setClosed] = useState(false);
  const [help, setHelp] = useState(false);
  useEffect(() => {
    // First-time visitors see the offer only after spending a little while on the page.
    const timer = setTimeout(() => setLingered(true), 25_000);
    return () => clearTimeout(timer);
  }, []);
  const eligible = install.ready && !install.standalone && !install.installed && (install.canPrompt || install.platform === "ios");
  const allowed = !banner.dismissed && (banner.returning || lingered);
  if (!eligible || !allowed || closed || onFormPage) return help ? <HowToDialog open onOpenChange={setHelp} labels={labels} platform={install.platform} /> : null;
  const dismiss = () => {
    setClosed(true);
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      /* private mode */
    }
  };
  return (
    <div role="region" aria-label={labels.bannerTitle} className="fixed inset-x-3 bottom-3 z-50 pb-[env(safe-area-inset-bottom)] sm:hidden">
      <div className="flex items-center gap-3 rounded-2xl bg-forest p-3 pr-2 text-white shadow-[0_20px_50px_-20px_rgb(16_36_28/0.8)] ring-1 ring-white/10">
        {/* eslint-disable-next-line @next/next/no-img-element -- tiny static icon */}
        <img src="/icons/icon-192.png" alt="" width={44} height={44} className="size-11 shrink-0 rounded-xl" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">{labels.bannerTitle}</p>
          <p className="line-clamp-2 text-xs text-white/70">{labels.bannerText}</p>
        </div>
        <Button
          type="button"
          size="sm"
          className="h-9 shrink-0 rounded-full bg-lime px-3 font-semibold text-forest hover:bg-white"
          onClick={async () => {
            if (!(await install.prompt())) setHelp(true);
            setClosed(true);
          }}
        >
          {labels.install}
        </Button>
        <button type="button" onClick={dismiss} className="grid size-8 shrink-0 place-items-center rounded-full text-white/60 hover:bg-white/10 hover:text-white" aria-label={labels.later}>
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}
