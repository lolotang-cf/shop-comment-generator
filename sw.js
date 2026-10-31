/* 店铺评论生成小工具 - Service Worker
   v2：改为网络优先，保证更新后能立刻拿到最新页面，避免被旧缓存卡住 */
var CACHE_NAME = 'shop-comment-v2';
var ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(ASSETS);
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.filter(function (k) { return k !== CACHE_NAME; })
            .map(function (k) { return caches.delete(k); })
      );
    }).then(function () {
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', function (e) {
  var url = e.request.url;
  // API 请求一律直连网络，绝不缓存
  if (url.indexOf('chat/completions') !== -1 || url.indexOf('/models') !== -1 || url.indexOf('api/') !== -1) {
    return;
  }
  if (e.request.method !== 'GET') return;

  // 网络优先：成功则顺带刷新缓存；失败（离线）才回退缓存
  e.respondWith(
    fetch(e.request).then(function (resp) {
      if (resp && resp.status === 200 && resp.type === 'basic') {
        var clone = resp.clone();
        caches.open(CACHE_NAME).then(function (cache) { cache.put(e.request, clone); });
      }
      return resp;
    }).catch(function () {
      return caches.match(e.request);
    })
  );
});