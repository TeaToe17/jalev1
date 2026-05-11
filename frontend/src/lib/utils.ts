import api from "./api";
import { ACCESS_TOKEN } from "./constant";
import { jwtDecode } from "jwt-decode";
import { useAppContext } from "@/context";
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getMessaging, getToken } from "firebase/messaging";
import { useEffect, useRef } from "react";
import { useParams, useRouter, usePathname } from "next/navigation";

type CustomUser = {
  id: number;
  username: string;
  whatsapp: string;
  call: string;
  image: string;
  email: string;
  referral_points: number;
  categories: number[];
};

interface Product {
  id: number;
  name: string;
  price: number;
  image: File;
  stock: number;
  new: boolean;
  sold: boolean;
  negotiable: boolean;
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

type CartItem = {
  id: number;
  owner: number;
  product: number;
  quantity: number;
  product_image: string;
  product_stock: number;
  product_name: string;
  product_price: number;
};

export const fetchUser = async (): Promise<CustomUser | null> => {
  const token = localStorage.getItem(ACCESS_TOKEN);
  if (token) {
    const decoded: DecodedToken = jwtDecode(token);
    const { CustomUser } = decoded;
    return CustomUser;
  } else {
    return null;
  }
};

export const getUser = async (): Promise<CustomUser | null> => {
  const token = localStorage.getItem(ACCESS_TOKEN);

  if (!token) return null;

  try {
    const decoded: DecodedToken = jwtDecode(token);
    const userId = decoded?.CustomUser?.id;

    if (!userId) return null;

    const response = await api.get<CustomUser>(`user/get_user/${userId}/`);
    return response.data;
  } catch (error) {
    console.error("Error fetching user:", error);
    return null;
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
    if (error?.response?.status == 401) {
      throw new Error("Please Login again.");
    } else {
      console.log(error);
    }
  }
};

export const fetchCategories = async () => {
  try {
    const res = await api.get("product/categories/");
    return res.data || [];
  } catch (error: any) {
    if (error?.response?.status == 401) {
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
export { analytics, messaging };

export const IsUser = () => {
  if (typeof window === "undefined") return false;
  return !!localStorage.getItem(ACCESS_TOKEN);
};

export function useGlobalListener() {
  const { setGlobalMessages, isLoggedIn, setWs, ws } = useAppContext();

  const retryCount = useRef(0);

  useEffect(() => {
    if (!isLoggedIn) return;

    let reconnectTimeout: NodeJS.Timeout | null = null;

    const connectWebSocket = () => {
      if (typeof window === "undefined") return;

      // Prevent duplicate active connections
      if (
        ws &&
        (ws.readyState === WebSocket.OPEN ||
          ws.readyState === WebSocket.CONNECTING)
      ) {
        console.log("WebSocket already active");
        return;
      }

      const token = localStorage.getItem(ACCESS_TOKEN);

      if (!token) return;

      const decoded: Decoded = jwtDecode(token);
      const userId = decoded.user_id;

      const socket =
        process.env.NEXT_PUBLIC_ENVIRONMENT === "development"
          ? new WebSocket(
              `ws://localhost:8000/ws/chat/${userId}/?token=${token}`,
            )
          : new WebSocket(
              `wss://jalev1.onrender.com/ws/chat/${userId}/?token=${token}`,
            );

      // Save globally
      setWs(socket);

      socket.onopen = () => {
        console.log("Global WebSocket opened");
        retryCount.current = 0;
      };

      socket.onmessage = (e) => {
        const data = JSON.parse(e.data);

        if (data.scope === "personal") {
          setGlobalMessages(data);
        }
      };

      socket.onclose = () => {
        console.log("Global WebSocket closed");

        setWs(null);

        if (retryCount.current < 2) {
          retryCount.current += 1;

          console.log(
            `Retrying WebSocket connection... (Attempt ${retryCount.current})`,
          );

          reconnectTimeout = setTimeout(() => {
            connectWebSocket();
          }, 3000);
        }
      };

      socket.onerror = (err) => {
        console.log("WebSocket error", err);
      };
    };

    connectWebSocket();

    return () => {
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }

      // Optional:
      // Only close if you truly want global cleanup
      // ws?.close();
    };
  }, [isLoggedIn]);
}

// export function connectToChat(
//   receiverId: number,
//   productId: number = 0,
//   ownerId: number = 0,
// ) {
//   const token = localStorage.getItem("access");
//   if (!token) {
//     // alert("Please Login to chat");
//     return null;
//   }

//   const ws =
//     process.env.NEXT_PUBLIC_ENVIRONMENT === "development"
//       ? new WebSocket(
//           productId
//             ? `ws://localhost:8000/ws/chat/${receiverId}/?token=${token}&product=${productId}&owner=${ownerId}`
//             : `ws://localhost:8000/ws/chat/${receiverId}/?token=${token}`,
//         )
//       : new WebSocket(
//           productId
//             ? `wss://jalev1.onrender.com/ws/chat/${receiverId}/?token=${token}&product=${productId}&owner=${ownerId}`
//             : `wss://jalev1.onrender.com/ws/chat/${receiverId}/?token=${token}`,
//         );

//   ws.onopen = () => {
//     console.log("Opened");
//   };

//   ws.onerror = () => {
//     console.log("error happened");
//   };

//   ws.onclose = (event) => {
//     console.log("CLOSE CODE:", event.code);
//     console.log("REASON:", event.reason);
//     console.log("WAS CLEAN:", event.wasClean);
//   };
//   return ws;
// }

export function connectToChat(ws: WebSocket | null, receiverId: number) {
  if (!ws) {
    console.log("No websocket found");
    return null;
  }

  if (ws.readyState !== WebSocket.OPEN) {
    console.log("WebSocket is not open");
    return null;
  }

  console.log("Chat handshake sent");

  ws.send(
    JSON.stringify({
      type: "connect_chat",
      receiver_id: receiverId,
    }),
  );

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

export function LoggedIn(): boolean {
  if (typeof window === "undefined") return false; // during SSR
  return Boolean(localStorage.getItem(ACCESS_TOKEN));
}

export const fetchCartItems = async () => {
  const res = await api.get<CartItem[]>("order/list/cartitem/");
  return res.data;
};
