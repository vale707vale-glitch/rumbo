const CACHE = "rumbo-v9";
const BASE = [
  "index.html",
  "mapa.html",
  "juego.html",
  "modulo1.html",
  "modulo2.html",
  "modulo3.html",
  "modulo4.html",
  "css/estilos.css",
  "js/base.js",
  "js/mapa.js",
  "js/juego.js",
  "js/modulo1.js",
  "js/modulo2.js",
  "js/modulo3.js",
  "js/modulo4.js",
  "manifest.webmanifest"
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(BASE)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET") return;
  if (url.origin !== location.origin) return;
  e.respondWith(
    caches.match(e.request).then((r) => r || fetch(e.request).then((resp) => {
      const clon = resp.clone();
      caches.open(CACHE).then((c) => c.put(e.request, clon));
      return resp;
    }).catch(() => caches.match("index.html")))
  );
});
