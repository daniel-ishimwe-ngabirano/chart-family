import axios from "axios";

export async function registerServiceWorker() {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    console.log("Push not supported");
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register("/sw.js");
    console.log("SW registered");
    return registration;
  } catch (err) {
    console.error("SW registration failed:", err);
    return null;
  }
}

export async function requestNotificationPermission() {
  if (!("Notification" in window)) return "denied";
  if (Notification.permission === "granted") return "granted";
  if (Notification.permission === "denied") return "denied";

  const result = await Notification.requestPermission();
  return result;
}

export async function subscribeToPush(registration) {
  if (!registration) return null;

  const perm = await requestNotificationPermission();
  if (perm !== "granted") return null;

  try {
    const { data } = await axios.get("/api/users/push/vapid-key");
    const publicKey = data.publicKey;
    if (!publicKey) return null;

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });

    await axios.put("/api/users/push/subscription", subscription);
    return subscription;
  } catch (err) {
    console.error("Push subscription failed:", err);
    return null;
  }
}

export async function unsubscribeFromPush(registration) {
  if (!registration) return;

  const subscription = await registration.pushManager.getSubscription();
  if (subscription) {
    await axios.delete("/api/users/push/subscription", {
      data: { endpoint: subscription.endpoint },
    });
    await subscription.unsubscribe();
  }
}

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((ch) => ch.charCodeAt(0)));
}
