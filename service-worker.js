const CACHE_NAME = "sideline-stats-v3-7-11";
const APP_SHELL = ["./", "./index.html", "./manifest.webmanifest", "./icon.png"];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;

  const req = event.request;
  const url = new URL(req.url);
  const isNavigation = req.mode === "navigate";
  const isIndex = url.pathname.endsWith("/index.html") || url.pathname.endsWith("/sideline-stats/") || url.pathname === "/sideline-stats";

  // IMPORTANT: Always try the network first for the app shell HTML.
  // This prevents Safari/PWA from getting stuck on an older deployed version.
  if (isNavigation || isIndex) {
    event.respondWith(
      fetch(req, {cache:"no-store"})
        .then(response => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(req, clone));
          }
          return response;
        })
        .catch(async () => {
          return (await caches.match(req)) ||
                 (await caches.match("./index.html")) ||
                 (await caches.match("./"));
        })
    );
    return;
  }

  // Static assets can remain cache-first for fast/offline behavior,
  // while refreshing themselves from network in the background.
  event.respondWith(
    caches.match(req).then(cached => {
      const network = fetch(req).then(response => {
        if (response && response.status === 200 && response.type !== "opaque") {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(req, clone));
        }
        return response;
      }).catch(() => cached);
      return cached || network;
    })
  );
});
