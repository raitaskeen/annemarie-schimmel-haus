import Image from "next/image";
import type { ReactNode } from "react";
import { ShieldCheck } from "lucide-react";
import { Girih } from "@/components/site/girih";

/** Split-screen frame for sign-in, 2FA and password screens. */
export function AuthShell({ title, lead, children }: { title: string; lead?: string; children: ReactNode }) {
  return (
    <main className="grid min-h-dvh bg-paper lg:grid-cols-[1.05fr_1fr]">
      <section className="relative hidden overflow-hidden bg-forest text-white lg:flex lg:flex-col lg:justify-between lg:p-12">
        <Girih className="text-white/[0.05]" size={72} />
        <div className="absolute -right-40 -bottom-40 size-[520px] rounded-full bg-lime/15 blur-3xl" aria-hidden />
        <Image src="/brand/ash-wordmark.png" alt="Annemarie-Schimmel-Haus" width={1513} height={674} className="relative h-12 w-auto brightness-0 invert" priority />
        <div className="relative max-w-md">
          <p className="eyebrow text-lime">Staff workspace</p>
          <p className="mt-4 font-display text-5xl leading-[1.05]">Courses, events and people — in one calm place.</p>
          <p className="mt-6 flex items-center gap-2 text-sm text-white/60">
            <ShieldCheck className="size-4 text-lime" /> Protected by rate limiting, account lockout and optional two-factor authentication.
          </p>
        </div>
        <p className="relative text-xs text-white/40">© Annemarie-Schimmel-Haus · Lahore</p>
      </section>
      <section className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-sm">
          <Image src="/brand/ash-wordmark.png" alt="Annemarie-Schimmel-Haus" width={1513} height={674} className="mb-10 h-10 w-auto lg:hidden" priority />
          <h1 className="font-display text-4xl text-forest">{title}</h1>
          {lead && <p className="mt-2 text-sm text-stone">{lead}</p>}
          <div className="mt-8">{children}</div>
        </div>
      </section>
    </main>
  );
}
