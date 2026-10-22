"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { CircleCheck, Loader2, Mail, TriangleAlert } from "lucide-react";
import { confirmNewsletterAction } from "@/server/actions/public";

type Copy = { title: string; lead: string; button: string; done: string; doneLead: string; failed: string; home: string };

export function NewsletterConfirm({ copy, homeHref }: { copy: Copy; homeHref: string }) {
  const token = useSearchParams().get("token") ?? "";
  const [state, setState] = useState<"idle" | "ok" | "failed">("idle");
  const [pending, start] = useTransition();

  if (state !== "idle") {
    const ok = state === "ok";
    return (
      <div role="status">
        {ok ? <CircleCheck className="mx-auto size-14 text-ash" /> : <TriangleAlert className="mx-auto size-14 text-[#b7791f]" />}
        <h1 className="mt-5 font-display text-3xl text-forest">{ok ? copy.done : copy.failed}</h1>
        {ok && <p className="mt-2 text-stone">{copy.doneLead}</p>}
        <Link href={homeHref} className="mt-8 inline-flex h-12 items-center rounded-full bg-forest px-6 font-semibold text-white hover:bg-pine">
          {copy.home}
        </Link>
      </div>
    );
  }

  return (
    <div>
      <Mail className="mx-auto size-14 text-ash" />
      <h1 className="mt-5 font-display text-3xl text-forest">{copy.title}</h1>
      <p className="mt-2 text-stone">{copy.lead}</p>
      <button
        type="button"
        disabled={pending || !token}
        onClick={() => start(async () => setState((await confirmNewsletterAction(token)).ok ? "ok" : "failed"))}
        className="mt-8 inline-flex h-12 items-center gap-2 rounded-full bg-forest px-6 font-semibold text-white hover:bg-pine disabled:opacity-60"
      >
        {pending && <Loader2 className="size-4 animate-spin" />}
        {copy.button}
      </button>
    </div>
  );
}
