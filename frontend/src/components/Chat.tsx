"use client";
import React from "react";

import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  ShoppingBag,
  AlertCircle,
  Loader2,
  Check,
  X,
  Brain,
} from "lucide-react";
import { connectToChat, fetchProducts, fetchUser, LoggedIn } from "@/lib/utils";
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
  analyzing?: boolean;
  scope?: string;
  product_id?: number;
  owner_id?: number;
}

// Memoized message components for performance
const MessageItem = React.memo(
  ({ msg, isCurrentUser }: { msg: Message; isCurrentUser: boolean }) => (
    <div className={`flex ${isCurrentUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[80%] rounded-lg px-4 py-3 ${
          isCurrentUser
            ? "bg-gradient-to-r from-[#fcecd8] to-[#1c2b3a] text-white"
            : "bg-white border border-gray-200 text-gray-800"
        }`}
      >
        {!isCurrentUser && (
          <div className="font-semibold mb-1 text-sm">
            {msg.sender_id === "system" ? "System" : `User #${msg.sender_id}`}
          </div>
        )}
        <div className="text-sm sm:text-base">{msg.text}</div>
        {msg.created_at && (
          <div
            className={`text-xs mt-1 ${
              isCurrentUser ? "text-white/70" : "text-gray-500"
            }`}
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
    <div className={`flex ${isCurrentUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[80%] rounded-lg px-4 py-3 ${
          isCurrentUser
            ? "bg-gradient-to-r from-[#fcecd8] to-[#1c2b3a]/80 text-white"
            : "bg-white border border-gray-200 text-gray-800"
        }`}
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
            className={`text-xs mt-1 ${
              isCurrentUser ? "text-white/70" : "text-gray-500"
            }`}
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
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [pendingMessages, setPendingMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const { currentProduct, setCurrentProduct, setMessageTrigger, isLoggedIn } =
    useAppContext();
  const [productId, setProductId] = useState<number | string>("");
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
  const [productDetails, setProductDetails] = useState({
    productImage: "",
    productName: "",
    productPrice: 0,
  });
  const [isHydrated, setIsHydrated] = useState(false);
  const localStorageSaveTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setIsHydrated(true);
    const storedProductId = localStorage.getItem("productId");
    const storedOwnerId = localStorage.getItem("ownerId");

    if (storedProductId && storedOwnerId) {
      setProductId(storedProductId);
      setOwnerId(storedOwnerId);
    }

    return () => {
      localStorage.removeItem("productId");
      localStorage.removeItem("ownerId");
    };
  }, []);

  useEffect(() => {
    if (!isHydrated) return;

    const storedProductId = localStorage.getItem("productId");
    if (storedProductId) {
      const loadProduct = async () => {
        const res: Product[] = await fetchProducts();
        if (res) {
          const product = res.find(
            (item) => item.id === Number(storedProductId),
          );
          if (product) {
            setProductDetails({
              productImage: product.image,
              productName: product.name,
              productPrice: product.price,
            });
          }
        }
      };
      loadProduct();
    }
  }, [isHydrated]);

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
        }));
        setMessages(formattedMessage);
      }

      const user = await fetchUser();
      setCurrentUser(user);
    } catch (error: unknown) {
      console.error("Failed to fetch chat history", error);
      setError("Failed to load chat history, refresh.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (lastMessage == "") return;

    if (receiverId) {
      localStorage.setItem("receiverId", JSON.stringify(receiverId));
      localStorage.setItem("message", JSON.stringify(lastMessage));
    }
  }, [lastMessage, receiverId]);

  useEffect(() => {
    if (!receiverId || !LoggedIn()) return;

    fetchHistory();

    let socket: WebSocket | null = null;
    let retryCount = 0;
    const MAX_RETRIES = 3;

    const connect = () => {
      try {
        socket = currentProduct
          ? connectToChat(receiverId, currentProduct.id, currentProduct.owner)
          : connectToChat(receiverId);

        if (!socket) return;

        setWs(socket);

        socket.onmessage = (e) => {
          const data = JSON.parse(e.data);
          console.log(data);

          if (data.scope == "group") {
            setPendingMessages((prev) =>
              prev.filter(
                (msg) =>
                  !(msg.text === data.text && msg.sender_id === data.sender_id),
              ),
            );

            setMessages((prev) => [...prev, data]);
          }

          if (data.product_id && data.owner_id) {
            setProductId(data.product_id);
            localStorage.setItem("productId", data.product_id.toString());

            setOwnerId(data.owner_id);
            localStorage.setItem("ownerId", data.owner_id.toString());
          }

          const pattern = /^The transaction has been confirmed at (\d+)$/i;
          const match = data.text.trim().match(pattern);

          if (match) {
            const price = Number.parseInt(match[1], 10);
            HandleOrder(price);
            localStorage.removeItem("ownerId");
            localStorage.removeItem("productId");
            setShowOrderSuccess(true);
          }
        };

        socket.onopen = () => {
          console.log("WS OPEN");
          retryCount = 0;
          setError(null);
        };

        socket.onerror = () => {
          console.log("WS ERROR");
        };

        socket.onclose = (event) => {
          console.log("WebSocket connection closed");

          if (event.code === 1006 || !event.wasClean) {
            if (retryCount < MAX_RETRIES) {
              retryCount++;
              console.log(`Retrying WebSocket... Attempt ${retryCount}`);

              setTimeout(() => {
                connect();
              }, 500);
            } else {
              console.error("Max retries reached. Stopping.");
              setError("Failed to connect to chat after multiple attempts.");
            }
          }
        };
      } catch (err) {
        console.error("WebSocket connection failed", err);
        setError("Failed to connect to chat. Please refresh the page.");
      }
    };

    connect();

    return () => {
      if (
        socket &&
        (socket.readyState === WebSocket.OPEN ||
          socket.readyState === WebSocket.CONNECTING)
      ) {
        console.log("Closing socket from cleanup...");
        socket.close();
      }
    };
  }, [receiverId, currentProduct]);

  // Debounced localStorage save
  useEffect(() => {
    if (messages.length !== 0) {
      if (localStorageSaveTimer.current) {
        clearTimeout(localStorageSaveTimer.current);
      }

      localStorageSaveTimer.current = setTimeout(() => {
        localStorage.setItem("messages", JSON.stringify(messages));
      }, 500);
    } else if (messages.length == 0) {
      const storedMessages = localStorage.getItem("messages");
      if (storedMessages) {
        const parsed = JSON.parse(storedMessages);
        if (Array.isArray(parsed)) {
          setMessages(parsed);
        }
      }
    }

    return () => {
      if (localStorageSaveTimer.current) {
        clearTimeout(localStorageSaveTimer.current);
      }
    };
  }, [messages]);

  useEffect(() => {
    if (!pathname.startsWith(`/chat/${receiverId}`)) return;
    if (!messages.length || !currentUser?.id) return;

    const last_msg = messages.at(-1);
    const lastSenderId = Number(last_msg?.sender_id);
    const currentUserId = Number(currentUser?.id);

    if (
      lastSenderId &&
      currentUserId &&
      Number(lastSenderId) !== Number(currentUserId)
    ) {
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
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "nearest",
    });
  }, [messages, pendingMessages]);

  useEffect(() => {
    if (ownerId && productId) {
      const confirmSeller = async () => {
        const user = await fetchUser();
        if (user?.id == ownerId) {
          setIsProductOwner(true);
        }
      };
      confirmSeller();
    }
  }, [ownerId, productId]);

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
    localStorage.removeItem("productId");
    localStorage.removeItem("ownerId");
    setIsProductOwner(false);
    if (!currentProduct) return;
    setIsSending(true);
    setError(null);
    try {
      const user = await fetchUser();
      if (!user) return;
      const formData = new FormData();
      formData.append(
        "product",
        currentProduct?.id.toString() ?? "Missing Book ID",
      );
      formData.append("agreed_price", price.toString());
      formData.append("buyer_name", user.username ?? "Missing Name");
      formData.append(
        "buyer_whatsapp_contact",
        user.whatsapp ?? "Missing WhatsApp",
      );
      formData.append("buyer_call_contact", user.call ?? "Missing Call");

      await api.post("order/create/", formData);

      setShowOrderSuccess(true);

      sendAdminMessage("Deal Approved");

      setCurrentProduct(null);
      localStorage.removeItem("productId");

      router.push(
        `https://wa.me/2347046938727?text=Hello%20I%20am%20${encodeURIComponent(
          user.username,
        )},%0AI%20just%20concluded%20an%20order%20for%20${encodeURIComponent(
          currentProduct?.name ?? "",
        )}%20(${currentProduct?.id})`,
      );
    } catch (error: unknown) {
      console.error("Unexpected error in HandleOrder:", error);
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsSending(false);
    }
  };

  const [currentTime, setCurrentTime] = useState<string>("");
  useEffect(() => {
    setCurrentTime(formatTime(new Date().toISOString()));
  }, []);

  const sendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (ws && input.trim()) {
      setIsSending(true);

      try {
        const pendingMsg = {
          text: input,
          sender_id: currentUser?.id,
          created_at: currentTime || formatTime(new Date().toISOString()),
          analyzing: true,
        };

        setPendingMessages((prev) => [...prev, pendingMsg]);

        ws.send(JSON.stringify({ message: input }));
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
          Math.random() * 1000 + 500,
        );
      } catch (error) {
        setError(`Failed to send message. Please try again, ${error}`);
        setPendingMessages((prev) => prev.filter((msg) => msg.text !== input));
      } finally {
        setIsSending(false);
      }
    }
  };

  const formatTime = (timeString: string) => {
    try {
      const date = new Date(timeString);
      return date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
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

  if (!LoggedIn()) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex justify-center items-center h-full">
          <Loader2 size={40} className="text-[#1c2b3a] animate-spin" />
        </div>
        <p>Redirecting to login…</p>
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
                  Your order has been successfully authorized. Buyer will be
                  redirected to WhatsApp for delivery follow up and Seller would
                  be contacted.
                </p>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowOrderSuccess(false)}
                  className="bg-gradient-to-r from-[#fcecd8] to-[#1c2b3a] text-white px-6 py-2 rounded-md shadow-sm hover:opacity-90 transition-all"
                >
                  Close
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        <>
          {error && error !== "This input is not allowed." && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2"
            >
              <AlertCircle size={20} />
              <p>{error}</p>
              <button
                onClick={() => setError(null)}
                className="ml-auto text-red-700 hover:text-red-900"
              >
                <X size={16} />
              </button>
            </motion.div>
          )}
        </>
      </AnimatePresence>

      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 size={40} className="text-[#1c2b3a] animate-spin" />
          </div>
        ) : messages.length === 0 && pendingMessages.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">
              No messages yet. Start the conversation!
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg, i) => {
              const isCurrentUser =
                currentUser && msg.sender_id === currentUser.id;

              return (
                <MessageItem
                  key={`msg-${i}`}
                  msg={msg}
                  isCurrentUser={!!isCurrentUser}
                />
              );
            })}

            {pendingMessages.map((msg, i) => {
              const isCurrentUser =
                currentUser && msg.sender_id === currentUser.id;

              return (
                <PendingMessageItem
                  key={`pending-${i}`}
                  msg={msg}
                  isCurrentUser={!!isCurrentUser}
                />
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {showDiv && productDetails.productName && (
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="flex gap-4 items-center bg-white p-4 rounded-lg shadow-sm">
            {productDetails.productImage && (
              <img
                src={productDetails.productImage}
                alt={productDetails.productName}
                className="w-16 h-16 object-cover rounded"
              />
            )}
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900">
                {productDetails.productName}
              </h3>
              <p className="text-sm text-gray-600">
                ₦{productDetails.productPrice.toLocaleString()}
              </p>
            </div>
            <button
              onClick={() => setShowDiv(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X size={20} />
            </button>
          </div>
        </div>
      )}

      {isProductOwner && (
        <div className="p-4 border-t border-gray-200 bg-gradient-to-r from-[#fcecd8]/20 to-[#1c2b3a]/20">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-[#1c2b3a]">
              <Brain size={16} />
              Confirm Deal
            </div>
            <div className="flex gap-2">
              <input
                type="number"
                placeholder="Agreed price..."
                value={agreedPrice}
                onChange={(e) => setAgreedPrice(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1c2b3a]"
              />
              <button
                onClick={ApproveOrder}
                disabled={isSending}
                className="px-4 py-2 bg-gradient-to-r from-[#fcecd8] to-[#1c2b3a] text-white rounded-lg hover:opacity-90 disabled:opacity-50 transition-all font-semibold flex items-center gap-2"
              >
                {isSending ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Confirming...
                  </>
                ) : (
                  <>
                    <Check size={16} />
                    Confirm
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <form
        onSubmit={sendMessage}
        className="p-4 border-t border-gray-200 bg-white"
      >
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={handleChange}
            placeholder="Type your message..."
            disabled={isSending}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1c2b3a] disabled:bg-gray-100"
          />
          <button
            type="submit"
            disabled={isSending || !input.trim()}
            className="px-4 py-2 bg-gradient-to-r from-[#fcecd8] to-[#1c2b3a] text-white rounded-lg hover:opacity-90 disabled:opacity-50 transition-all"
          >
            <Send size={20} />
          </button>
        </div>
      </form>
    </div>
  );
};

export default ChatWindow;
