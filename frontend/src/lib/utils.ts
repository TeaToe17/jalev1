import api from "./api";
import { ACCESS_TOKEN } from "./constant";
import { jwtDecode } from "jwt-decode";
import { useAppContext } from "@/context";
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getMessaging, getToken } from "firebase/messaging";
import { useEffect, useRef } from "react";
import { useParams, useRouter, usePathname } from "next/navigation";

interface CustomUser {
  id: number;
  name: string;
  whatsapp: string;
  call: string;
  image: string;
  categories: number[];
}

interface Product {
  id: number;
  name: string;
  price: number;
  image: File;
  stock: number;
  description: string;
  new: boolean;
  sold: boolean;
  extra_field: {};
  categories: number[];
  // categories: { id: number; name: string }[];
  owner: number;
}

interface DecodedToken {
  CustomUser: CustomUser;
  exp: number;
  iat: number;
  jti: string;
  token_type: string;
  user_id: number;
}

type Decoded = {
  user_id: number;
};

export const fetchUser = async (): Promise<CustomUser> => {
  const token = localStorage.getItem(ACCESS_TOKEN);
  if (token) {
    const decoded: DecodedToken = jwtDecode(token);
    const { CustomUser } = decoded;
    // console.log(decoded);
    return CustomUser;
  } else {
    throw new Error("Please Login");
  }
};

export const fetchBooks = async () => {
  try {
    const res = await api.get("book/seller_books/");
    return res.data || [];
  } catch (error: any) {
    if (error.response.status == 401) {
      throw new Error("Please Login again.");
    }
  }
};

export const fetchProducts = async (id: string | number | null = null) => {
  try {
    const res = id
      ? await api.get(`product/list/${id}/`)
      : await api.get("product/list/");
    return res.data || [];
  } catch (error: any) {
    if (error.response.status == 401) {
      throw new Error("Please Login again.");
    }
  }
};

export const fetchCategories = async () => {
  try {
    const res = await api.get("product/categories/");
    return res.data || [];
  } catch (error: any) {
    if (error.response.status == 401) {
      throw new Error("Please Login again.");
    }
  }
};

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Initialize

let analytics, messaging;
if (typeof window !== "undefined") {
  const app = initializeApp(firebaseConfig);
  analytics = getAnalytics(app);
  messaging = getMessaging(app);

  getToken(messaging, {
    vapidKey:
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
  })
    // .then((token) => console.log("FCM Token:", token))
    .catch((err) => console.error("Error getting FCM token:", err));
}
export { analytics, messaging };

export const IsUser = () => {
  if (typeof window === "undefined") return false;
  return !!localStorage.getItem(ACCESS_TOKEN);
};

export function useGlobalListener() {
  const { setGlobalMessages, isLoggedIn } = useAppContext();
  const retryCount = useRef(0); // Track number of retries

  useEffect(() => {
    if (!isLoggedIn) return;

    let ws: WebSocket | null = null;
    let reconnectTimeout: NodeJS.Timeout | null = null;

    const connectWebSocket = () => {
      if (typeof window === "undefined") return;

      const token = localStorage.getItem(ACCESS_TOKEN);
      if (!token) {
        alert("Please login to access chat feature");
        return;
      }

      const decoded: Decoded = jwtDecode(token);
      const userId = decoded.user_id;

      ws = new WebSocket(
        // `ws://localhost:8000/ws/global_chat/${userId}/?token=${token}`
        `wss://jalev1.onrender.com/ws/global_chat/${userId}/?token=${token}`
      );

      ws.onopen = () => {
        console.log("Global WebSocket opened");
        retryCount.current = 0; // Reset retry count on successful connection
      };

      ws.onmessage = (e) => {
        const data = JSON.parse(e.data);
        if (data.scope === "personal") {
          setGlobalMessages(data);
        }
      };

      ws.onclose = () => {
        console.log("Global WebSocket closed");

        if (retryCount.current < 2) {
          retryCount.current += 1;
          console.log(`Retrying WebSocket connection... (Attempt ${retryCount.current})`);
          reconnectTimeout = setTimeout(() => {
            connectWebSocket();
          }, 3000);
        }
      };
    };

    connectWebSocket();

    return () => {
      if (ws) ws.close();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
    };
  }, [isLoggedIn]);
}

export function connectToChat(receiverId: number, productId: number = 0, ownerId: number = 0) {
  const token = localStorage.getItem("access");
  if (!token) {
    alert("Please Login to chat");
    return null;
  }

  console.log(productId);
  const ws = new WebSocket(
    // productId ? `ws://localhost:8000/ws/chat/${receiverId}/?token=${token}&product=${productId}&owner=${ownerId}` : `ws://localhost:8000/ws/chat/${receiverId}/?token=${token}`
    productId ? `wss://jalev1.onrender.com/ws/chat/${receiverId}/?token=${token}&product=${productId}&owner=${ownerId}` : `wss://jalev1.onrender.com/ws/chat/${receiverId}/?token=${token}`
  );

  ws.onopen = () => {
    console.log("Opened");
  };

  return ws;
}

export const getDecodedToken = () => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem(ACCESS_TOKEN);
    if (token) {
      const decoded: DecodedToken = jwtDecode(token);
      return decoded;
    }
  }
};
