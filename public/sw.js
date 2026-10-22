/*
 * Annemarie-Schimmel-Haus service worker.
 *
 * - Static files (JS/CSS chunks, fonts, images) are cached after first use.
 * - Public pages are network-first; the last copy is shown when offline.
 * - Private areas (admin, API, documents) and anything with a query string
 *   (e.g. /track?ref=…) are never stored. POST requests are never touched.
 * Bump VERSION to drop all old caches after a change to this file.
 */
const VERSION = "ash-2026-10-22";
const STATIC_CACHE = `${VERSION}-static`;
const PAGE_CACHE = `${VERSION}-pages`;
const OFFLINE_URL = "/offline.html";
const PRECACHE = [OFFLINE_URL, "/icons/icon-192.png", "/brand/ash-wordmark.png"];
const PRIVATE = /^\/(admin|api|files)(\/|$)/;
const STATIC = /^\/(_next\/static|images|brand|icons|media)\//;
const MAX_PAGES = 30;
const MAX_STATIC = 200;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => !key.startsWith(VERSION)).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

async function trim(cacheName, max) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  await Promise.all(keys.slice(0, Math.max(0, keys.length - max)).map((key) => cache.delete(key)));
}

function cacheable(response) {
  if (!response || !response.ok || response.type !== "basic") return false;
  const cc = response.headers.get("cache-control") || "";
  return !/no-store|private/.test(cc);
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (cacheable(response)) {
    const copy = response.clone();
    caches.open(STATIC_CACHE).then((cache) => cache.put(request, copy).then(() => trim(STATIC_CACHE, MAX_STATIC)));
  }
  return response;
}

async function networkFirstPage(request) {
  try {
    const response = await fetch(request);
    if (cacheable(response)) {
      const copy = response.clone();
      caches.open(PAGE_CACHE).then((cache) => cache.put(request, copy).then(() => trim(PAGE_CACHE, MAX_PAGES)));
    }
    return response;
  } catch {
    return (await caches.match(request, { ignoreVary: true })) || (await caches.match(OFFLINE_URL));
  }
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (PRIVATE.test(url.pathname)) {
    // Never cache private responses; only show the offline page if the network is gone.
    if (request.mode === "navigate") event.respondWith(fetch(request).catch(() => caches.match(OFFLINE_URL)));
    return;
  }
  if (STATIC.test(url.pathname) || /\.(?:woff2|png|jpe?g|webp|avif|svg|ico)$/.test(url.pathname)) {
    event.respondWith(cacheFirst(request));
    return;
  }
  // Page navigations without a query string (query strings can carry application numbers).
  if (request.mode === "navigate" && !url.search) {
    event.respondWith(networkFirstPage(request));
  }
});
