import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base = process.env.APP_URL ?? "http://localhost:4000";
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/api/", "/files/", "/en/enroll/", "/de/enroll/", "/en/track", "/de/track"] }],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
