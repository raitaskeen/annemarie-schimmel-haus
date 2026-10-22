import type { Metadata } from "next";
import NotFound from "../not-found";

/**
 * Prerendered copy of the not-found page. The proxy rewrites unknown top-level paths
 * here with status 404, so a flood of made-up URLs is served like a static page instead
 * of rendering the not-found boundary for every request.
 */
export const metadata: Metadata = { title: "Page not found", robots: { index: false, follow: false } };

export default function MissingPage() {
  return <NotFound />;
}
