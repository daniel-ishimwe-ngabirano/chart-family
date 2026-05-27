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
