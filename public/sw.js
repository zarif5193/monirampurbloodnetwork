/*
 * Manirampur Blood Network service worker.
 *
 * Security policy: this worker caches only static shell assets.
 * It never caches API responses, donor data, notifications or any
 * authenticated/private content, so stale donor availability can never be
 * presented as current and private data cannot leak into shared caches.
 */
const CACHE_NAME = "mbn-shell-v1";
const SHELL_ASSETS = ["/icon.svg", "/manifest.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_ASSETS)).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Never intercept API or navigation traffic — always go to the network.
  if (url.pathname.startsWith("/api/") || request.mode === "navigate") return;

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request)
        .then((response) => {
          const isStatic =
            url.pathname.startsWith("/_next/static") || SHELL_ASSETS.includes(url.pathname);
          if (isStatic && response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => cached ?? Response.error());
    }),
  );
});
