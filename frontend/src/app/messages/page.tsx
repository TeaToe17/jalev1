"use client";

import { useAppContext } from "@/context";
import api from "@/lib/api";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence, Variants } from "framer-motion";
import {
  User,
  Clock,
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
  // const [chats, setChats] = useState<ChatPreview[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const { globalMessages }: { globalMessages: Message | undefined } =
    useAppContext();
  const { chats, setChats, currentUser } = useAppContext();

  const fetchPreviews = async () => {
    setIsLoading(true);
    setError(null);

    const decodedToken = getDecodedToken();
    if (decodedToken) {
      try {
        const res = await api.get("user/chatpreview/list/");
        console.log(res.data);
        setChats(res.data);
      } catch (error: unknown) {
        if (error instanceof AxiosError) {
          console.error(error);
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
    const decoded = getDecodedToken();
    if (!globalMessages || !decoded) return;
  }, [globalMessages]);

  useEffect(() => {
    // To ensure most recent chats stay upat the top and remove duplicates
    if (chatBar.latest_message === "") return;
    const filtered = chats.filter((chat) => chat.sender !== chatBar.sender);
    const updatedChats: ChatPreview[] = [chatBar, ...filtered];
    setChats(updatedChats);
  }, [chatBar]);

  useEffect(() => {
    fetchPreviews();
  }, [globalMessages]);

  // Filter chats based on search query
  const filteredChats = searchQuery
    ? chats.filter(
        (chat) =>
          chat.latest_message
            .toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
          String(chat.sender).includes(searchQuery)
      )
    : chats;

  // Animation variants
  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants: Variants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 24,
      },
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
        transition={{ duration: 0.5 }}
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
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            )}
            <span>{isLoading ? "Refreshing..." : "Refresh"}</span>
          </button>
        </div>

        {/* Search bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="relative mb-6"
        >
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={18} className="text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search messages..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1c2b3a] focus:border-transparent transition-colors"
          />
        </motion.div>

        {/* Error message */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2"
            >
              <AlertCircle size={20} />
              <p>{error}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Chat list */}
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, index) => (
              <div
                key={index}
                className="bg-white rounded-xl p-4 animate-pulse"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                  </div>
                  <div className="h-3 bg-gray-200 rounded w-16"></div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredChats.length > 0 ? (
          <motion.div
            initial="hidden"
            animate="visible"
            variants={containerVariants}
            className="space-y-3"
          >
            {filteredChats.map((chat) => (
              <motion.div
                key={
                  Number(chat.actual_sender) == Number(currentUser?.id)
                    ? chat.actual_receiver
                    : chat.actual_sender
                }
                variants={itemVariants}
                whileHover={{
                  y: -3,
                  boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1)",
                }}
                onClick={() => {
                  // setMessageTrigger(true);
                  router.push(
                    `/chat/${
                      Number(chat.actual_sender) == Number(currentUser?.id)
                        ? chat.actual_receiver
                        : chat.actual_sender
                    }`
                  );
                }}
                className="bg-white rounded-xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-md transition-all cursor-pointer"
              >
                <div className="p-4 flex items-center gap-3">
                  <div className="relative w-12 h-12 bg-gradient-to-r from-[#fcecd8] to-[#1c2b3a] rounded-full flex items-center justify-center text-white">
                    <User size={24} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-1">
                      <h3 className="font-semibold text-[#1c2b3a] truncate">
                        User #
                        {Number(chat.actual_sender) == Number(currentUser?.id)
                          ? chat.actual_receiver
                          : chat.actual_sender}
                      </h3>
                      <div className="flex flex-col">
                        <span className="text-xs text-gray-500 flex items-center gap-1 whitespace-nowrap">
                          <Clock size={12} />
                          {chat.time}
                        </span>
                        {Number(chat.actual_sender) !==
                          Number(currentUser?.id) &&
                          chat.unread > 0 && (
                            <span className="text-xs text-gray-500 flex items-center gap-1 whitespace-nowrap">
                              {chat.unread}
                            </span>
                          )}
                      </div>
                    </div>
                    <p className="text-gray-600 text-sm truncate">
                      {chat.latest_message}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="bg-white rounded-xl shadow-sm p-8 text-center"
          >
            <div className="flex flex-col items-center justify-center py-6">
              <div className="bg-gray-100 p-6 rounded-full mb-4">
                <MessageSquareOff size={48} className="text-gray-400" />
              </div>
              <h3 className="text-xl font-medium text-gray-700 mb-2">
                No Messages Yet
              </h3>
              <p className="text-gray-500 max-w-md mx-auto">
                {searchQuery
                  ? "No messages match your search. Try a different search term."
                  : "You don't have any messages yet. When you start conversations with other users, they'll appear here."}
              </p>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="mt-4 text-[#1c2b3a] font-medium hover:underline"
                >
                  Clear search
                </button>
              )}
            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
};

export default Messages;
