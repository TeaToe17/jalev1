import api from "./api";
import { ACCESS_TOKEN } from "./constant";
import { jwtDecode } from "jwt-decode";
import { useAppContext } from "@/context";
import { useEffect, useRef } from "react";
import { wsManager } from "@/lib/WebSocketManager";

type Category = {
  id: number;
  name: string;
  icon: string;
};

// MATCHES: Backend ProductListSerializer schema with variant proxy typing
export interface Product {
  id: number;
  name: string;
  categories: Category[]; // Updated: Complete category data structure
  created: string;
  owner: number;
  is_sticky: boolean;
  sticky_timestamp: string | null;

  // Preferred Variant values flattened automatically onto the object payload
  price: number | string;
  image: string;
  sku: string;
  stock: number;
  attributes: Record<string, string | number | null>;
}

// MATCHES: Full Variant Serializer from Backend
export interface ProductVariant {
  id: number;
  sku: string;
  price: string | number;
  stock: number;
  sizes: string[];
  attributes: Record<string, string | number | null>;
  negotiable: boolean;
  used: boolean;
  sold: boolean;
  reserved: boolean;
  image: string;
  created: string;
  datesold: string | null;
  request: number | null;
  is_preferred: boolean;
}

// MATCHES: Detailed view data shape with raw nested variations sub-arrays
export interface ProductDetailData {
  id: number;
  name: string;
  categories: Category[];
  created: string;
  owner: number;
  is_sticky: boolean;
  sticky_timestamp: string | null;
  variants: ProductVariant[];
  preferred_variant_id: number;
}

export type CustomUser = {
  id: number;
  username: string;
  whatsapp: string;
  call: string;
  image: string;
  email: string;
  referral_points: number;
  categories: number[];
};

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

export type CartItem = {
  id: number;
  owner: number;
  variant: number; // Updated: Tracks ProductVariant ID
  quantity: number;
  size: string;
  product_image: string;
  product_stock: number;
  product_name: string;
  product_price: number | string;
};

export const fetchUser = async (): Promise<CustomUser | null> => {
  const token = localStorage.getItem(ACCESS_TOKEN);
  if (token) {
    const decoded: DecodedToken = jwtDecode(token);
    return decoded.CustomUser;
  }
  return null;
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

// High-performance feed listing array data fetcher helper
interface PaginatedProducts {
  count: number;
  next: string | null;
  previous: string | null;
  results: Product[];
}

export const fetchProducts = async (
  page: number = 1,
  ownerId: string | number | null = null,
  search = "",
  category: number | null = null,
): Promise<PaginatedProducts> => {
  try {
    const params = new URLSearchParams();

    params.append("page", String(page));

    if (ownerId) {
      params.append("id", String(ownerId));
    }

    if (search) {
      params.append("search", search);
    }

    if (category) {
      params.append("category", String(category));
    }

    const res = await api.get<PaginatedProducts>(
      `product/list/?${params.toString()}`,
    );

    return res.data;
  } catch (error: any) {
    if (error?.response?.status === 401) {
      throw new Error("Please Login again.");
    }

    console.error("Error fetching products listing:", error);

    return {
      count: 0,
      next: null,
      previous: null,
      results: [],
    };
  }
};

// NEW: Hits specialized detail view to load parent data plus child variant options
export const fetchProductDetail = async (
  id: string | number,
): Promise<ProductDetailData | null> => {
  try {
    const res = await api.get<ProductDetailData>(`product/detail/${id}/`);
    return res.data || null;
  } catch (error: any) {
    if (error?.response?.status === 401) {
      throw new Error("Please Login again.");
    }
    console.error(`Error loading details for product ID ${id}:`, error);
    return null;
  }
};

export const fetchCategories = async (): Promise<Category[]> => {
  try {
    const res = await api.get<Category[]>("product/categories/");
    return res.data || [];
  } catch (error: any) {
    if (error?.response?.status === 401) {
      throw new Error("Please Login again.");
    }
    return [];
  }
};

export const IsUser = () => {
  if (typeof window === "undefined") return false;
  return !!localStorage.getItem(ACCESS_TOKEN);
};

export function useGlobalListener() {
  const { setGlobalMessages, isLoggedIn, setWs } = useAppContext();

  useEffect(() => {
    if (!isLoggedIn) return;

    const token = localStorage.getItem(ACCESS_TOKEN);

    if (!token) return;

    const decoded: Decoded = jwtDecode(token);

    const userId = decoded.user_id;

    // persistent singleton socket
    const socket = wsManager.connect(userId, token);

    if (!socket) return;
    console.log("Socket", socket);
    setWs(socket);

    // subscribe to EVERY websocket message
    const unsubscribe = wsManager.subscribe((data) => {
      try {
        if (data.scope === "personal") {
          // ALWAYS triggers on each message
          setGlobalMessages((prev: any) => ({
            ...prev,
            ...data,
          }));
        }
      } catch (err) {
        console.error("WS listener error", err);
      }
    });

    return () => {
      // IMPORTANT:
      // remove ONLY this listener
      // DO NOT close websocket
      unsubscribe();
    };
  }, [isLoggedIn, setGlobalMessages, setWs]);
}
// export function useGlobalListener() {
//   const { setGlobalMessages, isLoggedIn, setWs, ws } = useAppContext();
//   const retryCount = useRef(0);

//   useEffect(() => {
//     if (!isLoggedIn) return;
//     let reconnectTimeout: NodeJS.Timeout | null = null;

//     const connectWebSocket = () => {
//       if (typeof window === "undefined") return;
//       if (
//         ws &&
//         (ws.readyState === WebSocket.OPEN ||
//           ws.readyState === WebSocket.CONNECTING)
//       ) {
//         return;
//       }
//       const token = localStorage.getItem(ACCESS_TOKEN);
//       if (!token) return;

//       const decoded: Decoded = jwtDecode(token);
//       const userId = decoded.user_id;

//       const socket =
//         process.env.NEXT_PUBLIC_ENVIRONMENT === "development"
//           ? new WebSocket(
//               `ws://localhost:8000/ws/chat/${userId}/?token=${token}`,
//             )
//           : new WebSocket(
//               `wss://jalev1.onrender.com/ws/chat/${userId}/?token=${token}`,
//             );

//       setWs(socket);

//       socket.onopen = () => {
//         retryCount.current = 0;
//       };

//       socket.onmessage = (e) => {
//         const data = JSON.parse(e.data);
//         if (data.scope === "personal") {
//           setGlobalMessages(data);
//         }
//       };

//       socket.onclose = () => {
//         setWs(null);
//         if (retryCount.current < 2) {
//           retryCount.current += 1;
//           reconnectTimeout = setTimeout(() => {
//             connectWebSocket();
//           }, 3000);
//         }
//       };
//     };

//     connectWebSocket();
//     return () => {
//       if (reconnectTimeout) clearTimeout(reconnectTimeout);
//     };
//   }, [isLoggedIn]);
// }

export function connectToChat(ws: WebSocket | null, receiverId: number) {
  if (!ws || ws.readyState !== WebSocket.OPEN) return null;
  ws.send(JSON.stringify({ type: "connect_chat", receiver_id: receiverId }));
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
  if (typeof window === "undefined") return false;
  return Boolean(localStorage.getItem(ACCESS_TOKEN));
}

export const fetchCartItems = async (): Promise<CartItem[]> => {
  const res = await api.get<CartItem[]>("order/list/cartitem/");
  return res.data || [];
};
