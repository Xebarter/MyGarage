/* eslint-disable no-undef */
importScripts("https://www.gstatic.com/firebasejs/12.14.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/12.14.0/firebase-messaging-compat.js");

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = event.notification.data?.url || "/admin";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client) {
          client.navigate?.(target);
          return client.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(target);
      return undefined;
    }),
  );
});

async function initMessaging() {
  try {
    const res = await fetch("/api/auth/firebase-config", { cache: "no-store" });
    const body = await res.json();
    if (!body?.configured || !body.config) return;
    if (!self.firebase.apps.length) {
      self.firebase.initializeApp(body.config);
    }
    const messaging = self.firebase.messaging();
    messaging.onBackgroundMessage((payload) => {
      const title = payload.notification?.title || payload.data?.title || "MyGarage";
      const notificationBody = payload.notification?.body || payload.data?.body || "New admin alert";
      const url = payload.data?.url || "/admin";
      if (payload.notification) return;
      self.registration.showNotification(title, {
        body: notificationBody,
        icon: "/icon0.svg",
        badge: "/icon0.svg",
        data: { url },
        requireInteraction: true,
      });
    });
  } catch (error) {
    console.error("firebase-messaging-sw init failed", error);
  }
}

void initMessaging();
