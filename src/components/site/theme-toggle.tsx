"use client";

import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

const noop = () => () => {};

/** Light / dark switch. Follows the device setting until the visitor chooses (remembered in this browser). */
export function SiteThemeToggle({ labels, className }: { labels: { dark: string; light: string }; className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(noop, () => true, () => false);
  const dark = mounted && resolvedTheme === "dark";
  return (
    <button
      type="button"
      onClick={() => setTheme(dark ? "light" : "dark")}
      aria-label={dark ? labels.light : labels.dark}
      title={dark ? labels.light : labels.dark}
      className={cn("grid size-10 place-items-center rounded-full text-ink transition-colors hover:bg-ink/5", className)}
    >
      {dark ? <Sun className="size-5" /> : <Moon className="size-5" />}
    </button>
  );
}
