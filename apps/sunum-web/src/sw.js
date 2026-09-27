// Çevrimdışı yedek: okul ağı koparsa son indirilen sürüm açılır.
const CACHE = "sunum-__BUILD_VERSION__";
const CORE = ["./", "index.html", "styles.css?v=__BUILD_VERSION__", "app.js?v=__BUILD_VERSION__", "__DATA_FILE__", "icon.svg", "manifest.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Önce ağ, olmazsa önbellek
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET" || new URL(req.url).origin !== location.origin) return;
  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req, { ignoreSearch: req.mode === "navigate" }).then((r) => r || caches.match("index.html")))
  );
});
