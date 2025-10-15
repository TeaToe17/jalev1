"use client";
import type React from "react";

import { useEffect, useState, useRef } from "react";
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

// Interface for API response from backend
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
  analyzing?: boolean; // Only present in pending messages
  scope?: string; // From WebSocket data
  product_id?: number;
  owner_id?: number;
}

const ChatWindow: React.FC<ChatProps> = ({ receiverId }) => {
  const router = useRouter();
  const pathname = usePathname();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [pendingMessages, setPendingMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const { currentProduct, setCurrentProduct, setMessageTrigger } =
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

  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedProductId = localStorage.getItem("productId");
      if (storedProductId) {
        const loadProduct = async () => {
          const res: Product[] = await fetchProducts();
          console.log(res);
          if (res) {
            const product = res.find(
              (item) => item.id === Number(storedProductId)
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
    }
  }, [messages]);

  // Load product and owner IDs from localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedProductId = localStorage.getItem("productId");
      const storedOwnerId = localStorage.getItem("ownerId");

      if (storedProductId && storedOwnerId) {
        setProductId(storedProductId);
        setOwnerId(storedOwnerId);
      }
    }

    console.log(productDetails);

    return () => {
      // Always remove as users might leave midway and comback to negotiate on a different product with the Other user being the owner this time.
      localStorage.removeItem("productId");
      localStorage.removeItem("ownerId");
    };
  }, []);

  // Fetch chat history
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
          // created_at: msg.timestamp,
          created_at: formatTime(msg.timestamp || ""),
        }));
        setMessages(formattedMessage);
      }

      // Get current user
      const user = await fetchUser();
      setCurrentUser(user);
    } catch (error: unknown) {
      console.error("Failed to fetch chat history", error);
      setError("Failed to load chat history, refresh.");
    } finally {
      setIsLoading(false);
    }
  };

  const SendReminder = (receiverId: number, message: string) => {
    api
      .post("user/message_reminder/", {
        message,
        receiver_id: receiverId,
      })
      .catch((err) => {
        console.error("Non-blocking request failed", err);
      });
  };

  // This function triggers after every send of
  // message but only make stghe backend call if msg nt read after some minutes

  // BETTER TO WAIT TO MINUTES AND CONFIRM CERTAIN CONSITIONS BEFORE SENDING REMINDER REQUESTS TO THE BACKEND.
  // AS OPPOSED TO REMINDING ON EVERY SEND - POOR , BACKEND HEAVY , REQUESTS WILL ALSO STILL GET MADE FOR MSGS THAT MIOGHHT ALREADY
  // EVEN BEEN READ OR REPLIED TO.
  useEffect(() => {
    if (lastMessage == "") return;

    const last_msg = messages.at(-1);
    const lastSenderId = Number(last_msg?.sender_id);
    const currentUserId = Number(currentUser?.id);

    if (receiverId) {
      localStorage.setItem("receiverId", JSON.stringify(receiverId));
      localStorage.setItem("message", JSON.stringify(lastMessage));
    }

    let reminderSent = false;

    const safeSendReminder = () => {
      if (!reminderSent) {
        SendReminder(receiverId, lastMessage);
        reminderSent = true;
      }
    };

    const timeout = setTimeout(() => {
      if (
        lastSenderId &&
        currentUserId &&
        Number(lastSenderId) === Number(currentUserId)
      ) {
        safeSendReminder();
      }
    }, 1 * 60 * 1000);

    const handler = () => {
      safeSendReminder();
    };

    window.addEventListener("beforeunload", handler);

    return () => {
      clearTimeout(timeout);
      window.removeEventListener("beforeunload", handler);
      safeSendReminder(); // for soft route navigation
    };
  }, [lastMessage]);

  // Connect to WebSocket and fetch history
  useEffect(() => {
    if (!receiverId) return;

    fetchHistory();

    let socket: WebSocket | null = null;

    try {
      socket = currentProduct
        ? connectToChat(receiverId, currentProduct.id, currentProduct.owner)
        : connectToChat(receiverId);

      if (socket) {
        setWs(socket);

        socket.onmessage = (e) => {
          const data = JSON.parse(e.data);
          console.log(data);

          if (data.scope == "group") {
            // Remove any pending messages that match this received message
            setPendingMessages((prev) =>
              prev.filter(
                (msg) =>
                  !(msg.text === data.text && msg.sender_id === data.sender_id)
              )
            );

            setMessages((prev) => [...prev, data]);
          }

          if (data.product_id && data.owner_id) {
            setProductId(data.product_id);
            if (typeof window !== "undefined") {
              localStorage.setItem("productId", data.product_id.toString());
            }

            setOwnerId(data.owner_id);
            if (typeof window !== "undefined") {
              localStorage.setItem("ownerId", data.owner_id.toString());
            }
          }

          const pattern = /^The transaction has been confirmed at (\d+)$/i;
          const match = data.text.trim().match(pattern);

          if (match) {
            const price = Number.parseInt(match[1], 10); // Extracted price as integer

            HandleOrder(price); // Send price to your handler

            if (typeof window !== "undefined") {
              localStorage.removeItem("ownerId");
              localStorage.removeItem("productId");
            }

            setShowOrderSuccess(true);
          }
        };

        socket.onopen = () => {
          setError(null);
        };

        socket.onerror = () => {
          // setError("Please refresh the page.");
        };

        socket.onclose = () => {
          console.log("WebSocket connection closed");
        };
      }
    } catch (err) {
      console.error("WebSocket connection failed", err);
      setError("Failed to connect to chat. Please refresh the page.");
    }

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

  // Persist messages in localStorage
  useEffect(() => {
    if (messages.length !== 0) {
      localStorage.setItem("messages", JSON.stringify(messages));
    }
    if (messages.length == 0) {
      const storedMessages = localStorage.getItem("messages");
      if (storedMessages) {
        const parsed = JSON.parse(storedMessages);
        if (Array.isArray(parsed)) {
          setMessages(parsed);
        }
      }
    }
  }, [messages]);

  useEffect(() => {
    if (!pathname.startsWith(`/chat/${receiverId}`)) return;
    if (!messages.length || !currentUser?.id) return;

    const last_msg = messages.at(-1);
    const lastSenderId = Number(last_msg?.sender_id);
    const currentUserId = Number(currentUser?.id);

    // Only mark as read if the last message was sent by someone else
    if (
      lastSenderId &&
      currentUserId &&
      Number(lastSenderId) !== Number(currentUserId)
    ) {
      // Mark messages as read on backend
      api
        .post(`user/update_messages/${receiverId}/`)
        .then(() => {
          // Only trigger context update after successful backend update
          setMessageTrigger(true);
        })
        .catch((error) => {
          console.error("Failed to mark messages as read:", error);
        });
    }
  }, [messages, currentUser?.id, receiverId, setMessageTrigger]);

  // Scroll to bottom when messages or pending messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "nearest", // or "end"
      inline: "nearest",
    });
  }, [messages, pendingMessages]);

  // Check if current user is the product owner
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
      return; // do not update the input
    }

    setInput(value);
  };

  // Send admin message
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
        currentProduct?.id.toString() ?? "Missing Book ID"
      );
      formData.append("agreed_price", price.toString());
      formData.append("buyer_name", user.username ?? "Missing Name");
      formData.append(
        "buyer_whatsapp_contact",
        user.whatsapp ?? "Missing WhatsApp"
      );
      formData.append("buyer_call_contact", user.call ?? "Missing Call");

      await api.post("order/create/", formData);

      // Show success message
      setShowOrderSuccess(true);

      // Send message to chat
      sendAdminMessage("Deal Approved");

      // Reset product state
      setCurrentProduct(null);
      localStorage.removeItem("productId");

      // Redirect to WhatsApp
      router.push(
        `https://wa.me/2347046938727?text=Hello%20I%20am%20${encodeURIComponent(
          user.username
        )},%0AI%20just%20concluded%20an%20order%20for%20${encodeURIComponent(
          currentProduct?.name ?? ""
        )}%20(${currentProduct?.id})`
      );
    } catch (error: unknown) {
      console.error("Unexpected error in HandleOrder:", error);
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsSending(false);
    }
  };

  // Send message with analyzing animation
  const sendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (ws && input.trim()) {
      setIsSending(true);

      try {
        // Create a pending message with analyzing state
        const pendingMsg = {
          text: input,
          sender_id: currentUser?.id,
          created_at: formatTime(new Date().toISOString()),
          analyzing: true,
        };

        // Add to pending messages
        setPendingMessages((prev) => [...prev, pendingMsg]);

        // Send the actual message
        ws.send(JSON.stringify({ message: input }));
        setLastMessage(input);
        setInput("");

        // Simulate analysis time (optional - for consistent UX)
        setTimeout(() => {
          // Update the pending message to show it's been analyzed
          setPendingMessages((prev) =>
            prev.map((msg) =>
              msg === pendingMsg ? { ...msg, analyzing: false } : msg
            )
          );
        }, Math.random() * 1000 + 500); // Random time between 500-1500ms
      } catch (error) {
        setError(`Failed to send message. Please try again, ${error}`);
        // Remove the pending message if there was an error
        setPendingMessages((prev) => prev.filter((msg) => msg.text !== input));
      } finally {
        setIsSending(false);
      }
    }
  };

  // Format message timestamp
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
    if (!LoggedIn) router.replace("/login");
  }, [LoggedIn, router]);

  if (!LoggedIn) {
    // You can show a placeholder while the redirect happens
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
      {/* Order success message */}
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

      {/* Error message */}
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

      {/* Messages area */}
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
            {/* Render actual messages */}
            {messages.map((msg, i) => {
              const isCurrentUser =
                currentUser && msg.sender_id === currentUser.id;

              return (
                <motion.div
                  key={`msg-${i}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05, duration: 0.3 }}
                  className={`flex ${
                    isCurrentUser ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg px-4 py-3 ${
                      isCurrentUser
                        ? "bg-gradient-to-r from-[#fcecd8] to-[#1c2b3a] text-white"
                        : "bg-white border border-gray-200 text-gray-800"
                    }`}
                  >
                    {!isCurrentUser && (
                      <div className="font-semibold mb-1 text-sm">
                        {msg.sender_id === "system"
                          ? "System"
                          : `User #${msg.sender_id}`}
                      </div>
                    )}
                    <div
                      className="text-sm sm:text-base"
                      dangerouslySetInnerHTML={{ __html: msg.text }}
                    />
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
                </motion.div>
              );
            })}

            {/* Render pending messages with analyzing animation */}
            {pendingMessages.map((msg, i) => {
              const isCurrentUser =
                currentUser && msg.sender_id === currentUser.id;

              return (
                <motion.div
                  key={`pending-${i}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className={`flex ${
                    isCurrentUser ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg px-4 py-3 ${
                      isCurrentUser
                        ? "bg-gradient-to-r from-[#fcecd8] to-[#1c2b3a]/80 text-white"
                        : "bg-white border border-gray-200 text-gray-800"
                    }`}
                  >
                    {!isCurrentUser && (
                      <div className="font-semibold mb-1 text-sm">
                        {msg.sender_id === "system"
                          ? "System"
                          : `User #${msg.sender_id}`}
                      </div>
                    )}
                    <div className="text-sm sm:text-base">{msg.text}</div>

                    {/* Analyzing indicator */}
                    {msg.analyzing && (
                      <div
                        className={`flex items-center gap-2 mt-1 ${
                          isCurrentUser ? "text-white/80" : "text-gray-600"
                        }`}
                      >
                        <Brain
                          size={14}
                          className={
                            isCurrentUser ? "text-white/80" : "text-[#1c2b3a]"
                          }
                        />
                        <div className="text-xs font-medium flex items-center">
                          Analyzing
                          <span className="ml-1 flex">
                            <motion.span
                              animate={{ opacity: [0, 1, 0] }}
                              transition={{
                                repeat: Number.POSITIVE_INFINITY,
                                duration: 1.5,
                                times: [0, 0.5, 1],
                              }}
                              className="h-1 w-1 mx-0.5 rounded-full bg-current"
                            />
                            <motion.span
                              animate={{ opacity: [0, 1, 0] }}
                              transition={{
                                repeat: Number.POSITIVE_INFINITY,
                                duration: 1.5,
                                delay: 0.2,
                                times: [0, 0.5, 1],
                              }}
                              className="h-1 w-1 mx-0.5 rounded-full bg-current"
                            />
                            <motion.span
                              animate={{ opacity: [0, 1, 0] }}
                              transition={{
                                repeat: Number.POSITIVE_INFINITY,
                                duration: 1.5,
                                delay: 0.4,
                                times: [0, 0.5, 1],
                              }}
                              className="h-1 w-1 mx-0.5 rounded-full bg-current"
                            />
                          </span>
                        </div>
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
                </motion.div>
              );
            })}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>
      {/* Product order panel for sellers */}

      {isProductOwner && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="bg-gradient-to-r from-[#fcecd8] to-[#1c2b3a]/90 p-4 rounded-lg mb-4 shadow-md"
        >
          {/* Product Details Section */}
          <div className="mb-4 p-3 bg-white/10 rounded-md backdrop-blur-sm">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              {productDetails.productImage && (
                <img
                  src={productDetails.productImage || "/placeholder.svg"}
                  alt={productDetails.productName}
                  className="w-16 h-16 object-cover rounded-md border border-white/30"
                />
              )}
              <div className="flex-1">
                <h3 className="text-white font-semibold text-lg">
                  {productDetails.productName || "Product Name"}
                </h3>
                <p className="text-white/80 text-sm">
                  Price: {productDetails.productPrice || 0}
                </p>
              </div>
            </div>
          </div>

          {/* Authorization Section */}
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="flex items-center gap-2 text-white">
              <ShoppingBag size={20} />
              <span className="font-medium">Authorize Order</span>
            </div>
            <div className="flex-1 flex flex-col sm:flex-row gap-3">
              <input
                type="number"
                placeholder="Agreed Price e.g 5000"
                value={agreedPrice}
                onChange={(e) => setAgreedPrice(e.target.value)}
                className="px-4 py-2 rounded-md border border-white/30 bg-white/10 text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-white/50 w-full sm:w-auto"
              />
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={ApproveOrder}
                disabled={isSending || !agreedPrice}
                className={`px-4 py-2 rounded-md flex items-center justify-center gap-2 transition-colors ${
                  isSending || !agreedPrice
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-white text-[#1c2b3a] hover:bg-opacity-90"
                }`}
              >
                {isSending ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <Check size={16} />
                    <span>Authorize Order</span>
                  </>
                )}
              </motion.button>
            </div>
            <p className="text-white font-medium">
              Payout: {Number(agreedPrice) * 0.9}
            </p>
          </div>
        </motion.div>
      )}

      <AnimatePresence>
        <>
          {error == "This input is not allowed." && (
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
      {showDiv && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="bg-gradient-to-r from-[#fcecd8]/50 to-[#1c2b3a]/10 border border-[#fcecd8] rounded-lg p-2 shadow-sm"
        >
          <div className="flex items-start gap-3">
            <div className="text-[#1c2b3a] mt-0.5">
              <AlertCircle size={20} />
            </div>

            <div>
              <h4 className="font-medium text-[#1c2b3a] mb-1">
                Important Information for Buyers
              </h4>
              <p className="text-sm text-gray-700">
                Buyers must order via{" "}
                <span className="font-semibold text-[#1c2b3a]">
                  "Negotiate"
                </span>{" "}
                for seller approval. If <b>Authorize Order</b> isnt shown, let
                buyer go back, use "Negotiate" button, and resend a message.
                Seller Authorizes order after succesful negotiation.
              </p>
            </div>

            <div
              onClick={() => setShowDiv(false)}
              className="text-[#1c2b3a] mt-0.5 text-right"
            >
              <X size={20} />
            </div>
          </div>
        </motion.div>
      )}

      {/* Message input */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white border-t border-gray-200 p-4"
      >
        <form onSubmit={sendMessage} className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => handleChange(e)}
            placeholder="Type your message..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1c2b3a] focus:border-transparent transition-colors"
            disabled={isSending}
          />
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            type="submit"
            disabled={isSending || !input.trim()}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
              !input.trim()
                ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                : "bg-gradient-to-r from-[#fcecd8] to-[#1c2b3a] text-white"
            }`}
          >
            {isSending ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Send size={18} />
            )}
            <span className="hidden sm:inline">Send</span>
          </motion.button>
        </form>
      </motion.div>
    </div>
  );
};

export default ChatWindow;
