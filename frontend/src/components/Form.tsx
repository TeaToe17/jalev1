"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation"; // Change to `next/navigation`
import api from "../lib/api";
import { ACCESS_TOKEN, REFRESH_TOKEN } from "../lib/constant";
import LoadingIndicator from "./LoadingIndicator";
import { useAppContext } from "@/context";
import useFcmToken from "./FcmProvider";
import { useGlobalListener } from "@/lib/utils";

interface FormProps {
  route: string;
  method: "login" | "register";
}

const Form = ({ route, method }: FormProps) => {
  const { url, setIsLoggedIn } = useAppContext();
  const [username, setUserName] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState<string | null>(null);
  const [whatsapp, setWhatsapp] = useState<string | null>(null);
  const [call, setCall] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { token, notificationPermissionStatus } = useFcmToken();

  const name = method === "login" ? "Login" : "Register";

  useGlobalListener();

  const handleSubmit = async (e: React.FormEvent) => {
    setLoading(true);
    e.preventDefault();

    try {
      const res = await api.post(route, {
        username,
        password,
        email,
        whatsapp,
        call,
      });
      // console.log("API Response:", res.data); // Debug API response

      if (method === "login") {
        const { access, refresh } = res.data;
        if (!access || !refresh) {
          throw new Error("Tokens missing in response");
        }

        localStorage.setItem(ACCESS_TOKEN, access);
        localStorage.setItem(REFRESH_TOKEN, refresh);
        setIsLoggedIn(true);

        const fcmToken = await token;
        try {
          api.post("user/create_permission_token/", { token: fcmToken });
        } catch (error) {
          console.log(error);
        }

        // router.push(id ? `/mybooks/${id}/` : "/");
        router.push(url ? `${url}` : "/");
      } else {
        router.push("/login");
      }
    } catch (error) {
      alert("An error occurred during submission.");
      console.log(error);
    } finally {
      setLoading(false);
    }
  };
  return (
    <form onSubmit={handleSubmit} className="form-container" style={{ padding: '20px', backgroundColor: '#f4f1ed', borderRadius: '8px', maxWidth: '400px', margin: 'auto' }}>
      {/* <h1 style={{ color: '#000000', fontSize: '24px', fontWeight: 'bold', marginBottom: '20px' }}>{name}</h1> */}
  
      <input
        id="username"
        className="form-input"
        type="text"
        value={username}
        onChange={(e) => setUserName(e.target.value)}
        placeholder="Username"
        style={{
          padding: '10px',
          borderRadius: '5px',
          border: '1px solid #d9c9b2', // Light beige border
          marginBottom: '15px',
          width: '100%',
          backgroundColor: '#ffffff', // Pure white background
        }}
      />
  
      <input
        id="password"
        className="form-input"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
        style={{
          padding: '10px',
          borderRadius: '5px',
          border: '1px solid #d9c9b2', // Light beige border
          marginBottom: '15px',
          width: '100%',
          backgroundColor: '#ffffff', // Pure white background
        }}
      />
  
      <div>
        {name == "Register" && (
          <div>
            <input
              className="form-input"
              type="email"
              value={email ?? ""}
              required
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              style={{
                padding: '10px',
                borderRadius: '5px',
                border: '1px solid #d9c9b2', // Light beige border
                marginBottom: '15px',
                width: '100%',
                backgroundColor: '#ffffff', // Pure white background
              }}
            />
  
            <input
              className="form-input"
              type="text"
              value={whatsapp ?? ""}
              required
              onChange={(e) => setWhatsapp(e.target.value)}
              placeholder="WhatsApp Number"
              style={{
                padding: '10px',
                borderRadius: '5px',
                border: '1px solid #d9c9b2', // Light beige border
                marginBottom: '15px',
                width: '100%',
                backgroundColor: '#ffffff', // Pure white background
              }}
            />
  
            <input
              className="form-input"
              type="text"
              value={call ?? ""}
              required
              onChange={(e) => setCall(e.target.value)}
              placeholder="Call Number"
              style={{
                padding: '10px',
                borderRadius: '5px',
                border: '1px solid #d9c9b2', // Light beige border
                marginBottom: '15px',
                width: '100%',
                backgroundColor: '#ffffff', // Pure white background
              }}
            />
          </div>
        )}
      </div>
  
      {loading && <LoadingIndicator />}
  
      <button
        className="form-button"
        type="submit"
        style={{
          padding: '10px 20px',
          backgroundColor: '#ff6a00',  // Vibrant orange for the button
          color: '#ffffff',
          borderRadius: '5px',
          cursor: 'pointer',
          fontWeight: 'bold',
          transition: 'background-color 0.3s ease',
          width: '100%',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#e55c00')} // Darken on hover
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#ff6a00')} // Reset on mouse leave
      >
        {name}
      </button>
    </form>
  );
  };

export default Form;
