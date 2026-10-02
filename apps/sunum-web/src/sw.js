// Çevrimdışı yedek: okul ağı koparsa son indirilen sürüm açılır.
const CACHE = "sunum-__BUILD_VERSION__";
const CORE = ["./", "index.html", "styles.css?v=__BUILD_VERSION__", "app.js?v=__BUILD_VERSION__", "reveal-sequence.js", "__DATA_FILE__", "icon.svg", "manifest.webmanifest", "assets/karagoz-types.png", "assets/ogulla-bulusma-tren.png", "assets/theme4-p305-option-1.png", "assets/theme4-p305-option-2.png", "assets/theme4-p305-option-3.png", "assets/theme4-p305-option-4.png"];

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
      .catch(() =>
        caches.match(req, { ignoreSearch: req.mode === "navigate" }).then((cached) => {
          if (cached) return cached;
          return req.mode === "navigate"
            ? caches.match("index.html")
            : new Response("İstenen sunum dosyası önbellekte bulunamadı.", { status: 503 });
        })
      )
  );
});
