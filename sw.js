/* Alatau Atlas — офлайн-оболочка. Все данные карты встроены в index.html. */
// При обновлении файлов приложения увеличьте версию: map-v2, map-v3 ...
const CACHE_NAME = "map-v7";
const AVALANCHE_CACHE = "avalanche-v1";
const AVALANCHE_URL = new URL("./data/avalanche-zones.geojson", self.location.href).href;
const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  "./data/avalanche-zones.geojson"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_NAME && key !== AVALANCHE_CACHE).map((key) => caches.delete(key)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  // Погодное API и другие внешние ресурсы не кэшируем.
  if (url.origin !== self.location.origin) return;

  // Лавинные данные: network-first в отдельном маленьком кэше, до generic cache-first.
  if (url.href.split("?")[0] === AVALANCHE_URL) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok && response.type === "basic") {
            const copy = response.clone();
            caches.open(AVALANCHE_CACHE).then((cache) => cache.put(AVALANCHE_URL, copy));
          }
          return response;
        })
        .catch(async () => {
          const cache = await caches.open(AVALANCHE_CACHE);
          const cached = (await cache.match(AVALANCHE_URL)) || (await caches.match(AVALANCHE_URL));
          if (cached) return cached;
          // Нет сети и нет кэша: отдаём пустой корректный GeoJSON, чтобы не было ошибок в консоли.
          return new Response(JSON.stringify({
            schemaVersion: 1,
            scale: "EAWS-1-5",
            status: "no-data",
            issuedAt: null,
            validTo: null,
            source: "Alatau Atlas, неофициальный обзор по открытым данным",
            sourceUrl: "",
            features: []
          }), { headers: { "Content-Type": "application/json; charset=utf-8" } });
        })
    );
    return;
  }

  event.respondWith(
    caches.match(request, { ignoreSearch: true }).then((cached) => {
      if (cached) return cached;

      return fetch(request).then((response) => {
        if (response.ok && response.type === "basic") {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return response;
      }).catch(() => {
        // Навигация в авиарежиме всегда открывает сохранённую карту.
        if (request.mode === "navigate") return caches.match("./index.html");
        return Response.error();
      });
    })
  );
});
