/* TLC Battlecast service-worker retirement v3.
   Purges the stale shell caches used by older Android releases.
   No fetch handler: network remains authoritative for every game asset. */
self.addEventListener("install", event => {
  event.waitUntil(self.skipWaiting());
});
self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith("tlc-battle-"))
      .map(key => caches.delete(key)));
    await self.clients.claim();
    // Stop intercepting future launches. A proper versioned offline shell
    // can be reintroduced after Android lifecycle QA.
    await self.registration.unregister();
  })());
});
