// Offline support: network-first with cache fallback, so updates land
// immediately when online and the app still works with no connection.
// Bump CACHE when shipping a release so activate() drops the old bucket.
const CACHE = 'layer-tutor-v5';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './manifest.webmanifest',
  './js/main.js',
  './js/ui.js',
  './js/keyboardLayout.js',
  './js/lessons.js',
  './js/lessonPools.js',
  './js/gameEngine.js',
  './js/storage.js',
  './js/keyboardRenderer.js',
  './js/sound.js',
  './js/boards/index.js',
  './js/boards/corne-v4.js',
  './js/boards/buildLayout.js',
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
        // Only cache successful same-origin-ish GETs — never 404/500.
        if (res && res.ok && res.type !== 'error') {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy));
        }
        return res;
      })
      .catch(() => caches.match(e.request)),
  );
});
