/* TxxT 公考备考工作台 · Service Worker
 * 离线缓存应用壳；index.html 用 network-first 保证云端更新能生效，离线时回退缓存。
 */
const CACHE = 'txxT_app_v4';
const ASSETS = [
  './',
  './index.html',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) {
      return c.addAll(ASSETS).catch(function () { /* 部分资源不可达也不阻塞安装 */ });
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (ks) {
      return Promise.all(ks.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // 应用主页：network-first（在线拿最新，离线用缓存）
  const isHtml = url.pathname.endsWith('index.html') || url.pathname === '/' || url.pathname === '';
  if (url.origin === self.location.origin && isHtml) {
    e.respondWith(
      fetch(req).then(function (r) {
        const cp = r.clone();
        caches.open(CACHE).then(function (c) { c.put(req, cp); });
        return r;
      }).catch(function () { return caches.match(req); })
    );
    return;
  }

  // 同源其它静态资源：cache-first
  if (url.origin === self.location.origin) {
    e.respondWith(
      caches.match(req).then(function (r) {
        if (r) return r;
        return fetch(req).then(function (rr) {
          const cp = rr.clone();
          caches.open(CACHE).then(function (c) { c.put(req, cp); });
          return rr;
        });
      })
    );
    return;
  }

  // 跨域（如 Chart.js CDN）：network-first，失败回退缓存
  e.respondWith(
    fetch(req).then(function (r) {
      const cp = r.clone();
      caches.open(CACHE).then(function (c) { c.put(req, cp); });
      return r;
    }).catch(function () { return caches.match(req); })
  );
});
