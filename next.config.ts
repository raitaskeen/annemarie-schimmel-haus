import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

/**
 * Content-Security-Policy. Everything is served from this origin (fonts are
 * self-hosted by next/font, images come from /images, /brand and /media).
 * Static (prerendered) pages cannot carry per-request nonces, so inline
 * scripts emitted by Next.js are allowed; nothing in the app renders
 * user-supplied HTML (Markdown is rendered without raw HTML).
 */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isProd ? "" : " 'unsafe-eval'"}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  `connect-src 'self'${isProd ? "" : " ws: wss:"}`,
  "media-src 'self'",
  "frame-src https://www.google.com https://maps.google.com",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  ...(isProd ? ["upgrade-insecure-requests"] : []),
].join("; ");

const securityHeaders = [
  ...(isProd
    ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" }]
    : []),
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()",
  },
];

/** Private surfaces are never stored by shared caches or indexed. */
const privateHeaders = [
  { key: "Cache-Control", value: "private, no-store, max-age=0" },
  { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
];

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  poweredByHeader: false,
  reactStrictMode: true,
  serverExternalPackages: ["pg", "sharp", "embedded-postgres"],
  // pg switches to its Cloudflare socket driver inside Workers; tracing on Node never sees that
  // import, so the Workers build (docs/CLOUDFLARE.md) would miss it without this.
  outputFileTracingIncludes: { "/*": ["./node_modules/pg-cloudflare/**/*"] },
  images: {
    formats: ["image/avif", "image/webp"],
    qualities: [60, 75, 85],
    minimumCacheTTL: 2_678_400,
    localPatterns: [
      { pathname: "/images/**", search: "" },
      { pathname: "/brand/**", search: "" },
      { pathname: "/icons/**", search: "" },
      { pathname: "/media/**", search: "" },
    ],
  },
  experimental: {
    serverActions: { bodySizeLimit: "16mb" },
    proxyClientMaxBodySize: "16mb",
    // NEXT_DEV_CACHE=off skips Turbopack's on-disk dev cache (saves RAM on small machines
    // and recovers from a corrupted cache after a crash).
    turbopackFileSystemCacheForDev: process.env.NEXT_DEV_CACHE !== "off",
    // NEXT_BUILD_CPUS=2 limits parallel page generation during `next build` (small servers and
    // busy laptops otherwise run out of memory); unset uses Next.js' default.
    ...(process.env.NEXT_BUILD_CPUS ? { cpus: Number(process.env.NEXT_BUILD_CPUS) } : {}),
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      // Private documents and email previews send their own, stricter sandbox CSP.
      { source: "/((?!files/|admin/preview/).*)", headers: [{ key: "Content-Security-Policy", value: csp }] },
      { source: "/admin/:path*", headers: privateHeaders },
      { source: "/admin", headers: privateHeaders },
      { source: "/api/:path*", headers: privateHeaders },
      { source: "/files/:path*", headers: privateHeaders },
      // The service worker must always be revalidated so fixes reach installed apps quickly.
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, max-age=0, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
