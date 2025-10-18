/* firebase-messaging-sw.js - Service Worker for FCM Background Messages */

/* Import Firebase compat libraries */
importScripts("https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js")
importScripts("https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js")

/* Declare Firebase variable */
const firebase = self.firebase

/* Firebase configuration */
const firebaseConfig = {
  apiKey: "AIzaSyD5LN2IpcCY8RpwCVRxeV8X9trBWAnZGgg",
  authDomain: "bookit-83750.firebaseapp.com",
  projectId: "bookit-83750",
  // storageBucket: "bookit-83750.firebasestorage.app",
  storageBucket: "bookit-83750.appspot.com",
  messagingSenderId: "244206413621",
  appId: "1:244206413621:web:4b6ce1f09659632d590e7c",
  measurementId: "G-0NHM7Z1VPZ",
}

firebase.initializeApp(firebaseConfig)
const messaging = firebase.messaging()

/* Helper to show notification from payload */
async function showNotificationFromPayload(payload) {
  console.log("[SW] Received payload:", payload)

  // Extract notification data - FCM sends it in different structures
  const notificationData = payload.notification || {}
  const dataPayload = payload.data || {}

  const title = notificationData.title || dataPayload.title || "New Notification"
  const body = notificationData.body || dataPayload.body || "You have a new message"
  const icon = notificationData.icon || dataPayload.icon || "/jale logo.png"
  const url = dataPayload.url || dataPayload.click_action || payload.fcmOptions?.link || "/"
  const tag = dataPayload.tag || `jale-notification-${Date.now()}`

  const options = {
    body,
    icon,
    badge: "/jale logo.png",
    tag,
    requireInteraction: true,
    vibrate: [200, 100, 200],
    data: {
      url,
      timestamp: Date.now(),
      originalPayload: payload,
    },
    actions: [
      { action: "open", title: "Open" },
      { action: "close", title: "Dismiss" },
    ],
  }

  // Show the notification
  return self.registration.showNotification(title, options)
}

/* PRIMARY: Firebase background message handler */
messaging.onBackgroundMessage(async (payload) => {
  console.log("[SW] Background message received:", payload)

  if (Notification.permission !== "granted") {
    console.error("[SW] Notification permission not granted")
    return
  }

  try {
    await showNotificationFromPayload(payload)
  } catch (error) {
    console.error("[SW] Error showing notification:", error)
  }
})

/* FALLBACK: Raw push event listener */
self.addEventListener("push", (event) => {
  console.log("[SW] Push event received", event)

  if (!event.data) {
    console.log("[SW] Push event has no data")
    return
  }

  let payload
  try {
    payload = event.data.json()
    console.log("[SW] Parsed push payload:", payload)
  } catch (error) {
    console.error("[SW] Error parsing push data:", error)
    const textData = event.data.text()
    payload = {
      notification: {
        title: "New Notification",
        body: textData || "You have a new notification",
      },
      data: {},
    }
  }

  event.waitUntil(
    showNotificationFromPayload(payload)
      .then(() => console.log("[SW] Push notification shown successfully"))
      .catch((err) => console.error("[SW] Error showing push:", err)),
  )
})

/* Notification click handler */
self.addEventListener("notificationclick", (event) => {
  console.log("[SW] Notification clicked:", event.action)

  event.notification.close()

  if (event.action === "close") {
    return
  }

  const urlToOpen = event.notification.data?.url || "/"

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        // Try to find an existing window with matching URL
        for (const client of clientList) {
          try {
            const clientUrl = new URL(client.url)
            const targetUrl = new URL(urlToOpen, self.location.origin)

            if (clientUrl.pathname === targetUrl.pathname) {
              return client.focus()
            }
          } catch (err) {
            console.error("[SW] Error parsing client URL:", err)
          }
        }

        // No matching window found, open new one
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen)
        }
      })
      .catch((err) => console.error("[SW] Error handling click:", err)),
  )
})

/* Service Worker lifecycle */
self.addEventListener("install", (event) => {
  console.log("[SW] Service Worker installing")
  self.skipWaiting()
})

let keepAliveInterval
self.addEventListener("activate", (event) => {
  console.log("[SW] Service Worker activating")
  event.waitUntil(
    self.clients.claim().then(() => {
      // Start keepalive ping every 20 seconds
      if (keepAliveInterval) clearInterval(keepAliveInterval)
      keepAliveInterval = setInterval(() => {
        console.log("[SW] Keepalive ping")
      }, 20000)
    }),
  )
})

self.addEventListener("message", (event) => {
  console.log("[SW] Message received:", event.data)
  if (event.data && event.data.type === "PING") {
    event.ports[0].postMessage({ type: "PONG", timestamp: Date.now() })
  }
})

console.log("[SW] Firebase Messaging Service Worker loaded")
