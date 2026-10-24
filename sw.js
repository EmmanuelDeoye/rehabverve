// Service worker: network-first for the site's own files (so updates show immediately),
// cache-first for icon fonts, and an offline page when there is no connection.
// Firebase data is never cached here — the SDK talks to Firebase directly.
const CACHE_NAME = 'rehabverve-v6';
const STATIC_ASSETS = [
    './',
    'index.html',
    'offline.html',
    'manifest.json',
    'assets/css/app.css',
    'assets/js/theme.js',
    'assets/js/data.js',
    'assets/js/app.js',
    'assets/js/router.js',
    'assets/js/chat.js',
    'assets/js/firebase-init.js',
    'assets/js/cards.js',
    'assets/js/home.js',
    'pages/home.html',
    'assets/img/logo-96.png',
    'assets/img/profile.png',
    'assets/img/icon-192.png'
];

self.addEventListener('install', event => {
    event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS)).catch(() => {}));
    self.skipWaiting();
});

// Drop older caches so nobody keeps the previous (heavier) design
self.addEventListener('activate', event => {
    event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))));
    self.clients.claim();
});

self.addEventListener('fetch', event => {
    const request = event.request;
    if (request.method !== 'GET') return;
    const url = new URL(request.url);

    if (url.origin === self.location.origin) {
        event.respondWith(
            fetch(request)
                .then(response => {
                    if (response.ok) {
                        const copy = response.clone();
                        caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
                    }
                    return response;
                })
                .catch(() => caches.match(request).then(hit => {
                    if (hit) return hit;
                    const isPage = (request.headers.get('accept') || '').includes('text/html');
                    return isPage ? caches.match('offline.html') : Response.error();
                }))
        );
        return;
    }

    // Icon font and the pinned Firebase SDK files never change for a given URL
    if (/unpkg\.com\/boxicons@|gstatic\.com\/firebasejs\//.test(request.url)) {
        event.respondWith(caches.match(request).then(hit => hit || fetch(request).then(response => {
            if (response.ok) {
                const copy = response.clone();
                caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
            }
            return response;
        })));
    }
});
