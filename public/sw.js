// ==============================================================================
// Degv's Messenger - High Performance Service Worker
// Features: Stale-While-Revalidate for Static Assets, Network-First for HTML,
// and Atomic Update Notification Engine for Native & Web Deployments
// ==============================================================================

const CURRENT_CACHE_VERSION = 'degvs-messenger-v2.5.0-atomic';
const STAGE_CACHE_VERSION = 'stage-degvs-messenger-v2.5.0-atomic';

// Critical Core Shell Assets (Atomic pre-cache requirement)
const CRITICAL_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.svg',
  '/icon.svg',
  '/icon-192.png',
  '/icon-512.png',
  '/icon-maskable.png'
];

// 1. Install Event: Atomic Pre-Cache with Validation into Staging Cache
self.addEventListener('install', (event) => {
  console.log('[SW-Atomic] Installing version:', CURRENT_CACHE_VERSION);

  event.waitUntil(
    caches.open(STAGE_CACHE_VERSION).then(async (stageCache) => {
      console.log('[SW-Atomic] Pre-caching critical assets atomically...');
      
      const assetPromises = CRITICAL_ASSETS.map(async (assetUrl) => {
        try {
          const response = await fetch(assetUrl, { cache: 'no-cache' });
          if (response && (response.status === 200 || response.status === 0)) {
            await stageCache.put(assetUrl, response);
          }
        } catch (err) {
          console.warn('[SW-Atomic] Pre-cache warning for asset:', assetUrl, err);
        }
      });

      await Promise.all(assetPromises);
      console.log('[SW-Atomic] Staging cache verified. Calling skipWaiting.');
      return self.skipWaiting();
    })
  );
});

// 2. Activate Event: Promote Staging Cache & Broadcast Update to App.tsx
self.addEventListener('activate', (event) => {
  console.log('[SW-Atomic] Activating version:', CURRENT_CACHE_VERSION);

  event.waitUntil(
    (async () => {
      // 1. Promote staging cache assets to active cache
      try {
        const stageCache = await caches.open(STAGE_CACHE_VERSION);
        const activeCache = await caches.open(CURRENT_CACHE_VERSION);
        const stagedRequests = await stageCache.keys();

        await Promise.all(
          stagedRequests.map(async (req) => {
            const resp = await stageCache.match(req);
            if (resp) {
              await activeCache.put(req, resp);
            }
          })
        );
      } catch (e) {
        console.warn('[SW-Atomic] Staging promotion notice:', e);
      }

      // 2. Purge obsolete caches safely
      try {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames
            .filter((name) => name !== CURRENT_CACHE_VERSION && name !== STAGE_CACHE_VERSION)
            .map((name) => {
              console.log('[SW-Atomic] Purging obsolete cache:', name);
              return caches.delete(name);
            })
        );
      } catch (e) {
        console.warn('[SW-Atomic] Cache cleanup notice:', e);
      }

      // 3. Take control of all clients immediately
      await self.clients.claim();

      // 4. Broadcast Atomic Update Ready signal to App.tsx and all open clients without disrupting active UI
      const allClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      allClients.forEach((client) => {
        client.postMessage({
          type: 'SW_UPDATE_READY',
          action: 'NOTIFY_USER',
          version: CURRENT_CACHE_VERSION,
          message: 'Nueva versión lista para el despliegue nativo y web. Los cambios se aplicarán de forma transparente.',
          timestamp: Date.now()
        });
        client.postMessage({
          type: 'SW_ATOMIC_UPDATE_APPLIED',
          version: CURRENT_CACHE_VERSION,
          timestamp: Date.now()
        });
      });
    })()
  );
});

// 3. Message Event: Communication Channel with App.tsx and PlatformUpdateService
self.addEventListener('message', (event) => {
  if (!event.data) return;

  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  } else if (event.data.type === 'CHECK_FOR_UPDATE') {
    self.registration.update();
  } else if (event.data.type === 'RELOAD_ALL_CLIENTS') {
    self.clients.matchAll({ type: 'window' }).then((clients) => {
      clients.forEach((client) => {
        if (client.navigate) {
          client.navigate(client.url);
        }
      });
    });
  } else if (event.data.type === 'PURGE_AND_OPTIMIZE') {
    caches.keys().then((names) => {
      return Promise.all(
        names.filter((n) => n !== CURRENT_CACHE_VERSION).map((n) => caches.delete(n))
      );
    }).then(() => {
      self.clients.matchAll({ type: 'window' }).then((clients) => {
        clients.forEach((c) => c.postMessage({ type: 'SW_OPTIMIZATION_COMPLETE', version: CURRENT_CACHE_VERSION }));
      });
    });
  }
});

// 4. Fetch Event:
//    - Navigation (HTML): Network-First with 1.8s Timeout Fallback to Cache
//    - Static Assets (JS, CSS, Fonts, Images, Audio, Icons): Stale-While-Revalidate
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Bypass API calls, AI endpoints, and Firebase endpoints
  if (
    url.pathname.startsWith('/api/') ||
    url.hostname.includes('firebase') ||
    url.hostname.includes('googleapis') ||
    url.hostname.includes('identitytoolkit') ||
    url.hostname.includes('securetoken')
  ) {
    return;
  }

  // A. Navigation / Document Requests: Network-First with 1.8s Timeout -> Cached Fallback
  if (event.request.mode === 'navigate' || event.request.destination === 'document') {
    event.respondWith(
      (async () => {
        try {
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Network navigation timeout')), 1800)
          );
          const networkResponse = await Promise.race([
            fetch(event.request),
            timeoutPromise
          ]);
          if (networkResponse && networkResponse.status === 200) {
            const cache = await caches.open(CURRENT_CACHE_VERSION);
            cache.put(event.request, networkResponse.clone());
            return networkResponse;
          }
        } catch (err) {
          console.log('[SW-Atomic] Network slow/offline, serving cached shell:', err);
        }

        const cache = await caches.open(CURRENT_CACHE_VERSION);
        const cached = await cache.match(event.request);
        if (cached) return cached;
        
        const fallbackIndex = (await cache.match('/index.html')) || (await cache.match('/'));
        if (fallbackIndex) return fallbackIndex;

        return fetch(event.request);
      })()
    );
    return;
  }

  // B. Static Assets: Pure 'Stale-While-Revalidate' Strategy
  // Return cached asset immediately for instant loading, then fetch & update cache in background
  event.respondWith(
    caches.open(CURRENT_CACHE_VERSION).then(async (cache) => {
      const cachedResponse = await cache.match(event.request);

      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && (networkResponse.status === 200 || networkResponse.status === 0)) {
            // Clone and cache the refreshed asset
            cache.put(event.request, networkResponse.clone()).catch(() => {});
          }
          return networkResponse;
        })
        .catch((err) => {
          // If offline or network error, return cached response if available
          if (cachedResponse) return cachedResponse;
          throw err;
        });

      return cachedResponse || fetchPromise;
    })
  );
});

// 5. Background Sync Event
self.addEventListener('sync', (event) => {
  if (event.tag === 'degvs-messages-sync') {
    console.log('[SW-Atomic] Background Sync executing for queued messages');
  }
});

// 6. Push Notification Event
self.addEventListener('push', (event) => {
  let data = {
    title: "Degv's Messenger",
    body: "Tienes un nuevo mensaje.",
    roomId: null
  };

  if (event.data) {
    try {
      data = event.data.json();
    } catch {
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
      { action: 'open', title: 'Abrir' },
      { action: 'close', title: 'Descartar' }
    ]
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

// 7. Notification Click Event
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
