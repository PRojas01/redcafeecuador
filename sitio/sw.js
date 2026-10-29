/* Red Café Ecuador — Service Worker (PWA básica)
   Precaché de la shell de la app y rutas principales. */

const VERSION = "20261029h";
const CACHE = `redcafe-raiz-v${VERSION}`;
const BASE = "";

const SHELL = [
  `${BASE}/manifest.json`,
  `${BASE}/icon-192.png`,
  `${BASE}/icon-512.png`,
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    cleanOldCaches()
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", (event) => {
  if (!event.data || event.data.type !== "REDCF_CLEAR_OLD_CACHES") return;
  event.waitUntil(cleanOldCaches());
});

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { titulo: "Red Café Ecuador", cuerpo: event.data ? event.data.text() : "" };
  }
  const title = data.titulo || "Red Café Ecuador";
  // "//otro-dominio" también empieza por "/": solo rutas internas.
  const url = typeof data.url === "string" && data.url.startsWith("/") && !data.url.startsWith("//") ? data.url : "/";
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.cuerpo || "",
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      data: { url },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL((event.notification.data && event.notification.data.url) || "/", location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url === url && "focus" in client) return client.focus();
      }
      return self.clients.openWindow(url);
    })
  );
});

function cleanOldCaches() {
  return caches
    .keys()
    .then((keys) => Promise.all(keys
      .filter((k) => k.indexOf("redcafe-") === 0 && k !== CACHE)
      .map((k) => caches.delete(k))));
}

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Solo GET y rutas del mismo origen
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== location.origin) return;

  // No interceptar las APIs dinámicas PHP (siempre red)
  if (url.pathname.includes("/api/")) return;

  // Navegaciones: red primero, fallback a caché, luego a la home
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(request, copy));
          return res;
        })
        .catch(() => caches.match(request).then((r) => r || caches.match(`${BASE}/`)))
    );
    return;
  }

  // Estáticos críticos: red primero para no retener JS/CSS viejos tras deploy.
  if (url.pathname.endsWith(".js") || url.pathname.endsWith(".css")) {
    event.respondWith(
      fetch(request)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(request, copy));
          }
          return res;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Otros estáticos: caché primero, luego red
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((res) => {
        if (res.ok && (url.pathname.endsWith(".png") || url.pathname.endsWith(".svg") || url.pathname.endsWith(".webp"))) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(request, copy));
        }
        return res;
      });
    })
  );
});
