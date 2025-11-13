// public/sw.js
// Minimal service worker for VolleySmart installability

const CACHE_NAME = "volleysmart-v1";
const ASSETS = [
  "/",
  "/manifest.webmanifest",
  "/favicon.ico",
  "/favicon.svg",
  "/icons/apple-touch-icon.png",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.map((key) => (key === CACHE_NAME ? null : caches.delete(key)))
        )
      )
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.mode === "navigate") {
    // Network-first for navigation requests
    event.respondWith(fetch(event.request).catch(() => caches.match("/")));
  } else {
    // Cache-first for other assets
    event.respondWith(
      caches
        .match(event.request)
        .then((cached) => cached || fetch(event.request))
    );
  }
});
