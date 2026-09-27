const CACHE_NAME = "rehabverve-v3-aurora";
const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/offline.html",
  "/assets/css/styles.css",
  "/assets/css/styleload.css",
  "/assets/js/navmodal.js",
  "/assets/js/verve.js",
  "/assets/js/main.js",
  "/assets/js/auth.js",
  "/assets/js/mainload.js",
  "/assets/img/logo.svg",
  "/assets/img/logo.png",
  "/assets/img/profile.png"
];

/* INSTALL */
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS)).catch(() => {})
  );
  self.skipWaiting();
});

/* ACTIVATE — drop every older cache so no visitor keeps a stale design */
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)))
    )
  );
  self.clients.claim();
});

/* FETCH
   - Firebase / non-GET: bypass
   - Same-origin (HTML, CSS, JS, images): network first, cache fallback for offline
   - Cross-origin static (fonts, icon CSS): cache first */
self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET" || request.url.includes("firebase") || request.url.includes("googleapis.com/v0")) return;

  const url = new URL(request.url);
  const sameOrigin = url.origin === self.location.origin;

  if (sameOrigin) {
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
          }
          return response;
        })
        .catch(() =>
          caches.match(request).then(res => {
            if (res) return res;
            const isPage = (request.headers.get("accept") || "").includes("text/html");
            return isPage ? caches.match("/offline.html") : Response.error();
          })
        )
    );
    return;
  }

  if (/fonts\.(googleapis|gstatic)\.com|unpkg\.com\/boxicons/.test(request.url)) {
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
  }
});
