"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useGlobalListener } from "@/lib/utils";
import { useAppContext } from "@/context";

import Form from "./Form";
import api, { logout } from "@/lib/api";

type Message = {
  sender_id: number;
  receiver_id: number;
  text: string;
  created_at: string;
};

const Navbar = () => {
  const router = useRouter();
  const pathname = usePathname();
  useGlobalListener();
  const { globalMessages } = useAppContext();

  useEffect(() => {
    if (pathname === `chat/${globalMessages?.receiver_id}`) return;
    if (globalMessages) {
      const PushMessage = async (msg: Message) => {
        const formData = new FormData();
        formData.append("receiverId", msg.receiver_id.toString());
        formData.append("senderId", msg.sender_id.toString());
        formData.append("message", msg.text);
        try {
          await api.post("user/push_message/", formData, {
            headers: { "Content-Type": "multipart/form-data" },
          });
        } catch (error) {
          console.log(error);
        }
      };

      PushMessage(globalMessages);
    }
  }, [globalMessages]);

  return (
    <div className="w-full flex flex-col md:flex-row justify-between items-center bg-[#fcecd8] text-white px-4 py-3 shadow-md">
      <div className="text-xl font-bold">
        <Link href="/">
          <img src="/jale_logo.png" alt="Jàle Logo" className="w-10 h-10" />
        </Link>
      </div>
      <ul className="flex flex-col md:flex-row gap-4 text-sm font-medium mt-2 md:mt-0">
        <li>
          <Link href="/">Home</Link>
        </li>
        <li>
          <Link href="/requests">Requests</Link>
        </li>
        <li>
          <Link href="/myproducts">My Products</Link>
        </li>
        <li>
          <button onClick={() => router.push("/messages")}>Inbox</button>
        </li>
        <li>
          <button onClick={() => router.push("/profile")}>Profile</button>
        </li>
        <li>
          <button onClick={() => router.push("/login")}>Login</button>
        </li>
        <li>
          <button onClick={() => router.push("/register")}>Register</button>
        </li>
        <li>
          <button onClick={logout}>Logout</button>
        </li>
      </ul>
    </div>
  );
};

export default Navbar;
