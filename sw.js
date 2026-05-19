// TNCD Task Tracker — Service Worker v34
// Upload this file to GitHub alongside index.html

const CACHE = 'tncd-v34';
const APP_SHELL = ['./'];

// Install — cache the app shell
self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE).then(function(c) {
      return c.addAll(APP_SHELL);
    }).then(function() {
      return self.skipWaiting();
    })
  );
});

// Activate — clear old caches
self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== CACHE; })
            .map(function(k) { return caches.delete(k); })
      );
    }).then(function() {
      return self.clients.claim();
    })
  );
});

// Fetch — cache-first for app, network-first for APIs
self.addEventListener('fetch', function(e) {
  if (e.request.method !== 'GET') return;

  const url = new URL(e.request.url);
  const isLocal = url.origin === self.location.origin;

  // External APIs (Firebase, OpenStreetMap) — network only, no cache
  if (!isLocal) {
    e.respondWith(
      fetch(e.request).catch(function() {
        return new Response('{"error":"offline"}', {
          status: 503,
          headers: { 'Content-Type': 'application/json' }
        });
      })
    );
    return;
  }

  // Local app files — cache first, then network, update cache in background
  e.respondWith(
    caches.match(e.request).then(function(cached) {
      const fetchPromise = fetch(e.request).then(function(resp) {
        if (resp && resp.status === 200) {
          const clone = resp.clone();
          caches.open(CACHE).then(function(c) { c.put(e.request, clone); });
        }
        return resp;
      }).catch(function() {
        // Network failed — return cached version
        return cached || new Response('App offline', { status: 503 });
      });

      // Return cached immediately if available, fetch in background
      return cached || fetchPromise;
    })
  );
});
