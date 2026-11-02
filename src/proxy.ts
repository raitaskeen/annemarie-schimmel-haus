import { NextResponse, type NextRequest } from "next/server";
import { PUBLIC_SECTIONS } from "@/lib/public-sections";

/**
 * Edge proxy:
 *  1. Public pages live under /en and /de. Requests without a locale are
 *     redirected using the browser's Accept-Language preference.
 *  2. /admin is optimistically guarded: without a session cookie the visitor is
 *     sent to the login page. (Real authorization happens in the Data Access
 *     Layer on every request; this only avoids rendering work for anonymous users.)
 */
type Locale = "en" | "de";
const PUBLIC_ADMIN = /^\/admin\/(login|forgot-password|reset-password|invite)(\/|$)/;
/**
 * Paths only vulnerability scanners ask for (PHP, WordPress, dotfiles, backups). They get a
 * tiny 404 here instead of a fully rendered page, so a scan cannot tie up the server.
 */
const SCANNER =
  /\.(php\d?|aspx?|jsp|cgi|env|ini|bak|sql|sqlite|old|swp|log|ya?ml|toml)$|(^|\/)(\.git|\.svn|\.hg|\.env|\.aws|\.ssh|\.DS_Store|wp-admin|wp-content|wp-includes|wp-json|xmlrpc|phpmyadmin|cgi-bin|vendor\/phpunit)(\/|$)/i;
const SEARCH_BOT = /googlebot|bingbot|duckduckbot|yandexbot|baiduspider|applebot|slurp|petalbot/i;
/**
 * Files that really exist at the site root (public/ and app/ metadata routes). Any other
 * single-segment path with an extension (/foo.txt, /manifest.json …) gets a cheap 404 here
 * instead of falling through to the locale layout, which is slow and, on Workers, unreliable.
 */
const ROOT_FILES = new Set(["/offline.html", "/sw.js", "/favicon.ico", "/icon.svg", "/apple-icon.png", "/site.webmanifest", "/robots.txt", "/sitemap.xml"]);
const ROOT_FILE_LIKE = /^\/[^/]+\.[a-z0-9]+$/i;
const notFoundText = () => new NextResponse("Not found", { status: 404, headers: { "content-type": "text/plain", "cache-control": "public, max-age=3600" } });

function preferredLocale(header: string | null): Locale {
  if (!header) return "en";
  const ranked = header
    .split(",")
    .map((part) => {
      const [tag, q] = part.trim().split(";q=");
      return { lang: tag.toLowerCase().split("-")[0], q: q ? Number(q) : 1 };
    })
    .sort((a, b) => b.q - a.q);
  for (const { lang } of ranked) if (lang === "de" || lang === "en") return lang;
  return "en";
}

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (SCANNER.test(pathname)) return notFoundText();
  if (ROOT_FILE_LIKE.test(pathname)) return ROOT_FILES.has(pathname) ? NextResponse.next() : notFoundText();

  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    const hasSession = request.cookies.has("__Host-ash_session") || request.cookies.has("ash_session");
    if (!hasSession && !PUBLIC_ADMIN.test(pathname)) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin/login";
      url.search = pathname === "/admin" ? "" : `?next=${encodeURIComponent(pathname)}`;
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  const localized = /^\/(en|de)(?=\/|$)(?:\/([^/]+))?/.exec(pathname);
  if (localized) {
    const [, locale, section] = localized;
    // Unknown section: visitors get the prerendered not-found page (cheap even under a flood
    // of made-up URLs). Next cannot attach a 404 status to a rewrite, so it carries noindex,
    // and search engines are sent to the catch-all route, which answers with a real 404.
    if (section && !PUBLIC_SECTIONS.has(section) && !SEARCH_BOT.test(request.headers.get("user-agent") ?? "")) {
      const url = request.nextUrl.clone();
      url.pathname = `/${locale}/missing`;
      url.search = "";
      const res = NextResponse.rewrite(url);
      res.headers.set("x-robots-tag", "noindex");
      return res;
    }
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  url.pathname = `/${preferredLocale(request.headers.get("accept-language"))}${pathname === "/" ? "" : pathname}`;
  url.search = search;
  return NextResponse.redirect(url, 307);
}

export const config = {
  matcher: [
    // Everything except Next internals, API routes, uploaded media, private files and static assets.
    "/((?!_next/|api/|media/|files/|images/|brand/|favicon.ico|robots.txt|sitemap.xml|manifest.webmanifest|icon|apple-icon|.*\\.[a-z0-9]+$).*)",
    // Scanner probes that the rule above skips because they end in a file extension.
    "/(.*\\.(?:php\\d?|aspx?|jsp|cgi|env|ini|bak|sql|sqlite|old|swp|log|ya?ml|toml))",
    // File-like paths at the site root (see ROOT_FILES).
    "/([^/]+\\.[a-zA-Z0-9]+)",
  ],
};
