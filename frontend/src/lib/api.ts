import axios from "axios";
import { jwtDecode } from "jwt-decode"; // Default import for jwt-decode
import { ACCESS_TOKEN, REFRESH_TOKEN } from "./constant";

export const apiURL = "http://127.0.0.1:8000/";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || apiURL,
});

const refreshTokenEndpoint = "/api/token/refresh/";
const publicEndpoints = ["book/list/"]; // Add other public endpoints

let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

type User = {
  id: number;
}

const isTokenExpired = (token: any): boolean => {
  try {
    const decoded: { exp?: number } = jwtDecode(token); // Specify type for decoded token
    const now = Math.floor(Date.now() / 1000); // Current time in seconds

    // Check if `exp` exists and compare it with the current time
    if (decoded.exp && now >= decoded.exp) {
      return true; // Token is expired
    }

    return false; // Token is valid
  } catch (error) {
    return true; // Assume token is expired if decoding fails
  }
};

const onTokenRefreshed = (token: string) => {
  refreshSubscribers.forEach((callback) => callback(token));
  refreshSubscribers = [];
};

const addRefreshSubscriber = (callback: (token: string) => void) => {
  refreshSubscribers.push(callback);
};

export const logout = () => {
  try {
    const token = localStorage.getItem(ACCESS_TOKEN);
    if (!token) {
      console.log("No token found in localStorage.");
      alert("You are Already logged Out")
      return;
    }

    // const decoded: { CustomUser: User } = jwtDecode(token);
    // console.log("📌 Decoded User ID:", decoded?.CustomUser?.id);

    // if (decoded?.CustomUser) {
    //   api.delete("user/delete_permission_token/")
    //     .then((response) => {
    //       console.log("✅ Token deleted successfully:", response.data);
    //       // Perform logout cleanup
    //     })
    //     .catch((error) => {
    //       console.error("❌ Error deleting token:", error.response || error);
    //       localStorage.removeItem(ACCESS_TOKEN);
    //       localStorage.removeItem(REFRESH_TOKEN);
    //       window.location.href = "/logout";  
    //     });
    //   }
      localStorage.removeItem(ACCESS_TOKEN);
      localStorage.removeItem(REFRESH_TOKEN);
      window.location.href = "/logout";  
  } catch (error) {
    console.error("❌ Error decoding token or making API call:", error);
  }


};


api.interceptors.request.use(
  async (config) => {
    if (
      config.url &&
      !publicEndpoints.some((endpoint) => config.url?.includes(endpoint)) &&
      !config.url.includes(refreshTokenEndpoint)
    ) {
      const token = localStorage.getItem(ACCESS_TOKEN);
      const refreshToken = localStorage.getItem(REFRESH_TOKEN);

      if (token && isTokenExpired(token)) {
        if (!isRefreshing) {
          isRefreshing = true;
          try {
            const res = await api.post(refreshTokenEndpoint, {
              refresh: refreshToken,
            });

            const newAccessToken = res.data.access;
            localStorage.setItem(ACCESS_TOKEN, newAccessToken);
            onTokenRefreshed(newAccessToken);
            config.headers.Authorization = `Bearer ${newAccessToken}`;
          } catch (error) {
            console.error("Failed to refresh token:", error);
            logout();
          } finally {
            isRefreshing = false;
          }
        } else {
          return new Promise((resolve) => {
            addRefreshSubscriber((newToken: string) => {
              config.headers.Authorization = `Bearer ${newToken}`;
              resolve(config);
            });
          });
        }
      } else if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }

    return config;
  },
  (error) => Promise.reject(error)
);

export default api;