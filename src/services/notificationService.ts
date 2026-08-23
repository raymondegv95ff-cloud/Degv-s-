// Browser Notification Service using Web Notification API & Service Worker
import { NotificationSettings } from "../types";

export class NotificationService {
  private static settings: NotificationSettings = {
    messages: true,
    calls: true,
    aiActivity: true,
    sound: true,
  };

  // Debouncing tracking map per contact / room to prevent sound and notification spam in rapid succession
  private static lastContactNotificationTimestamps: Map<string, number> = new Map();
  private static readonly CONTACT_NOTIFICATION_DEBOUNCE_MS = 2500; // 2.5s debounce window per contact/conversation

  public static setSettings(newSettings: NotificationSettings) {
    this.settings = newSettings;
  }

  public static isSupported(): boolean {
    return typeof window !== "undefined" && "Notification" in window;
  }

  public static getPermissionState(): NotificationPermission | "unsupported" {
    if (!this.isSupported()) return "unsupported";
    return Notification.permission;
  }

  public static async requestPermission(): Promise<boolean> {
    if (!this.isSupported()) {
      console.warn("[NotificationService] Browser does not support Desktop/Mobile Notifications");
      return false;
    }

    if (Notification.permission === "granted") {
      return true;
    }

    if (Notification.permission !== "denied") {
      try {
        const permission = await Notification.requestPermission();
        return permission === "granted";
      } catch (e) {
        console.error("[NotificationService] Error requesting notification permission:", e);
        return false;
      }
    }

    return false;
  }

  /**
   * Check if a notification for a contact/room should proceed based on debouncing
   */
  public static canNotifyContact(contactKey: string, customWindowMs: number = this.CONTACT_NOTIFICATION_DEBOUNCE_MS): boolean {
    if (!contactKey) return true;
    const now = Date.now();
    const lastTime = this.lastContactNotificationTimestamps.get(contactKey) || 0;
    if (now - lastTime < customWindowMs) {
      return false;
    }
    return true;
  }

  /**
   * Record that a notification was just triggered for a contact/room
   */
  public static markContactNotified(contactKey: string): void {
    if (contactKey) {
      this.lastContactNotificationTimestamps.set(contactKey, Date.now());
    }
  }

  /**
   * Clear debouncing state for a contact/room or all
   */
  public static clearDebounce(contactKey?: string): void {
    if (contactKey) {
      this.lastContactNotificationTimestamps.delete(contactKey);
    } else {
      this.lastContactNotificationTimestamps.clear();
    }
  }

  public static async sendNotification(
    title: string,
    body: string,
    roomId?: string,
    type: "messages" | "calls" | "aiActivity" = "messages",
    senderId?: string
  ) {
    // Check user preference
    if (!this.settings[type]) return;

    // Contact/Conversation Debounce Filter: Prevents barrage of alerts from the same contact in a short window
    const debounceKey = senderId || roomId || title;
    if (!this.canNotifyContact(debounceKey)) {
      return;
    }
    this.markContactNotified(debounceKey);

    if (!this.isSupported() || Notification.permission !== "granted") {
      return;
    }

    // Trigger notification if app is hidden or blurred
    const shouldNotify = document.hidden || !document.hasFocus();
    if (!shouldNotify) return;

    try {
      // Prefer Service Worker Notification if registered (recommended for PWA)
      if ("serviceWorker" in navigator) {
        const reg = await navigator.serviceWorker.ready;
        if (reg && reg.showNotification) {
          await reg.showNotification(title, {
            body,
            icon: "/icon.svg",
            badge: "/favicon.svg",
            tag: roomId || "degvs-messenger",
            data: { url: roomId ? `/#room=${roomId}` : "/" },
          });
          return;
        }
      }

      // Fallback to classic browser Notification API
      const notif = new Notification(title, {
        body,
        icon: "/icon.svg",
        badge: "/favicon.svg",
        tag: roomId || "degvs-messenger",
      });

      notif.onclick = () => {
        window.focus();
        if (roomId) {
          window.location.hash = `#room=${roomId}`;
        }
        notif.close();
      };
    } catch (e) {
      console.error("[NotificationService] Error launching notification:", e);
    }
  }
}

export const notificationService = {
  isSupported: () => NotificationService.isSupported(),
  getPermissionState: () => NotificationService.getPermissionState(),
  requestPermission: () => NotificationService.requestPermission(),
  canNotifyContact: (contactKey: string, customWindowMs?: number) => NotificationService.canNotifyContact(contactKey, customWindowMs),
  markContactNotified: (contactKey: string) => NotificationService.markContactNotified(contactKey),
  clearDebounce: (contactKey?: string) => NotificationService.clearDebounce(contactKey),
  sendNotification: (
    title: string,
    body: string,
    roomId?: string,
    type?: "messages" | "calls" | "aiActivity",
    senderId?: string
  ) => NotificationService.sendNotification(title, body, roomId, type, senderId),
  setSettings: (s: NotificationSettings) => NotificationService.setSettings(s),
};
