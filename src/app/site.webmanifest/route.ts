/**
 * Web app manifest for the public website (installable on Android, iOS, Windows,
 * macOS, ChromeOS and Linux). The staff admin has its own: /admin/app.webmanifest.
 */
export function GET() {
  const manifest = {
    id: "/",
    name: "Annemarie-Schimmel-Haus Lahore",
    short_name: "ASH Lahore",
    description: "German courses, events, the placement test and Goethe exams at the German cultural centre in Lahore, with your application status at a glance.",
    lang: "en",
    dir: "ltr",
    start_url: "/en?source=app",
    scope: "/",
    display: "standalone",
    display_override: ["window-controls-overlay", "standalone"],
    orientation: "any",
    background_color: "#f7f3e9",
    theme_color: "#10241c",
    categories: ["education", "lifestyle"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "German courses", short_name: "Courses", url: "/en/courses?source=app", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Events", url: "/en/events?source=app", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Track my application", short_name: "Track", url: "/en/track?source=app", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Placement test", url: "/en/placement-test?source=app", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
    prefer_related_applications: false,
  };
  return Response.json(manifest, { headers: { "content-type": "application/manifest+json", "cache-control": "public, max-age=3600" } });
}
