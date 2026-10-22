"use client";

import { useState, useTransition } from "react";
import { ArrowRight, CircleCheck, Loader2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { newsletterAction } from "@/server/actions/public";
import type { Locale } from "@/i18n/config";

type Copy = {
  placeholder: string;
  button: string;
  consent: string;
  success: string;
  already: string;
  error: string;
  invalid: string;
};

export function NewsletterForm({ locale, copy }: { locale: Locale; copy: Copy }) {
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [pending, start] = useTransition();

  if (message?.tone === "ok") {
    return (
      <p role="status" className="flex items-start gap-2 rounded-2xl bg-white/10 p-4 text-sm text-white">
        <CircleCheck className="mt-0.5 size-4 shrink-0 text-lime" />
        {message.text}
      </p>
    );
  }

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        const website = new FormData(e.currentTarget).get("website");
        if (!consent || !/^\S+@\S+\.\S+$/.test(email)) {
          setMessage({ tone: "error", text: copy.invalid });
          return;
        }
        start(async () => {
          const res = await newsletterAction(locale, { email, consent: true, website: website ?? "" });
          if (res.ok) setMessage({ tone: "ok", text: res.already ? copy.already : copy.success });
          else setMessage({ tone: "error", text: copy.error });
        });
      }}
      className="grid gap-3"
    >
      <div className="flex rounded-full bg-white/10 p-1 ring-1 ring-white/15 focus-within:ring-2 focus-within:ring-lime">
        <label htmlFor="newsletter-email" className="sr-only">
          {copy.placeholder}
        </label>
        <input
          id="newsletter-email"
          type="email"
          autoComplete="email"
          inputMode="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={copy.placeholder}
          className="min-w-0 flex-1 bg-transparent px-4 text-sm text-white [--autofill-fg:#fff] placeholder:text-white/50 focus:outline-none"
        />
        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-10 items-center gap-1.5 rounded-full bg-lime px-4 text-sm font-semibold text-forest transition-colors hover:bg-white disabled:opacity-70"
        >
          {pending ? <Loader2 className="size-4 animate-spin" /> : <ArrowRight className="size-4" />}
          <span className="hidden sm:inline">{copy.button}</span>
        </button>
      </div>
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
      <label className="flex items-start gap-2.5 text-xs leading-relaxed text-white/70">
        <Checkbox
          checked={consent}
          onCheckedChange={(v) => setConsent(v === true)}
          className="mt-0.5 border-white/40 data-[state=checked]:border-lime data-[state=checked]:bg-lime data-[state=checked]:text-forest"
        />
        {copy.consent}
      </label>
      {message?.tone === "error" && (
        <p role="alert" className="text-xs text-[#ffb4a8]">
          {message.text}
        </p>
      )}
    </form>
  );
}
