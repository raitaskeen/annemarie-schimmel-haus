import type { Metadata } from "next";
import { lang } from "next/root-params";
import { GalleryGrid } from "@/components/site/gallery-grid";
import { PageHero } from "@/components/site/page-hero";
import { commonDictionary } from "@/i18n/common";
import { hasLocale, href, pick, type Locale } from "@/i18n/config";
import { getGallery } from "@/server/public/queries";

async function locale(): Promise<Locale> {
  const v = await lang();
  return hasLocale(v) ? v : "en";
}

const COPY = {
  en: { title: "Life at the Haus, in pictures.", lead: "Classrooms and garden, concerts and readings, lantern evenings and literary workshops, moments from Annemarie-Schimmel-Haus.", meta: "Gallery" },
  de: { title: "Das Leben im Haus, in Bildern.", lead: "Klassenräume und Garten, Konzerte und Lesungen, Laternenabende und Schreibwerkstätten: Momente aus dem Annemarie-Schimmel-Haus.", meta: "Galerie" },
};

export async function generateMetadata(): Promise<Metadata> {
  const l = await locale();
  return { title: COPY[l].meta, description: COPY[l].lead, alternates: { canonical: `/${l}/gallery` } };
}

export default async function GalleryPage() {
  const l = await locale();
  const d = commonDictionary(l);
  const photos = await getGallery();
  const categories = [...new Set(photos.map((p) => p.category))].map((c) => ({ value: c, label: d.galleryCategories[c] }));

  return (
    <>
      <PageHero breadcrumbs={[{ label: d.nav.home, href: href(l) }, { label: d.nav.gallery }]} eyebrow={d.nav.gallery} title={COPY[l].title} lead={COPY[l].lead} />
      <section className="py-14 lg:py-20">
        <div className="container-site">
          <GalleryGrid
            photos={photos.map((p) => ({ id: p.id, src: p.imagePath, width: p.width, height: p.height, alt: pick(p, "alt", l), caption: pick(p, "caption", l), category: p.category }))}
            categories={categories}
            labels={{ all: d.common.all, close: d.nav.close, prev: d.common.previous, next: d.common.next, open: l === "de" ? "Bild öffnen" : "Open photo" }}
          />
        </div>
      </section>
    </>
  );
}
