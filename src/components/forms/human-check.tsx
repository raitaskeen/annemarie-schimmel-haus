"use client";

import { useCallback, useEffect, useId, useState } from "react";
import { RefreshCw, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

type Challenge = { a: number; b: number; op: "+" | "−" | "×"; token: string };

const SPOKEN = {
  en: { "+": "plus", "−": "minus", "×": "times", ask: "What is" },
  de: { "+": "plus", "−": "minus", "×": "mal", ask: "Wie viel ist" },
} as const;

async function fetchChallenge(): Promise<Challenge | null> {
  try {
    const res = await fetch("/api/challenge", { cache: "no-store" });
    return res.ok ? ((await res.json()) as Challenge) : null;
  } catch {
    return null;
  }
}

/**
 * "Bot quiz": a small arithmetic question issued and verified by the server
 * (signed, single-use, minimum answer time). No third-party script, no tracking.
 */
export function HumanCheck({
  locale,
  answer,
  onAnswer,
  onToken,
  refreshKey = 0,
  error,
  labels,
}: {
  locale: "en" | "de";
  answer: string;
  onAnswer: (value: string) => void;
  onToken: (token: string) => void;
  refreshKey?: number;
  error?: string;
  labels: { title: string; prompt: string; refresh: string };
}) {
  const id = useId();
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [loading, setLoading] = useState(true);

  const apply = useCallback((data: Challenge | null) => {
    setChallenge(data);
    setLoading(false);
    if (data) {
      onToken(data.token);
      onAnswer("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // A fresh question on mount and whenever the parent asks (e.g. after a failed submission).
  useEffect(() => {
    let live = true;
    void fetchChallenge().then((data) => live && apply(data));
    return () => {
      live = false;
    };
  }, [apply, refreshKey]);

  const load = () => {
    setLoading(true);
    void fetchChallenge().then(apply);
  };

  const spoken = SPOKEN[locale];
  return (
    <div className={cn("rounded-2xl border border-dashed bg-cream/80 p-4", error ? "border-destructive/60" : "border-ash/40")}>
      <div className="flex items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-sm font-semibold text-forest">
          <ShieldCheck className="size-4 text-ash" />
          {labels.title}
        </p>
        <button type="button" onClick={load} className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium text-pine hover:bg-mist" aria-label={labels.refresh}>
          <RefreshCw className={cn("size-3.5", loading && "animate-spin")} />
          <span className="hidden sm:inline">{labels.refresh}</span>
        </button>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <label htmlFor={id} className="font-display text-2xl text-forest tabular">
          {challenge ? (
            <>
              <span className="sr-only">
                {spoken.ask} {challenge.a} {spoken[challenge.op]} {challenge.b}?
              </span>
              <span aria-hidden>
                {challenge.a} {challenge.op} {challenge.b} =
              </span>
            </>
          ) : (
            <span className="inline-block h-7 w-28 animate-pulse rounded-lg bg-ink/10" />
          )}
        </label>
        <input
          id={id}
          inputMode="numeric"
          autoComplete="off"
          pattern="-?[0-9]*"
          maxLength={4}
          value={answer}
          onChange={(e) => onAnswer(e.target.value.replace(/[^0-9-]/g, ""))}
          aria-invalid={!!error || undefined}
          aria-describedby={error ? `${id}-err` : `${id}-hint`}
          className="h-12 w-24 rounded-xl border border-input bg-white px-3 text-center font-display text-2xl tabular focus:border-ash focus:ring-4 focus:ring-ash/15 focus:outline-none"
        />
      </div>
      <p id={`${id}-hint`} className={cn("mt-2 text-xs text-stone", error && "sr-only")}>
        {labels.prompt}
      </p>
      {error && (
        <p id={`${id}-err`} role="alert" className="mt-2 text-xs font-medium text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
