/**
 * True inside a Cloudflare Worker (workerd), false on the Node.js server and at build time.
 * Code that needs Cloudflare bindings (Hyperdrive, Images) branches on this.
 */
export const onCloudflareWorkers = typeof navigator !== "undefined" && navigator.userAgent === "Cloudflare-Workers";
