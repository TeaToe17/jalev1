"use client";

import React, { useEffect, useState } from "react";
import { fetchUser } from "@/lib/utils";

interface CustomUser {
  id: number;
  name: string;
  whatsapp: string;
  call: string;
  image: string;
  categories: number[];
}

const Profile = () => {
  const [user, setUser] = useState<CustomUser>();

  useEffect(() => {
    const loadUser = async () => {
      try {
        const data = await fetchUser();
        console.log(data);
        setUser(data);
      } catch (err) {
        console.error("Failed to load user:", err);
      }
    };
    loadUser();
  }, []);

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "100vh", // Ensures it's vertically centered
        backgroundColor: "#f4f1ed", // Light beige background
        padding: "20px",
      }}
    >
      <div
        style={{
          backgroundColor: "#ffffff", // Pure white background for the profile container
          padding: "30px",
          borderRadius: "8px",
          boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)",
          width: "100%",
          maxWidth: "400px", // Max width for the profile container
          textAlign: "center",
        }}
      >
        {user ? (
          <>
            <h1
              style={{
                color: "#000000", // Black for the heading text
                fontSize: "24px",
                fontWeight: "bold",
                marginBottom: "20px",
              }}
            >
              {user.name}
            </h1>
            {/* Hardcoded placeholder image */}
            <img
              src="https://via.placeholder.com/100" // Placeholder image
              alt="Profile"
              width={100}
              style={{
                borderRadius: "50%",
                marginBottom: "20px",
              }}
            />
            <p
              style={{
                color: "#000000",
                fontSize: "16px",
                marginBottom: "10px",
              }}
            >
              <strong>WhatsApp:</strong> {user.whatsapp}
            </p>
            <p
              style={{
                color: "#000000",
                fontSize: "16px",
                marginBottom: "10px",
              }}
            >
              <strong>Call:</strong> {user.call}
            </p>
            <p
              style={{
                color: "#000000",
                fontSize: "16px",
              }}
            >
              <strong>Categories:</strong>
              {user.categories.map((category, index) => (
                <span
                  key={index}
                  style={{
                    marginRight: "5px",
                    backgroundColor: "#ff6a00", // Vibrant orange for categories
                    color: "#ffffff", // White text on the orange background
                    padding: "5px",
                    borderRadius: "8px",
                  }}
                >
                  {category}
                </span>
              ))}
            </p>
          </>
        ) : (
          <p>Loading...</p>
        )}
      </div>
    </div>
  );
};

export default Profile;
