const CACHE_NAME = "dongle-v1";
const STATIC_CACHE = "dongle-static-v1";
const API_CACHE = "dongle-api-v1";

const PRE_CACHE_URLS = ["/", "/discover", "/docs"];

const STATIC_ASSET_PATTERN =
  /\.(js|css|woff2?|ttf|otf|eot|png|jpe?g|gif|webp|svg|ico)$/;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRE_CACHE_URLS)),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names
          .filter((name) => name !== STATIC_CACHE && name !== API_CACHE)
          .map((name) => caches.delete(name)),
      ),
    ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // API calls: Network-First
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(networkFirst(request));
    return;
  }

  // Static assets: Cache-First
  if (STATIC_ASSET_PATTERN.test(url.pathname)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Navigation / pages: Network-First with cache fallback
  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request));
    return;
  }

  // Everything else: Network-First
  event.respondWith(networkFirst(request));
});

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response("Offline", { status: 503 });
  }
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(API_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    return new Response("Offline", { status: 503, statusText: "Offline" });
  }
}
