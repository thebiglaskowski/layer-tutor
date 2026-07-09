// Offline support: network-first with cache fallback, so updates land
// immediately when online and the app still works with no connection.
const CACHE = 'layer-tutor-v1';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './manifest.webmanifest',
  './js/main.js',
  './js/ui.js',
  './js/keyboardLayout.js',
  './js/lessons.js',
  './js/gameEngine.js',
  './js/storage.js',
  './js/keyboardRenderer.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy));
        return res;
      })
      .catch(() => caches.match(e.request)),
  );
});
