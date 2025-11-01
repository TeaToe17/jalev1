import { getApp, getApps, initializeApp } from "firebase/app";
import { getMessaging, getToken, isSupported } from "firebase/messaging";

// Replace the following with your app's Firebase project configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

const messaging = async () => {
  const supported = await isSupported();
  return supported ? getMessaging(app) : null;
};

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export const fetchToken = async () => {
  try {
    // --- Detect if the browser is iOS Safari ---
    const isIos =
      /iPad|iPhone|iPod/.test(navigator.userAgent) && !("MSStream" in window);

    // --- Handle Apple Web Push (iOS Safari PWAs) ---
    if (isIos) {
      console.log("Detected iOS Safari — using Apple Push API");
      // alert("Detected iOS Safari — using Apple Push API");

      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        console.warn("Notification permission denied on iOS");
        return null;
      }

      const registration = await navigator.serviceWorker.ready;
      const vapidKey = process.env.NEXT_PUBLIC_WEBPUSH_VAPID_KEY;
      if (!vapidKey) throw new Error("VAPID public key is missing!");

      if (!("standalone" in navigator) || !navigator.standalone) {
        alert("Please install the PWA to receive notifications on iOS.");
        return;
      }

      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });

      if (!sub) {
        console.warn("Push subscription failed — got null");
        return null;
      }
      console.log("Apple Push API subscription:", sub.toJSON());
      return sub.toJSON(); // This is an Apple Push Subscription object
    }

    const fcmMessaging = await messaging();
    if (fcmMessaging) {
      const token = await getToken(fcmMessaging, {
        vapidKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      });
      return token;
    }
    return null;
  } catch (err) {
    console.error("An error occurred while fetching the token:", err);
    return null;
  }
};

export { app, messaging };
