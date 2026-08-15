// Media Storage & Cleanup Service via IndexedDB and local storage cache
import { Message, Room } from "../types";
import { StorageService } from "./storageService";

const MEDIA_DB_NAME = "degvs_messenger_offline_db";
const MEDIA_STORE_NAME = "degvs_media_files";
const MEDIA_DB_VERSION = 2; // Incremented to add media store

export interface MediaFileItem {
  id: string;
  messageId: string;
  roomId: string;
  chatName: string;
  senderName: string;
  type: "image" | "audio" | "video" | "file" | "sticker";
  url: string;
  timestamp: number;
  dateStr: string;
  sizeBytes: number;
  sizeFormatted: string;
  ageDays: number;
}

export interface StorageBreakdown {
  totalBytes: number;
  totalFormatted: string;
  imageBytes: number;
  imageCount: number;
  audioBytes: number;
  audioCount: number;
  videoBytes: number;
  videoCount: number;
  fileBytes: number;
  fileCount: number;
  stickerBytes: number;
  stickerCount: number;
  totalCount: number;
}

class MediaStorageService {
  private dbPromise: Promise<IDBDatabase> | null = null;

  private initDB(): Promise<IDBDatabase> {
    if (!this.dbPromise) {
      this.dbPromise = new Promise((resolve, reject) => {
        if (typeof window === "undefined" || !window.indexedDB) {
          reject(new Error("IndexedDB not supported"));
          return;
        }

        const request = window.indexedDB.open(MEDIA_DB_NAME, MEDIA_DB_VERSION);

        request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
          const db = (event.target as IDBOpenDBRequest).result;
          // Ensure offline messages queue exists
          if (!db.objectStoreNames.contains("offline_messages_queue")) {
            const queueStore = db.createObjectStore("offline_messages_queue", { keyPath: "messageId" });
            queueStore.createIndex("roomId", "roomId", { unique: false });
            queueStore.createIndex("queuedAt", "queuedAt", { unique: false });
          }
          // Ensure media files store exists
          if (!db.objectStoreNames.contains(MEDIA_STORE_NAME)) {
            const mediaStore = db.createObjectStore(MEDIA_STORE_NAME, { keyPath: "id" });
            mediaStore.createIndex("type", "type", { unique: false });
            mediaStore.createIndex("roomId", "roomId", { unique: false });
            mediaStore.createIndex("timestamp", "timestamp", { unique: false });
          }
        };

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    }
    return this.dbPromise;
  }

  /**
   * Approximate size in bytes of a URL, base64 data URL or text snippet
   */
  public estimateSize(url?: string, content?: string): number {
    let size = 0;
    if (url) {
      if (url.startsWith("data:")) {
        // Base64 size estimation
        const base64Str = url.split(",")[1] || "";
        size += Math.round((base64Str.length * 3) / 4);
      } else {
        // Mock / remote URL size estimate: image ~ 450KB, audio ~ 220KB, video ~ 1.8MB, file ~ 300KB
        size += 150 * 1024;
      }
    }
    if (content) {
      size += content.length * 2;
    }
    return Math.max(size, 1024); // at least 1KB
  }

  public formatBytes(bytes: number): string {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  }

  /**
   * Scans all messages and IndexedDB to retrieve all stored media files
   */
  public async scanMediaFiles(): Promise<MediaFileItem[]> {
    const allMsgsMap = StorageService.getAllMessagesMap();
    const rooms = StorageService.getRooms();
    const roomNamesMap: Record<string, string> = {};
    rooms.forEach((r) => {
      roomNamesMap[r.id] = r.name;
    });

    const mediaList: MediaFileItem[] = [];
    const now = Date.now();

    // Iterate over all rooms and messages
    Object.entries(allMsgsMap).forEach(([roomId, msgs]) => {
      if (!Array.isArray(msgs)) return;

      msgs.forEach((m) => {
        const isMedia =
          m.type === "image" ||
          m.type === "audio" ||
          m.type === "video" ||
          m.type === "file" ||
          m.type === "sticker" ||
          (m.mediaUrl && !m.mediaUrl.startsWith("purged_"));

        if (isMedia && m.mediaUrl && !m.mediaUrl.startsWith("purged_")) {
          const timestamp = m.timestamp || now;
          const ageMs = Math.max(0, now - timestamp);
          const ageDays = Math.floor(ageMs / (1000 * 60 * 60 * 24));
          const sizeBytes = this.estimateSize(m.mediaUrl, m.content);

          mediaList.push({
            id: `media_${m.id}`,
            messageId: m.id,
            roomId: m.roomId || roomId,
            chatName: roomNamesMap[m.roomId || roomId] || "Chat",
            senderName: m.senderName || "Usuario",
            type: m.type as any,
            url: m.mediaUrl,
            timestamp,
            dateStr: new Date(timestamp).toLocaleDateString("es-ES", {
              day: "numeric",
              month: "short",
              year: "numeric",
            }),
            sizeBytes,
            sizeFormatted: this.formatBytes(sizeBytes),
            ageDays,
          });
        }
      });
    });

    // Also sync and store in IndexedDB media store for persistent tracking
    try {
      const db = await this.initDB();
      if (db.objectStoreNames.contains(MEDIA_STORE_NAME)) {
        const tx = db.transaction(MEDIA_STORE_NAME, "readwrite");
        const store = tx.objectStore(MEDIA_STORE_NAME);
        for (const item of mediaList) {
          store.put(item);
        }
      }
    } catch (e) {
      console.warn("IndexedDB media sync notice:", e);
    }

    // Sort newest to oldest
    return mediaList.sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Calculates overall storage breakdown
   */
  public calculateBreakdown(files: MediaFileItem[]): StorageBreakdown {
    let totalBytes = 0;
    let imageBytes = 0;
    let imageCount = 0;
    let audioBytes = 0;
    let audioCount = 0;
    let videoBytes = 0;
    let videoCount = 0;
    let fileBytes = 0;
    let fileCount = 0;
    let stickerBytes = 0;
    let stickerCount = 0;

    files.forEach((f) => {
      totalBytes += f.sizeBytes;
      if (f.type === "image") {
        imageBytes += f.sizeBytes;
        imageCount++;
      } else if (f.type === "audio") {
        audioBytes += f.sizeBytes;
        audioCount++;
      } else if (f.type === "video") {
        videoBytes += f.sizeBytes;
        videoCount++;
      } else if (f.type === "file") {
        fileBytes += f.sizeBytes;
        fileCount++;
      } else if (f.type === "sticker") {
        stickerBytes += f.sizeBytes;
        stickerCount++;
      }
    });

    return {
      totalBytes,
      totalFormatted: this.formatBytes(totalBytes),
      imageBytes,
      imageCount,
      audioBytes,
      audioCount,
      videoBytes,
      videoCount,
      fileBytes,
      fileCount,
      stickerBytes,
      stickerCount,
      totalCount: files.length,
    };
  }

  /**
   * Delete specific media items from IndexedDB and clean the heavy media from message cache
   */
  public async deleteMediaItems(itemsToDelete: MediaFileItem[]): Promise<{ freedBytes: number; freedFormatted: string; count: number }> {
    if (!itemsToDelete || itemsToDelete.length === 0) {
      return { freedBytes: 0, freedFormatted: "0 B", count: 0 };
    }

    let freedBytes = 0;
    const targetMessageIds = new Set(itemsToDelete.map((i) => i.messageId));
    itemsToDelete.forEach((i) => {
      freedBytes += i.sizeBytes;
    });

    // 1. Remove from IndexedDB
    try {
      const db = await this.initDB();
      if (db.objectStoreNames.contains(MEDIA_STORE_NAME)) {
        const tx = db.transaction(MEDIA_STORE_NAME, "readwrite");
        const store = tx.objectStore(MEDIA_STORE_NAME);
        for (const item of itemsToDelete) {
          store.delete(item.id);
        }
      }
    } catch (e) {
      console.warn("IndexedDB delete notice:", e);
    }

    // 2. Clean message media in StorageService & localStorage
    const allMsgsMap = StorageService.getAllMessagesMap();
    let modified = false;

    Object.entries(allMsgsMap).forEach(([roomId, msgs]) => {
      if (!Array.isArray(msgs)) return;

      const updated = msgs.map((m) => {
        if (targetMessageIds.has(m.id)) {
          modified = true;
          return {
            ...m,
            mediaUrl: "purged_to_save_space",
            content: m.content ? `${m.content} (Archivo multimedia eliminado para ahorrar espacio)` : "(Archivo multimedia eliminado para ahorrar espacio)",
          };
        }
        return m;
      });

      if (modified) {
        allMsgsMap[roomId] = updated;
      }
    });

    if (modified) {
      StorageService.saveAllMessagesMap(allMsgsMap);
    }

    return {
      freedBytes,
      freedFormatted: this.formatBytes(freedBytes),
      count: itemsToDelete.length,
    };
  }

  /**
   * Delete all media older than a given number of days (e.g. 7, 30)
   */
  public async deleteOlderThanDays(days: number): Promise<{ freedBytes: number; freedFormatted: string; count: number }> {
    const allFiles = await this.scanMediaFiles();
    const olderFiles = allFiles.filter((f) => f.ageDays >= days);
    return this.deleteMediaItems(olderFiles);
  }

  /**
   * Delete all media of a specific type (e.g. audio notes, images)
   */
  public async deleteByType(type: "image" | "audio" | "video" | "file" | "sticker"): Promise<{ freedBytes: number; freedFormatted: string; count: number }> {
    const allFiles = await this.scanMediaFiles();
    const targetFiles = allFiles.filter((f) => f.type === type);
    return this.deleteMediaItems(targetFiles);
  }

  /**
   * Complete media wipe: removes all cached media files
   */
  public async clearAllMedia(): Promise<{ freedBytes: number; freedFormatted: string; count: number }> {
    const allFiles = await this.scanMediaFiles();
    return this.deleteMediaItems(allFiles);
  }
}

export const mediaStorageService = new MediaStorageService();
