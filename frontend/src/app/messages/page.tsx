"use client";

import { useAppContext } from "@/context";
import api from "@/lib/api";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, Variants } from "framer-motion";
import {
  User,
  AlertCircle,
  Search,
  Loader2,
  MessageSquareOff,
} from "lucide-react";
import { IsUser, getDecodedToken } from "@/lib/utils";
import { AxiosError } from "axios";

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

const Messages = () => {
  const router = useRouter();

  const [chatBar] = useState<ChatPreview>({
    sender: 0,
    receiver: 0,
    latest_message: "",
    time: "",
    unread: 0,
    actual_sender: 0,
    actual_receiver: 0,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const { globalMessages }: { globalMessages: Message | undefined } =
    useAppContext();
  const { chats, setChats, currentUser } = useAppContext();

  // ✅ CORE FIX: Always get "the other user"
  const getOtherUserId = (chat: ChatPreview) => {
    const currentId = Number(currentUser?.id);

    const participants = [
      Number(chat.actual_sender),
      Number(chat.actual_receiver),
    ];

    const otherUser = participants.find((id) => id !== currentId);

    return otherUser ?? null;
  };

  const fetchPreviews = async () => {
    setIsLoading(true);
    setError(null);

    const decodedToken = getDecodedToken();
    if (decodedToken) {
      try {
        const res = await api.get("user/chatpreview/list/");
        setChats(res.data);
      } catch (error: unknown) {
        if (error instanceof AxiosError) {
          setError(error.response?.data?.message || "Failed to load messages");
        }
      } finally {
        setIsLoading(false);
      }
    } else {
      setIsLoading(false);
      setError("You need to be logged in to view messages");
    }
  };

  useEffect(() => {
    fetchPreviews();
  }, [globalMessages]);

  // ✅ FIXED deduplication (based on actual conversation, not sender)
  useEffect(() => {
    if (chatBar.latest_message === "") return;

    const currentOther = getOtherUserId(chatBar);

    const filtered = chats.filter((c) => getOtherUserId(c) !== currentOther);

    const updatedChats: ChatPreview[] = [chatBar, ...filtered];
    setChats(updatedChats);
  }, [chatBar]);

  // Filter chats
  const filteredChats = searchQuery
    ? chats.filter((chat) => {
        const otherUser = getOtherUserId(chat);
        return (
          chat.latest_message
            .toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
          String(otherUser).includes(searchQuery)
        );
      })
    : chats;

  // Animations
  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 },
    },
  };

  const itemVariants: Variants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { type: "spring", stiffness: 300, damping: 24 },
    },
  };

  if (!IsUser) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#f8f9fa] px-4">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-8 rounded-xl shadow-md text-center max-w-md w-full"
        >
          <div className="flex justify-center mb-4">
            <div className="bg-red-100 p-3 rounded-full">
              <AlertCircle size={32} className="text-red-500" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-[#1c2b3a] mb-2">
            Login Required
          </h2>
          <p className="text-gray-600 mb-6">
            You need to be logged in to view your messages.
          </p>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => router.push("/login")}
            className="bg-gradient-to-r from-[#fcecd8] to-[#1c2b3a] text-white px-6 py-3 rounded-md shadow-sm hover:opacity-90 transition-all w-full"
          >
            Login to Continue
          </motion.button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="bg-[#f8f9fa] min-h-screen px-4 sm:px-8 md:px-16 lg:px-24 py-8">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-3xl mx-auto"
      >
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-[#1c2b3a]">Messages</h1>
          <button
            onClick={fetchPreviews}
            className="text-[#1c2b3a] hover:text-opacity-70 text-sm font-medium flex items-center gap-1"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Refresh"
            )}
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={18} className="text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search messages..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-lg"
          />
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
            <AlertCircle size={20} />
            <p>{error}</p>
          </div>
        )}

        {/* Chats */}
        {isLoading ? (
          <div>Loading...</div>
        ) : filteredChats.length > 0 ? (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-3"
          >
            {filteredChats.map((chat) => {
              const otherUser = getOtherUserId(chat);

              return (
                <motion.div
                  key={`${chat.actual_sender}-${chat.actual_receiver}`}
                  variants={itemVariants}
                  onClick={() => {
                    if (!otherUser) return;
                    if (otherUser === Number(currentUser?.id)) return;

                    router.push(`/chat/${otherUser}`);
                  }}
                  className="bg-white rounded-xl p-4 cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                      <User />
                    </div>

                    <div className="flex-1">
                      <div className="flex justify-between">
                        <h3>User #{otherUser}</h3>
                        <span>{chat.time}</span>
                      </div>

                      <p className="text-sm text-gray-600">
                        {chat.latest_message}
                      </p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        ) : (
          <div className="text-center py-10">
            <MessageSquareOff size={40} className="mx-auto text-gray-400" />
            <p>No messages</p>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default Messages;
