"use client";

import { useEffect, useState, useCallback } from "react";
import api from "@/lib/api";

interface PushSubscription {
  endpoint: string;
  keys: {
    auth: string;
    p256dh: string;
  };
}

interface PushNotificationState {
  isSupported: boolean;
  isSubscribed: boolean;
  isLoading: boolean;
  error: string | null;
}

export function usePushNotifications() {
  const [state, setState] = useState<PushNotificationState>({
    isSupported: false,
    isSubscribed: false,
    isLoading: false,
    error: null,
  });

  const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";
  const STORAGE_KEY = "pwa-push-subscription";

  // Check if push notifications are supported
  useEffect(() => {
    const isSupported =
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window;

    setState((prev) => ({ ...prev, isSupported }));

    if (isSupported) {
      // Check if already subscribed
      const savedSubscription = localStorage.getItem(STORAGE_KEY);
      if (savedSubscription) {
        setState((prev) => ({ ...prev, isSubscribed: true }));
      }
    }
  }, []);

  // Request notification permission and subscribe to push
  const subscribe = useCallback(async () => {
    if (!state.isSupported) {
      setState((prev) => ({
        ...prev,
        error: "Push notifications are not supported in this browser",
      }));
      return false;
    }

    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      // Request permission
      if (Notification.permission === "default") {
        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
          setState((prev) => ({
            ...prev,
            isLoading: false,
            error: "Notification permission denied",
          }));
          return false;
        }
      }

      // Register service worker
      const registration = await navigator.serviceWorker.register(
        "/service-worker.js",
        { scope: "/" }
      );

      console.log("[Hook] Service worker registered");

      // Subscribe to push
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        //@ts-ignore
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      await api.post("user/create_permission_token/", {
        subscription: subscription,
      });

      setState((prev) => ({
        ...prev,
        isSubscribed: true,
        isLoading: false,
      }));

      console.log("[Hook] Successfully subscribed to push notifications");
      return true;
    } catch (error) {
      console.error("[Hook] Subscription error:", error);
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : "Subscription failed",
      }));
      return false;
    }
  }, [state.isSupported, VAPID_PUBLIC_KEY]);

  useEffect(() => {
    let lastToken = localStorage.getItem("access");

    // 🔹 Helper: Check for token and subscribe if it just appeared
    const checkToken = () => {
      const currentToken = localStorage.getItem("access");

      // If token was just added
      if (currentToken && currentToken !== lastToken) {
        lastToken = currentToken;

        subscribe()
          .then((success) =>
            console.log("Subscribed (token appeared)?", success)
          )
          .catch((err) => console.error("[Subscription error]", err));
      }
    };

    // 🔹 Check immediately in case already logged in
    if (lastToken) {
      subscribe()
        .then((success) =>
          console.log("Subscribed (already logged in)?", success)
        )
        .catch((err) => console.error("[Subscription error]", err));
    }

    // 🔹 Watch for changes in the same tab
    const interval = setInterval(checkToken, 1000);

    // 🔹 Watch for changes across tabs
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === "ACCESS_TOKEN" && event.newValue) {
        subscribe()
          .then((success) => console.log("Subscribed (cross-tab)?", success))
          .catch((err) => console.error("[Subscription error]", err));
      }
    };

    window.addEventListener("storage", handleStorageChange);

    // 🔹 Cleanup
    return () => {
      clearInterval(interval);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [subscribe]);

  // Unsubscribe from push notifications
  const unsubscribe = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await subscription.unsubscribe();
        localStorage.removeItem(STORAGE_KEY);

        setState((prev) => ({
          ...prev,
          isSubscribed: false,
          isLoading: false,
        }));

        console.log("[Hook] Successfully unsubscribed from push notifications");
        return true;
      }

      return false;
    } catch (error) {
      console.error("[Hook] Unsubscription error:", error);
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : "Unsubscription failed",
      }));
      return false;
    }
  }, []);

  // Send a test notification
  const sendPushNotification = useCallback(
    async (
      receiverId: number,
      userId: number,
      body: string,
      title: string
    ) => {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      try {
        const response = await fetch("/api/send-notification/", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            receiverId: receiverId,
            userId: userId,
            body: body,
            title: title,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to send notification");
        }

        setState((prev) => ({ ...prev, isLoading: false }));
        console.log("[Hook] Test notification sent");
        return true;
      } catch (error) {
        console.error("[Hook] Send notification error:", error);
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error:
            error instanceof Error
              ? error.message
              : "Failed to send notification",
        }));
        return false;
      }
    },
    []
  );

  return {
    ...state,
    subscribe,
    unsubscribe,
    sendPushNotification,
  };
}

// Helper function to convert VAPID public key from base64 to Uint8Array
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}
