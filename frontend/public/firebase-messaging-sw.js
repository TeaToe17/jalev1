// /* ==========================================================
//    Firebase Messaging Service Worker - Unified Version
//    Works for both FCM (Android/Chrome) and WebPush (Safari/iOS)
//    ========================================================== */

// /* Import Firebase compat libraries */
// importScripts("https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js")
// importScripts("https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js")

// /* Firebase configuration */
// const firebaseConfig = {
//   apiKey: "AIzaSyD5LN2IpcCY8RpwCVRxeV8X9trBWAnZGgg",
//   authDomain: "bookit-83750.firebaseapp.com",
//   projectId: "bookit-83750",
//   storageBucket: "bookit-83750.appspot.com",
//   messagingSenderId: "244206413621",
//   appId: "1:244206413621:web:4b6ce1f09659632d590e7c",
//   measurementId: "G-0NHM7Z1VPZ",
// }

// /* Initialize Firebase */
// firebase.initializeApp(firebaseConfig)
// const messaging = firebase.messaging()

// console.log("[SW] Firebase Messaging Service Worker loaded")

// /* ==========================================================
//    🔇 Disable FCM’s built-in background message notification
//    ========================================================== */
// messaging.onBackgroundMessage((payload) => {
//   console.log("[SW] Firebase background message suppressed — using unified push handler only.", payload)
// })

// /* ==========================================================
//    🔔 Unified Push Event Listener
//    Handles both WebPush (Safari/iOS) and FCM (Android/Chrome)
//    ========================================================== */
// self.addEventListener("push", (event) => {
//   console.log("[SW] Push event received")

//   if (!event.data) {
//     console.warn("[SW] Push event has no data")
//     return
//   }

//   let payload
//   try {
//     payload = event.data.json()
//     console.log("[SW] Parsed push payload:", payload)
//   } catch (error) {
//     console.error("[SW] Error parsing push payload:", error)
//     payload = {
//       notification: { title: "New Notification", body: event.data.text() || "You have a new message" },
//       data: {},
//     }
//   }

//   const notification = payload.notification || {}
//   const data = payload.data || {}

//   const title = notification.title || data.title || "New Notification"
//   const body = notification.body || data.body || "You have a new message"
//   const icon = notification.icon || data.icon || "/jale logo.png"
//   const badge = "/jale logo.png"
//   const url = data.url || data.click_action || payload.fcmOptions?.link || "/"
//   const tag = data.tag || "jale-unified-notification"

//   const options = {
//     body,
//     icon,
//     badge,
//     tag,
//     requireInteraction: true,
//     vibrate: [200, 100, 200],
//     data: {
//       url,
//       timestamp: Date.now(),
//     },
//     actions: [
//       { action: "open", title: "Open" },
//       { action: "close", title: "Dismiss" },
//     ],
//   }

//   // Display notification
//   event.waitUntil(
//     self.registration.showNotification(title, options).then(() => {
//       console.log("[SW] Notification displayed successfully")
//     })
//   )
// })

// /* ==========================================================
//    🖱️ Notification Click Handling
//    Focuses existing window or opens a new one
//    ========================================================== */
// self.addEventListener("notificationclick", (event) => {
//   console.log("[SW] Notification clicked:", event.action)
//   event.notification.close()

//   if (event.action === "close") return

//   const targetUrl = event.notification.data?.url || "/"

//   event.waitUntil(
//     clients
//       .matchAll({ type: "window", includeUncontrolled: true })
//       .then((clientList) => {
//         // Focus existing tab if same URL
//         for (const client of clientList) {
//           try {
//             const clientUrl = new URL(client.url)
//             const target = new URL(targetUrl, self.location.origin)
//             if (clientUrl.pathname === target.pathname) return client.focus()
//           } catch (e) {
//             console.warn("[SW] Error matching client URL:", e)
//           }
//         }
//         // Otherwise open a new one
//         return clients.openWindow(targetUrl)
//       })
//       .catch((e) => console.error("[SW] Error handling click:", e))
//   )
// })

// /* ==========================================================
//    ⚙️ Lifecycle Management (Install / Activate)
//    ========================================================== */
// self.addEventListener("install", (event) => {
//   console.log("[SW] Installing new service worker...")
//   self.skipWaiting()
// })

// // let keepAliveInterval
// // self.addEventListener("activate", (event) => {
// //   console.log("[SW] Activating service worker...")
// //   event.waitUntil(
// //     self.clients.claim().then(() => {
// //       if (keepAliveInterval) clearInterval(keepAliveInterval)
// //       keepAliveInterval = setInterval(() => console.log("[SW] Keepalive ping"), 20000)
// //     })
// //   )
// // })

// /* ==========================================================
//    💬 Message Listener (for PING/PONG checks)
//    ========================================================== */
// self.addEventListener("message", (event) => {
//   console.log("[SW] Message received:", event.data)
//   if (event.data?.type === "PING") {
//     event.ports[0].postMessage({ type: "PONG", timestamp: Date.now() })
//   }
// })
