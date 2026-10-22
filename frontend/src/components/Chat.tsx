"use client";
import React from "react";
import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  ShoppingBag,
  AlertCircle,
  Loader2,
  Check,
  X,
} from "lucide-react";
import {
  connectToChat,
  fetchProductDetail,
  fetchUser,
  LoggedIn,
} from "@/lib/utils";
import api from "@/lib/api";
import { useAppContext } from "@/context";
import { useRouter, usePathname } from "next/navigation";

interface ChatProps {
  receiverId: number;
}

interface ApiMessage {
  content: string;
  sender: number | string;
  timestamp: string;
}

// MATCHES: Global Context Detail Schema
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

interface Product {
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

interface Message {
  text: string;
  sender_id: number | string | undefined;
  created_at: string;
  timestamp?: string;
  analyzing?: boolean;
  scope?: string;
  variant_id?: number; // Refactored from product_id
  owner_id?: number;
}

const MessageItem = React.memo(
  ({ msg, isCurrentUser }: { msg: Message; isCurrentUser: boolean }) => (
    <div
      className={`w-full flex ${isCurrentUser ? "justify-end" : "justify-start"}`}
    >
      <div
        className={`max-w-[80%] rounded-lg px-4 py-3 ${isCurrentUser ? "bg-gradient-to-r from-[#fcecd8] to-[#1c2b3a] text-white" : "bg-white border border-gray-200 text-gray-800"}`}
      >
        {!isCurrentUser && (
          <div className="font-semibold mb-1 text-sm">
            {msg.sender_id === "system" ? "System" : `User #${msg.sender_id}`}
          </div>
        )}
        <div className="text-sm sm:text-base">{msg.text}</div>
        {msg.created_at && (
          <div
            className={`text-xs mt-1 ${isCurrentUser ? "text-white/70" : "text-gray-500"}`}
          >
            {msg.created_at}
          </div>
        )}
      </div>
    </div>
  ),
);
MessageItem.displayName = "MessageItem";

const PendingMessageItem = React.memo(
  ({ msg, isCurrentUser }: { msg: Message; isCurrentUser: boolean }) => (
    <div
      className={`w-full flex ${isCurrentUser ? "justify-end" : "justify-start"}`}
    >
      <div
        className={`max-w-[80%] rounded-lg px-4 py-3 ${isCurrentUser ? "bg-gradient-to-r from-[#fcecd8] to-[#1c2b3a]/80 text-white" : "bg-white border border-gray-200 text-gray-800"}`}
      >
        {!isCurrentUser && (
          <div className="font-semibold mb-1 text-sm">
            {msg.sender_id === "system" ? "System" : `User #${msg.sender_id}`}
          </div>
        )}
        <div className="text-sm sm:text-base">{msg.text}</div>
        {msg.analyzing && (
          <div className="flex items-center gap-1 mt-2">
            <div className="w-2 h-2 bg-current rounded-full animate-bounce" />
            <div className="w-2 h-2 bg-current rounded-full animate-bounce delay-100" />
            <div className="w-2 h-2 bg-current rounded-full animate-bounce delay-200" />
          </div>
        )}
        {msg.created_at && (
          <div
            className={`text-xs mt-1 ${isCurrentUser ? "text-white/70" : "text-gray-500"}`}
          >
            {msg.created_at}
          </div>
        )}
      </div>
    </div>
  ),
);
PendingMessageItem.displayName = "PendingMessageItem";

const ChatWindow: React.FC<ChatProps> = ({ receiverId }) => {
  const router = useRouter();
  const pathname = usePathname();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const [messages, setMessages] = useState<Message[]>([]);
  const [pendingMessages, setPendingMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const { currentProduct, setCurrentProduct, setMessageTrigger, ws } =
    useAppContext();

  // Refactored State Tokens from product -> variant containers
  const [variantId, setVariantId] = useState<number | string>("");
  const [ownerId, setOwnerId] = useState<number | string>("");
  const [agreedPrice, setAgreedPrice] = useState<number | string>("");
  const [isProductOwner, setIsProductOwner] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [showOrderSuccess, setShowOrderSuccess] = useState(false);
  const [currentUser, setCurrentUser] = useState<CustomUser | null>(null);
  const [showDiv, setShowDiv] = useState(true);
  const [lastMessage, setLastMessage] = useState<string>("");
  const inputRef = useRef<HTMLInputElement>(null);

  const [variantDetails, setVariantDetails] = useState({
    variantImage: "",
    variantName: "",
    variantPrice: 0,
    variantSku: "",
  });

  const [isHydrated, setIsHydrated] = useState(false);
  const localStorageSaveTimer = useRef<NodeJS.Timeout | null>(null);
  const hasLoadedHistory = useRef(false);

  const allMessages = [...messages, ...pendingMessages]
    .slice()
    .sort(
      (a, b) =>
        new Date(a.timestamp || "").getTime() -
        new Date(b.timestamp || "").getTime(),
    );

  useEffect(() => {
    setIsHydrated(true);
    const storedVariantId = localStorage.getItem("variantId");
    const storedOwnerId = localStorage.getItem("ownerId");
    if (storedVariantId && storedOwnerId) {
      setVariantId(storedVariantId);
      setOwnerId(storedOwnerId);
    } else if (currentProduct && currentProduct.variants?.length > 0) {
      // Initialize layout from current context settings if user comes from details page
      const prefId = currentProduct.preferred_variant_id;
      const targetV =
        currentProduct.variants.find((v) => v.id === prefId) ||
        currentProduct.variants[0];
      setVariantId(targetV.id);
      setOwnerId(currentProduct.owner);
      localStorage.setItem("variantId", String(targetV.id));
      localStorage.setItem("ownerId", String(currentProduct.owner));
    }
    return () => {
      localStorage.removeItem("variantId");
      localStorage.removeItem("ownerId");
    };
  }, [currentProduct]);

  useEffect(() => {
    if (!isHydrated) return;
    const storedVariantId = localStorage.getItem("variantId");
    if (storedVariantId) {
      const loadVariantMetadata = async () => {
        try {
          // Retrieve detailed information from endpoint containing structural variation components
          const response = await api.get(`product/list/`); // or query via variant details lookup endpoint
          const catalog: any[] = response.data || [];

          // Traverse structural catalog down to target variation card metrics matching ID
          let foundVariant: any = null;
          let parentName = "Negotiated Variant Item";

          if (
            currentProduct &&
            currentProduct.variants?.some(
              (v) => v.id === Number(storedVariantId),
            )
          ) {
            foundVariant = currentProduct.variants.find(
              (v) => v.id === Number(storedVariantId),
            );
            parentName = currentProduct.name;
          }

          if (foundVariant) {
            const vPrice =
              typeof foundVariant.price === "string"
                ? parseFloat(foundVariant.price)
                : foundVariant.price;
            setVariantDetails({
              variantImage: foundVariant.image || "",
              variantName: `${parentName}`,
              variantPrice: vPrice || 0,
              variantSku: foundVariant.sku || "",
            });
          }
        } catch (err) {
          console.error("Error hydration loading metadata details:", err);
        }
      };
      loadVariantMetadata();
    }
  }, [isHydrated, variantId, currentProduct]);

  const fetchHistory = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.get(`user/list_messages/${receiverId}/`);
      const resDict = response.data;
      if (Array.isArray(resDict) && resDict.length !== 0) {
        const formattedMessage = resDict.map((msg: ApiMessage) => ({
          text: msg.content,
          sender_id: msg.sender,
          created_at: formatTime(msg.timestamp || ""),
          timestamp: msg.timestamp,
        }));
        setMessages(formattedMessage);
        localStorage.setItem("messages", JSON.stringify(formattedMessage));
      }
      const user = await fetchUser();
      setCurrentUser(user);
    } catch (error: unknown) {
      console.error("Failed to fetch chat history", error);
      setError("Failed to load chat history, refresh.");
    } finally {
      setIsLoading(false);
      hasLoadedHistory.current = true;
    }
  };

  useEffect(() => {
    if (lastMessage === "") return;
    if (receiverId) {
      localStorage.setItem("receiverId", JSON.stringify(receiverId));
      localStorage.setItem("message", JSON.stringify(lastMessage));
    }
  }, [lastMessage, receiverId]);

  useEffect(() => {
    if (!receiverId || !LoggedIn() || !ws) return;
    if (hasLoadedHistory.current) return;
    fetchHistory();
  }, [receiverId, ws]);

  useEffect(() => {
    if (!receiverId || !LoggedIn()) return;
    if (!ws) return;
    connectToChat(ws, receiverId);

    const handleMessage = (e: MessageEvent) => {
      const data = JSON.parse(e.data);
      if (data.text && data.sender_id !== undefined) {
        setPendingMessages((prev) =>
          prev.filter(
            (msg) =>
              !(msg.text === data.text && msg.sender_id === data.sender_id),
          ),
        );
        setMessages((prev) => {
          const newMessage: Message = {
            text: data.text,
            sender_id: data.sender_id,
            created_at: data.created_at
              ? formatTime(data.created_at)
              : formatTime(new Date().toISOString()),
            timestamp: data.timestamp || data.created_at,
            analyzing: data.analyzing,
            scope: data.scope,
            variant_id: data.variant_id || data.product_id, // Safety fallbacks
            owner_id: data.owner_id,
          };
          const updated = [...prev, newMessage];
          localStorage.setItem("messages", JSON.stringify(updated));
          return updated;
        });
      }

      if (data.variant_id && data.owner_id) {
        setVariantId(data.variant_id);
        setOwnerId(data.owner_id);
        localStorage.setItem("variantId", String(data.variant_id));
        localStorage.setItem("ownerId", String(data.owner_id));
      }

      const pattern = /^The transaction has been confirmed at (\d+)$/i;
      const match = data.text?.trim()?.match(pattern);
      if (match) {
        const price = Number.parseInt(match[1], 10);
        HandleOrder(price);
        localStorage.removeItem("ownerId");
        localStorage.removeItem("variantId");
        setShowOrderSuccess(true);
      }
    };

    ws?.addEventListener("message", handleMessage);
    return () => {
      ws?.removeEventListener("message", handleMessage);
    };
  }, [receiverId, ws]);

  useEffect(() => {
    if (!hasLoadedHistory.current || messages.length === 0) return;
    if (localStorageSaveTimer.current) {
      clearTimeout(localStorageSaveTimer.current);
    }
    localStorageSaveTimer.current = setTimeout(() => {
      localStorage.setItem("messages", JSON.stringify(messages));
    }, 500);
    return () => {
      if (localStorageSaveTimer.current)
        clearTimeout(localStorageSaveTimer.current);
    };
  }, [messages]);

  useEffect(() => {
    if (!pathname.startsWith(`/chat/${receiverId}`)) return;
    if (!messages.length || !currentUser?.id) return;
    const last_msg = messages.at(-1);
    if (last_msg && Number(last_msg.sender_id) !== Number(currentUser.id)) {
      api
        .post(`user/update_messages/${receiverId}/`)
        .then(() => {
          setMessageTrigger(true);
        })
        .catch((error) => {
          console.error("Failed to mark messages as read:", error);
        });
    }
  }, [messages, currentUser?.id, receiverId, setMessageTrigger]);

  useEffect(() => {
    if (isHydrated && inputRef.current) {
      inputRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [isHydrated, allMessages.length]);

  useEffect(() => {
    if (ownerId && variantId) {
      const confirmSeller = async () => {
        const user = await fetchUser();
        if (user?.id === Number(ownerId)) {
          setIsProductOwner(true);
        }
      };
      confirmSeller();
    }
  }, [ownerId, variantId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const forbiddenPhrase = /^The transaction has been confirmed at \d+$/i;
    const value = e.target.value;
    if (forbiddenPhrase.test(value)) {
      setError("This input is not allowed.");
      return;
    }
    setInput(value);
  };

  const sendAdminMessage = (text: string) => {
    if (ws && text.trim()) {
      ws.send(JSON.stringify({ message: text }));
    }
  };

  const ApproveOrder = () => {
    if (!agreedPrice) {
      setError("Please enter an agreed price");
      return;
    }
    sendAdminMessage(`The transaction has been confirmed at ${agreedPrice}`);
  };

  const HandleOrder = async (price: number) => {
    localStorage.removeItem("variantId");
    localStorage.removeItem("ownerId");
    setIsProductOwner(false);
    setIsSending(true);
    setError(null);
    try {
      const user = await fetchUser();
      if (!user) return;
      const targetId = variantId || localStorage.getItem("variantId");
      if (!targetId) {
        setError("Missing critical variation payload metadata.");
        return;
      }

      // MATCHES: Backend Order model mapping schema pointing strictly to variation IDs
      const response = await api.post("order/create/", {
        variant: Number(targetId),
        agreed_price: price,
        buyer_name: user.username,
        buyer_whatsapp_contact: user.whatsapp || "N/A",
        buyer_call_contact: user.call || "N/A",
        quantity: 1,
      });

      setShowOrderSuccess(true);
      sendAdminMessage("Deal Approved");
      setCurrentProduct(null);
      localStorage.removeItem("variantId");
      router.push(
        `https://wa.me{encodeURIComponent(
          user.username
        )},%0AI%20just%20concluded%20a%20negotiation%20deal%20for%20${encodeURIComponent(
          variantDetails.variantName,
        )}%20at%20₦${price}`,
      );
    } catch (error: unknown) {
      console.error("Unexpected error in HandleOrder:", error);
      setError(
        "An unexpected error occurred processing the variant transaction.",
      );
    } finally {
      setIsSending(false);
    }
  };

  const sendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!ws || !input.trim()) return;
    setIsSending(true);

    const payload = {
      type: "chat_message",
      message: input,
      receiver_id: receiverId,
      variant_id: Number(variantId) || 0, // Swapped from product_id to preserve context isolation
      owner_id: Number(ownerId) || 0,
    };

    const now = new Date().toISOString();
    const pendingMsg: Message = {
      text: input,
      sender_id: currentUser?.id,
      timestamp: now,
      created_at: formatTime(now),
      analyzing: true,
    };
    setPendingMessages((prev) => [...prev, pendingMsg]);

    try {
      ws.send(JSON.stringify(payload));
      setLastMessage(input);
      setInput("");
      setTimeout(
        () => {
          setPendingMessages((prev) =>
            prev.map((msg) =>
              msg === pendingMsg ? { ...msg, analyzing: false } : msg,
            ),
          );
        },
        Math.random() * 800 + 400,
      );
    } catch (error) {
      setError(`Failed to send message. ${error}`);
      setPendingMessages((prev) => prev.filter((msg) => msg.text !== input));
    } finally {
      setIsSending(false);
    }
  };

  const formatTime = (timeString: string) => {
    try {
      const date = new Date(timeString);
      return date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    } catch (e) {
      return "";
    }
  };

  useEffect(() => {
    if (!LoggedIn()) router.replace("/login");
  }, [router]);

  if (!isHydrated) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 size={40} className="text-[#1c2b3a] animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full relative">
      <AnimatePresence>
        {showOrderSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="bg-white rounded-xl p-6 max-w-md w-full shadow-xl"
            >
              <div className="flex flex-col items-center text-center">
                <div className="bg-green-100 p-3 rounded-full mb-4">
                  <Check size={32} className="text-green-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  Order Authorized Successfully!
                </h3>
                <p className="text-gray-600 mb-6">
                  Your negotiated option deal has been successfully authorized.
                  The buyer will be redirected to WhatsApp for tracking setup.
                </p>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowOrderSuccess(false)}
                  className="bg-gradient-to-r from-[#fcecd8] to-[#1c2b3a] text-white px-6 py-2 rounded-md shadow-sm"
                >
                  Close Dashboard Portal
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* DYNAMIC VARIATION NEGOTIATION HEADS UP SUB-BAR DISPLAY */}
      {variantDetails.variantName && showDiv && (
        <div className="bg-white p-3 border-b border-gray-200 flex items-center justify-between shadow-sm animate-fadeIn">
          <div className="flex items-center gap-3">
            <div className="relative h-12 w-12 rounded overflow-hidden border bg-gray-50 flex-shrink-0">
              <img
                src={variantDetails.variantImage || "/placeholder.svg"}
                alt="Item Face"
                className="object-cover h-full w-full"
              />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-[#1c2b3a]/60">
                Negotiating Variant
              </p>
              <h4 className="text-sm font-bold text-gray-900 line-clamp-1">
                {variantDetails.variantName}
              </h4>
              <p className="text-xs font-semibold text-red-500">
                Base Price: ₦{variantDetails.variantPrice.toLocaleString()}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowDiv(false)}
            className="text-gray-400 hover:text-gray-600 p-1"
          >
            <X size={16} />
          </button>
        </div>
      )}

      <AnimatePresence>
        {error && error !== "This input is not allowed." && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md flex items-start justify-between gap-3 mx-4 mt-2"
          >
            <div className="flex gap-2">
              <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
              <span className="text-sm">{error}</span>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-red-500 hover:text-red-700"
            >
              <X size={18} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-4 flex flex-col gap-4"
      >
        {isLoading && messages.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <Loader2 size={40} className="text-[#1c2b3a] animate-spin" />
          </div>
        )}
        {allMessages.map((msg) => {
          const isPending = msg.analyzing;
          return isPending ? (
            <PendingMessageItem
              key={`${msg.timestamp}-${msg.sender_id}-${msg.text}`}
              msg={msg}
              isCurrentUser={Number(msg.sender_id) === Number(currentUser?.id)}
            />
          ) : (
            <MessageItem
              key={`${msg.timestamp}-${msg.sender_id}-${msg.text}`}
              msg={msg}
              isCurrentUser={Number(msg.sender_id) === Number(currentUser?.id)}
            />
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {variantId && ownerId && isProductOwner && (
        <div className="border-t border-gray-200 p-4 bg-white shadow-lg">
          <div className="mb-3">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Confirm Negotiated Variant Price
            </label>
            <input
              type="number"
              value={agreedPrice}
              onChange={(e) => setAgreedPrice(e.target.value)}
              placeholder="Enter finalized price agreement"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#1c2b3a]"
            />
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={ApproveOrder}
            disabled={isSending}
            className="w-full bg-gradient-to-r from-[#fcecd8] to-[#1c2b3a] text-white py-2 rounded-md transition-all flex items-center justify-center gap-2 font-medium shadow-sm"
          >
            {isSending ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <>
                <Check size={18} /> Confirm Order
              </>
            )}
          </motion.button>
        </div>
      )}

      <form
        onSubmit={sendMessage}
        className="border-t border-gray-200 p-4 bg-white"
      >
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={handleChange}
            placeholder="Type your message..."
            disabled={isSending}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1c2b3a]"
          />
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            type="submit"
            disabled={isSending || !input.trim()}
            className="bg-gradient-to-r from-[#fcecd8] to-[#1c2b3a] text-white p-2 rounded-lg disabled:opacity-50"
          >
            {isSending ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <Send size={20} />
            )}
          </motion.button>
        </div>
      </form>
    </div>
  );
};

export default ChatWindow;

// "use client";
// import React from "react";

// import { useEffect, useState, useRef, useLayoutEffect } from "react";
// import { motion, AnimatePresence } from "framer-motion";
// import {
//   Send,
//   ShoppingBag,
//   AlertCircle,
//   Loader2,
//   Check,
//   X,
//   Brain,
// } from "lucide-react";
// import { connectToChat, fetchProducts, fetchUser, LoggedIn } from "@/lib/utils";
// import api from "@/lib/api";
// import { useAppContext } from "@/context";
// import { useRouter, usePathname } from "next/navigation";

// interface ChatProps {
//   receiverId: number;
// }

// interface ApiMessage {
//   content: string;
//   sender: number | string;
//   timestamp: string;
// }

// interface Product {
//   id: number;
//   name: string;
//   price: number;
//   imagefile: File | string;
//   image: string;
//   stock: number;
//   used: boolean;
//   sold: boolean;
//   negotiable: boolean;
//   extra_field: {};
//   categories: number[];
//   owner: number;
// }

// type CustomUser = {
//   id: number;
//   username: string;
//   whatsapp: string;
//   call: string;
//   image: string;
//   email: string;
//   referral_points: number;
//   categories: number[];
// };

// interface Message {
//   text: string;
//   sender_id: number | string | undefined;
//   created_at: string;
//   timestamp?: string;
//   analyzing?: boolean;
//   scope?: string;
//   product_id?: number;
//   owner_id?: number;
// }

// // Memoized message components for performance
// const MessageItem = React.memo(
//   ({ msg, isCurrentUser }: { msg: Message; isCurrentUser: boolean }) => (
//     <div
//       className={`w-full flex ${isCurrentUser ? "justify-end" : "justify-start"}`}
//     >
//       <div
//         className={`max-w-[80%] rounded-lg px-4 py-3 ${
//           isCurrentUser
//             ? "bg-gradient-to-r from-[#fcecd8] to-[#1c2b3a] text-white"
//             : "bg-white border border-gray-200 text-gray-800"
//         }`}
//       >
//         {!isCurrentUser && (
//           <div className="font-semibold mb-1 text-sm">
//             {msg.sender_id === "system" ? "System" : `User #${msg.sender_id}`}
//           </div>
//         )}
//         <div className="text-sm sm:text-base">{msg.text}</div>
//         {msg.created_at && (
//           <div
//             className={`text-xs mt-1 ${
//               isCurrentUser ? "text-white/70" : "text-gray-500"
//             }`}
//           >
//             {msg.created_at}
//           </div>
//         )}
//       </div>
//     </div>
//   ),
// );

// MessageItem.displayName = "MessageItem";

// const PendingMessageItem = React.memo(
//   ({ msg, isCurrentUser }: { msg: Message; isCurrentUser: boolean }) => (
//     <div
//       className={`w-full flex ${isCurrentUser ? "justify-end" : "justify-start"}`}
//     >
//       <div
//         className={`max-w-[80%] rounded-lg px-4 py-3 ${
//           isCurrentUser
//             ? "bg-gradient-to-r from-[#fcecd8] to-[#1c2b3a]/80 text-white"
//             : "bg-white border border-gray-200 text-gray-800"
//         }`}
//       >
//         {!isCurrentUser && (
//           <div className="font-semibold mb-1 text-sm">
//             {msg.sender_id === "system" ? "System" : `User #${msg.sender_id}`}
//           </div>
//         )}
//         <div className="text-sm sm:text-base">{msg.text}</div>
//         {msg.analyzing && (
//           <div className="flex items-center gap-1 mt-2">
//             <div className="w-2 h-2 bg-current rounded-full animate-bounce" />
//             <div className="w-2 h-2 bg-current rounded-full animate-bounce delay-100" />
//             <div className="w-2 h-2 bg-current rounded-full animate-bounce delay-200" />
//           </div>
//         )}
//         {msg.created_at && (
//           <div
//             className={`text-xs mt-1 ${
//               isCurrentUser ? "text-white/70" : "text-gray-500"
//             }`}
//           >
//             {msg.created_at}
//           </div>
//         )}
//       </div>
//     </div>
//   ),
// );

// PendingMessageItem.displayName = "PendingMessageItem";

// const ChatWindow: React.FC<ChatProps> = ({ receiverId }) => {
//   const router = useRouter();
//   const pathname = usePathname();
//   const messagesEndRef = useRef<HTMLDivElement>(null);
//   const messagesContainerRef = useRef<HTMLDivElement>(null);
//   const [messages, setMessages] = useState<Message[]>([]);
//   const [pendingMessages, setPendingMessages] = useState<Message[]>([]);
//   const [input, setInput] = useState("");
//   const { currentProduct, setCurrentProduct, setMessageTrigger, ws } =
//     useAppContext();
//   const [productId, setProductId] = useState<number | string>("");
//   const [ownerId, setOwnerId] = useState<number | string>("");
//   const [agreedPrice, setAgreedPrice] = useState<number | string>("");
//   const [isProductOwner, setIsProductOwner] = useState(false);
//   const [isLoading, setIsLoading] = useState(true);
//   const [error, setError] = useState<string | null>(null);
//   const [isSending, setIsSending] = useState(false);
//   const [showOrderSuccess, setShowOrderSuccess] = useState(false);
//   const [currentUser, setCurrentUser] = useState<CustomUser | null>(null);
//   const [showDiv, setShowDiv] = useState(true);
//   const [lastMessage, setLastMessage] = useState<string>("");
//   const inputRef = useRef<HTMLInputElement>(null);

//   const [productDetails, setProductDetails] = useState({
//     productImage: "",
//     productName: "",
//     productPrice: 0,
//   });
//   const [isHydrated, setIsHydrated] = useState(false);
//   const localStorageSaveTimer = useRef<NodeJS.Timeout | null>(null);
//   const hasLoadedHistory = useRef(false);

//   const allMessages = [...messages, ...pendingMessages]
//     .slice()
//     .sort(
//       (a, b) =>
//         new Date(a.timestamp || "").getTime() -
//         new Date(b.timestamp || "").getTime(),
//     );

//   useEffect(() => {
//     setIsHydrated(true);
//     const storedProductId = localStorage.getItem("productId");
//     const storedOwnerId = localStorage.getItem("ownerId");

//     if (storedProductId && storedOwnerId) {
//       setProductId(storedProductId);
//       setOwnerId(storedOwnerId);
//     }

//     return () => {
//       localStorage.removeItem("productId");
//       localStorage.removeItem("ownerId");
//     };
//   }, []);

//   useEffect(() => {
//     if (!isHydrated) return;

//     const storedProductId = localStorage.getItem("productId");
//     if (storedProductId) {
//       const loadProduct = async () => {
//         const res: Product[] = await fetchProducts();
//         if (res) {
//           const product = res.find(
//             (item) => item.id === Number(storedProductId),
//           );
//           if (product) {
//             setProductDetails({
//               productImage: product.image,
//               productName: product.name,
//               productPrice: product.price,
//             });
//           }
//         }
//       };
//       loadProduct();
//     }
//   }, [isHydrated]);

//   const fetchHistory = async () => {
//     setIsLoading(true);
//     setError(null);

//     try {
//       const response = await api.get(`user/list_messages/${receiverId}/`);
//       const resDict = response.data;

//       if (Array.isArray(resDict) && resDict.length !== 0) {
//         const formattedMessage = resDict.map((msg: ApiMessage) => ({
//           text: msg.content,
//           sender_id: msg.sender,
//           created_at: formatTime(msg.timestamp || ""),
//           timestamp: msg.timestamp,
//         }));
//         setMessages(formattedMessage);
//         localStorage.setItem("messages", JSON.stringify(formattedMessage));
//       }

//       const user = await fetchUser();
//       setCurrentUser(user);
//     } catch (error: unknown) {
//       console.error("Failed to fetch chat history", error);
//       setError("Failed to load chat history, refresh.");
//     } finally {
//       setIsLoading(false);
//       hasLoadedHistory.current = true;
//     }
//   };

//   useEffect(() => {
//     if (lastMessage == "") return;

//     if (receiverId) {
//       localStorage.setItem("receiverId", JSON.stringify(receiverId));
//       localStorage.setItem("message", JSON.stringify(lastMessage));
//     }
//   }, [lastMessage, receiverId]);

//   // Fetch chat history when receiverId and WebSocket are ready
//   useEffect(() => {
//     if (!receiverId || !LoggedIn() || !ws) return;
//     if (hasLoadedHistory.current) return; // Only fetch once

//     fetchHistory();
//   }, [receiverId, ws]);

//   useEffect(() => {
//     if (!receiverId || !LoggedIn()) return;
//     if (!ws) return;

//     // optional handshake only (NOT required for routing anymore)
//     connectToChat(ws, receiverId);

//     const handleMessage = (e: MessageEvent) => {
//       const data = JSON.parse(e.data);

//       console.log("[v0] WS DATA:", data);

//       // Handle all incoming messages
//       if (data.text && data.sender_id !== undefined) {
//         console.log("[v0] Adding message to state:", data.text);

//         // Remove pending message if this is a response to one we sent
//         setPendingMessages((prev) =>
//           prev.filter(
//             (msg) =>
//               !(msg.text === data.text && msg.sender_id === data.sender_id),
//           ),
//         );

//         // Add message to state
//         setMessages((prev) => {
//           const newMessage: Message = {
//             text: data.text,
//             sender_id: data.sender_id,
//             created_at: data.created_at
//               ? formatTime(data.created_at)
//               : formatTime(new Date().toISOString()),
//             timestamp: data.timestamp || data.created_at,
//             analyzing: data.analyzing,
//             scope: data.scope,
//             product_id: data.product_id,
//             owner_id: data.owner_id,
//           };
//           const updated = [...prev, newMessage];
//           // Save to localStorage immediately when new message arrives
//           localStorage.setItem("messages", JSON.stringify(updated));
//           return updated;
//         });
//       }

//       // update product context dynamically
//       if (data.product_id && data.owner_id) {
//         setProductId(data.product_id);
//         setOwnerId(data.owner_id);

//         localStorage.setItem("productId", String(data.product_id));
//         localStorage.setItem("ownerId", String(data.owner_id));
//       }

//       // order confirmation logic
//       const pattern = /^The transaction has been confirmed at (\d+)$/i;
//       const match = data.text?.trim()?.match(pattern);

//       if (match) {
//         const price = Number.parseInt(match[1], 10);

//         HandleOrder(price);

//         localStorage.removeItem("ownerId");
//         localStorage.removeItem("productId");

//         setShowOrderSuccess(true);
//       }
//     };

//     ws?.addEventListener("message", handleMessage);

//     return () => {
//       ws?.removeEventListener("message", handleMessage);
//     };
//   }, [receiverId, ws]);

//   // Debounced localStorage save
//   useEffect(() => {
//     if (!hasLoadedHistory.current || messages.length === 0) return;

//     if (localStorageSaveTimer.current) {
//       clearTimeout(localStorageSaveTimer.current);
//     }

//     localStorageSaveTimer.current = setTimeout(() => {
//       localStorage.setItem("messages", JSON.stringify(messages));
//     }, 500);

//     return () => {
//       if (localStorageSaveTimer.current) {
//         clearTimeout(localStorageSaveTimer.current);
//       }
//     };
//   }, [messages]);

//   useEffect(() => {
//     if (!pathname.startsWith(`/chat/${receiverId}`)) return;
//     if (!messages.length || !currentUser?.id) return;

//     const last_msg = messages.at(-1);
//     const lastSenderId = Number(last_msg?.sender_id);
//     const currentUserId = Number(currentUser?.id);

//     if (
//       lastSenderId &&
//       currentUserId &&
//       Number(lastSenderId) !== Number(currentUserId)
//     ) {
//       api
//         .post(`user/update_messages/${receiverId}/`)
//         .then(() => {
//           setMessageTrigger(true);
//         })
//         .catch((error) => {
//           console.error("Failed to mark messages as read:", error);
//         });
//     }
//   }, [messages, currentUser?.id, receiverId, setMessageTrigger]);

//   useEffect(() => {
//     if (isHydrated && inputRef.current) {
//       inputRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
//     }
//   }, [isHydrated, allMessages.length]);

//   useEffect(() => {
//     if (ownerId && productId) {
//       const confirmSeller = async () => {
//         const user = await fetchUser();
//         if (user?.id == ownerId) {
//           setIsProductOwner(true);
//         }
//       };
//       confirmSeller();
//     }
//   }, [ownerId, productId]);

//   const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
//     const forbiddenPhrase = /^The transaction has been confirmed at \d+$/i;
//     const value = e.target.value;

//     if (forbiddenPhrase.test(value)) {
//       setError("This input is not allowed.");
//       return;
//     }

//     setInput(value);
//   };

//   const sendAdminMessage = (text: string) => {
//     if (ws && text.trim()) {
//       ws.send(JSON.stringify({ message: text }));
//     }
//   };

//   const ApproveOrder = () => {
//     if (!agreedPrice) {
//       setError("Please enter an agreed price");
//       return;
//     }
//     sendAdminMessage(`The transaction has been confirmed at ${agreedPrice}`);
//   };

//   const HandleOrder = async (price: number) => {
//     localStorage.removeItem("productId");
//     localStorage.removeItem("ownerId");
//     setIsProductOwner(false);
//     if (!currentProduct) return;
//     setIsSending(true);
//     setError(null);
//     try {
//       const user = await fetchUser();
//       if (!user) return;
//       const formData = new FormData();
//       formData.append(
//         "product",
//         currentProduct?.id.toString() ?? "Missing Book ID",
//       );
//       formData.append("agreed_price", price.toString());
//       formData.append("buyer_name", user.username ?? "Missing Name");
//       formData.append(
//         "buyer_whatsapp_contact",
//         user.whatsapp ?? "Missing WhatsApp",
//       );
//       formData.append("buyer_call_contact", user.call ?? "Missing Call");

//       await api.post("order/create/", formData);

//       setShowOrderSuccess(true);

//       sendAdminMessage("Deal Approved");

//       setCurrentProduct(null);
//       localStorage.removeItem("productId");

//       router.push(
//         `https://wa.me/2347046938727?text=Hello%20I%20am%20${encodeURIComponent(
//           user.username,
//         )},%0AI%20just%20concluded%20an%20order%20for%20${encodeURIComponent(
//           currentProduct?.name ?? "",
//         )}%20(${currentProduct?.id})`,
//       );
//     } catch (error: unknown) {
//       console.error("Unexpected error in HandleOrder:", error);
//       setError("An unexpected error occurred. Please try again.");
//     } finally {
//       setIsSending(false);
//     }
//   };

//   const sendMessage = (e?: React.FormEvent) => {
//     if (e) e.preventDefault();

//     if (!ws || !input.trim()) return;

//     setIsSending(true);

//     const payload = {
//       type: "chat_message",
//       message: input,
//       receiver_id: receiverId,
//       product_id: currentProduct?.id ?? 0,
//       owner_id: currentProduct?.owner ?? 0,
//     };

//     const now = new Date().toISOString();

//     const pendingMsg: Message = {
//       text: input,
//       sender_id: currentUser?.id,
//       timestamp: now,
//       created_at: formatTime(now),
//       analyzing: true,
//     };

//     setPendingMessages((prev) => [...prev, pendingMsg]);

//     try {
//       ws.send(JSON.stringify(payload));

//       setLastMessage(input);
//       setInput("");

//       setTimeout(
//         () => {
//           setPendingMessages((prev) =>
//             prev.map((msg) =>
//               msg === pendingMsg ? { ...msg, analyzing: false } : msg,
//             ),
//           );
//         },
//         Math.random() * 800 + 400,
//       );
//     } catch (error) {
//       setError(`Failed to send message. ${error}`);

//       setPendingMessages((prev) => prev.filter((msg) => msg.text !== input));
//     } finally {
//       setIsSending(false);
//     }
//   };

//   const formatTime = (timeString: string) => {
//     try {
//       const date = new Date(timeString);
//       return date.toLocaleTimeString([], {
//         hour: "2-digit",
//         minute: "2-digit",
//         hour12: true,
//       });
//     } catch (e) {
//       return "";
//     }
//   };

//   useEffect(() => {
//     if (!LoggedIn()) router.replace("/login");
//   }, [router]);

//   if (!isHydrated) {
//     return (
//       <div className="flex h-full items-center justify-center">
//         <Loader2 size={40} className="text-[#1c2b3a] animate-spin" />
//       </div>
//     );
//   }

//   if (!LoggedIn()) {
//     return (
//       <div className="flex h-full items-center justify-center">
//         <div className="flex justify-center items-center h-full">
//           <Loader2 size={40} className="text-[#1c2b3a] animate-spin" />
//         </div>
//         <p>Redirecting to login…</p>
//       </div>
//     );
//   }

//   return (
//     <div className="flex flex-col h-full relative">
//       <AnimatePresence>
//         {showOrderSuccess && (
//           <motion.div
//             initial={{ opacity: 0, y: -50 }}
//             animate={{ opacity: 1, y: 0 }}
//             exit={{ opacity: 0, y: -50 }}
//             className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
//           >
//             <motion.div
//               initial={{ scale: 0.9 }}
//               animate={{ scale: 1 }}
//               exit={{ scale: 0.9 }}
//               className="bg-white rounded-xl p-6 max-w-md w-full shadow-xl"
//             >
//               <div className="flex flex-col items-center text-center">
//                 <div className="bg-green-100 p-3 rounded-full mb-4">
//                   <Check size={32} className="text-green-600" />
//                 </div>
//                 <h3 className="text-xl font-bold text-gray-900 mb-2">
//                   Order Authorized Successfully!
//                 </h3>
//                 <p className="text-gray-600 mb-6">
//                   Your order has been successfully authorized. Buyer will be
//                   redirected to WhatsApp for delivery follow up and Seller would
//                   be contacted.
//                 </p>
//                 <motion.button
//                   whileHover={{ scale: 1.05 }}
//                   whileTap={{ scale: 0.95 }}
//                   onClick={() => setShowOrderSuccess(false)}
//                   className="bg-gradient-to-r from-[#fcecd8] to-[#1c2b3a] text-white px-6 py-2 rounded-md shadow-sm hover:opacity-90 transition-all"
//                 >
//                   Close
//                 </motion.button>
//               </div>
//             </motion.div>
//           </motion.div>
//         )}
//       </AnimatePresence>

//       <AnimatePresence>
//         <>
//           {error && error !== "This input is not allowed." && (
//             <motion.div
//               initial={{ opacity: 0, y: -10 }}
//               animate={{ opacity: 1, y: 0 }}
//               exit={{ opacity: 0, y: -10 }}
//               className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md flex items-start justify-between gap-3"
//             >
//               <div className="flex gap-2">
//                 <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
//                 <span className="text-sm">{error}</span>
//               </div>
//               <button
//                 onClick={() => setError(null)}
//                 className="text-red-500 hover:text-red-700"
//               >
//                 <X size={18} />
//               </button>
//             </motion.div>
//           )}
//         </>
//       </AnimatePresence>

//       <div
//         ref={messagesContainerRef}
//         className="flex-1 overflow-y-auto p-4 flex flex-col gap-4"
//       >
//         {isLoading && messages.length === 0 && (
//           <div className="flex items-center justify-center h-full">
//             <Loader2 size={40} className="text-[#1c2b3a] animate-spin" />
//           </div>
//         )}

//         {allMessages.map((msg) => {
//           const isPending = msg.analyzing;

//           return isPending ? (
//             <PendingMessageItem
//               key={`${msg.timestamp}-${msg.sender_id}-${msg.text}`}
//               msg={msg}
//               isCurrentUser={Number(msg.sender_id) === Number(currentUser?.id)}
//             />
//           ) : (
//             <MessageItem
//               key={`${msg.timestamp}-${msg.sender_id}-${msg.text}`}
//               msg={msg}
//               isCurrentUser={Number(msg.sender_id) === Number(currentUser?.id)}
//             />
//           );
//         })}

//         <div ref={messagesEndRef} />
//       </div>

//       {productId && ownerId && isProductOwner && (
//         <div className="border-t border-gray-200 p-4 bg-white">
//           <div className="mb-3">
//             <label className="block text-sm font-medium text-gray-700 mb-2">
//               Confirm Transaction Price
//             </label>
//             <input
//               type="number"
//               value={agreedPrice}
//               onChange={(e) => setAgreedPrice(e.target.value)}
//               placeholder="Enter agreed price"
//               className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#1c2b3a]"
//             />
//           </div>
//           <motion.button
//             whileHover={{ scale: 1.02 }}
//             whileTap={{ scale: 0.98 }}
//             onClick={ApproveOrder}
//             disabled={isSending}
//             className="w-full bg-gradient-to-r from-[#fcecd8] to-[#1c2b3a] text-white py-2 rounded-md hover:opacity-90 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
//           >
//             {isSending ? (
//               <>
//                 <Loader2 size={18} className="animate-spin" />
//                 Confirming...
//               </>
//             ) : (
//               <>
//                 <Check size={18} />
//                 Confirm Order
//               </>
//             )}
//           </motion.button>
//         </div>
//       )}

//       <form
//         onSubmit={sendMessage}
//         className="border-t border-gray-200 p-4 bg-white"
//       >
//         <div className="flex gap-2">
//           <input
//             ref={inputRef}
//             type="text"
//             value={input}
//             onChange={handleChange}
//             placeholder="Type your message..."
//             disabled={isSending}
//             className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1c2b3a]"
//           />
//           <motion.button
//             whileHover={{ scale: 1.05 }}
//             whileTap={{ scale: 0.95 }}
//             type="submit"
//             disabled={isSending || !input.trim()}
//             className="bg-gradient-to-r from-[#fcecd8] to-[#1c2b3a] text-white p-2 rounded-lg hover:opacity-90 disabled:opacity-50 transition-all"
//           >
//             {isSending ? (
//               <Loader2 size={20} className="animate-spin" />
//             ) : (
//               <Send size={20} />
//             )}
//           </motion.button>
//         </div>
//       </form>
//     </div>
//   );
// };

// export default ChatWindow;
