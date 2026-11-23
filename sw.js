const CACHE_NAME = "hanzireader-pwa-v2";
const SHARE_CACHE = "hanzireader-share-v1";
const ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME && key !== SHARE_CACHE)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  if (event.request.method === "POST" && url.pathname.endsWith("/share-target")) {
    event.respondWith((async () => {
      try {
        const formData = await event.request.formData();
        const file = formData.get("shared_file");
        const sharedText = formData.get("text");

        let payload = "";
        let filename = "shared.json";

        if (file && typeof file.text === "function") {
          payload = await file.text();
          if (file.name) filename = file.name;
        } else if (typeof sharedText === "string" && sharedText.trim()) {
          payload = sharedText;
        }

        if (payload) {
          const shareCache = await caches.open(SHARE_CACHE);
          const cacheKey = new URL("./shared-json-payload", self.location.href).href;
          await shareCache.put(
            cacheKey,
            new Response(payload, {
              headers: {
                "Content-Type": "application/json; charset=utf-8",
                "X-Shared-Filename": encodeURIComponent(filename)
              }
            })
          );
        }
      } catch (err) {
        // Ignore malformed share payload
      }
      return Response.redirect("./?shared=1", 303);
    })());
    return;
  }

  if (event.request.method !== "GET") return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).catch(() => caches.match("./index.html"));
    })
  );
});
