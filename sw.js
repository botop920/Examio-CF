
const CACHE_NAME = 'examio-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/index.tsx',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        // Attempt to cache core files, but don't fail if some missing in dev
        return cache.addAll(urlsToCache).catch(err => console.log('SW Cache warning:', err));
      })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Navigation requests: Network first, fallback to cache
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          return caches.match(event.request);
        })
    );
    return;
  }

  // Asset requests: Stale-while-revalidate strategy
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        const fetchPromise = fetch(event.request).then(
          (networkResponse) => {
            if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
               const responseToCache = networkResponse.clone();
               caches.open(CACHE_NAME).then((cache) => {
                 cache.put(event.request, responseToCache);
               });
            }
            return networkResponse;
          }
        ).catch(() => {
           // Network failed, nothing to do (response already has cache if available)
        });
        return response || fetchPromise;
      })
  );
});
