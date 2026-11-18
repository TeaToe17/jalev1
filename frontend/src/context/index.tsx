"use client";

import { ACCESS_TOKEN } from "@/lib/constant";
import type React from "react";
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import api from "@/lib/api";
import {
  fetchCartItems,
  IsUser,
  getDecodedToken,
  fetchProducts,
  calculateMonthlyClickBill,
} from "@/lib/utils";

// Add these model definitions to your global AppContext workspace
interface Category {
  id: number;
  name: string;
  icon: string;
}

interface ProductVariant {
  id: number;
  sku: string;
  price: string | number;
  stock: number;
  attributes: Record<string, string | number | null>;
  negotiable: boolean;
  used: boolean;
  sold: boolean;
  reserved: boolean;
  image: string;
  created: string;
}

// Update the primary Product definition inside context layout files
interface Product {
  id: number;
  name: string;
  categories: Category[];
  created: string;
  owner: number;
  is_sticky: boolean;
  sticky_timestamp: string | null;
  variants: ProductVariant[]; // Added: Supports nested configuration lists
  preferred_variant_id: number; // Added: Remembers main default identity key
}

type ChatPreview = {
  sender: number;
  receiver: number;
  latest_message: string;
  time: string;
  unread: number;
  actual_sender: number;
  actual_receiver: number;
};

type Message = {
  sender_id: number;
  receiver_id: number;
  text: string;
  created_at: string;
};

type CustomUser = {
  id: number;
  username: string;
  whatsapp: string;
  call: string;
  image: string;
  email: string;
  categories: number[];
};

// MATCHES: Backend CartItemSerializer schema reflecting the change to variants
type CartItem = {
  id?: number;
  owner: number;
  variant: number; // Updated: Changed from 'product' to point to ProductVariant ID
  quantity: number;
  size?: string;
  product_image: string;
  product_stock: number;
  product_name: string;
  product_price: number | string; // Updated: Matches string decimals to prevent crash logs
};

type AppContextType = {
  url: string | null;
  setUrl: React.Dispatch<React.SetStateAction<string | null>>;
  globalMessages: Message | undefined;
  setGlobalMessages: React.Dispatch<React.SetStateAction<Message | undefined>>;
  isLoggedIn: boolean;
  setIsLoggedIn: React.Dispatch<React.SetStateAction<boolean>>;
  currentProduct: Product | null;
  setCurrentProduct: React.Dispatch<React.SetStateAction<Product | null>>;
  messageCount: number;
  setMessageCount: React.Dispatch<React.SetStateAction<number>>;
  chats: ChatPreview[];
  setChats: React.Dispatch<React.SetStateAction<ChatPreview[]>>;
  currentUser: CustomUser | undefined;
  setCurrentUser: React.Dispatch<React.SetStateAction<CustomUser | undefined>>;
  messageTrigger: boolean;
  setMessageTrigger: React.Dispatch<React.SetStateAction<boolean>>;
  cart: CartItem[];
  setCart: React.Dispatch<React.SetStateAction<CartItem[]>>;
  cartCount: number;
  setCartCount: React.Dispatch<React.SetStateAction<number>>;
  changedCart: boolean;
  setChangedCart: React.Dispatch<React.SetStateAction<boolean>>;
  setWs: React.Dispatch<React.SetStateAction<WebSocket | null>>;
  ws: WebSocket | null;
  debt: boolean;
  setDebt: React.Dispatch<React.SetStateAction<boolean>>;
  clearanceRequired: boolean;
  clearanceProductCount: number;
  refreshClearanceStatus: () => Promise<void>;
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppWrapper({ children }: { children: React.ReactNode }) {
  const [url, setUrl] = useState<string | null>(null);
  const [globalMessages, setGlobalMessages] = useState<Message | undefined>();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentProduct, setCurrentProduct] = useState<Product | null>(null);
  const [messageCount, setMessageCount] = useState<number>(0);
  const [chats, setChats] = useState<ChatPreview[]>([]);
  const [currentUser, setCurrentUser] = useState<CustomUser>();
  const [messageTrigger, setMessageTrigger] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartCount, setCartCount] = useState<number>(0);
  const [changedCart, setChangedCart] = useState<boolean>(false);
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [debt, setDebt] = useState(false);
  const [clearanceRequired, setClearanceRequired] = useState(false);
  const [clearanceProductCount, setClearanceProductCount] = useState(0);

  useEffect(() => {
    if (!isLoggedIn) {
      if (typeof window !== "undefined") {
        const token = localStorage.getItem(ACCESS_TOKEN);
        if (token) {
          setIsLoggedIn(true);
        }
      }
    }
  }, []);

  const loadCartItems = async () => {
    if (!IsUser()) return;
    const data = await fetchCartItems();
    if (data) {
      setCart(data);
      setChangedCart(false);
    }
  };

  useEffect(() => {
    if (!isLoggedIn || !IsUser() || !changedCart) return;

    const loadCart = async () => {
      try {
        await loadCartItems();
      } catch (error) {
        console.error("Failed to load cart items:", error);
      }
    };

    loadCart();
  }, [changedCart, isLoggedIn]);

  useEffect(() => {
    setCartCount(cart?.length || 0);
  }, [cart]);

  // Auto-trigger message updates when globalMessages changes
  useEffect(() => {
    if (globalMessages && isLoggedIn) {
      setMessageTrigger(true);
    }
  }, [globalMessages, isLoggedIn]);

  // Fetch compulsory clearance products globally
  const refreshClearanceStatus = useCallback(async () => {
    if (!isLoggedIn || !IsUser()) return;

    try {
      console.log("[CLEARANCE] Checking compulsory clearance products...");

      const decoded = getDecodedToken();
      const userId = decoded?.CustomUser?.id;

      if (!userId) {
        console.log("[CLEARANCE] No authenticated user ID found.");
        return;
      }

      // Same fetch used by the Payments page
      const response = await fetchProducts(1, userId, "", null, true);

      // Same compulsory clearance rules used by the Payments page
      const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;

      const dueProducts = response.results.filter((product) => {
        const billing = calculateMonthlyClickBill(
          product.chargeable_clicks,
          product.price,
        );

        const clearanceExpired =
          new Date(product.lastclearance).getTime() <= cutoff;

        const isDue = clearanceExpired && billing.monthly_bill >= 1000;

        return isDue;
      });

      console.log("[CLEARANCE] Compulsory products:", dueProducts);

      setClearanceProductCount(dueProducts.length);
      setClearanceRequired(dueProducts.length > 0);
    } catch (error) {
      console.error("[CLEARANCE] Failed to check clearance status:", error);
    }
  }, [isLoggedIn]);

  return (
    <AppContext.Provider
      value={{
        url,
        setUrl,
        globalMessages,
        setGlobalMessages,
        isLoggedIn,
        setIsLoggedIn,
        currentProduct,
        setCurrentProduct,
        messageCount,
        setMessageCount,
        chats,
        setChats,
        currentUser,
        setCurrentUser,
        messageTrigger,
        setMessageTrigger,
        cart,
        setCart,
        cartCount,
        setCartCount,
        changedCart,
        setChangedCart,
        setWs,
        ws,
        setDebt,
        debt,
        clearanceRequired,
        clearanceProductCount,
        refreshClearanceStatus,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) throw new Error("useAppContext must be used within AppWrapper");
  return context;
}
