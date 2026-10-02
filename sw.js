const CACHE_NAME = 'tag-list-v78-visual-update-1';
const APP_SHELL = [
  './',
  './index.html',
  './css/app.css',
  './js/storage.js',
  './js/tags.js',
  './js/export.js',
  './js/ocr-utils.js',
  './js/ocr.js',
  './js/import.js',
  './js/ui.js',
  './manifest.webmanifest',
  './favicon-64.png',
  './icon-180.png',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) {
    event.respondWith(fetch(request));
    return;
  }

  // Navigation: return cached shell immediately when available, while updating it
  // in the background. First visit still goes to network and then gets cached.
  if (request.mode === 'navigate') {
    event.respondWith(
      caches.match(request).then(cached => {
        const network = fetch(request).then(response => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(request, copy)).catch(() => {});
          }
          return response;
        }).catch(() => null);
        return cached || network.then(response => response || caches.match('./index.html'));
      })
    );
    return;
  }

  // App shell/assets: cache-first gives the fastest repeat launch on iPhone/Android.
  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached;
      return fetch(request).then(response => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, copy)).catch(() => {});
        }
        return response;
      }).catch(() => Response.error());
    })
  );
});
