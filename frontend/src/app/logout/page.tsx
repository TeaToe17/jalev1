"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAppContext } from "@/context";
import React from "react";

const Logout = () => {
  const { setIsLoggedIn } = useAppContext();
  const router = useRouter();

  function handleLogout() {
    localStorage.clear();
    setIsLoggedIn(false);
    router.push("/login");
  }

  useEffect(() => {
    handleLogout();
  }, []);

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        backgroundColor: '#f4f1ed', // Light beige background
        padding: '20px',
      }}
    >
      <div
        style={{
          backgroundColor: '#ffffff', // Pure white background for the logout container
          padding: '30px',
          borderRadius: '8px',
          boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
          width: '100%',
          maxWidth: '400px', // Max width for the form container
          textAlign: 'center',
        }}
      >
        <h1
          style={{
            color: '#000000', // Black for the heading text
            fontSize: '24px',
            fontWeight: 'bold',
            marginBottom: '20px',
          }}
        >
          Successfully Logged Out
        </h1>
        <p
          style={{
            color: '#000000', // Black text for the message
            fontSize: '16px',
            marginBottom: '20px',
          }}
        >
          You have been logged out. You will be redirected to the login page shortly.
        </p>
        <div style={{ fontSize: '14px', color: '#ff6a00', fontWeight: 'bold' }}>
          Redirecting...
        </div>
      </div>
    </div>
  );
};

export default Logout;
