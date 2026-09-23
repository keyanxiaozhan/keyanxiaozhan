// sw.js
// Service Worker - 简单 cache-first 策略
// 缓存静态资源 (HTML/CSS/JS/icons), API 请求走网络
//
// 注意: 不要缓存 /api/* (后端数据总是要新鲜的)

const CACHE_NAME = 'characterization-v1';
const STATIC_ASSETS = [
  './',
  './index.html',
  './detail.html',
  './booking.html',
  './booking-detail.html',
  './about.html',
  './manifest.json',
  './css/style.css',
  './js/api.js',
  './js/price.js',
  './js/questionnaire.js',
  './js/common.js',
  './js/auth.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

// 安装: 预缓存静态资源
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_ASSETS).catch(err => {
        // 单个文件失败不阻塞, 静默忽略
        console.warn('[SW] 部分资源预缓存失败:', err);
      }))
      .then(() => self.skipWaiting())
  );
});

// 激活: 清理旧 cache
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// fetch: 静态资源 cache-first, API 走网络
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // 只处理 GET
  if (req.method !== 'GET') return;

  // API 请求: 走网络, 不缓存
  if (url.pathname.startsWith('/api/')) {
    return; // 让浏览器直接走网络
  }

  // 跨域: 走网络
  if (url.origin !== self.location.origin) {
    return;
  }

  // 静态资源: cache-first, fallback network
  event.respondWith(
    caches.match(req).then(cached => {
      if (cached) return cached;
      return fetch(req)
        .then(res => {
          // 只缓存成功的 GET 响应
          if (res && res.status === 200 && res.type === 'basic') {
            const copy = res.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(req, copy));
          }
          return res;
        })
        .catch(() => {
          // 网络挂了, 兜底: 如果是导航请求, 返回 index.html (SPA fallback)
          if (req.mode === 'navigate') {
            return caches.match('./index.html');
          }
          // 其他资源: 返回空响应
          return new Response('', { status: 504, statusText: 'Offline' });
        });
    })
  );
});
