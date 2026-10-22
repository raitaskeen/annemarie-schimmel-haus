import { Suspense } from "react";
import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { lang } from "next/root-params";
import "../globals.css";
import { fontVariables } from "../fonts";
import { MotionProvider } from "@/components/motion";
import { SiteThemeProvider } from "@/components/site/theme-provider";
import { InstallBanner } from "@/components/pwa/install-ui";
import { ServiceWorker } from "@/components/pwa/service-worker";
import { captureInstallPromptScript } from "@/components/pwa/capture-script";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { Toaster } from "@/components/ui/sonner";
import { commonDictionary } from "@/i18n/common";
import { hasLocale, locales } from "@/i18n/config";

export function generateStaticParams() {
  return locales.map((l) => ({ lang: l }));
}

const META = {
  en: {
    title: "Annemarie-Schimmel-Haus: German Cultural Centre Lahore",
    description:
      "Learn German from A1 to C1 on campus or online, take the placement test, prepare for Goethe-Institut exams and join cultural events at the German cultural centre in Lahore.",
  },
  de: {
    title: "Annemarie-Schimmel-Haus: Deutsches Kulturzentrum Lahore",
    description:
      "Deutsch lernen von A1 bis C1 vor Ort oder online, Einstufungstest, Vorbereitung auf Goethe-Prüfungen und Kulturveranstaltungen im deutschen Kulturzentrum in Lahore.",
  },
};

export async function generateMetadata(): Promise<Metadata> {
  const value = await lang();
  const locale = hasLocale(value) ? value : "en";
  const m = META[locale];
  return {
    metadataBase: new URL(process.env.APP_URL ?? "http://localhost:4000"),
    title: { default: m.title, template: "%s · Annemarie-Schimmel-Haus" },
    description: m.description,
    applicationName: "Annemarie-Schimmel-Haus",
    manifest: "/site.webmanifest",
    appleWebApp: { capable: true, title: "ASH Lahore", statusBarStyle: "default" },
    alternates: { languages: { en: "/en", de: "/de", "x-default": "/en" } },
    openGraph: {
      type: "website",
      siteName: "Annemarie-Schimmel-Haus",
      locale: locale === "de" ? "de_DE" : "en_PK",
      title: m.title,
      description: m.description,
      // JPG: accepted by every platform that renders link previews (WhatsApp, Facebook, LinkedIn, X).
      images: [{ url: "/brand/og-image.jpg", width: 1200, height: 630, alt: "Annemarie-Schimmel-Haus, Lahore" }],
    },
    twitter: { card: "summary_large_image" },
    formatDetection: { telephone: false },
  };
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f3e9" },
    { media: "(prefers-color-scheme: dark)", color: "#0c1611" },
  ],
  colorScheme: "light dark",
  // Lets the install banner and bottom bars respect the iPhone home indicator.
  viewportFit: "cover",
};

export default async function PublicLayout({ children }: LayoutProps<"/[lang]">) {
  const value = await lang();
  if (!hasLocale(value)) notFound();
  return (
    <html lang={value} className={fontVariables} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: captureInstallPromptScript }} />
      </head>
      <body className="flex min-h-dvh flex-col">
        <SiteThemeProvider>
        <MotionProvider>
          <SiteHeader locale={value} />
          <main id="main" className="flex-1">
            {children}
          </main>
          <SiteFooter locale={value} />
          <Toaster position="top-center" richColors />
          <Suspense fallback={null}>
            <InstallBanner labels={commonDictionary(value).app} />
          </Suspense>
          <ServiceWorker />
        </MotionProvider>
        </SiteThemeProvider>
      </body>
    </html>
  );
}
