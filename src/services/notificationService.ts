// Browser Notification Service using Web Notification API & Service Worker
import { NotificationSettings } from "../types";

export class NotificationService {
  private static settings: NotificationSettings = {
    messages: true,
    calls: true,
    aiActivity: true,
    sound: true,
  };

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

  public static async sendNotification(
    title: string,
    body: string,
    roomId?: string,
    type: "messages" | "calls" | "aiActivity" = "messages"
  ) {
    // Check user preference
    if (!this.settings[type]) return;

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
  sendNotification: (
    title: string,
    body: string,
    roomId?: string,
    type?: "messages" | "calls" | "aiActivity"
  ) => NotificationService.sendNotification(title, body, roomId, type),
  setSettings: (s: NotificationSettings) => NotificationService.setSettings(s),
};
