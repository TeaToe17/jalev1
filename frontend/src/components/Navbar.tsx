"use client";

import type React from "react";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useGlobalListener, fetchUser } from "@/lib/utils";
import { useAppContext } from "@/context";
import Image from "next/image";
import api, { logout } from "@/lib/api";
import {
  Menu,
  X,
  Home,
  MessageSquareMore,
  User,
  HandCoins,
  ShoppingCart,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { ACCESS_TOKEN } from "@/lib/constant";

type Message = {
  sender_id: number;
  receiver_id: number;
  text: string;
  created_at: string;
};

type ChatPreview = {
  sender: number;
  receiver: number;
  latest_message: string;
  time: string;
  unread: number;
  actual_sender: number;
  actual_receiver: number;
};

const Navbar = () => {
  const router = useRouter();
  const pathname = usePathname();
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const {
    globalMessages,
    isLoggedIn,
    messageCount,
    setMessageCount,
    chats,
    setChats,
    currentUser,
    setCurrentUser,
    messageTrigger,
    setMessageTrigger,
    cartCount,
    setChangedCart,
  } = useAppContext();

  useGlobalListener();

  // Making sure cart load regardless of route
  useEffect(() => {
    setChangedCart(true);
  }, []);

  useEffect(() => {
    const loadUser = async () => {
      const data = await fetchUser();
      if (data) {
        setCurrentUser(data);
      }
    };
    loadUser();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setDropdownOpen(false);
      }
    };

    if (dropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [dropdownOpen]);

  // Close mobile menu when route changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  // Fetch chat previews when messageTrigger is true
  useEffect(() => {
    if (!isLoggedIn) return;
    // if (!messageTrigger || !isLoggedIn) return;

    const token = localStorage.getItem(ACCESS_TOKEN);
    if (token) {
      const fetchPreview = async () => {
        try {
          console.log("fetched chat previews for navbar");
          const res = await api.get("user/chatpreview/list/");
          const data: ChatPreview[] = res.data;
          console.log("preview Fetched");
          setChats(data);
          // Reset the trigger after successful fetch
          setMessageTrigger(false);
        } catch (error: any) {
          console.error("Error fetching chat previews:", error);
          // Reset trigger even on error to prevent infinite loops
          setMessageTrigger(false);
        }
      };
      fetchPreview();
    }
  }, [messageTrigger, isLoggedIn, setChats, setMessageTrigger]);

  // Update message count when chats change
  useEffect(() => {
    if (chats.length < 1 || !currentUser) return;

    const user_id = Number(currentUser.id);

    const count = chats.reduce((acc, chat) => {
      const sender = Number(chat.actual_sender);
      if (sender !== user_id && !!chat.unread) {
        return acc + 1;
      }
      return acc;
    }, 0);
    console.log("Message count updated");
    console.log(count);
    setMessageCount(count);
  }, [chats, currentUser, setMessageCount, globalMessages]);
  // }, [chats, currentUser, setMessageCount, globalMessages]);

  const navItems = isLoggedIn ? (
    <>
      <NavItem href="/" icon={<Home className="w-5 h-5" />} label="Home" />
      <NavItem
        href="/requests"
        icon={<HandCoins className="w-5 h-5" />}
        label="Requests"
      />
      <NavItem
        href="/cart"
        icon={
          <div className="relative">
            <ShoppingCart className="w-5 h-5" />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] font-bold px-1 rounded-full">
                {cartCount}
              </span>
            )}
          </div>
        }
        label="Cart"
      />
      <NavItem
        href="/messages"
        label="Messages"
        onClick={() => router.push("/messages")}
        icon={
          <div className="relative">
            <MessageSquareMore className="w-5 h-5" />
            {messageCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] font-bold px-1 rounded-full">
                {messageCount}
              </span>
            )}
          </div>
        }
      />
      <li className="relative">
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="flex items-center gap-2 p-2 rounded-md transition-colors hover:bg-white/10"
        >
          <User className="w-5 h-5" />
          <span className="md:hidden">Account</span>
        </button>

        <AnimatePresence>
          {dropdownOpen && (
            <motion.div
              ref={dropdownRef}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="absolute top-full right-0 mt-1 bg-white text-black rounded-md shadow-lg py-2 w-40 z-50"
            >
              <DropdownItem
                label="Profile"
                onClick={() => {
                  router.push("/profile");
                  setDropdownOpen(false);
                }}
              />
              <DropdownItem
                label="Logout"
                onClick={() => {
                  logout();
                  setDropdownOpen(false);
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </li>
    </>
  ) : (
    <>
      <NavItem href="/" icon={<Home className="w-5 h-5" />} label="Home" />
      <NavItem
        href="/login"
        label="Login"
        onClick={() => router.push("/login")}
      />
      <NavItem
        href="/register"
        label="Register"
        onClick={() => router.push("/register")}
      />
    </>
  );

  return (
    <nav className="sticky top-0 z-50 w-full bg-gradient-to-r from-[#fcecd8] to-[#1c2b3a] text-white px-4 py-3 shadow-md">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        {/* Logo */}
        <Link href="/" className="z-10 ml-5">
          <motion.div
            whileHover={{ scale: 1.1 }}
            transition={{ type: "spring", stiffness: 400, damping: 10 }}
          >
            <Image
              src="/jale logo.png"
              alt="Jàle Logo"
              width={40}
              height={40}
              className="rounded-full"
            />
          </motion.div>
        </Link>

        {/* Desktop Navigation */}
        <ul className="hidden md:flex items-center gap-6 text-sm font-medium">
          {navItems}
        </ul>

        {/* Mobile Menu Button */}
        <button
          className="md:hidden z-[30] p-2"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={mobileMenuOpen ? "close" : "open"}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              {mobileMenuOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <span className="relative">
                  <Menu className="w-6 h-6" />
                  {(messageCount > 0 || cartCount > 0) && (
                    <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] font-bold px-1 rounded-full">
                      {messageCount+cartCount}
                    </span>
                  )}
                </span>
              )}
            </motion.div>
          </AnimatePresence>
        </button>

        {/* Mobile Navigation */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, x: "100%" }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="fixed inset-0 z-[25] bg-gradient-to-r from-[#fcecd8] to-[#1c2b3a] pt-20 px-6"
            >
              <ul className="flex flex-col gap-4 text-base font-medium">
                {navItems}
              </ul>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </nav>
  );
};

// Helper components for cleaner code
const NavItem = ({
  href,
  icon,
  label,
  onClick,
}: {
  href: string;
  icon?: React.ReactNode;
  label: string;
  onClick?: () => void;
}) => {
  return (
    <li>
      <Link
        href={href}
        onClick={onClick}
        className="flex items-center gap-2 p-2 rounded-md transition-all hover:bg-white/10"
      >
        <motion.div
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          className="flex items-center gap-2"
        >
          {icon}
          <span className={icon ? "md:hidden" : ""}>{label}</span>
        </motion.div>
      </Link>
    </li>
  );
};

const DropdownItem = ({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) => {
  return (
    <motion.button
      whileHover={{ backgroundColor: "#f3f4f6" }}
      className="block w-full text-left px-4 py-2"
      onClick={onClick}
    >
      {label}
    </motion.button>
  );
};

export default Navbar;
