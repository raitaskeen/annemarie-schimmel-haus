import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { lang } from "next/root-params";
import { Suspense } from "react";
import { ArrowLeft } from "lucide-react";
import { Breadcrumbs } from "@/components/site/blocks";
import { Markdown } from "@/components/site/markdown";
import { commonDictionary } from "@/i18n/common";
import { hasLocale, href, pick, type Locale } from "@/i18n/config";
import { formatDate } from "@/lib/format";
import { getPostBySlug, getPostSlugs } from "@/server/public/queries";

async function locale(): Promise<Locale> {
  const v = await lang();
  return hasLocale(v) ? v : "en";
}

export async function generateStaticParams() {
  return (await getPostSlugs()).map((slug) => ({ slug }));
}

export async function generateMetadata(props: PageProps<"/[lang]/news/[slug]">): Promise<Metadata> {
  const [{ slug }, l] = await Promise.all([props.params, locale()]);
  const p = await getPostBySlug(slug);
  if (!p) return {};
  return {
    title: pick(p, "title", l),
    description: pick(p, "excerpt", l),
    alternates: { canonical: `/${l}/news/${slug}` },
    openGraph: { type: "article", publishedTime: p.publishedAt?.toISOString(), images: p.imagePath ? [{ url: p.imagePath }] : undefined },
  };
}

export default function PostPage(props: PageProps<"/[lang]/news/[slug]">) {
  return (
    <Suspense fallback={<div className="container-site h-[60dvh] animate-pulse py-20" />}>
      <PostContent params={props.params} />
    </Suspense>
  );
}

async function PostContent({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const l = await locale();
  const p = await getPostBySlug(slug);
  if (!p) notFound();
  const d = commonDictionary(l);
  return (
    <article className="pb-24">
      <header className="border-b border-ink/10 bg-paper">
        <div className="container-site max-w-4xl py-12 lg:py-16">
          <Breadcrumbs items={[{ label: d.nav.home, href: href(l) }, { label: d.nav.news, href: href(l, "/news") }, { label: pick(p, "title", l) }]} />
          <p className="eyebrow mt-8 text-ash">
            {d.postCategories[p.category]} · {p.publishedAt ? formatDate(p.publishedAt, l) : ""}
          </p>
          <h1 className="mt-4 font-display text-4xl leading-[1.05] text-forest sm:text-6xl">{pick(p, "title", l)}</h1>
          <p className="mt-5 text-xl leading-relaxed text-stone">{pick(p, "excerpt", l)}</p>
        </div>
      </header>
      {p.imagePath && (
        <div className="container-site max-w-5xl">
          <div className="relative -mt-px aspect-[16/8] overflow-hidden rounded-b-[2rem] bg-mint">
            <Image src={p.imagePath} alt="" fill priority sizes="(min-width: 1024px) 64rem, 100vw" className="object-cover" />
          </div>
        </div>
      )}
      <div className="container-site max-w-3xl pt-12">
        <Markdown className="text-lg">{pick(p, "body", l)}</Markdown>
        <Link href={href(l, "/news")} className="mt-12 inline-flex items-center gap-2 text-sm font-semibold text-pine">
          <ArrowLeft className="size-4" /> {d.nav.news}
        </Link>
      </div>
    </article>
  );
}
