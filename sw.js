const CACHE_NAME = "rehabverve-v2";
const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/offline.html",

  // CSS
  "/assets/css/styles.css",
  "/assets/css/styleload.css",

  // JS
  "/assets/js/main.js",
  "/assets/js/auth.js",
  "/assets/js/mainload.js",
  "/assets/js/track.js",

  // Images
  "/assets/img/logo.png",

  // External assets (safe to cache)
  "https://unpkg.com/boxicons@2.1.4/css/boxicons.min.css"
];

/* ======================
   INSTALL
====================== */
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

/* ======================
   ACTIVATE
====================== */
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

/* ======================
   FETCH
====================== */
self.addEventListener("fetch", event => {
  const request = event.request;

  // Ignore Firebase & API calls
  if (request.url.includes("firebase") || request.method !== "GET") {
    return;
  }

  // HTML pages → Network first
  if (request.headers.get("accept")?.includes("text/html")) {
    event.respondWith(
      fetch(request)
        .then(response => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
          return response;
        })
        .catch(() =>
          caches.match(request).then(res => res || caches.match("/offline.html"))
        )
    );
    return;
  }

  // Static assets → Cache first
  event.respondWith(
    caches.match(request).then(cached =>
      cached ||
      fetch(request).then(response => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
        return response;
      })
    )
  );
});