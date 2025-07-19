importScripts(
  "https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js"
);
importScripts(
  "https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js"
);

const firebaseConfig = {
  apiKey: "AIzaSyD5LN2IpcCY8RpwCVRxeV8X9trBWAnZGgg",
  authDomain: "bookit-83750.firebaseapp.com",
  projectId: "bookit-83750",
  storageBucket: "bookit-83750.firebasestorage.app",
  messagingSenderId: "244206413621",
  appId: "1:244206413621:web:4b6ce1f09659632d590e7c",
  measurementId: "G-0NHM7Z1VPZ",
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

// Enhanced background message handler
messaging.onBackgroundMessage((payload) => {
  console.log(
    "[firebase-messaging-sw.js] Received background message",
    payload
  );

  // Handle both notification and data payloads
  const notificationTitle =
    payload.notification?.title || payload.data?.title || "New Notification";
  const notificationBody =
    payload.notification?.body ||
    payload.data?.body ||
    "You have a new message";
  const link = payload.data?.url || payload.fcmOptions?.link;

  const notificationOptions = {
    body: notificationBody,
    icon: "/logo.png", // Use absolute path
    badge: "/badge-icon.png", // Add badge for mobile
    tag: "notification-tag", // Prevent duplicate notifications
    requireInteraction: true, // Keep notification visible until user interacts
    actions: [
      {
        action: "open",
        title: "Open",
        icon: "/open-icon.png",
      },
      {
        action: "close",
        title: "Close",
        icon: "/close-icon.png",
      },
    ],
    data: {
      url: link,
      timestamp: Date.now(),
    },
    // Add vibration pattern for mobile
    vibrate: [200, 100, 200],
    // Add sound
    silent: false,
  };

  return self.registration.showNotification(
    notificationTitle,
    notificationOptions
  );
});

// Enhanced notification click handler
self.addEventListener("notificationclick", (event) => {
  console.log("[firebase-messaging-sw.js] Notification click received.");

  event.notification.close();

  const url = event.notification.data?.url;
  const action = event.action;

  if (action === "close") {
    return; // Just close the notification
  }

  if (!url) {
    console.log("No URL provided in notification data");
    return;
  }

  event.waitUntil(
    clients
      .matchAll({
        type: "window",
        includeUncontrolled: true,
      })
      .then((clientList) => {
        // Try to find an existing window with the target URL
        for (const client of clientList) {
          if (
            client.url.includes(new URL(url, self.location.origin).pathname) &&
            "focus" in client
          ) {
            return client.focus();
          }
        }

        // If no existing window found, open a new one
        if (clients.openWindow) {
          return clients.openWindow(url);
        }
      })
      .catch((error) => {
        console.error("Error handling notification click:", error);
      })
  );
});

// Add push event listener for better mobile support
self.addEventListener("push", (event) => {
  console.log("[firebase-messaging-sw.js] Push event received");

  if (!event.data) {
    console.log("Push event but no data");
    return;
  }

  try {
    const payload = event.data.json();
    console.log("Push payload:", payload);

    // Handle the push event manually if needed
    const notificationTitle =
      payload.notification?.title || payload.data?.title || "New Notification";
    const notificationOptions = {
      body:
        payload.notification?.body ||
        payload.data?.body ||
        "You have a new message",
      icon: "/logo.png",
      badge: "/badge-icon.png",
      data: payload.data || {},
      tag: "push-notification",
    };

    event.waitUntil(
      self.registration.showNotification(notificationTitle, notificationOptions)
    );
  } catch (error) {
    console.error("Error parsing push data:", error);
  }
});

// Add install and activate events for better service worker lifecycle management
self.addEventListener("install", (event) => {
  console.log("[firebase-messaging-sw.js] Service worker installing");
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  console.log("[firebase-messaging-sw.js] Service worker activating");
  event.waitUntil(self.clients.claim());
});
