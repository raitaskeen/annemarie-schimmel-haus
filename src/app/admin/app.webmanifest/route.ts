/**
 * Separate installable app for staff ("ASH Admin"): opens straight into the admin,
 * gets its own icon and window, and never mixes with the public website app.
 * Contains no private data, so it is served without a session.
 */
export function GET() {
  const manifest = {
    id: "/admin",
    name: "ASH Admin: Annemarie-Schimmel-Haus",
    short_name: "ASH Admin",
    description: "Applications, courses, events, placement tests and website content for the Annemarie-Schimmel-Haus team.",
    lang: "en",
    start_url: "/admin?source=app",
    scope: "/admin",
    display: "standalone",
    display_override: ["window-controls-overlay", "standalone"],
    background_color: "#f3f2ec",
    theme_color: "#10241c",
    categories: ["business", "productivity"],
    icons: [
      { src: "/icons/admin-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/admin-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/admin-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Enrollments", url: "/admin/enrollments", icons: [{ src: "/icons/admin-192.png", sizes: "192x192" }] },
      { name: "Events & check-in", url: "/admin/events", icons: [{ src: "/icons/admin-192.png", sizes: "192x192" }] },
      { name: "Messages", url: "/admin/messages", icons: [{ src: "/icons/admin-192.png", sizes: "192x192" }] },
    ],
  };
  return Response.json(manifest, { headers: { "content-type": "application/manifest+json", "cache-control": "public, max-age=3600" } });
}
