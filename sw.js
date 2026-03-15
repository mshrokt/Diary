const CACHE_NAME = "diary-app-v1";
const ASSETS = ["/"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener("fetch", (event) => {
  // Skip cross-origin requests (like Firebase Storage/Firestore)
  // and non-GET requests (like file uploads)
  if (
    !event.request.url.startsWith(self.location.origin) ||
    event.request.method !== "GET"
  ) {
    return;
  }

  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});

// --- Push Notifications ---

self.addEventListener("push", (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      console.error("Push data is not JSON:", event.data.text());
      data = { body: event.data.text() };
    }
  }

  console.log("DEBUG: Push event received!", data);

  const title = data.title || "My Diary";
  const options = {
    body: data.body || "今日のできごとを記録しませんか？",
    icon: "/icon-192x192.png",
    data: {
      url: data.url || "/",
    }
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data.url)
  );
});
