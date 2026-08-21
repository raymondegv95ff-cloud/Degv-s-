// IndexedDB offline message queue & network connectivity auto-sync service
import { Message } from "../types";

const DB_NAME = "degvs_messenger_offline_db";
const DB_VERSION = 2; // Incremented for upgraded schema and clientMessageId indexing
const STORE_NAME = "offline_messages_queue";

export interface QueuedMessageItem {
  clientMessageId: string;
  messageId: string;
  conversationId: string;
  roomId: string;
  senderId: string;
  recipientId?: string;
  participants: string[];
  type: string;
  text?: string;
  content?: string;
  attachment?: {
    url: string;
    name?: string;
    mimeType?: string;
    size?: number;
  };
  mediaUrl?: string;
  replyTo?: string | null;
  replyToSnippet?: any;
  poll?: any;
  message: Message;
  createdAt: number;
  retryCount: number;
  lastError?: string;
  status: "pending" | "sending" | "failed";
}

class IndexedDbQueueService {
  private dbPromise: Promise<IDBDatabase> | null = null;
  private isOnlineState: boolean = typeof navigator !== "undefined" ? navigator.onLine : true;
  private listeners: Set<(isOnline: boolean, queuedCount: number) => void> = new Set();

  constructor() {
    if (typeof window !== "undefined") {
      this.initNetworkListeners();
      this.initDB().catch((err) => {
        console.warn("[Messenger][QUEUE] IndexedDB initialization notice:", err);
      });
    }
  }

  private initDB(): Promise<IDBDatabase> {
    if (!this.dbPromise) {
      this.dbPromise = new Promise((resolve, reject) => {
        if (typeof window === "undefined" || !window.indexedDB) {
          reject(new Error("IndexedDB is not supported"));
          return;
        }

        const request = window.indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
          const db = (event.target as IDBOpenDBRequest).result;
          let store: IDBObjectStore;

          if (!db.objectStoreNames.contains(STORE_NAME)) {
            store = db.createObjectStore(STORE_NAME, { keyPath: "clientMessageId" });
          } else {
            store = (event.target as any).transaction.objectStore(STORE_NAME);
          }

          if (!store.indexNames.contains("conversationId")) {
            store.createIndex("conversationId", "conversationId", { unique: false });
          }
          if (!store.indexNames.contains("roomId")) {
            store.createIndex("roomId", "roomId", { unique: false });
          }
          if (!store.indexNames.contains("createdAt")) {
            store.createIndex("createdAt", "createdAt", { unique: false });
          }
          if (!store.indexNames.contains("status")) {
            store.createIndex("status", "status", { unique: false });
          }
        };

        request.onsuccess = () => {
          resolve(request.result);
        };

        request.onerror = () => {
          console.error("[Messenger][QUEUE] IndexedDB open error:", request.error);
          reject(request.error);
        };
      });
    }
    return this.dbPromise;
  }

  private initNetworkListeners() {
    window.addEventListener("online", () => {
      console.log("[Messenger][QUEUE] 🌐 Conectividad RESTABLECIDA (online event).");
      this.isOnlineState = true;
      this.notifyListeners();
    });

    window.addEventListener("offline", () => {
      console.log("[Messenger][QUEUE] 🔌 Conectividad PERDIDA (offline event).");
      this.isOnlineState = false;
      this.notifyListeners();
    });
  }

  public isOnline(): boolean {
    return typeof navigator !== "undefined" ? navigator.onLine && this.isOnlineState : true;
  }

  public subscribe(callback: (isOnline: boolean, queuedCount: number) => void) {
    this.listeners.add(callback);
    this.getQueueCount().then((count) => callback(this.isOnline(), count));
    return () => {
      this.listeners.delete(callback);
    };
  }

  private async notifyListeners() {
    const count = await this.getQueueCount();
    this.listeners.forEach((cb) => cb(this.isOnline(), count));
  }

  /**
   * Enqueue a message when offline or when network write fails
   */
  public async enqueueMessage(
    conversationId: string,
    message: Message,
    rawPayload?: any
  ): Promise<void> {
    const clientMessageId = message.clientMessageId || `${crypto.randomUUID ? crypto.randomUUID() : Date.now()}-${Date.now()}`;
    const item: QueuedMessageItem = {
      clientMessageId,
      messageId: message.id,
      conversationId: conversationId || message.roomId,
      roomId: message.roomId || conversationId,
      senderId: message.senderId,
      recipientId: message.recipientId || message.receiverId,
      participants: message.participants || [message.senderId],
      type: message.type || "text",
      text: message.text || message.content,
      content: message.content || message.text,
      attachment: message.attachment,
      mediaUrl: message.mediaUrl,
      replyTo: message.replyTo,
      replyToSnippet: message.replyToSnippet,
      poll: message.poll,
      message: {
        ...message,
        clientMessageId,
        status: "pending",
      },
      createdAt: message.timestamp || Date.now(),
      retryCount: 0,
      status: "pending",
    };

    console.log(`[Messenger][QUEUE] 📥 Enqueueing message into IndexedDB: [${clientMessageId}] for conv '${conversationId}'`);

    try {
      const db = await this.initDB();
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);

      store.put(item);

      await new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });

      this.notifyListeners();
    } catch (err) {
      console.warn("[Messenger][QUEUE] Failed to enqueue to IndexedDB, fallback to localStorage:", err);
      try {
        const raw = localStorage.getItem("degvs_offline_queue_fallback") || "[]";
        const list = JSON.parse(raw).filter((x: any) => x.clientMessageId !== clientMessageId);
        list.push(item);
        localStorage.setItem("degvs_offline_queue_fallback", JSON.stringify(list));
        this.notifyListeners();
      } catch {}
    }
  }

  /**
   * Get all queued messages sorted chronologically
   */
  public async getQueuedMessages(): Promise<QueuedMessageItem[]> {
    try {
      const db = await this.initDB();
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const request = store.getAll();

      const items = await new Promise<QueuedMessageItem[]>((resolve, reject) => {
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
      });

      return items.sort((a, b) => a.createdAt - b.createdAt);
    } catch {
      try {
        const raw = localStorage.getItem("degvs_offline_queue_fallback") || "[]";
        const list: QueuedMessageItem[] = JSON.parse(raw);
        return list.sort((a, b) => a.createdAt - b.createdAt);
      } catch {
        return [];
      }
    }
  }

  /**
   * Get count of queued items
   */
  public async getQueueCount(): Promise<number> {
    try {
      const items = await this.getQueuedMessages();
      return items.length;
    } catch {
      return 0;
    }
  }

  /**
   * Update retry count and error on a queued item
   */
  public async updateRetryState(
    clientMessageId: string,
    retryCount: number,
    lastError?: string
  ): Promise<void> {
    try {
      const db = await this.initDB();
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const getReq = store.get(clientMessageId);

      getReq.onsuccess = () => {
        if (getReq.result) {
          const updated: QueuedMessageItem = {
            ...getReq.result,
            retryCount,
            lastError,
            status: retryCount > 5 ? "failed" : "pending",
          };
          store.put(updated);
        }
      };

      await new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch (err) {
      console.warn("[Messenger][QUEUE] Notice updating retry state:", err);
    }
  }

  /**
   * Remove message from queue ONLY after Firestore confirmation
   */
  public async removeQueuedMessage(clientMessageId: string): Promise<void> {
    console.log(`[Messenger][QUEUE] 🗑️ Removing confirmed message [${clientMessageId}] from IndexedDB.`);
    try {
      const db = await this.initDB();
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      store.delete(clientMessageId);

      await new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });

      // Also clean up fallback storage
      try {
        const raw = localStorage.getItem("degvs_offline_queue_fallback");
        if (raw) {
          const list = JSON.parse(raw).filter((item: any) => item.clientMessageId !== clientMessageId && item.messageId !== clientMessageId);
          localStorage.setItem("degvs_offline_queue_fallback", JSON.stringify(list));
        }
      } catch {}

      this.notifyListeners();
    } catch (err) {
      console.warn("[Messenger][QUEUE] Failed to delete queued message from IndexedDB:", err);
    }
  }

  /**
   * Clear entire queue (manual debug or account wipe)
   */
  public async clearQueue(): Promise<void> {
    try {
      const db = await this.initDB();
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      store.clear();
      localStorage.removeItem("degvs_offline_queue_fallback");
      this.notifyListeners();
    } catch (err) {
      console.warn("[Messenger][QUEUE] Failed to clear queue:", err);
    }
  }

  /**
   * Synchronize all pending messages with exponential backoff
   * ONLY removes an item if sendHandler returns true!
   */
  public async syncQueue(
    sendHandler: (item: QueuedMessageItem) => Promise<boolean>
  ): Promise<{ syncedCount: number; failedCount: number }> {
    if (!this.isOnline()) {
      console.log("[Messenger][QUEUE] ⏳ syncQueue skipped: device is currently offline.");
      return { syncedCount: 0, failedCount: 0 };
    }

    const queue = await this.getQueuedMessages();
    if (queue.length === 0) return { syncedCount: 0, failedCount: 0 };

    console.log(`[Messenger][QUEUE] 🔄 Starting syncQueue process for ${queue.length} pending offline messages.`);

    let syncedCount = 0;
    let failedCount = 0;

    for (const item of queue) {
      // Exponential backoff delay calculation: 1s, 2s, 4s, 8s, 16s, 32s (max 32s)
      const backoffMs = Math.min(1000 * Math.pow(2, item.retryCount || 0), 32000);
      if (item.retryCount > 0) {
        console.log(`[Messenger][QUEUE] ⏱️ Backoff delay: waiting ${backoffMs}ms before retrying [${item.clientMessageId}] (attempt ${item.retryCount + 1})...`);
        await new Promise((r) => setTimeout(r, Math.min(backoffMs, 2000))); // Quick sleep during batch loop
      }

      try {
        const confirmed = await sendHandler(item);
        if (confirmed) {
          await this.removeQueuedMessage(item.clientMessageId);
          syncedCount++;
          console.log(`[Messenger][QUEUE] ✅ Message [${item.clientMessageId}] successfully sent to Firestore and removed from queue.`);
        } else {
          await this.updateRetryState(item.clientMessageId, (item.retryCount || 0) + 1, "Failed to confirm in Firestore");
          failedCount++;
        }
      } catch (err: any) {
        console.error(`[Messenger][QUEUE] ❌ Error syncing queued message [${item.clientMessageId}]:`, err);
        await this.updateRetryState(item.clientMessageId, (item.retryCount || 0) + 1, err.message || "Network error");
        failedCount++;
      }
    }

    this.notifyListeners();
    return { syncedCount, failedCount };
  }
}

export const indexedDbQueueService = new IndexedDbQueueService();
