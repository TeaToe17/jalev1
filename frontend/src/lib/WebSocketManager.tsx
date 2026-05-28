// WebSocketManager.ts

class WebSocketManager {
  private ws: WebSocket | null = null;
  private reconnectTimeout: NodeJS.Timeout | null = null;

  // listeners
  private messageListeners = new Set<(data: any) => void>();

  connect(userId: number, token: string) {
    // prevent duplicate active sockets
    if (
      this.ws &&
      (this.ws.readyState === WebSocket.OPEN ||
        this.ws.readyState === WebSocket.CONNECTING)
    ) {
      console.log("WS already active");
      return this.ws;
    }

    // cleanup dead socket
    if (
      this.ws &&
      (this.ws.readyState === WebSocket.CLOSED ||
        this.ws.readyState === WebSocket.CLOSING)
    ) {
      this.ws = null;
    }

    const url =
      process.env.NEXT_PUBLIC_ENVIRONMENT === "development"
        ? `ws://localhost:8000/ws/chat/${userId}/?token=${token}`
        : `wss://jalev1.onrender.com/ws/chat/${userId}/?token=${token}`;

    console.log("Creating WS");

    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      console.log("WS connected");
    };

    this.ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);

        console.log("WS message", data);

        // trigger ALL listeners on EVERY message
        this.messageListeners.forEach((listener) => {
          listener(data);
        });
      } catch (err) {
        console.error("WS parse error", err);
      }
    };

    this.ws.onerror = (e) => {
      console.log("WS error", e);
    };

    this.ws.onclose = () => {
      console.log("WS closed");

      this.ws = null;

      // prevent reconnect stacking
      if (!this.reconnectTimeout) {
        this.reconnectTimeout = setTimeout(() => {
          console.log("Reconnecting WS...");

          this.reconnectTimeout = null;

          this.connect(userId, token);
        }, 2000);
      }
    };

    return this.ws;
  }

  subscribe(listener: (data: any) => void) {
    this.messageListeners.add(listener);

    return () => {
      this.messageListeners.delete(listener);
    };
  }

  send(data: any) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  getSocket() {
    return this.ws;
  }

  disconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

export const wsManager = new WebSocketManager();
