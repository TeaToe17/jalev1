"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import api from "@/lib/api";

interface PushNotificationState {
  isSupported: boolean;
  isSubscribed: boolean;
  isLoading: boolean;
  error: string | null;
}

const STORAGE_KEY = "pwa-push-subscription";

export function usePushNotifications(enabled: boolean = false) {
  const [state, setState] = useState<PushNotificationState>({
    isSupported: false,
    isSubscribed: false,
    isLoading: false,
    error: null,
  });

  const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";

  const subscribedRef = useRef(false);
  const subscribingRef = useRef(false);

  // -----------------------------------------
  // 1. CHECK BROWSER SUPPORT
  // -----------------------------------------

  useEffect(() => {
    const supported =
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window;

    console.log("[Push] Browser support:", supported);

    setState((prev) => ({
      ...prev,
      isSupported: supported,
    }));
  }, []);

  // -----------------------------------------
  // 2. SUBSCRIBE / REGISTER PUSH NOTIFICATIONS
  // -----------------------------------------

  const subscribe = useCallback(async (): Promise<boolean> => {
    if (subscribingRef.current) {
      console.log("[Push] Subscription already in progress");
      return false;
    }

    const supported =
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window;

    if (!supported) {
      setState((prev) => ({
        ...prev,
        error: "Push notifications are not supported",
      }));
      return false;
    }

    if (!VAPID_PUBLIC_KEY) {
      console.error("[Push] VAPID public key is missing");

      setState((prev) => ({
        ...prev,
        error: "VAPID public key is missing",
      }));

      return false;
    }

    subscribingRef.current = true;

    setState((prev) => ({
      ...prev,
      isLoading: true,
      error: null,
    }));

    try {
      // Check permission
      let permission = Notification.permission;

      console.log("[Push] Current permission:", permission);

      if (permission === "default") {
        console.log("[Push] Requesting notification permission");

        permission = await Notification.requestPermission();
      }

      if (permission !== "granted") {
        throw new Error(
          permission === "denied"
            ? "Notifications are blocked. Enable them in browser settings."
            : "Notification permission was not granted.",
        );
      }

      console.log("[Push] Permission granted");

      // Register service worker
      const registration = await navigator.serviceWorker.register(
        "/service-worker.js",
        { scope: "/" },
      );

      console.log("[Push] Service worker registered");

      await navigator.serviceWorker.ready;

      // Get existing browser subscription
      let subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        console.log("[Push] Existing browser subscription found");
      } else {
        console.log("[Push] Creating new browser subscription");

        const applicationServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);

        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey,
        });

        console.log("[Push] New browser subscription created");
      }

      // Always synchronize with Django.
      // This is important if the database record was deleted.
      const subscriptionData = subscription.toJSON();

      console.log("[Push] Sending subscription to backend");

      const response = await api.post("user/create_permission_token/", {
        subscription: subscriptionData,
      });

      console.log(
        "[Push] Backend subscription response:",
        response.status,
        response.data,
      );

      localStorage.setItem(STORAGE_KEY, "true");

      subscribedRef.current = true;

      setState((prev) => ({
        ...prev,
        isSubscribed: true,
        isLoading: false,
        error: null,
      }));

      console.log("[Push] Subscription successfully registered");

      return true;
    } catch (error) {
      console.error("[Push] Subscription failed:", error);

      setState((prev) => ({
        ...prev,
        isSubscribed: false,
        isLoading: false,
        error: error instanceof Error ? error.message : "Subscription failed",
      }));

      return false;
    } finally {
      subscribingRef.current = false;
    }
  }, [VAPID_PUBLIC_KEY]);

  // -----------------------------------------
  // 3. AUTOMATIC CHECK AFTER LOGIN
  // -----------------------------------------

  useEffect(() => {
    if (!enabled) {
      console.log("[Push] User not logged in. Skipping check.");
      return;
    }

    if (!("Notification" in window)) return;

    console.log("[Push] Logged-in user. Permission:", Notification.permission);

    // Only automatically subscribe if permission
    // has already been granted.
    if (Notification.permission === "granted") {
      console.log("[Push] Permission already granted. Syncing subscription.");

      subscribe();
    } else {
      console.log(
        "[Push] Permission not granted yet. Waiting for user interaction.",
      );
    }
  }, [enabled, subscribe]);

  // -----------------------------------------
  // 4. CROSS-TAB LOGIN LISTENER
  // -----------------------------------------

  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === "access" && event.newValue) {
        console.log("[Push] Login detected in another tab");

        if ("Notification" in window && Notification.permission === "granted") {
          subscribe();
        }
      }

      if (event.key === "access" && !event.newValue) {
        console.log("[Push] Logout detected in another tab");

        subscribedRef.current = false;

        setState((prev) => ({
          ...prev,
          isSubscribed: false,
        }));
      }
    };

    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [subscribe]);

  // -----------------------------------------
  // 5. UNSUBSCRIBE
  // -----------------------------------------

  const unsubscribe = useCallback(async (): Promise<boolean> => {
    if (!("serviceWorker" in navigator)) {
      return false;
    }

    setState((prev) => ({
      ...prev,
      isLoading: true,
      error: null,
    }));

    try {
      const registration = await navigator.serviceWorker.ready;

      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await subscription.unsubscribe();

        console.log("[Push] Browser subscription removed");
      }

      localStorage.removeItem(STORAGE_KEY);

      subscribedRef.current = false;

      setState((prev) => ({
        ...prev,
        isSubscribed: false,
        isLoading: false,
      }));

      console.log("[Push] Unsubscribed successfully");

      return true;
    } catch (error) {
      console.error("[Push] Unsubscribe error:", error);

      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : "Unsubscription failed",
      }));

      return false;
    }
  }, []);

  // -----------------------------------------
  // 6. SEND NOTIFICATION
  // -----------------------------------------

  const sendPushNotification = useCallback(
    (receiverId: number, userId: number, body: string, title: string) => {
      setState((prev) => ({
        ...prev,
        isLoading: true,
        error: null,
      }));

      fetch("/api/send-notification/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          receiverId,
          userId,
          body,
          title,
        }),
      })
        .then(async (res) => {
          const data = await res.json();

          if (!res.ok) {
            throw new Error(data?.error || "Failed");
          }

          setState((prev) => ({
            ...prev,
            isLoading: false,
          }));

          console.log("[Push] Notification sent successfully");
        })
        .catch((error) => {
          console.error("[Push] Send notification error:", error);

          setState((prev) => ({
            ...prev,
            isLoading: false,
            error: error instanceof Error ? error.message : "Failed",
          }));
        });
    },
    [],
  );

  // -----------------------------------------
  // 7. RETURN
  // -----------------------------------------

  return {
    ...state,
    subscribe,
    unsubscribe,
    sendPushNotification,
  };
}

// -----------------------------------------
// HELPER: CONVERT VAPID PUBLIC KEY
// -----------------------------------------

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);

  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

// "use client";

// import { useEffect, useState, useCallback, useRef } from "react";
// import api from "@/lib/api";

// interface PushSubscription {
//   endpoint: string;
//   keys: {
//     auth: string;
//     p256dh: string;
//   };
// }

// interface PushNotificationState {
//   isSupported: boolean;
//   isSubscribed: boolean;
//   isLoading: boolean;
//   error: string | null;
// }

// export function usePushNotifications() {
//   const [state, setState] = useState<PushNotificationState>({
//     isSupported: false,
//     isSubscribed: false,
//     isLoading: false,
//     error: null,
//   });

//   const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";
//   const STORAGE_KEY = "pwa-push-subscription";

//   const subscribedRef = useRef(false);
//   const subscribeRef = useRef<() => Promise<boolean>>();

//   // -----------------------------
//   // Check support + initial state
//   // -----------------------------
//   useEffect(() => {
//     const isSupported =
//       "serviceWorker" in navigator &&
//       "PushManager" in window &&
//       "Notification" in window;

//     setState((prev) => ({ ...prev, isSupported }));

//     if (!isSupported) return;

//     const saved = localStorage.getItem(STORAGE_KEY);
//     if (saved) {
//       setState((prev) => ({ ...prev, isSubscribed: true }));
//     }
//   }, []);

//   // -----------------------------
//   // Subscribe function
//   // -----------------------------
//   const subscribe = useCallback(async (): Promise<boolean> => {
//     if (!state.isSupported) return false;

//     // prevent duplicate calls
//     if (subscribedRef.current) return true;

//     setState((prev) => ({ ...prev, isLoading: true, error: null }));

//     try {
//       if (Notification.permission === "default") {
//         const permission = await Notification.requestPermission();
//         if (permission !== "granted") {
//           setState((prev) => ({
//             ...prev,
//             isLoading: false,
//             error: "Notification permission denied",
//           }));
//           return false;
//         }
//       }

//       const registration = await navigator.serviceWorker.register(
//         "/service-worker.js",
//         { scope: "/" },
//       );

//       // 🔑 prevent duplicate push subscriptions
//       let subscription = await registration.pushManager.getSubscription();

//       if (!subscription) {
//         const applicationServerKey = urlBase64ToUint8Array(
//           VAPID_PUBLIC_KEY,
//         ) as unknown as BufferSource;

//         subscription = await registration.pushManager.subscribe({
//           userVisibleOnly: true,
//           applicationServerKey,
//         });
//       }

//       await api.post("user/create_permission_token/", {
//         subscription,
//       });

//       localStorage.setItem(STORAGE_KEY, "true");

//       setState((prev) => ({
//         ...prev,
//         isSubscribed: true,
//         isLoading: false,
//       }));

//       subscribedRef.current = true;

//       console.log("[Push] Subscribed successfully");
//       return true;
//     } catch (error) {
//       console.error("[Push] Subscribe error:", error);

//       setState((prev) => ({
//         ...prev,
//         isLoading: false,
//         error: error instanceof Error ? error.message : "Subscription failed",
//       }));

//       return false;
//     }
//   }, [state.isSupported, VAPID_PUBLIC_KEY]);

//   subscribeRef.current = subscribe;

//   // -----------------------------
//   // Auto-subscribe on load (NO POLLING)
//   // -----------------------------
//   useEffect(() => {
//     const token = localStorage.getItem("access");

//     if (token && subscribeRef.current) {
//       subscribeRef.current();
//     }
//   }, []);

//   // -----------------------------
//   // Cross-tab listener ONLY (clean)
//   // -----------------------------
//   useEffect(() => {
//     const handleStorageChange = (event: StorageEvent) => {
//       if (event.key === "access" && event.newValue) {
//         subscribeRef.current?.();
//       }
//     };

//     window.addEventListener("storage", handleStorageChange);

//     return () => {
//       window.removeEventListener("storage", handleStorageChange);
//     };
//   }, []);

//   // -----------------------------
//   // Unsubscribe
//   // -----------------------------
//   const unsubscribe = useCallback(async (): Promise<boolean> => {
//     setState((prev) => ({ ...prev, isLoading: true, error: null }));

//     try {
//       const registration = await navigator.serviceWorker.ready;
//       const subscription = await registration.pushManager.getSubscription();

//       if (subscription) {
//         await subscription.unsubscribe();
//       }

//       localStorage.removeItem(STORAGE_KEY);

//       setState((prev) => ({
//         ...prev,
//         isSubscribed: false,
//         isLoading: false,
//       }));

//       subscribedRef.current = false;

//       console.log("[Push] Unsubscribed");
//       return true;
//     } catch (error) {
//       setState((prev) => ({
//         ...prev,
//         isLoading: false,
//         error: error instanceof Error ? error.message : "Unsubscription failed",
//       }));

//       return false;
//     }
//   }, []);

//   // -----------------------------
//   // Send notification (unchanged but safe)
//   // -----------------------------
//   const sendPushNotification = useCallback(
//     (receiverId: number, userId: number, body: string, title: string) => {
//       setState((prev) => ({ ...prev, isLoading: true, error: null }));

//       fetch("/api/send-notification/", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ receiverId, userId, body, title }),
//       })
//         .then(async (res) => {
//           const data = await res.json();

//           if (!res.ok) throw new Error(data?.error || "Failed");

//           setState((prev) => ({ ...prev, isLoading: false }));
//           return true;
//         })
//         .catch((err) => {
//           setState((prev) => ({
//             ...prev,
//             isLoading: false,
//             error: err instanceof Error ? err.message : "Failed",
//           }));
//         });
//     },
//     [],
//   );

//   return {
//     ...state,
//     subscribe,
//     unsubscribe,
//     sendPushNotification,
//   };
// }

// // -----------------------------
// // Helper
// // -----------------------------
// function urlBase64ToUint8Array(base64String: string): Uint8Array {
//   const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
//   const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");

//   const rawData = window.atob(base64);

//   // ✅ FORCE ArrayBuffer (fixes TS error)
//   const buffer = new ArrayBuffer(rawData.length);
//   const outputArray = new Uint8Array(buffer);

//   for (let i = 0; i < rawData.length; ++i) {
//     outputArray[i] = rawData.charCodeAt(i);
//   }

//   return outputArray;
// }

// "use client";

// import { useEffect, useState, useCallback } from "react";
// import api from "@/lib/api";

// interface PushSubscription {
//   endpoint: string;
//   keys: {
//     auth: string;
//     p256dh: string;
//   };
// }

// interface PushNotificationState {
//   isSupported: boolean;
//   isSubscribed: boolean;
//   isLoading: boolean;
//   error: string | null;
// }

// export function usePushNotifications() {
//   const [state, setState] = useState<PushNotificationState>({
//     isSupported: false,
//     isSubscribed: false,
//     isLoading: false,
//     error: null,
//   });

//   const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";
//   const STORAGE_KEY = "pwa-push-subscription";

//   // Check if push notifications are supported
//   useEffect(() => {
//     const isSupported =
//       "serviceWorker" in navigator &&
//       "PushManager" in window &&
//       "Notification" in window;

//     setState((prev) => ({ ...prev, isSupported }));

//     if (isSupported) {
//       // Check if already subscribed
//       const savedSubscription = localStorage.getItem(STORAGE_KEY);
//       if (savedSubscription) {
//         setState((prev) => ({ ...prev, isSubscribed: true }));
//       }
//     }
//   }, []);

//   const existingSubscription = await registration.pushManager.getSubscription();

//   if (existingSubscription) {
//     return true;
//   }

//   // Request notification permission and subscribe to push
//   const subscribe = useCallback(async () => {
//     if (!state.isSupported) {
//       setState((prev) => ({
//         ...prev,
//         error: "Push notifications are not supported in this browser",
//       }));
//       return false;
//     }

//     setState((prev) => ({ ...prev, isLoading: true, error: null }));

//     try {
//       // Request permission
//       if (Notification.permission === "default") {
//         const permission = await Notification.requestPermission();
//         if (permission !== "granted") {
//           setState((prev) => ({
//             ...prev,
//             isLoading: false,
//             error: "Notification permission denied",
//           }));
//           return false;
//         }
//       }

//       // Register service worker
//       const registration = await navigator.serviceWorker.register(
//         "/service-worker.js",
//         { scope: "/" },
//       );

//       console.log("[Hook] Service worker registered");

//       // Subscribe to push
//       const subscription = await registration.pushManager.subscribe({
//         userVisibleOnly: true,
//         //@ts-ignore
//         applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
//       });

//       await api.post("user/create_permission_token/", {
//         subscription,
//       });

//       setState((prev) => ({
//         ...prev,
//         isSubscribed: true,
//         isLoading: false,
//       }));

//       console.log("[Hook] Successfully subscribed to push notifications");
//       return true;
//     } catch (error) {
//       console.error("[Hook] Subscription error:", error);
//       setState((prev) => ({
//         ...prev,
//         isLoading: false,
//         error: error instanceof Error ? error.message : "Subscription failed",
//       }));
//       return false;
//     }
//   }, [state.isSupported, VAPID_PUBLIC_KEY]);

//   useEffect(() => {
//     let lastToken = localStorage.getItem("access");

//     // 🔹 Helper: Check for token and subscribe if it just appeared
//     const checkToken = () => {
//       const currentToken = localStorage.getItem("access");

//       // If token was just added
//       if (currentToken && currentToken !== lastToken) {
//         lastToken = currentToken;

//         subscribe()
//           .then((success) =>
//             console.log("Subscribed (token appeared)?", success),
//           )
//           .catch((err) => console.error("[Subscription error]", err));
//       }
//     };

//     // 🔹 Check immediately in case already logged in
//     if (lastToken) {
//       subscribe()
//         .then((success) =>
//           console.log("Subscribed (already logged in)?", success),
//         )
//         .catch((err) => console.error("[Subscription error]", err));
//     }

//     // 🔹 Watch for changes in the same tab
//     useEffect(() => {
//       const token = localStorage.getItem("access");

//       if (token) {
//         subscribe();
//       }
//     }, []);
//     // 🔹 Watch for changes across tabs
//     const handleStorageChange = (event: StorageEvent) => {
//       if (event.key === "ACCESS_TOKEN" && event.newValue) {
//         subscribe()
//           .then((success) => console.log("Subscribed (cross-tab)?", success))
//           .catch((err) => console.error("[Subscription error]", err));
//       }
//     };

//     window.addEventListener("storage", handleStorageChange);

//     // 🔹 Cleanup
//     return () => {
//       clearInterval(interval);
//       window.removeEventListener("storage", handleStorageChange);
//     };
//   }, [subscribe]);

//   // Unsubscribe from push notifications
//   const unsubscribe = useCallback(async () => {
//     setState((prev) => ({ ...prev, isLoading: true, error: null }));

//     try {
//       const registration = await navigator.serviceWorker.ready;
//       const subscription = await registration.pushManager.getSubscription();

//       if (subscription) {
//         await subscription.unsubscribe();
//         localStorage.removeItem(STORAGE_KEY);

//         setState((prev) => ({
//           ...prev,
//           isSubscribed: false,
//           isLoading: false,
//         }));

//         console.log("[Hook] Successfully unsubscribed from push notifications");
//         return true;
//       }

//       return false;
//     } catch (error) {
//       console.error("[Hook] Unsubscription error:", error);
//       setState((prev) => ({
//         ...prev,
//         isLoading: false,
//         error: error instanceof Error ? error.message : "Unsubscription failed",
//       }));
//       return false;
//     }
//   }, []);

//   // Send a test notification
//   const sendPushNotification = useCallback(
//     (receiverId: number, userId: number, body: string, title: string) => {
//       // Instantly update UI — no await lag
//       setState((prev) => ({ ...prev, isLoading: true, error: null }));

//       // Fire-and-forget network request
//       fetch("/api/send-notification/", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({
//           receiverId,
//           userId,
//           body,
//           title,
//         }),
//       })
//         .then(async (response) => {
//           const data = await response.json();

//           if (!response.ok) {
//             throw new Error(data?.error || "Failed to send notification");
//           }

//           // Finish instantly on success
//           setState((prev) => ({ ...prev, isLoading: false }));
//           console.log("[Hook] Notification sent");
//           return true;
//         })
//         .catch((error) => {
//           console.error("[Hook] Send notification error:", error);

//           setState((prev) => ({
//             ...prev,
//             isLoading: false,
//             error:
//               error instanceof Error
//                 ? error.message
//                 : "Failed to send notification",
//           }));

//           return false;
//         });
//     },
//     [],
//   );

//   return {
//     ...state,
//     subscribe,
//     unsubscribe,
//     sendPushNotification,
//   };
// }

// // Helper function to convert VAPID public key from base64 to Uint8Array
// function urlBase64ToUint8Array(base64String: string): Uint8Array {
//   const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
//   const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");

//   const rawData = window.atob(base64);
//   const outputArray = new Uint8Array(rawData.length);

//   for (let i = 0; i < rawData.length; ++i) {
//     outputArray[i] = rawData.charCodeAt(i);
//   }

//   return outputArray;
// }
