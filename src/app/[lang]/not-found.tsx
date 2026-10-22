import Link from "next/link";
import { ArrowLeft, FileSearch } from "lucide-react";
import { Girih } from "@/components/site/girih";

export default function NotFound() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 text-ash/10">
        <Girih size={56} />
      </div>
      <div className="container-site relative grid min-h-[70dvh] place-items-center py-24 text-center">
        <div className="max-w-xl">
          <p className="font-display text-[9rem] leading-none text-ash/30">404</p>
          <h1 className="-mt-6 font-display text-4xl text-forest sm:text-5xl">This page took a different path.</h1>
          <p className="mt-4 text-lg text-stone">Diese Seite hat einen anderen Weg genommen. The link may be outdated, or the page has moved.</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/en" className="inline-flex h-12 items-center gap-2 rounded-full bg-forest px-6 font-semibold text-white hover:bg-pine">
              <ArrowLeft className="size-4" /> Home
            </Link>
            <Link href="/en/track" className="inline-flex h-12 items-center gap-2 rounded-full px-6 font-semibold text-forest ring-1 ring-ink/15 hover:bg-cream">
              <FileSearch className="size-4" /> Track application
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
