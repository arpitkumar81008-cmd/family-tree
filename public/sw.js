const CACHE_NAME = 'vanshvriksha-static-v14';

const PRECACHE_URLS = [
  '/',
  '/manifest.webmanifest',
  '/images/tree-logo.png'
];

const BYPASS_HOSTS = new Set([
  'firestore.googleapis.com',
  'identitytoolkit.googleapis.com',
  'securetoken.googleapis.com',
  'googletagmanager.com',
  'www.googletagmanager.com',
  'google-analytics.com',
  'www.google-analytics.com',
  'api.emailjs.com'
]);

const offlineFallbackResponse = () =>
  new Response('Offline — please reconnect to load this resource.', {
    status: 503,
    statusText: 'Service Unavailable',
    headers: { 'Content-Type': 'text/plain; charset=utf-8' }
  });

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Only handle GET requests
  if (request.method !== 'GET') {
    return;
  }

  let url;
  try {
    url = new URL(request.url);
  } catch {
    return;
  }

  // Only intercept HTTP(S) requests; never intercept blob: or data: URLs
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return;
  }

  // Never intercept Firebase, Auth, Analytics, or EmailJS hosts
  if (BYPASS_HOSTS.has(url.hostname)) {
    return;
  }

  // Only cache same-origin requests
  if (url.origin !== self.location.origin) {
    return;
  }

  const isNavigation =
    request.mode === 'navigate' ||
    (request.headers.get('accept') || '').includes('text/html');

  if (isNavigation) {
    // Network-first for HTML navigations; normalize cache key to '/' so ?code= secrets are never stored in Cache keys
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.ok && networkResponse.type === 'basic') {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put('/', copy)).catch(() => {});
          }
          return networkResponse;
        })
        .catch(() =>
          caches.match('/').then((cached) => cached || offlineFallbackResponse())
        )
    );
    return;
  }

  // Pure cache-first for immutable Vite hashed assets (/assets/*)
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) =>
        cache.match(request).then((cachedResponse) => {
          if (cachedResponse) return cachedResponse;
          return fetch(request)
            .then((networkResponse) => {
              if (networkResponse && networkResponse.ok && networkResponse.type === 'basic') {
                cache.put(request, networkResponse.clone()).catch(() => {});
              }
              return networkResponse;
            })
            .catch(() => offlineFallbackResponse());
        })
      )
    );
    return;
  }

  // Cache-first with background refresh for other same-origin static assets
  event.respondWith(
    caches.open(CACHE_NAME).then((cache) =>
      cache.match(request).then((cachedResponse) => {
        const fetchPromise = fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.ok && networkResponse.type === 'basic') {
              cache.put(request, networkResponse.clone()).catch(() => {});
            }
            return networkResponse;
          })
          .catch(() => cachedResponse || offlineFallbackResponse());

        return cachedResponse || fetchPromise;
      })
    )
  );
});
