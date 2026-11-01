/* TLC Battle — scope-aware offline shell for root hosting and GitHub Pages. */
const CACHE_NAME = "tlc-battle-shell-v2";
const APP_SCOPE = self.registration.scope;
const SHELL_URL = new URL("index.html", APP_SCOPE).href;
const SCOPE_PATH = new URL(APP_SCOPE).pathname;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll([SHELL_URL]))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith("tlc-battle-") && key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin || !url.pathname.startsWith(SCOPE_PATH)) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.status === 404) return caches.match(SHELL_URL).then((cached) => cached || response);
          if (response.ok && (url.pathname === SCOPE_PATH || url.pathname.endsWith("/index.html"))) {
            const copy = response.clone();
            event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.put(SHELL_URL, copy)));
          }
          return response;
        })
        .catch(() => caches.match(SHELL_URL))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request).then((response) => {
      if (response.ok) {
        const copy = response.clone();
        event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.put(request, copy)));
      }
      return response;
    }))
  );
});
