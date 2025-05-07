"use client";

import { ACCESS_TOKEN } from "@/lib/constant";
import { createContext, useContext, useState, useEffect } from "react";

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

type AppContextType = {
  url: string | null;
  setUrl: React.Dispatch<React.SetStateAction<string | null>>;
  globalMessages: Message | undefined;
  setGlobalMessages: React.Dispatch<React.SetStateAction<Message | undefined>>;
  isLoggedIn: boolean;
  setIsLoggedIn: React.Dispatch<React.SetStateAction<boolean>>;
  currentProduct: Product | null;
  setCurrentProduct: React.Dispatch<React.SetStateAction<Product | null>>;
};

type Message = {
  sender_id: number;
  receiver_id: number;
  text: string;
  created_at: string;
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppWrapper({ children }: { children: React.ReactNode }) {
  const [url, setUrl] = useState<string | null>(null);
  const [globalMessages, setGlobalMessages] = useState<Message | undefined>();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentProduct, setCurrentProduct] = useState<Product | null>(null);

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
