const CACHE_NAME = 'taro-print-v1';
const STATIC_CACHE_NAME = 'taro-print-static-v1';
const DYNAMIC_CACHE_NAME = 'taro-print-dynamic-v1';

// 需要缓存的静态资源
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/app.js',
  '/app.css',
  '/manifest.json',
  '/favicon.ico',
  '/logo.png',
  '/offline.html',
  '/workers/image-worker.js'
];

// 安装事件
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then((cache) => {
        console.log('缓存静态资源');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        return self.skipWaiting();
      })
  );
});

// 激活事件
self.addEventListener('activate', (event) => {
  // 清理旧缓存
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (
              cacheName !== STATIC_CACHE_NAME && 
              cacheName !== DYNAMIC_CACHE_NAME && 
              cacheName.startsWith('taro-print-')
            ) {
              console.log('删除旧缓存', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        // 接管所有客户端
        return self.clients.claim();
      })
  );
});

// 缓存优先策略
const cacheFirst = async (request) => {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    
    // 只缓存成功的响应
    if (networkResponse && networkResponse.status === 200) {
      const cache = await caches.open(DYNAMIC_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    // 无法获取网络响应
    const url = new URL(request.url);
    if (url.pathname.endsWith('.html')) {
      return caches.match('/offline.html');
    }
    
    return new Response('网络请求失败', { 
      status: 408, 
      headers: { 'Content-Type': 'text/plain' } 
    });
  }
};

// 网络优先策略
const networkFirst = async (request) => {
  try {
    const networkResponse = await fetch(request);
    
    // 只缓存成功的响应
    if (networkResponse && networkResponse.status === 200) {
      const cache = await caches.open(DYNAMIC_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // 如果是HTML请求，返回离线页面
    const url = new URL(request.url);
    if (url.pathname.endsWith('.html')) {
      return caches.match('/offline.html');
    }
    
    return new Response('网络请求失败', { 
      status: 408, 
      headers: { 'Content-Type': 'text/plain' } 
    });
  }
};

// 拦截请求
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // 跳过不是HTTP/HTTPS的请求
  if (!url.protocol.startsWith('http')) {
    return;
  }
  
  // 静态资源使用缓存优先策略
  if (
    STATIC_ASSETS.includes(url.pathname) || 
    url.pathname.startsWith('/workers/') || 
    url.pathname.endsWith('.js') || 
    url.pathname.endsWith('.css') || 
    url.pathname.endsWith('.png') || 
    url.pathname.endsWith('.jpg') || 
    url.pathname.endsWith('.svg') || 
    url.pathname.endsWith('.woff2')
  ) {
    event.respondWith(cacheFirst(request));
    return;
  }
  
  // API请求使用网络优先策略
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(request));
    return;
  }
  
  // 其他请求使用缓存优先策略
  event.respondWith(cacheFirst(request));
});

// 消息处理
self.addEventListener('message', (event) => {
  if (event.data && event.data.action === 'skipWaiting') {
    self.skipWaiting();
  }
}); 