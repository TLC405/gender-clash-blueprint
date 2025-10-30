const CACHE_NAME = 'tlc-battle-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/data/config.json',
  '/data/teams.json',
  '/data/classes.json',
  '/data/relics.json',
  '/data/maps.json',
  '/data/i18n.en.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});
