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
  console.log("DEBUG: Push event received!");
  
  // Broadcast to all windows to show in the debug console
  self.clients.matchAll().then(clients => {
    clients.forEach(client => {
      client.postMessage({
        type: "PUSH_RECEIVED",
        timestamp: new Date().toISOString()
      });
    });
  });

  const title = "My Diary (Server)";
  const options = {
    body: "サーバーからの信号を受け取りました！",
    icon: "/icon-192x192.png",
    tag: "test-push"
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
