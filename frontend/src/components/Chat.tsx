"use client";

import { useEffect, useState } from "react";

import { connectToChat, fetchUser } from "@/lib/utils";
import api from "@/lib/api";
import { useAppContext } from "@/context";
import { useRouter } from "next/navigation";

interface ChatProps {
  receiverId: number;
}

const ChatWindow: React.FC<ChatProps> = ({ receiverId }) => {
  const router = useRouter();
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const { currentProduct, setCurrentProduct } = useAppContext();
  const [productId, setProductId] = useState<number | string>("");
  const [ownerId, setOwnerId] = useState<number | string>("");
  const [agreedPrice, setAgreedPrice] = useState<number | string>("");
  const [isProductOwner, setIsProductOwner] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const productId = localStorage.getItem("productId");
      const ownerId = localStorage.getItem("ownerId");

      if (productId && ownerId) {
        setProductId(productId);
        setOwnerId(ownerId);
      }
    }

    return () => {
      localStorage.removeItem("productId");
      localStorage.removeItem("ownerId");
    };
  }, []);

  const fetchHistory = async () => {
    try {
      const response = await api.get(`user/list_messages/${receiverId}/`);
      const resDict = response.data;
      if (Array.isArray(resDict) && resDict.length !== 0) {
        const formattedMessage = resDict.map((msg: any) => ({
          text: msg.content,
          sender_id: msg.sender,
        }));
        setMessages(formattedMessage);
        // console.log(formattedMessage);
      }
    } catch (error) {
      console.error("Failed to fetch chat history", error);
    }
  };

  useEffect(() => {
    if (!receiverId) return;

    fetchHistory();

    let socket: WebSocket | null = null;

    try {
      console.log(currentProduct?.id);
      socket = currentProduct
        ? connectToChat(receiverId, currentProduct.id, currentProduct.owner)
        : connectToChat(receiverId);
      if (socket) {
        setWs(socket);

        socket.onmessage = (e) => {
          const data = JSON.parse(e.data);
          if (data.scope == "group") {
            console.log(data);
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
          if (data.text == "Deal Closed") {
            if (typeof window !== "undefined") {
              localStorage.removeItem("ownerId")
              localStorage.removeItem("productId")
            }
          }
        };
      }
    } catch (err) {
      console.error("WebSocket connection failed", err);
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

  const sendAdminMessage = (text: string) => {
    if (ws && text.trim()) {
      ws.send(JSON.stringify({ message: text }));
    }
  };

  const HandleOrder = async () => {
    const user = await fetchUser();
    if (!isProductOwner) {
      alert(
        "Only Seller can Authorize, also make sure youre navigating here through the product"
      );
    } else {
      const formData = new FormData();
      formData.append(
        "product",
        currentProduct?.id?.toString() ?? "Missing Book ID"
      );
      formData.append("agreed_price", agreedPrice.toString());
      formData.append("buyer_name", user.name ?? "Missing Name");
      formData.append(
        "buyer_whatsapp_contact",
        user.whatsapp ?? "Missing WhatsApp"
      );
      formData.append("buyer_call_contact", user.call ?? "Missing Call");
      try {
        api.post("order/create/", formData);
        alert("Order successfully placed!");
        router.push(
          `https://wa.me/2348152207142?text=Hello%20I%20am%20${encodeURIComponent(
            user.name
          )},%0AI%20just%20concluded%20an%20order%20for%20${encodeURIComponent(
            currentProduct?.name ?? ""
          )}%20(${currentProduct?.id})`
        );
        setCurrentProduct(null);
        localStorage.removeItem("productId");
        sendAdminMessage("Deal Closed");
      } catch (error: any) {
        console.error("Unexpected error in HandleOrder:", error);
        alert("An unexpected error occurred. Please try again.");
      }
    }
  };

  const sendMessage = () => {
    if (ws && input.trim()) {
      ws.send(JSON.stringify({ message: input }));
      setInput("");
    }
  };

  useEffect(() => {
    if (ownerId && productId) {
      const ConfirmSeller = async () => {
        const user = await fetchUser();
        if (user.id == ownerId) {
          setIsProductOwner(true);
        }
      };
      ConfirmSeller();
    }
  }, [ownerId, productId]);

  return (
    <div className="relative" style={{ padding: '20px' }}>
      {isProductOwner && (
        <div className="absolute" style={{ top: '10px', right: '10px', padding: '10px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
          <input
            type="number"
            placeholder="Agreed Price"
            value={agreedPrice}
            onChange={(e) => setAgreedPrice(Number(e.target.value))}
            style={{
              padding: '8px',
              borderRadius: '5px',
              border: '1px solid #d9c9b2', // Light beige border
              marginBottom: '10px',
              width: '200px',
              backgroundColor: '#f4f1ed', // Light beige background
            }}
          />
          <span
            onClick={() => HandleOrder()}
            style={{
              display: 'inline-block',
              padding: '8px 12px',
              backgroundColor: '#ff6a00',  // Vibrant orange for the button
              color: '#ffffff',
              borderRadius: '5px',
              cursor: 'pointer',
              fontWeight: 'bold',
              textAlign: 'center',
              transition: 'background-color 0.3s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#e55c00')} // Darken on hover
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#ff6a00')} // Reset on mouse leave
          >
            Authorize Order
          </span>
        </div>
      )}
  
      <div className="text-sm md:text-base" style={{ marginTop: '40px' }}>
        {messages.map((msg, i) => (
          <div key={i} style={{ marginBottom: '12px', padding: '10px', borderRadius: '8px', backgroundColor: '#fcecd8' }}>
            <b style={{ color: '#000000' }}>{msg.sender_id}</b> :{" "}
            <div
              style={{
                color: '#000000',
                fontSize: '14px',
                marginTop: '5px',
              }}
              dangerouslySetInnerHTML={{ __html: msg.text }}
            />
          </div>
        ))}
      </div>
  
      <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          style={{
            padding: '10px',
            borderRadius: '5px',
            border: '1px solid #d9c9b2', // Light beige border
            backgroundColor: '#ffffff', // Pure white input background
            width: '80%',
          }}
        />
        <button
          onClick={sendMessage}
          style={{
            padding: '10px 20px',
            backgroundColor: '#ff6a00',  // Vibrant orange for button
            color: '#ffffff',
            borderRadius: '5px',
            cursor: 'pointer',
            fontWeight: 'bold',
            transition: 'background-color 0.3s ease',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#e55c00')} // Darken on hover
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#ff6a00')} // Reset on mouse leave
        >
          Send
        </button>
      </div>
    </div>
  );
  };

export default ChatWindow;
