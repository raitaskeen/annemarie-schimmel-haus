import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import r2IncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache";
import doQueue from "@opennextjs/cloudflare/overrides/queue/do-queue";
import d1NextTagCache from "@opennextjs/cloudflare/overrides/tag-cache/d1-next-tag-cache";

/**
 * Cloudflare Workers build (`bun run cf:build`). Bindings live in wrangler.jsonc.
 *  - Page and "use cache" entries: R2 (strongly consistent; KV writes are linked to
 *    hanging requests in opennextjs/opennextjs-cloudflare#1464).
 *  - Tags for updateTag()/revalidateTag() from the admin: D1, so edits show up at once.
 *  - Background revalidation: a Durable Object queue that dedupes refreshes.
 */
export default defineCloudflareConfig({
  incrementalCache: r2IncrementalCache,
  tagCache: d1NextTagCache,
  queue: doQueue,
});
