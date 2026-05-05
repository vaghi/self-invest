import type { WSEvent } from '@self-invest/shared';

type WSHandler = (event: WSEvent) => void;

class WebSocketClient {
  private ws: WebSocket | null = null;
  private handlers: Set<WSHandler> = new Set();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectDelay = 1000;

  connect(url: string): void {
    if (this.ws?.readyState === WebSocket.OPEN) return;

    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      this.reconnectDelay = 1000;
    };

    this.ws.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data) as WSEvent;
        this.handlers.forEach((handler) => handler(parsed));
      } catch {}
    };

    this.ws.onclose = () => {
      this.scheduleReconnect(url);
    };

    this.ws.onerror = () => {
      this.ws?.close();
    };
  }

  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.ws?.close();
    this.ws = null;
  }

  subscribe(handler: WSHandler): () => void {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  private scheduleReconnect(url: string): void {
    this.reconnectTimer = setTimeout(() => {
      this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30000);
      this.connect(url);
    }, this.reconnectDelay);
  }
}

export const wsClient = new WebSocketClient();
