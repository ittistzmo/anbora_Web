const CACHE_NAME = "anbora-pwa-v1.0.0";
const OFFLINE_URL = "./offline.html";

const PRECACHE_ASSETS = [
  "./",
  "./index.html",
  "./offline.html",
  "./manifest.json",
  "./favicon.ico",
  "./assets/icons/icon-192.png",
  "./assets/icons/icon-512.png",
  "./assets/icons/logo.svg",
  "./assets/images/splash-illustration.svg",
  "./css/style.css",
  "./css/components.css",
  "./css/animations.css",
  "./css/responsive.css",
  "./js/utils.js",
  "./js/language.js",
  "./js/firebase.js",
  "./js/auth.js",
  "./js/router.js",
  "./js/dashboard.js",
  "./js/checkin.js",
  "./js/contacts.js",
  "./js/location.js",
  "./js/notifications.js",
  "./js/ai-companion.js",
  "./js/app.js",
  "./config/environment.example.js"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  // Bypass Firebase / Google APIs for network-only live data
  if (
    url.hostname.includes("googleapis.com") ||
    url.hostname.includes("firebaseio.com") ||
    url.hostname.includes("cloudfunctions.net")
  ) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => caches.match(OFFLINE_URL))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      const fetchPromise = fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200 && url.origin === self.location.origin) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return networkResponse;
        })
        .catch(() => cached);
      return cached || fetchPromise;
    })
  );
});

self.addEventListener("push", (event) => {
  let payload = {
    title: "ANBORA Safety Reminder",
    body: "Time for your safety check-in. Tap to confirm you are safe.",
    url: "./index.html#/checkin"
  };
  if (event.data) {
    try {
      payload = Object.assign(payload, event.data.json());
    } catch (_) {
      payload.body = event.data.text();
    }
  }
  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: "./assets/icons/icon-192.png",
      badge: "./assets/icons/icon-192.png",
      vibrate: [200, 100, 200],
      data: { url: payload.url || "./index.html#/checkin" },
      actions: [
        { action: "confirm_safe", title: "I'm Safe Now" },
        { action: "open_app", title: "Open ANBORA" }
      ]
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || "./index.html#/checkin";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if ("focus" in client) {
          client.focus();
          client.postMessage({ type: "NAVIGATE", hash: "#/checkin" });
          return;
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
