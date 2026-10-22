import type { Metadata, Viewport } from "next";
import "../globals.css";
import { fontVariables } from "../fonts";
import { AdminProviders } from "@/components/admin/providers";
import { ServiceWorker } from "@/components/pwa/service-worker";
import { captureInstallPromptScript } from "@/components/pwa/capture-script";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_URL ?? "http://localhost:4000"),
  title: { default: "Admin", template: "%s · ASH Admin" },
  applicationName: "ASH Admin",
  manifest: "/admin/app.webmanifest",
  appleWebApp: { capable: true, title: "ASH Admin", statusBarStyle: "black-translucent" },
  icons: { icon: "/icons/admin-192.png", apple: "/icons/admin-192.png" },
  robots: { index: false, follow: false, nocache: true },
  referrer: "no-referrer",
};

export const viewport: Viewport = { themeColor: "#10241c", viewportFit: "cover" };

export default function AdminRootLayout({ children }: LayoutProps<"/admin">) {
  return (
    <html lang="en" className={fontVariables} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: captureInstallPromptScript }} />
      </head>
      <body className="admin-theme min-h-dvh bg-background text-foreground antialiased">
        <AdminProviders>{children}</AdminProviders>
        <ServiceWorker />
      </body>
    </html>
  );
}
