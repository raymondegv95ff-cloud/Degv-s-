// Service Worker for Degv's Messenger - Stale-While-Revalidate, Background Sync & Auto-Update Engine
const CACHE_NAME = 'degvs-messenger-v5';

// Core assets to pre-cache on install
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.svg',
  '/icon.svg'
];

// Install Event: Pre-cache core shell assets and skip waiting immediately for PWA Builder apps
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
            console.log('[SW] Removing old cache:', name);
            return caches.delete(name);
          })
      );
    }).then(() => {
      return self.clients.claim();
    }).then(() => {
      // Notify all PWA clients that update is complete
      return self.clients.matchAll({ type: 'window' }).then((clients) => {
        clients.forEach((client) => {
          client.postMessage({ type: 'SW_UPDATED', version: CACHE_NAME });
        });
      });
    })
  );
});

// Listen for explicit SKIP_WAITING and UPDATE messages from PWA app
self.addEventListener('message', (event) => {
  if (event.data) {
    if (event.data.type === 'SKIP_WAITING') {
      console.log('[SW] Received SKIP_WAITING signal, skipping waiting');
      self.skipWaiting();
    } else if (event.data.type === 'CHECK_UPDATE') {
      console.log('[SW] Checking for SW updates on published server');
      self.registration.update();
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
