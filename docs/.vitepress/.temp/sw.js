/**
 * Service Worker for Taro Bluetooth Print Documentation
 *
 * Features:
 * - Offline caching of documentation pages
 * - Background sync for updates
 * - Cache management with version control
 * - Network-aware fallbacks
 */

const CACHE_NAME = 'taro-bluetooth-print-docs-v1.0.8';
const RUNTIME_CACHE = 'taro-bluetooth-print-runtime-v1.0.8';
const STATIC_CACHE = 'taro-bluetooth-print-static-v1.0.8';

// Cache configuration
const CACHE_CONFIG = {
  // Static assets that should be cached permanently
  staticAssets: [
    '/',
    '/taro-bluetooth-print/',
    '/taro-bluetooth-print/index.html',
    '/taro-bluetooth-print/manifest.json',
    '/taro-bluetooth-print/favicon.ico',
    '/taro-bluetooth-print/apple-touch-icon.png'
  ],

  // Documentation pages to cache
  documentationPages: [
    '/taro-bluetooth-print/',
    '/taro-bluetooth-print/guide/getting-started',
    '/taro-bluetooth-print/guide/installation',
    '/taro-bluetooth-print/guide/basic-usage',
    '/taro-bluetooth-print/api/',
    '/taro-bluetooth-print/examples/basic-print',
    '/taro-bluetooth-print/reference/changelog'
  ],

  // External resources to cache
  externalResources: [
    'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
    'https://cdn.jsdelivr.net/npm/prismjs@1.29.0/themes/prism-tomorrow.min.css'
  ],

  // API endpoints to cache (if any)
  apiEndpoints: [],

  // Cache expiration times (in milliseconds)
  expirationTimes: {
    documentation: 24 * 60 * 60 * 1000, // 24 hours
    static: 7 * 24 * 60 * 60 * 1000,   // 7 days
    runtime: 60 * 60 * 1000            // 1 hour
  }
};

// Network timeout configuration
const NETWORK_TIMEOUT = 10000; // 10 seconds

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');

  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('[SW] Caching static assets...');
        return cache.addAll(CACHE_CONFIG.staticAssets);
      })
      .then(() => {
        console.log('[SW] Static assets cached successfully');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[SW] Failed to cache static assets:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');

  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME &&
                cacheName !== RUNTIME_CACHE &&
                cacheName !== STATIC_CACHE) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('[SW] Service worker activated');
        return self.clients.claim();
      })
      .catch((error) => {
        console.error('[SW] Activation failed:', error);
      })
  );
});

// Fetch event - serve cached content when offline
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests and chrome-extension requests
  if (request.method !== 'GET' || url.protocol === 'chrome-extension:') {
    return;
  }

  // Handle different request types
  if (isDocumentationPage(url)) {
    event.respondWith(handleDocumentationRequest(request));
  } else if (isStaticAsset(url)) {
    event.respondWith(handleStaticAssetRequest(request));
  } else if (isAPIRequest(url)) {
    event.respondWith(handleAPIRequest(request));
  } else {
    event.respondWith(handleGeneralRequest(request));
  }
});

// Handle documentation page requests
async function handleDocumentationRequest(request) {
  try {
    // Try network first with timeout
    const networkResponse = await fetchWithTimeout(request, NETWORK_TIMEOUT);

    if (networkResponse.ok) {
      // Cache the successful response
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, networkResponse.clone());
      return networkResponse;
    }
  } catch (error) {
    console.log('[SW] Network failed, trying cache for documentation:', request.url);
  }

  // Fallback to cache
  try {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
  } catch (error) {
    console.error('[SW] Cache access failed:', error);
  }

  // Return offline page
  return createOfflineResponse('documentation');
}

// Handle static asset requests
async function handleStaticAssetRequest(request) {
  try {
    // Try cache first for static assets
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
  } catch (error) {
    console.error('[SW] Static asset cache access failed:', error);
  }

  try {
    // Try network
    const networkResponse = await fetchWithTimeout(request, NETWORK_TIMEOUT);
    if (networkResponse.ok) {
      // Cache the response
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, networkResponse.clone());
      return networkResponse;
    }
  } catch (error) {
    console.log('[SW] Network failed for static asset:', request.url);
  }

  // Return placeholder for missing assets
  return createOfflineResponse('asset');
}

// Handle API requests
async function handleAPIRequest(request) {
  try {
    // Try network first for API requests
    const networkResponse = await fetchWithTimeout(request, NETWORK_TIMEOUT);
    if (networkResponse.ok) {
      // Cache API response for a short time
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, networkResponse.clone());
      return networkResponse;
    }
  } catch (error) {
    console.log('[SW] Network failed for API request:', request.url);
  }

  // Try cached API response
  try {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
  } catch (error) {
    console.error('[SW] API cache access failed:', error);
  }

  // Return error response
  return createOfflineResponse('api');
}

// Handle general requests
async function handleGeneralRequest(request) {
  try {
    const networkResponse = await fetchWithTimeout(request, NETWORK_TIMEOUT);
    return networkResponse;
  } catch (error) {
    console.log('[SW] Network failed for general request:', request.url);

    // Try to serve from cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    return createOfflineResponse('general');
  }
}

// Helper functions
function isDocumentationPage(url) {
  const path = url.pathname;
  return path.includes('/guide/') ||
         path.includes('/api/') ||
         path.includes('/examples/') ||
         path.includes('/reference/') ||
         path === '/' ||
         path.endsWith('.html');
}

function isStaticAsset(url) {
  const path = url.pathname;
  return path.includes('/icons/') ||
         path.includes('/images/') ||
         path.includes('/screenshots/') ||
         path.endsWith('.css') ||
         path.endsWith('.js') ||
         path.endsWith('.woff2') ||
         path.endsWith('.woff') ||
         path.endsWith('.ttf') ||
         path.endsWith('.png') ||
         path.endsWith('.jpg') ||
         path.endsWith('.jpeg') ||
         path.endsWith('.gif') ||
         path.endsWith('.svg');
}

function isAPIRequest(url) {
  return url.pathname.includes('/api/') &&
         (url.pathname.endsWith('.json') ||
          url.searchParams.has('api'));
}

// Fetch with timeout
function fetchWithTimeout(request, timeout) {
  return Promise.race([
    fetch(request),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Network timeout')), timeout)
    )
  ]);
}

// Create offline response
function createOfflineResponse(type) {
  const responses = {
    documentation: new Response(`
      <!DOCTYPE html>
      <html lang="zh-CN">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>离线模式 - Taro Bluetooth Print</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                 margin: 0; padding: 40px 20px; background: #f8fafc; }
          .container { max-width: 600px; margin: 0 auto;
                      background: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          h1 { color: #3b82f6; margin: 0 0 20px 0; }
          p { color: #64748b; line-height: 1.6; margin-bottom: 16px; }
          .icon { font-size: 48px; margin-bottom: 20px; }
          button { background: #3b82f6; color: white; border: none; padding: 12px 24px;
                   border-radius: 6px; cursor: pointer; font-size: 16px; }
          button:hover { background: #2563eb; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="icon">📱</div>
          <h1>离线模式</h1>
          <p>您当前处于离线状态。文档内容可能在网络恢复后无法及时更新。</p>
          <p>已缓存的部分文档仍可继续浏览。</p>
          <button onclick="window.location.reload()">重新加载</button>
        </div>
      </body>
      </html>
    `, {
      headers: { 'Content-Type': 'text/html' }
    }),

    asset: new Response('', { status: 404 }),

    api: new Response(JSON.stringify({
      error: '离线模式',
      message: 'API请求失败，请检查网络连接'
    }), {
      headers: { 'Content-Type': 'application/json' }
    }),

    general: new Response('离线模式 - 网络不可用', {
      status: 503,
      headers: { 'Content-Type': 'text/plain' }
    })
  };

  return responses[type] || responses.general;
}

// Background sync for updates
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync triggered:', event.tag);

  if (event.tag === 'update-docs') {
    event.waitUntil(updateDocumentationCache());
  }
});

// Update documentation cache
async function updateDocumentationCache() {
  try {
    const cache = await caches.open(RUNTIME_CACHE);

    for (const page of CACHE_CONFIG.documentationPages) {
      try {
        const response = await fetch(page);
        if (response.ok) {
          await cache.put(page, response);
          console.log('[SW] Updated cache for:', page);
        }
      } catch (error) {
        console.error('[SW] Failed to update cache for:', page, error);
      }
    }
  } catch (error) {
    console.error('[SW] Background sync failed:', error);
  }
}

// Push notifications (optional)
self.addEventListener('push', (event) => {
  if (!event.data) return;

  const data = event.data.json();
  const options = {
    body: data.body || '有新的文档更新',
    icon: '/taro-bluetooth-print/icons/icon-192.png',
    badge: '/taro-bluetooth-print/icons/badge-72.png',
    tag: 'docs-update',
    renotify: true,
    requireInteraction: false,
    actions: [
      {
        action: 'view',
        title: '查看文档'
      },
      {
        action: 'dismiss',
        title: '忽略'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(
      data.title || 'Taro Bluetooth Print 文档更新',
      options
    )
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'view') {
    event.waitUntil(
      clients.openWindow('/taro-bluetooth-print/')
    );
  }
});

// Periodic background sync
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'update-docs-periodic') {
    event.waitUntil(updateDocumentationCache());
  }
});

// Cache cleanup on low storage
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'cleanup-cache') {
    event.waitUntil(cleanupOldCache());
  }
});

async function cleanupOldCache() {
  try {
    const cacheNames = await caches.keys();
    const now = Date.now();

    for (const cacheName of cacheNames) {
      const cache = await caches.open(cacheName);
      const requests = await cache.keys();

      for (const request of requests) {
        const response = await cache.match(request);
        if (response) {
          const dateHeader = response.headers.get('date');
          if (dateHeader) {
            const responseDate = new Date(dateHeader).getTime();
            const age = now - responseDate;

            // Remove old cached files (older than 30 days)
            if (age > 30 * 24 * 60 * 60 * 1000) {
              await cache.delete(request);
              console.log('[SW] Cleaned up old cache entry:', request.url);
            }
          }
        }
      }
    }
  } catch (error) {
    console.error('[SW] Cache cleanup failed:', error);
  }
}

console.log('[SW] Service worker loaded successfully');