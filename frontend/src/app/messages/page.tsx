"use client";

import { useAppContext } from "@/context";
import api from "@/lib/api";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ACCESS_TOKEN } from "@/lib/constant";
import { jwtDecode } from "jwt-decode";
import { IsUser, getDecodedToken } from "@/lib/utils";

type ChatPreview = {
  sender: number;
  receiver: number;
  latest_message: string;
  time: string;
};

type Chats = {
  chatBar: ChatPreview;
};

type Message = {
  sender_id: number;
  receiver_id: number;
  text: string;
  created_at: string;
};

interface CustomUser {
  id: number;
  name: string;
  whatsapp: string;
  call: string;
}

interface DecodedToken {
  CustomUser: CustomUser;
  exp: number;
  iat: number;
  jti: string;
  token_type: string;
  user_id: number;
}

const Messages = () => {
  const router = useRouter();
  const [chatBar, setchatBar] = useState<ChatPreview>({
    sender: 0,
    receiver: 0,
    latest_message: "",
    time: "",
  });
  const [chats, setChats] = useState<ChatPreview[]>([]);
  const { globalMessages }: { globalMessages: Message | undefined } =
    useAppContext();
  // const [fetched, setFetched] = useState<boolean>(false);

  const fetchPreviews = async () => {
    let fetched = false;
    if (fetched) return;
    fetched = true;
    console.log("fetched");
    const decodedToken = getDecodedToken();
    if (decodedToken) {
      try {
        const res = await api.get("user/chatpreview/list/");
        const data: ChatPreview[] = res.data;
        data.forEach((message) => {
          if (message.sender == decodedToken.user_id) {
            message.sender = message.receiver;
          }
        });
        setChats(res.data);
      } catch (error) {
        console.log(error);
      }
    }
  };

  useEffect(() => {
    const decoded = getDecodedToken();
    if (!globalMessages || !decoded) return;

    try {
      const { sender_id, receiver_id, text, created_at } = globalMessages;

      const otherPerson = [sender_id, receiver_id].find(
        (id) => Number(id) !== Number(decoded.user_id)
      );

      console.log(created_at)
      if (otherPerson) {
        setchatBar({
          sender: otherPerson,
          receiver: receiver_id,
          latest_message: text,
          time: created_at,

        });
      }
    } catch (error) {
      console.error(
        "Error decoding token or processing globalMessages:",
        error
      );
    }
  }, [globalMessages]);

  useEffect(() => {
    console.log(chatBar);
    if (chatBar.latest_message === "") return;
    let filtered = chats.filter((chat) => chat.sender !== chatBar.sender);
    const updatedChats: ChatPreview[] = [chatBar, ...filtered];
    setChats(updatedChats);
  }, [chatBar]);

  useEffect(() => {
    fetchPreviews();
  }, []);

  if (!IsUser) return <div>Login to see your Messages</div>;
  return (
    <div className="bg-[#f8f9fa] text-[#333] min-h-screen" >
      {chats &&
        chats.map((chat) => (
          <div
            key={chat.sender}
            onClick={() => router.push(`/chat/${chat.sender}`)}
            style={{
              display: "flex",
              backgroundColor: "#ffffff",  // Card base color
              padding: "10px",
              marginBottom: "10px",
              borderRadius: "8px",
              boxShadow: "0 2px 5px rgba(0, 0, 0, 0.1)",
              cursor: "pointer",
              transition: "background-color 0.3s ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#fcecd8")} // Hover effect (Pale orange)
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#ffffff")} // Reset background on mouse leave
          >
            <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
              <span style={{ fontWeight: "bold", color: "#ff6a00" }}>{chat.sender}</span>  {/* Sender's name in vibrant orange */}
              <span style={{ color: "#000000" }}>{chat.latest_message}</span>  {/* Latest message in black */}
            </div>
            <span style={{ color: "#ff6a00", marginLeft: "auto", alignSelf: "center" }}>{chat.time}</span>  {/* Time in vibrant orange */}
          </div>
        ))}
    </div>
  );  
};

export default Messages;
