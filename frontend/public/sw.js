const CACHE = "wavechat-v1";

const PRECACHE_URLS = [
  "/",
  "/offline",
  "/manifest.json",
  "/favicon.png",
  "/icons/icon-192.svg",
  "/icons/icon-512.svg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const fetchPromise = fetch(event.request)
        .then((response) => {
          if (response.ok && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => cached);
      return cached || fetchPromise;
    })
  );
});

self.addEventListener("push", (event) => {
  const data = event.data?.json() || {};
  const { title = "WaveChat", body = "", icon = "/favicon.png", badge = "/favicon.png", data: msgData = {} } = data;

  const options = {
    body,
    icon,
    badge,
    data: msgData,
    vibrate: [200, 100, 200],
    tag: msgData.conversationId || "wavechat",
    renotify: true,
    actions: [
      { action: "reply", title: "Reply" },
      { action: "open", title: "Open Chat" },
    ],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const data = event.notification.data || {};

  if (event.action === "reply") {
    const url = data.url || "/chat";
    clients.openWindow(url);
    return;
  }

  const url = data.url || "/chat";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(url) && "focus" in client) {
          return client.focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});
