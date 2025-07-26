"use client";

import { ACCESS_TOKEN } from "@/lib/constant";
import type React from "react";
import { createContext, useContext, useState, useEffect } from "react";
import api from "@/lib/api";
import { fetchCartItems, IsUser } from "@/lib/utils";

interface Product {
  id: number;
  name: string;
  price: number;
  imagefile: File | string;
  image: string;
  stock: number;
  used: boolean;
  sold: boolean;
  negotiable: boolean;
  extra_field: {};
  categories: number[];
  owner: number;
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
    if (!IsUser()) return
    const data = await fetchCartItems();
    if (data) {
      setCart(data);
      setChangedCart(false);
    }
  };

  useEffect(() => {
    if (changedCart == true) {
      loadCartItems();
    }
  }, [changedCart]);

  useEffect(() => {
    setCartCount(cart?.length);
  }, [cart]);

  // Auto-trigger message updates when globalMessages changes
  useEffect(() => {
    if (globalMessages && isLoggedIn) {
      setMessageTrigger(true);
    }
  }, [globalMessages, isLoggedIn]);

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
