import { ACCESS_TOKEN } from "./constant";
import { LoggedIn } from "./utils";

class WebSocketManager {
  private ws: WebSocket | null = null;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private messageListeners = new Set<(data: any) => void>();

  private retryCount = 0;
  private maxRetries = 3;

  connect(userId: number, token: string) {
    if (
      this.ws &&
      (this.ws.readyState === WebSocket.OPEN ||
        this.ws.readyState === WebSocket.CONNECTING)
    ) {
      return this.ws;
    }

    const url =
      process.env.NEXT_PUBLIC_ENVIRONMENT === "development"
        ? `ws://localhost:8000/ws/chat/${userId}/?token=${token}`
        : `wss://jalev1.onrender.com/ws/chat/${userId}/?token=${token}`;

    //Avoiding unneccesary failed connections and redirects in cases where users were never logged in
    
    if (!LoggedIn) return;
    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      this.retryCount = 0;
      console.log("WS opened");
    };

    this.ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);

        this.messageListeners.forEach((fn) => fn(data));
      } catch (err) {
        console.error("WS parse error", err);
      }
    };

    this.ws.onerror = (err) => {
      console.log("WS error", err);
    };

    this.ws.onclose = (event) => {
      console.log("WS closed", event);

      this.ws = null;

      // 🔥 IMPORTANT: detect auth failure from server behavior
      const authFailed =
        this.retryCount >= this.maxRetries ||
        event.reason?.toLowerCase?.().includes("token") ||
        event.reason?.toLowerCase?.().includes("auth");

      // If auth failure → HARD STOP
      if (authFailed) {
        console.log("WS auth failed → logging out user");

        this.handleAuthFailure();
        return;
      }

      // normal reconnect
      if (this.retryCount < this.maxRetries) {
        this.retryCount++;

        this.reconnectTimeout = setTimeout(() => {
          this.connect(userId, token);
        }, 2000);
      }
    };

    return this.ws;
  }

  private handleAuthFailure() {
    this.disconnect();

    // clear storage
    localStorage.removeItem(ACCESS_TOKEN);

    // force redirect
    window.location.href = "/login";
  }

  subscribe(fn: (data: any) => void) {
    this.messageListeners.add(fn);

    return () => this.messageListeners.delete(fn);
  }

  disconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    this.ws?.close();
    this.ws = null;
  }
}

export const wsManager = new WebSocketManager();
