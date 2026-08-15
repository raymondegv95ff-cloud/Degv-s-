// IndexedDB offline message queue & network connectivity auto-sync service
import { Message } from "../types";

const DB_NAME = "degvs_messenger_offline_db";
const DB_VERSION = 1;
const STORE_NAME = "offline_messages_queue";

export interface QueuedMessageItem {
  messageId: string;
  roomId: string;
  message: Message;
  queuedAt: number;
  retryCount: number;
}

class IndexedDbQueueService {
  private dbPromise: Promise<IDBDatabase> | null = null;
  private isOnlineState: boolean = typeof navigator !== "undefined" ? navigator.onLine : true;
  private listeners: Set<(isOnline: boolean, queuedCount: number) => void> = new Set();

  constructor() {
    if (typeof window !== "undefined") {
      this.initNetworkListeners();
      this.initDB();
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
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            const store = db.createObjectStore(STORE_NAME, { keyPath: "messageId" });
            store.createIndex("roomId", "roomId", { unique: false });
            store.createIndex("queuedAt", "queuedAt", { unique: false });
          }
        };

        request.onsuccess = () => {
          resolve(request.result);
        };

        request.onerror = () => {
          console.error("IndexedDB open error:", request.error);
          reject(request.error);
        };
      });
    }
    return this.dbPromise;
  }

  private initNetworkListeners() {
    window.addEventListener("online", () => {
      this.isOnlineState = true;
      this.notifyListeners();
    });

    window.addEventListener("offline", () => {
      this.isOnlineState = false;
      this.notifyListeners();
    });
  }

  public isOnline(): boolean {
    return this.isOnlineState;
  }

  public subscribe(callback: (isOnline: boolean, queuedCount: number) => void) {
    this.listeners.add(callback);
    this.getQueueCount().then((count) => callback(this.isOnlineState, count));
    return () => {
      this.listeners.delete(callback);
    };
  }

  private async notifyListeners() {
    const count = await this.getQueueCount();
    this.listeners.forEach((cb) => cb(this.isOnlineState, count));
  }

  // Enqueue a message when offline or when sending fails
  public async enqueueMessage(roomId: string, message: Message): Promise<void> {
    try {
      const db = await this.initDB();
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);

      const item: QueuedMessageItem = {
        messageId: message.id,
        roomId,
        message: {
          ...message,
          status: "sending",
        },
        queuedAt: Date.now(),
        retryCount: 0,
      };

      store.put(item);

      await new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });

      this.notifyListeners();
    } catch (err) {
      console.warn("Failed to enqueue message to IndexedDB, fallback to localStorage:", err);
      try {
        const raw = localStorage.getItem("degvs_offline_queue_fallback") || "[]";
        const list = JSON.parse(raw);
        list.push({ messageId: message.id, roomId, message, queuedAt: Date.now() });
        localStorage.setItem("degvs_offline_queue_fallback", JSON.stringify(list));
      } catch {}
    }
  }

  // Get all queued messages
  public async getQueuedMessages(): Promise<QueuedMessageItem[]> {
    try {
      const db = await this.initDB();
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const request = store.getAll();

      return await new Promise<QueuedMessageItem[]>((resolve, reject) => {
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
      });
    } catch {
      try {
        const raw = localStorage.getItem("degvs_offline_queue_fallback") || "[]";
        return JSON.parse(raw);
      } catch {
        return [];
      }
    }
  }

  // Get count of queued items
  public async getQueueCount(): Promise<number> {
    try {
      const items = await this.getQueuedMessages();
      return items.length;
    } catch {
      return 0;
    }
  }

  // Remove message from queue once synchronized
  public async removeQueuedMessage(messageId: string): Promise<void> {
    try {
      const db = await this.initDB();
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      store.delete(messageId);

      await new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });

      // Also clean up fallback storage
      try {
        const raw = localStorage.getItem("degvs_offline_queue_fallback");
        if (raw) {
          const list = JSON.parse(raw).filter((item: any) => item.messageId !== messageId);
          localStorage.setItem("degvs_offline_queue_fallback", JSON.stringify(list));
        }
      } catch {}

      this.notifyListeners();
    } catch (err) {
      console.warn("Failed to delete queued message from IndexedDB:", err);
    }
  }

  // Clear entire queue
  public async clearQueue(): Promise<void> {
    try {
      const db = await this.initDB();
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      store.clear();
      localStorage.removeItem("degvs_offline_queue_fallback");
      this.notifyListeners();
    } catch (err) {
      console.warn("Failed to clear queue:", err);
    }
  }

  // Synchronize all pending messages once connection is online
  public async syncQueue(
    onSendMessage: (item: QueuedMessageItem) => Promise<boolean>
  ): Promise<{ syncedCount: number; failedCount: number }> {
    const queue = await this.getQueuedMessages();
    if (queue.length === 0) return { syncedCount: 0, failedCount: 0 };

    let syncedCount = 0;
    let failedCount = 0;

    for (const item of queue) {
      try {
        const ok = await onSendMessage(item);
        if (ok) {
          await this.removeQueuedMessage(item.messageId);
          syncedCount++;
        } else {
          failedCount++;
        }
      } catch (err) {
        console.error("Error syncing queued message:", item.messageId, err);
        failedCount++;
      }
    }

    return { syncedCount, failedCount };
  }
}

export const indexedDbQueueService = new IndexedDbQueueService();
