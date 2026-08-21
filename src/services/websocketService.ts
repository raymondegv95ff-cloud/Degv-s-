/**
 * Degv's Messenger Persistent WebSocket Client
 * Maintains an active, non-terminating WebSocket connection with automatic reconnect
 * and ping/pong heartbeats.
 */

class WebSocketClientService {
  private ws: WebSocket | null = null;
  private reconnectTimer: any = null;
  private pingTimer: any = null;
  private isConnecting: boolean = false;
  private listeners: Set<(data: any) => void> = new Set();
  private statusListeners: Set<(connected: boolean) => void> = new Set();
  private isExplicitlyClosed: boolean = false;

  public init() {
    this.isExplicitlyClosed = false;
    this.connect();
  }

  public connect() {
    if (this.isExplicitlyClosed) return;
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }
    if (this.isConnecting) return;

    this.isConnecting = true;

    try {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${window.location.host}/ws`;

      console.log(`[WebSocket Client] 🌐 Conectando persistentemente a ${wsUrl}...`);
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.isConnecting = false;
        console.log(`[WebSocket Client] ✅ WebSocket conectado y activo. Conexión permanente establecida.`);
        this.notifyStatus(true);
        this.startHeartbeat();
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === "pong") {
            return;
          }
          this.listeners.forEach((listener) => {
            try {
              listener(data);
            } catch (err) {
              console.warn("[WebSocket Client] Error in listener:", err);
            }
          });
        } catch {
          // Non-JSON message
        }
      };

      this.ws.onclose = (event) => {
        this.isConnecting = false;
        this.stopHeartbeat();
        this.notifyStatus(false);
        console.log(`[WebSocket Client] 🔌 Conexión cerrada (${event.code}). Reconectando automáticamente en 2 segundos...`);
        if (!this.isExplicitlyClosed) {
          this.scheduleReconnect();
        }
      };

      this.ws.onerror = (error) => {
        this.isConnecting = false;
        console.warn("[WebSocket Client] ⚠️ Evento de error en WebSocket:", error);
      };
    } catch (err) {
      this.isConnecting = false;
      console.warn("[WebSocket Client] Error al inicializar conexión:", err);
      this.scheduleReconnect();
    }
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    this.pingTimer = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: "ping", timestamp: Date.now() }));
      }
    }, 20000);
  }

  private stopHeartbeat() {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => {
      console.log("[WebSocket Client] 🔄 Reintentando apertura de WebSocket...");
      this.connect();
    }, 2000);
  }

  public send(payload: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(typeof payload === "string" ? payload : JSON.stringify(payload));
    } else {
      console.warn("[WebSocket Client] ⚠️ No se puede enviar mensaje: socket no listo.");
    }
  }

  public subscribe(cb: (data: any) => void) {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  public onStatusChange(cb: (connected: boolean) => void) {
    this.statusListeners.add(cb);
    cb(this.isConnected());
    return () => this.statusListeners.delete(cb);
  }

  private notifyStatus(connected: boolean) {
    this.statusListeners.forEach((cb) => {
      try {
        cb(connected);
      } catch {}
    });
  }

  public isConnected(): boolean {
    return !!this.ws && this.ws.readyState === WebSocket.OPEN;
  }
}

export const websocketService = new WebSocketClientService();
