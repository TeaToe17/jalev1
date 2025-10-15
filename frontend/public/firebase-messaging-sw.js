/* firebase-messaging-sw.js (full service worker) */

/* Import Firebase compat libraries */
importScripts(
  "https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js"
);
importScripts(
  "https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js"
);

/* Replace with your config (kept from your example) */
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

/* Helper to build and show a notification from a parsed payload */
async function showNotificationFromPayload(parsed) {
  // Narrowly extract fields but preserve everything in data
  const title =
    parsed.notification?.title ||
    parsed.data?.title ||
    parsed.data?.titleText ||
    "New Notification";
  const body =
    parsed.notification?.body ||
    parsed.data?.body ||
    parsed.data?.message ||
    "You have a new message";
  const url =
    parsed.data?.url || parsed.fcmOptions?.link || parsed.data?.link || "/";

  // Build a tag to help dedupe replacement if duplicate handlers run
  // If payload provides a tag/id, prefer it; otherwise use a stable timestamp
  const tag =
    parsed.data?.tag ||
    parsed.notification?.tag ||
    `app-notification-${
      parsed.data?.id || parsed.data?.timestamp || Date.now()
    }`;

  const options = {
    body,
    icon: "/logo.png",
    badge: "/badge-icon.png",
    tag,
    requireInteraction: true,
    actions: [
      { action: "open", title: "Open", icon: "/open-icon.png" },
      { action: "close", title: "Close", icon: "/close-icon.png" },
    ],
    data: {
      // Preserve the full data object so you can use any field on click
      url,
      payloadData: parsed.data || {},
      timestamp: Date.now(),
    },
    vibrate: [200, 100, 200],
    silent: false,
  };

  return self.registration.showNotification(title, options);
}

/* --- Primary: Firebase background message handler --- */
/* This is the recommended compat handler for FCM background messages */
messaging.onBackgroundMessage(async (payload) => {
  try {
    // payload can contain .notification and .data — pass it through
    await showNotificationFromPayload(payload);
    console.log(
      "[firebase-messaging-sw.js] onBackgroundMessage handled:",
      payload
    );
  } catch (err) {
    console.error(
      "[firebase-messaging-sw.js] Error in onBackgroundMessage:",
      err
    );
  }
});

/* --- Fallback push listener --- */
/* Some environments deliver a raw push event rather than triggering
   firebase's onBackgroundMessage. This fallback parses the event and
   calls the same showNotificationFromPayload helper.
   To avoid duplicate notifications when both run, we rely on `tag`
   replacement: same tag => replaces existing notification. */
self.addEventListener("push", (event) => {
  if (!event.data) {
    // No payload — nothing to show
    return;
  }

  let parsed = null;
  try {
    parsed = event.data.json();
  } catch (err) {
    // If data isn't JSON, treat as text body
    parsed = {
      notification: { title: "Notification", body: event.data.text() },
      data: {},
    };
  }

  event.waitUntil(
    (async () => {
      try {
        await showNotificationFromPayload(parsed);
        console.log("[firebase-messaging-sw.js] Push event shown:", parsed);
      } catch (err) {
        console.error("[firebase-messaging-sw.js] Error showing push:", err);
      }
    })()
  );
});

/* --- Notification click handler --- */
/* Focus an existing window with the URL or open a new one. */
self.addEventListener("notificationclick", (event) => {
  console.log("[firebase-messaging-sw.js] Notification click received.");
  event.notification.close();

  const action = event.action;
  // Extract saved url (if any)
  const url =
    event.notification.data?.url ||
    event.notification.data?.payloadData?.url ||
    "/";

  if (action === "close") {
    // user explicitly clicked the close action
    return;
  }

  event.waitUntil(
    (async () => {
      try {
        // Get all the window clients (tabs)
        const clientList = await clients.matchAll({
          type: "window",
          includeUncontrolled: true,
        });

        // Try to find a client whose URL path matches the notification URL
        const targetPath = new URL(url, self.location.origin).pathname;

        for (const client of clientList) {
          try {
            const clientUrl = new URL(client.url);
            if (
              clientUrl.pathname === targetPath ||
              client.url.includes(targetPath)
            ) {
              // If it's focusable, focus it and bring to front
              if ("focus" in client) {
                await client.focus();
                // Optionally navigate if it doesn't match full URL (e.g., single-page apps)
                // Use client.postMessage if you need to inform the page about the payload
                // client.postMessage({ type: "notification-click", data: event.notification.data });
                return;
              }
            }
          } catch (err) {
            // ignore malformed urls in clients
            continue;
          }
        }

        // If no matching client, open a new window/tab
        if (clients.openWindow) {
          await clients.openWindow(url);
        }
      } catch (err) {
        console.error("Error handling notification click:", err);
      }
    })()
  );
});

/* --- Install / Activate lifecycle --- */
self.addEventListener("install", (event) => {
  console.log("[firebase-messaging-sw.js] installing service worker");
  self.skipWaiting(); // Activate new worker immediately
});

self.addEventListener("activate", (event) => {
  console.log("[firebase-messaging-sw.js] activating service worker");
  event.waitUntil(self.clients.claim()); // Become available to all pages
});
