// Service Worker for Degv's Messenger - Stale-While-Revalidate, Background Sync & Cross-Platform Auto-Update Engine
const CACHE_NAME = 'degvs-messenger-v6';

// Core assets to pre-cache on install
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.svg',
  '/icon.svg',
  '/icon-192.png',
  '/icon-512.png'
];

// Install Event: Pre-cache core shell assets and skip waiting immediately for PWA Builder & Native apps
self.addEventListener('install', (event) => {
  console.log('[SW] Installing new Service Worker version:', CACHE_NAME);
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Pre-caching app shell assets');
      return cache.addAll(PRECACHE_ASSETS);
    })
  );
});

// Activate Event: Clean up legacy caches & claim clients immediately so update takes effect instantly
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating new Service Worker version:', CACHE_NAME);
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => {
            console.log('[SW] Purging old cache for instant optimization:', name);
            return caches.delete(name);
          })
      );
    }).then(() => {
      return self.clients.claim();
    }).then(() => {
      // Notify all PWA and WebView clients that update & cache optimization are active
      return self.clients.matchAll({ type: 'window' }).then((clients) => {
        clients.forEach((client) => {
          client.postMessage({ type: 'SW_UPDATED', version: CACHE_NAME, timestamp: Date.now() });
        });
      });
    })
  );
});

// Listen for explicit SKIP_WAITING, OPTIMIZE_AND_UPDATE, and CHECK_UPDATE messages from PWA app
self.addEventListener('message', (event) => {
  if (event.data) {
    if (event.data.type === 'SKIP_WAITING') {
      console.log('[SW] Received SKIP_WAITING signal, skipping waiting');
      self.skipWaiting();
    } else if (event.data.type === 'CHECK_UPDATE') {
      console.log('[SW] Checking for SW updates on server');
      self.registration.update();
    } else if (event.data.type === 'OPTIMIZE_AND_UPDATE' || event.data.type === 'PURGE_OLD_CACHES') {
      console.log('[SW] Performing active cache purge and optimization');
      caches.keys().then((keys) => {
        return Promise.all(
          keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
        );
      }).then(() => {
        self.skipWaiting();
        self.clients.matchAll({ type: 'window' }).then((clients) => {
          clients.forEach((c) => c.postMessage({ type: 'SW_OPTIMIZATION_COMPLETE', version: CACHE_NAME }));
        });
      });
    }
  }
});

// Fetch Event: Stale-While-Revalidate Caching Strategy
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  if (url.pathname.startsWith('/api/')) return;

  event.respondWith(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.match(event.request).then((cachedResponse) => {
        const fetchPromise = fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
              cache.put(event.request, networkResponse.clone());
            }
            return networkResponse;
          })
          .catch((err) => {
            console.warn('[SW] Fetch failed; returning cached resource if available:', err);
            if (event.request.mode === 'navigate') {
              return cache.match('/index.html') || cache.match('/');
            }
            return cachedResponse;
          });

        return cachedResponse || fetchPromise;
      });
    })
  );
});

// Background Sync Handler
self.addEventListener('sync', (event) => {
  if (event.tag === 'degvs-messages-sync') {
    event.waitUntil(
      console.log('[SW] Executing Background Sync for pending messages...')
    );
  }
});

// Periodic Background Sync Handler
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'degvs-periodic-update') {
    event.waitUntil(
      console.log('[SW] Periodic Sync triggered in background')
    );
  }
});

// Push Notification Handler for Background Alerts
self.addEventListener('push', (event) => {
  let data = {
    title: "Degv's Messenger",
    body: "Tienes un nuevo mensaje recibido.",
    roomId: null
  };

  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: '/icon.svg',
    badge: '/favicon.svg',
    vibrate: [100, 50, 100],
    data: {
      url: data.roomId ? `/#room=${data.roomId}` : '/'
    },
    actions: [
      { action: 'open', title: 'Abrir Chat' },
      { action: 'close', title: 'Descartar' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Notification Click Listener
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (let client of windowClients) {
        if ('focus' in client) {
          client.focus();
          if (client.navigate) {
            client.navigate(targetUrl);
          }
          return;
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
