import { Room, Message, UserProfile, ThemeMode, BubbleStyle, NotificationSettings, UserStatusItem, SoundCustomizationSettings, CustomSoundItem, AccentColorOption, CacheStats, DayNightPaletteSettings, QuickReplyItem, AutoPurgeConfig, AutoPurgeReport } from "../types";
import { aiAssistantUser, createDefaultRoomsForUser, createDefaultMessagesForUser, mockUsersList } from "./mockData";

const STORAGE_KEYS = {
  USER: "degvs_messenger_user",
  ROOMS: "degvs_messenger_rooms",
  MESSAGES: "degvs_messenger_messages",
  THEME: "degvs_messenger_theme",
  BUBBLE_STYLE: "degvs_messenger_bubble_style",
  VAULT_PIN: "degvs_messenger_vault_pin",
  SUPABASE_CONFIG: "degvs_messenger_supabase",
  NOTIFICATION_SETTINGS: "degvs_messenger_notif_settings",
  LANGUAGE: "degvs_messenger_lang",
  SOUND_MUTED: "degvs_messenger_sound_muted",
  SOUND_SETTINGS: "degvs_messenger_sound_settings",
  STATUSES: "degvs_messenger_statuses",
  FOLDERS: "degvs_messenger_folders",
  READ_RECEIPTS: "degvs_messenger_read_receipts",
  FONT: "degvs_messenger_font",
  ACCENT_COLOR: "degvs_messenger_accent_color",
  AUTO_TIME_PALETTE: "degvs_messenger_auto_time_palette",
  ACCENT_COLOR_LIGHT: "degvs_messenger_accent_color_light",
  ACCENT_COLOR_DARK: "degvs_messenger_accent_color_dark",
  CONTACTS: "degvs_messenger_contacts",
  CALL_LOGS: "degvs_messenger_call_logs",
  CUSTOM_STICKERS: "degvs_messenger_custom_stickers",
  CACHE_METADATA: "degvs_messenger_cache_metadata",
  QUICK_REPLIES: "degvs_messenger_quick_replies",
  AUTO_PURGE_CONFIG: "degvs_messenger_auto_purge_config",
  LAST_AUTO_PURGE_REPORT: "degvs_messenger_last_auto_purge_report",
  MUTED_ROOMS: "degvs_messenger_muted_rooms",
};


// Broadcast channel for multi-tab real-time sync
const syncChannel = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel("degvs_messenger_sync") : null;

export const ACCENT_COLOR_MAP: Record<AccentColorOption, { name: string; hex: string; rgb: string; border: string; glow: string }> = {
  emerald: { name: "Verde Neón", hex: "#00E676", rgb: "0, 230, 118", border: "#00E676", glow: "rgba(0, 230, 118, 0.4)" },
  cyan: { name: "Cian Ciber", hex: "#00E5FF", rgb: "0, 229, 255", border: "#00E5FF", glow: "rgba(0, 229, 255, 0.4)" },
  purple: { name: "Púrpura Neón", hex: "#A855F7", rgb: "168, 85, 247", border: "#A855F7", glow: "rgba(168, 85, 247, 0.4)" },
  pink: { name: "Rosa Ciber", hex: "#EC4899", rgb: "236, 72, 153", border: "#EC4899", glow: "rgba(236, 72, 153, 0.4)" },
  amber: { name: "Dorado Cálido", hex: "#F59E0B", rgb: "245, 158, 11", border: "#F59E0B", glow: "rgba(245, 158, 11, 0.4)" },
  blue: { name: "Azul Eléctrico", hex: "#3B82F6", rgb: "59, 130, 246", border: "#3B82F6", glow: "rgba(59, 130, 246, 0.4)" },
  red: { name: "Rojo Neón", hex: "#FF2A6D", rgb: "255, 42, 109", border: "#FF2A6D", glow: "rgba(255, 42, 109, 0.4)" },
};

export class StorageService {
  private static roomsCache: Room[] | null = null;
  private static messagesCache: Record<string, Message[]> | null = null;
  private static lastCacheSync: number = Date.now();

  // Helper to get user-scoped storage key
  private static getUserRoomsKey(userId?: string): string {
    const uid = userId || this.getCurrentUser()?.id;
    return uid ? `${STORAGE_KEYS.ROOMS}_${uid}` : `${STORAGE_KEYS.ROOMS}_guest`;
  }

  private static getUserMessagesKey(userId?: string): string {
    const uid = userId || this.getCurrentUser()?.id;
    return uid ? `${STORAGE_KEYS.MESSAGES}_${uid}` : `${STORAGE_KEYS.MESSAGES}_guest`;
  }

  private static getUserContactsKey(userId?: string): string {
    const uid = userId || this.getCurrentUser()?.id;
    return uid ? `${STORAGE_KEYS.CONTACTS}_${uid}` : `${STORAGE_KEYS.CONTACTS}_guest`;
  }

  private static getUserStatusesKey(userId?: string): string {
    const uid = userId || this.getCurrentUser()?.id;
    return uid ? `${STORAGE_KEYS.STATUSES}_${uid}` : `${STORAGE_KEYS.STATUSES}_guest`;
  }

  // Initialize storage defaults if empty and warm up memory cache
  public static init() {
    if (!localStorage.getItem(STORAGE_KEYS.AUTO_TIME_PALETTE)) {
      localStorage.setItem(STORAGE_KEYS.AUTO_TIME_PALETTE, "true");
    }
    if (!localStorage.getItem(STORAGE_KEYS.ACCENT_COLOR_LIGHT)) {
      localStorage.setItem(STORAGE_KEYS.ACCENT_COLOR_LIGHT, "cyan");
    }
    if (!localStorage.getItem(STORAGE_KEYS.ACCENT_COLOR_DARK)) {
      localStorage.setItem(STORAGE_KEYS.ACCENT_COLOR_DARK, "emerald");
    }

    // Warm up in-memory cache for instant zero-latency access
    this.warmCache();
  }

  private static warmCache() {
    try {
      const user = this.getCurrentUser();
      const defaultRooms = createDefaultRoomsForUser(user);
      const defaultMessages = createDefaultMessagesForUser(user);

      if (!this.roomsCache) {
        const roomsKey = this.getUserRoomsKey(user?.id);
        const roomsRaw = localStorage.getItem(roomsKey);
        this.roomsCache = roomsRaw ? JSON.parse(roomsRaw) : defaultRooms;
      }
      if (!this.messagesCache) {
        const msgsKey = this.getUserMessagesKey(user?.id);
        const msgsRaw = localStorage.getItem(msgsKey);
        this.messagesCache = msgsRaw ? JSON.parse(msgsRaw) : defaultMessages;
      }
      this.lastCacheSync = Date.now();
    } catch {
      const user = this.getCurrentUser();
      this.roomsCache = createDefaultRoomsForUser(user);
      this.messagesCache = createDefaultMessagesForUser(user);
    }
  }

  // Instant Offline Cache Metrics
  public static getCacheStats(): CacheStats {
    this.warmCache();
    const rooms = this.getRooms();
    const allMsgs = this.getAllMessagesMap();
    let totalMessages = 0;
    Object.values(allMsgs).forEach((list) => {
      totalMessages += Array.isArray(list) ? list.length : 0;
    });

    let sizeKb = 0;
    try {
      const msgsKey = this.getUserMessagesKey();
      const msgsRaw = localStorage.getItem(msgsKey) || "";
      const roomsKey = this.getUserRoomsKey();
      const roomsRaw = localStorage.getItem(roomsKey) || "";
      sizeKb = Math.round((msgsRaw.length + roomsRaw.length) / 1024);
    } catch {}

    return {
      totalRooms: rooms.length,
      totalMessages,
      lastUpdated: this.lastCacheSync,
      isReady: true,
      cacheSizeKb: sizeKb,
    };
  }

  public static isRoomCached(roomId: string): boolean {
    this.warmCache();
    return !!(this.messagesCache && this.messagesCache[roomId] && this.messagesCache[roomId].length > 0);
  }

  public static getRoomCachedCount(roomId: string): number {
    this.warmCache();
    return (this.messagesCache && this.messagesCache[roomId]) ? this.messagesCache[roomId].length : 0;
  }

  public static onSync(callback: () => void) {
    if (syncChannel) {
      syncChannel.onmessage = (event) => {
        if (event.data?.type === "SYNC") {
          this.roomsCache = null;
          this.messagesCache = null;
          callback();
        }
      };
    }
  }

  public static notifySync() {
    if (syncChannel) {
      syncChannel.postMessage({ type: "SYNC", timestamp: Date.now() });
    }
  }

  // User Auth - Return null if no user is authenticated
  public static getCurrentUser(): UserProfile | null {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.USER);
      if (!data) return null;
      const parsed = JSON.parse(data);
      if (parsed && typeof parsed === "object" && parsed.id) {
        return parsed;
      }
      return null;
    } catch {
      return null;
    }
  }

  public static setCurrentUser(user: UserProfile | null) {
    if (user && user.id) {
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
      this.roomsCache = null;
      this.messagesCache = null;
      this.notifySync();
    } else {
      localStorage.removeItem(STORAGE_KEYS.USER);
      this.roomsCache = null;
      this.messagesCache = null;
      this.notifySync();
    }
  }

  public static logout() {
    localStorage.removeItem(STORAGE_KEYS.USER);
    this.roomsCache = null;
    this.messagesCache = null;
    this.notifySync();
  }

  // Users Directory
  public static getAllUsers(): UserProfile[] {
    const me = this.getCurrentUser();
    let customContacts: UserProfile[] = [];
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CONTACTS);
      if (saved) customContacts = JSON.parse(saved);
    } catch {}

    const allMap = new Map<string, UserProfile>();
    if (me && me.id) allMap.set(me.id, me);
    allMap.set(aiAssistantUser.id, aiAssistantUser);
    customContacts.forEach((u) => {
      if (u && u.id) allMap.set(u.id, u);
    });

    return Array.from(allMap.values());
  }

  // Rooms
  public static getRooms(): Room[] {
    const user = this.getCurrentUser();
    const defaultRooms = createDefaultRoomsForUser(user);

    try {
      const roomsKey = this.getUserRoomsKey(user?.id);
      const data = localStorage.getItem(roomsKey);
      if (!data) return defaultRooms;
      const rooms: Room[] = JSON.parse(data);
      if (Array.isArray(rooms) && rooms.length > 0) {
        // Ensure only rooms matching this user or AI chat are returned
        const filtered = rooms.filter((r) => {
          if (!r) return false;
          if (r.id === "room_ai_assistant" || r.isAiChat) return true;
          if (!user) return false;
          return r.participants?.some((p) => {
            const pid = typeof p === "string" ? p : p?.id;
            return pid === user.id;
          });
        });
        return filtered.length > 0 ? filtered : defaultRooms;
      }
      return defaultRooms;
    } catch {
      return defaultRooms;
    }
  }

  public static saveRooms(rooms: Room[]) {
    const user = this.getCurrentUser();
    const roomsKey = this.getUserRoomsKey(user?.id);
    this.roomsCache = rooms;
    localStorage.setItem(roomsKey, JSON.stringify(rooms));
    this.notifySync();
  }

  // Room Mute Status (Individual Conversation Sound Control)
  public static getMutedRooms(): string[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.MUTED_ROOMS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  public static isRoomMuted(roomId: string): boolean {
    if (!roomId) return false;
    const mutedRooms = this.getMutedRooms();
    if (mutedRooms.includes(roomId)) return true;
    const rooms = this.getRooms();
    const room = rooms.find((r) => r.id === roomId);
    return !!room?.isMuted;
  }

  public static setRoomMuted(roomId: string, muted: boolean): void {
    if (!roomId) return;
    const mutedRooms = this.getMutedRooms();
    let updatedMutedList: string[];
    if (muted) {
      updatedMutedList = Array.from(new Set([...mutedRooms, roomId]));
    } else {
      updatedMutedList = mutedRooms.filter((id) => id !== roomId);
    }
    localStorage.setItem(STORAGE_KEYS.MUTED_ROOMS, JSON.stringify(updatedMutedList));

    // Update in cached rooms
    const rooms = this.getRooms();
    const updatedRooms = rooms.map((r) => (r.id === roomId ? { ...r, isMuted: muted } : r));
    this.saveRooms(updatedRooms);
  }

  public static toggleRoomMute(roomId: string): boolean {
    const isCurrentlyMuted = this.isRoomMuted(roomId);
    const nextState = !isCurrentlyMuted;
    this.setRoomMuted(roomId, nextState);
    return nextState;
  }

  public static saveRoomDraft(roomId: string, draftText: string) {
    const rooms = this.getRooms();
    const updated = rooms.map(r => r.id === roomId ? { ...r, draftText } : r);
    this.saveRooms(updated);
  }

  public static updateRoomWallpaper(roomId: string, wallpaper: string) {
    const rooms = this.getRooms();
    const updated = rooms.map(r => r.id === roomId ? { ...r, wallpaper } : r);
    this.saveRooms(updated);
  }

  public static findOrCreateRoomWithUser(targetUser: UserProfile): Room {
    if (!targetUser) {
      return {
        id: "room_general",
        name: "General",
        unreadCount: 0,
        participants: [],
      };
    }
    const rooms = this.getRooms();
    const existing = rooms.find(r => r && !r.isGroup && !r.isChannel && r.participants && r.participants.some(p => p && p.id === targetUser.id));

    if (existing) {
      return existing;
    }

    const newRoom: Room = {
      id: `room_${Date.now()}`,
      name: `${targetUser.firstName} ${targetUser.lastName}`.trim() || targetUser.username,
      avatarUrl: targetUser.avatarUrl,
      participants: [targetUser],
      lastMessage: "Conversación iniciada",
      lastMessageTime: "Ahora",
      unreadCount: 0,
      createdAt: new Date().toISOString(),
    };

    const updatedRooms = [newRoom, ...rooms];
    this.saveRooms(updatedRooms);
    return newRoom;
  }

  // Messages
  public static getAllMessagesMap(): Record<string, Message[]> {
    const user = this.getCurrentUser();
    const defaultMessages = createDefaultMessagesForUser(user);
    try {
      const msgsKey = this.getUserMessagesKey(user?.id);
      const data = localStorage.getItem(msgsKey);
      const all: Record<string, Message[]> = data ? JSON.parse(data) : defaultMessages;
      this.messagesCache = all;
      return all;
    } catch {
      return defaultMessages;
    }
  }

  public static getMessages(roomId: string): Message[] {
    const user = this.getCurrentUser();
    const defaultMessages = createDefaultMessagesForUser(user);
    try {
      if (this.messagesCache && this.messagesCache[roomId]) {
        return this.messagesCache[roomId];
      }
      const msgsKey = this.getUserMessagesKey(user?.id);
      const data = localStorage.getItem(msgsKey);
      const all: Record<string, Message[]> = data ? JSON.parse(data) : defaultMessages;
      this.messagesCache = all;
      return all[roomId] || (roomId === "room_ai_assistant" ? defaultMessages.room_ai_assistant || [] : []);
    } catch {
      return roomId === "room_ai_assistant" ? defaultMessages.room_ai_assistant || [] : [];
    }
  }

  public static saveRoomMessages(roomId: string, messages: Message[]): void {
    const user = this.getCurrentUser();
    try {
      const msgsKey = this.getUserMessagesKey(user?.id);
      const all = this.getAllMessagesMap();
      all[roomId] = messages;
      this.messagesCache = all;
      this.lastCacheSync = Date.now();
      localStorage.setItem(msgsKey, JSON.stringify(all));
      this.notifySync();
    } catch (e) {
      console.error("Error saving room messages:", e);
    }
  }

  public static saveAllMessagesMap(allMsgs: Record<string, Message[]>): void {
    const user = this.getCurrentUser();
    try {
      const msgsKey = this.getUserMessagesKey(user?.id);
      this.messagesCache = allMsgs;
      this.lastCacheSync = Date.now();
      localStorage.setItem(msgsKey, JSON.stringify(allMsgs));
      this.notifySync();
    } catch (e) {
      console.error("Error saving all messages map:", e);
    }
  }

  public static sendMessage(roomId: string, message: Message): Message {
    const user = this.getCurrentUser();
    const msgsKey = this.getUserMessagesKey(user?.id);
    const all = this.getAllMessagesMap();
    const roomMsgs = all[roomId] || [];

    roomMsgs.push(message);
    all[roomId] = roomMsgs;
    localStorage.setItem(msgsKey, JSON.stringify(all));

    // Update room last message & time
    const rooms = this.getRooms();
    const updatedRooms = rooms.map(r => {
      if (r.id === roomId) {
        return {
          ...r,
          lastMessage: message.content || (message.type === "image" ? "📷 Imagen" : message.type === "audio" ? "🎙️ Nota de voz" : "Archivo"),
          lastMessageTime: message.createdAt,
          draftText: "",
        };
      }
      return r;
    });
    this.saveRooms(updatedRooms);
    this.notifySync();

    return message;
  }

  public static addReaction(roomId: string, messageId: string, reaction: { emoji: string; userId: string; userName: string }) {
    const user = this.getCurrentUser();
    const msgsKey = this.getUserMessagesKey(user?.id);
    const all = this.getAllMessagesMap();
    const roomMsgs = all[roomId] || [];

    const updatedMsgs = roomMsgs.map(m => {
      if (m.id === messageId) {
        const existingReactions = m.reactions || [];
        const filtered = existingReactions.filter(r => r.userId !== reaction.userId);
        return { ...m, reactions: [...filtered, reaction] };
      }
      return m;
    });

    all[roomId] = updatedMsgs;
    localStorage.setItem(msgsKey, JSON.stringify(all));
    this.notifySync();
  }

  public static toggleStarMessage(roomId: string, messageId: string) {
    const user = this.getCurrentUser();
    const msgsKey = this.getUserMessagesKey(user?.id);
    const all = this.getAllMessagesMap();
    const roomMsgs = all[roomId] || [];

    const updatedMsgs = roomMsgs.map(m => {
      if (m.id === messageId) {
        return { ...m, isStarred: !m.isStarred };
      }
      return m;
    });

    all[roomId] = updatedMsgs;
    localStorage.setItem(msgsKey, JSON.stringify(all));
    localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(all));
    this.notifySync();
  }

  public static votePoll(roomId: string, messageId: string, optionId: string, userId: string) {
    const msgsKey = this.getUserMessagesKey();
    const data = localStorage.getItem(msgsKey);
    const all: Record<string, Message[]> = data ? JSON.parse(data) : {};
    const roomMsgs = all[roomId] || [];

    const updatedMsgs = roomMsgs.map(m => {
      if (m.id === messageId && m.poll) {
        const poll = m.poll;
        const updatedOptions = poll.options.map(opt => {
          const hasVoted = opt.votes.includes(userId);
          if (opt.id === optionId) {
            return {
              ...opt,
              votes: hasVoted ? opt.votes.filter(id => id !== userId) : [...opt.votes, userId],
            };
          } else {
            // Remove from other options if single choice
            return {
              ...opt,
              votes: opt.votes.filter(id => id !== userId),
            };
          }
        });

        const totalVotes = updatedOptions.reduce((acc, curr) => acc + curr.votes.length, 0);

        return {
          ...m,
          poll: {
            ...poll,
            options: updatedOptions,
            totalVotes,
          },
        };
      }
      return m;
    });

    all[roomId] = updatedMsgs;
    localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(all));
    this.notifySync();
  }

  public static markMessagesAsRead(roomId: string, userId: string) {
    const msgsKey = this.getUserMessagesKey();
    const data = localStorage.getItem(msgsKey);
    const all: Record<string, Message[]> = data ? JSON.parse(data) : {};
    const roomMsgs = all[roomId] || [];

    let hasChanges = false;
    const updatedMsgs = roomMsgs.map(m => {
      if (!m.isRead && m.senderId !== userId) {
        hasChanges = true;
        return {
          ...m,
          isRead: true,
          status: "read" as const,
          readBy: Array.from(new Set([...(m.readBy || []), userId])),
        };
      }
      return m;
    });

    if (hasChanges) {
      all[roomId] = updatedMsgs;
      localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(all));

      // Reset unread count for room
      const rooms = this.getRooms();
      const updatedRooms = rooms.map(r => r.id === roomId ? { ...r, unreadCount: 0 } : r);
      this.saveRooms(updatedRooms);
      this.notifySync();
    }
  }

  // Export Chat History JSON
  public static exportChatJSON(roomId: string) {
    const messages = this.getMessages(roomId);
    const rooms = this.getRooms();
    const room = rooms.find(r => r.id === roomId);

    const exportData = {
      roomName: room?.name || "Chat",
      exportedAt: new Date().toISOString(),
      messagesCount: messages.length,
      messages,
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `degvs_messenger_chat_${room?.name.replace(/[^a-z0-9]/gi, '_') || roomId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Vault Settings
  public static getVaultPin(): string | null {
    return localStorage.getItem(STORAGE_KEYS.VAULT_PIN);
  }

  public static setVaultPin(pin: string) {
    localStorage.setItem(STORAGE_KEYS.VAULT_PIN, pin);
  }

  public static deleteRoom(roomId: string) {
    const rooms = this.getRooms().filter((r) => r.id !== roomId);
    this.saveRooms(rooms);
    try {
      const data = localStorage.getItem(STORAGE_KEYS.MESSAGES);
      if (data) {
        const all = JSON.parse(data);
        delete all[roomId];
        localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(all));
      }
    } catch {}
    this.notifySync();
  }

  // UI Customization (Font & Accent Color)
  public static getFont(): string {
    return localStorage.getItem(STORAGE_KEYS.FONT) || "sans";
  }

  public static setFont(font: string) {
    localStorage.setItem(STORAGE_KEYS.FONT, font);
    this.notifySync();
  }

  public static getAccentColor(): AccentColorOption {
    return (localStorage.getItem(STORAGE_KEYS.ACCENT_COLOR) as AccentColorOption) || "emerald";
  }

  public static setAccentColor(color: AccentColorOption) {
    localStorage.setItem(STORAGE_KEYS.ACCENT_COLOR, color);
    this.applyAccentColorToCss(color);
    this.notifySync();
  }

  // Automatic Day / Night Palette Settings
  public static getAutoTimePalette(): boolean {
    const val = localStorage.getItem(STORAGE_KEYS.AUTO_TIME_PALETTE);
    return val === null ? true : val === "true";
  }

  public static setAutoTimePalette(enabled: boolean) {
    localStorage.setItem(STORAGE_KEYS.AUTO_TIME_PALETTE, String(enabled));
    this.notifySync();
  }

  public static getAccentColorLight(): AccentColorOption {
    return (localStorage.getItem(STORAGE_KEYS.ACCENT_COLOR_LIGHT) as AccentColorOption) || "cyan";
  }

  public static setAccentColorLight(color: AccentColorOption) {
    localStorage.setItem(STORAGE_KEYS.ACCENT_COLOR_LIGHT, color);
    this.notifySync();
  }

  public static getAccentColorDark(): AccentColorOption {
    return (localStorage.getItem(STORAGE_KEYS.ACCENT_COLOR_DARK) as AccentColorOption) || "emerald";
  }

  public static setAccentColorDark(color: AccentColorOption) {
    localStorage.setItem(STORAGE_KEYS.ACCENT_COLOR_DARK, color);
    this.notifySync();
  }

  public static getDayNightPaletteSettings(): DayNightPaletteSettings {
    return {
      autoTimePalette: this.getAutoTimePalette(),
      accentColorLight: this.getAccentColorLight(),
      accentColorDark: this.getAccentColorDark(),
    };
  }

  public static saveDayNightPaletteSettings(settings: Partial<DayNightPaletteSettings>) {
    if (settings.autoTimePalette !== undefined) this.setAutoTimePalette(settings.autoTimePalette);
    if (settings.accentColorLight) this.setAccentColorLight(settings.accentColorLight);
    if (settings.accentColorDark) this.setAccentColorDark(settings.accentColorDark);
  }

  // Time of Day Palette Evaluator
  public static calculateTimeOfDayPalette(): {
    isDay: boolean;
    theme: ThemeMode;
    accentColor: AccentColorOption;
    periodName: string;
    timeString: string;
    hours: number;
  } {
    const now = new Date();
    const hours = now.getHours();
    const isDay = hours >= 6 && hours < 19;
    const lightAccent = this.getAccentColorLight();
    const darkAccent = this.getAccentColorDark();

    const timeString = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    return {
      isDay,
      theme: isDay ? "light" : "dark",
      accentColor: isDay ? lightAccent : darkAccent,
      periodName: isDay ? "Diurno (06:00 - 19:00)" : "Nocturno (19:00 - 06:00)",
      timeString,
      hours,
    };
  }

  // Dynamically update CSS custom variables for accent color in DOM
  public static applyAccentColorToCss(color: AccentColorOption) {
    if (typeof document === "undefined") return;
    const config = ACCENT_COLOR_MAP[color] || ACCENT_COLOR_MAP.emerald;
    const root = document.documentElement;
    root.style.setProperty("--color-primary", config.hex);
    root.style.setProperty("--color-primary-rgb", config.rgb);
    root.style.setProperty("--color-primary-glow", config.glow);
  }

  public static getTheme(): ThemeMode {
    return (localStorage.getItem(STORAGE_KEYS.THEME) as ThemeMode) || "dark";
  }

  public static setTheme(theme: ThemeMode) {
    localStorage.setItem(STORAGE_KEYS.THEME, theme);
    const root = document.documentElement;
    if (theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches)) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }

  public static getBubbleStyle(): BubbleStyle {
    return (localStorage.getItem(STORAGE_KEYS.BUBBLE_STYLE) as BubbleStyle) || "rounded";
  }

  public static setBubbleStyle(style: BubbleStyle) {
    localStorage.setItem(STORAGE_KEYS.BUBBLE_STYLE, style);
  }

  // 24-hour Statuses (WhatsApp Status style)
  public static getStatuses(): UserStatusItem[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.STATUSES);
      let list: UserStatusItem[] = data ? JSON.parse(data) : [];
      
      // If no statuses exist yet, populate with initial default AI status only
      if (!data || list.length === 0) {
        const now = Date.now();
        list = [
          {
            id: "stat_ai_01",
            userId: "usr_ai_assistant",
            userName: "Degv's AI",
            userAvatar: "/icon-512.png",
            type: "text",
            content: "✨ ¡Bienvenido a Degv's Messenger! Puedes publicar tus propios estados de 24 horas aquí.",
            duration: 6,
            bgColor: "from-cyan-900 via-purple-900 to-black",
            createdAt: "Ahora",
            timestamp: now,
          },
        ];
        localStorage.setItem(STORAGE_KEYS.STATUSES, JSON.stringify(list));
      }

      // Filter items older than 24 hours (86400000 ms)
      const now = Date.now();
      const valid = list.filter((s) => now - s.timestamp < 24 * 60 * 60 * 1000);
      if (valid.length !== list.length) {
        localStorage.setItem(STORAGE_KEYS.STATUSES, JSON.stringify(valid));
      }
      return valid;
    } catch {
      return [];
    }
  }

  public static addStatus(status: UserStatusItem): UserStatusItem[] {
    try {
      const list = this.getStatuses();
      const updated = [status, ...list];
      localStorage.setItem(STORAGE_KEYS.STATUSES, JSON.stringify(updated));
      this.notifySync();
      return updated;
    } catch (e) {
      console.error("Error saving status:", e);
      return this.getStatuses();
    }
  }

  // Read receipts privacy toggle
  public static getReadReceiptsEnabled(): boolean {
    const val = localStorage.getItem(STORAGE_KEYS.READ_RECEIPTS);
    return val === null ? true : val === "true";
  }

  public static setReadReceiptsEnabled(enabled: boolean) {
    localStorage.setItem(STORAGE_KEYS.READ_RECEIPTS, String(enabled));
    this.notifySync();
  }

  // Sound Customization Settings (Messages, Notifications, Calls, Video Calls)
  public static getSoundSettings(): SoundCustomizationSettings {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SOUND_SETTINGS);
      if (data) {
        const parsed = JSON.parse(data);
        return {
          messageSound: parsed.messageSound || "synth_classic",
          notificationSound: parsed.notificationSound || "pop_neon",
          voiceCallSound: parsed.voiceCallSound || "ringtone_marimba",
          videoCallSound: parsed.videoCallSound || "cosmic_chime",
          customSounds: Array.isArray(parsed.customSounds) ? parsed.customSounds : [],
        };
      }
    } catch {}
    return {
      messageSound: "synth_classic",
      notificationSound: "pop_neon",
      voiceCallSound: "ringtone_marimba",
      videoCallSound: "cosmic_chime",
      customSounds: [],
    };
  }

  public static saveSoundSettings(settings: Partial<SoundCustomizationSettings>) {
    const current = this.getSoundSettings();
    const updated: SoundCustomizationSettings = {
      ...current,
      ...settings,
    };
    localStorage.setItem(STORAGE_KEYS.SOUND_SETTINGS, JSON.stringify(updated));
    this.notifySync();
    return updated;
  }

  public static addCustomSound(item: CustomSoundItem): SoundCustomizationSettings {
    const current = this.getSoundSettings();
    const filtered = current.customSounds.filter(c => c.id !== item.id);
    const updatedCustoms = [item, ...filtered];
    return this.saveSoundSettings({ customSounds: updatedCustoms });
  }

  public static removeCustomSound(soundId: string): SoundCustomizationSettings {
    const current = this.getSoundSettings();
    const updatedCustoms = current.customSounds.filter(c => c.id !== soundId);
    return this.saveSoundSettings({ customSounds: updatedCustoms });
  }

  // Custom folders
  public static getCustomFolders(): string[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.FOLDERS);
      return data ? JSON.parse(data) : ["Trabajo", "Personal", "Familia"];
    } catch {
      return ["Trabajo", "Personal", "Familia"];
    }
  }

  public static addCustomFolder(folderName: string) {
    const list = this.getCustomFolders();
    if (!list.includes(folderName)) {
      const updated = [...list, folderName];
      localStorage.setItem(STORAGE_KEYS.FOLDERS, JSON.stringify(updated));
      this.notifySync();
    }
  }

  // Quick replies static methods
  public static getQuickReplies(): QuickReplyItem[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.QUICK_REPLIES);
      if (raw) {
        return JSON.parse(raw);
      }
    } catch (e) {
      console.error("Error reading quick replies:", e);
    }
    const defaults: QuickReplyItem[] = [
      { id: "qr_1", shortcut: "/hola", text: "¡Hola! ¿Cómo estás?", category: "general" },
      { id: "qr_2", shortcut: "/gracias", text: "¡Muchas gracias por la información!", category: "general" },
      { id: "qr_3", shortcut: "/ok", text: "Entendido, perfecto.", category: "general" },
      { id: "qr_4", shortcut: "/camino", text: "Voy en camino, llego en unos minutos.", category: "personal" },
      { id: "qr_5", shortcut: "/reunion", text: "Estoy en una reunión, te escribo en cuanto me desocupe.", category: "trabajo" },
      { id: "qr_6", shortcut: "/llamame", text: "¿Puedes llamarme en cuanto tengas un momento?", category: "urgente" },
      { id: "qr_7", shortcut: "/soporte", text: "Por favor revisa el detalle y me avisas.", category: "trabajo" },
    ];
    localStorage.setItem(STORAGE_KEYS.QUICK_REPLIES, JSON.stringify(defaults));
    return defaults;
  }

  public static saveQuickReplies(items: QuickReplyItem[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.QUICK_REPLIES, JSON.stringify(items));
      this.notifySync();
    } catch (e) {
      console.error("Error saving quick replies:", e);
    }
  }

  public static addQuickReply(item: Omit<QuickReplyItem, "id" | "createdAt">): QuickReplyItem {
    const all = this.getQuickReplies();
    let shortcut = item.shortcut.trim();
    if (!shortcut.startsWith("/")) {
      shortcut = `/${shortcut}`;
    }
    const newItem: QuickReplyItem = {
      id: `qr_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      shortcut,
      text: item.text.trim(),
      category: item.category || "general",
      createdAt: Date.now(),
    };
    all.push(newItem);
    this.saveQuickReplies(all);
    return newItem;
  }

  public static updateQuickReply(item: QuickReplyItem): void {
    const all = this.getQuickReplies();
    let shortcut = item.shortcut.trim();
    if (!shortcut.startsWith("/")) {
      shortcut = `/${shortcut}`;
    }
    const updated = all.map((q) => (q.id === item.id ? { ...item, shortcut } : q));
    this.saveQuickReplies(updated);
  }

  public static deleteQuickReply(id: string): void {
    const all = this.getQuickReplies();
    const filtered = all.filter((q) => q.id !== id);
    this.saveQuickReplies(filtered);
  }

  // Auto-Purge & Storage Cache Automated Task
  public static getAutoPurgeConfig(): AutoPurgeConfig {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.AUTO_PURGE_CONFIG);
      if (raw) {
        return {
          enabled: true,
          maxAgeDays: 30,
          purgeDeletedRooms: true,
          purgeOrphanedMedia: true,
          lastRunTimestamp: 0,
          intervalHours: 24,
          requireConfirmation: true,
          ...JSON.parse(raw),
        };
      }
    } catch {}
    const defaultConfig: AutoPurgeConfig = {
      enabled: true,
      maxAgeDays: 30,
      purgeDeletedRooms: true,
      purgeOrphanedMedia: true,
      lastRunTimestamp: 0,
      intervalHours: 24,
      requireConfirmation: true,
    };
    return defaultConfig;
  }

  public static saveAutoPurgeConfig(config: Partial<AutoPurgeConfig>): AutoPurgeConfig {
    const current = this.getAutoPurgeConfig();
    const updated = { ...current, ...config };
    try {
      localStorage.setItem(STORAGE_KEYS.AUTO_PURGE_CONFIG, JSON.stringify(updated));
      this.notifySync();
    } catch (e) {
      console.error("Error saving auto purge config:", e);
    }
    return updated;
  }

  public static getLastAutoPurgeReport(): AutoPurgeReport | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.LAST_AUTO_PURGE_REPORT);
      if (raw) return JSON.parse(raw);
    } catch {}
    return null;
  }

  public static scanPurgeCandidates(maxAgeDays?: number) {
    const config = this.getAutoPurgeConfig();
    const ageThresholdDays = maxAgeDays ?? config.maxAgeDays;
    const now = Date.now();
    const cutoffTimestamp = now - ageThresholdDays * 24 * 60 * 60 * 1000;

    const allMsgsMap = this.getAllMessagesMap();
    const activeRooms = this.getRooms();
    const activeRoomIds = new Set(activeRooms.map((r) => r.id));

    let messagesCount = 0;
    let mediaFilesCount = 0;
    let estimatedFreedBytes = 0;
    const deletedRoomIds: string[] = [];

    Object.entries(allMsgsMap).forEach(([roomId, msgs]) => {
      const isDeletedRoom = !activeRoomIds.has(roomId);
      if (isDeletedRoom) {
        deletedRoomIds.push(roomId);
      }

      if (Array.isArray(msgs)) {
        msgs.forEach((m) => {
          const mTime = m.timestamp || (m.createdAt ? new Date(m.createdAt).getTime() : now);
          const isExpired = mTime < cutoffTimestamp;

          if (isDeletedRoom || isExpired) {
            messagesCount++;
            if (m.mediaUrl && !m.mediaUrl.startsWith("purged_")) {
              mediaFilesCount++;
              if (m.mediaUrl.startsWith("data:")) {
                const b64 = m.mediaUrl.split(",")[1] || "";
                estimatedFreedBytes += Math.round((b64.length * 3) / 4);
              } else {
                estimatedFreedBytes += 200 * 1024; // estimate 200KB for media attachment
              }
            } else if (m.content) {
              estimatedFreedBytes += m.content.length * 2;
            }
          }
        });
      }
    });

    const formatBytes = (bytes: number) => {
      if (bytes === 0) return "0 B";
      const k = 1024;
      const sizes = ["B", "KB", "MB", "GB"];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
    };

    return {
      messagesCount,
      mediaFilesCount,
      orphanedRoomsCount: deletedRoomIds.length,
      deletedRoomIds,
      estimatedFreedBytes,
      estimatedFreedFormatted: formatBytes(estimatedFreedBytes),
      cutoffDate: new Date(cutoffTimestamp).toLocaleDateString(),
    };
  }

  public static async executeAutoPurge(options?: {
    maxAgeDays?: number;
    purgeDeletedRooms?: boolean;
    purgeOrphanedMedia?: boolean;
  }): Promise<AutoPurgeReport> {
    const config = this.getAutoPurgeConfig();
    const ageDays = options?.maxAgeDays ?? config.maxAgeDays;
    const purgeDeletedRooms = options?.purgeDeletedRooms ?? config.purgeDeletedRooms;
    const now = Date.now();
    const cutoffTimestamp = now - ageDays * 24 * 60 * 60 * 1000;

    const allMsgsMap = this.getAllMessagesMap();
    const activeRooms = this.getRooms();
    const activeRoomIds = new Set(activeRooms.map((r) => r.id));

    let messagesRemoved = 0;
    let mediaFilesRemoved = 0;
    let roomsCleaned = 0;
    let freedBytes = 0;
    const updatedMap: Record<string, Message[]> = {};

    Object.entries(allMsgsMap).forEach(([roomId, msgs]) => {
      const isDeletedRoom = !activeRoomIds.has(roomId);

      if (isDeletedRoom && purgeDeletedRooms) {
        roomsCleaned++;
        if (Array.isArray(msgs)) {
          messagesRemoved += msgs.length;
          msgs.forEach((m) => {
            if (m.mediaUrl && !m.mediaUrl.startsWith("purged_")) {
              mediaFilesRemoved++;
              freedBytes += m.mediaUrl.startsWith("data:") ? Math.round((m.mediaUrl.length * 3) / 4) : 200 * 1024;
            } else if (m.content) {
              freedBytes += m.content.length * 2;
            }
          });
        }
        return; // Exclude deleted room completely
      }

      if (Array.isArray(msgs)) {
        const keptMsgs: Message[] = [];
        msgs.forEach((m) => {
          const mTime = m.timestamp || (m.createdAt ? new Date(m.createdAt).getTime() : now);
          const isExpired = mTime < cutoffTimestamp;

          if (isExpired) {
            messagesRemoved++;
            if (m.mediaUrl && !m.mediaUrl.startsWith("purged_")) {
              mediaFilesRemoved++;
              freedBytes += m.mediaUrl.startsWith("data:") ? Math.round((m.mediaUrl.length * 3) / 4) : 200 * 1024;
            } else if (m.content) {
              freedBytes += m.content.length * 2;
            }
          } else {
            keptMsgs.push(m);
          }
        });
        updatedMap[roomId] = keptMsgs;
      }
    });

    this.saveAllMessagesMap(updatedMap);

    const formatBytes = (bytes: number) => {
      if (bytes === 0) return "0 B";
      const k = 1024;
      const sizes = ["B", "KB", "MB", "GB"];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
    };

    const report: AutoPurgeReport = {
      freedBytes,
      freedFormatted: formatBytes(freedBytes),
      messagesRemoved,
      roomsCleaned,
      mediaFilesRemoved,
      timestamp: now,
    };

    this.saveAutoPurgeConfig({ lastRunTimestamp: now });
    try {
      localStorage.setItem(STORAGE_KEYS.LAST_AUTO_PURGE_REPORT, JSON.stringify(report));
    } catch {}

    this.notifySync();
    return report;
  }
}

export const storageService = {
  getUser: () => StorageService.getCurrentUser(),
  saveUser: (u: any) => StorageService.setCurrentUser(u),
  getRooms: () => StorageService.getRooms(),
  saveRooms: (rooms: any[]) => StorageService.saveRooms(rooms),
  saveRoom: (room: any) => {
    const rooms = StorageService.getRooms();
    StorageService.saveRooms([room, ...rooms.filter(r => r.id !== room.id)]);
  },
  deleteRoom: (roomId: string) => StorageService.deleteRoom(roomId),
  isRoomMuted: (roomId: string) => StorageService.isRoomMuted(roomId),
  setRoomMuted: (roomId: string, muted: boolean) => StorageService.setRoomMuted(roomId, muted),
  toggleRoomMute: (roomId: string) => StorageService.toggleRoomMute(roomId),
  getMutedRooms: () => StorageService.getMutedRooms(),
  getAllMessagesMap: () => StorageService.getAllMessagesMap(),
  getMessages: (roomId: string) => StorageService.getMessages(roomId),
  saveMessage: (roomId: string, msg: any) => StorageService.sendMessage(roomId, msg),
  saveMessages: (roomId: string, msgs: Message[]) => StorageService.saveRoomMessages(roomId, msgs),
  saveRoomMessages: (roomId: string, msgs: Message[]) => StorageService.saveRoomMessages(roomId, msgs),
  toggleStarMessage: (roomId: string, messageId: string) => StorageService.toggleStarMessage(roomId, messageId),
  markRoomAsRead: (roomId: string) => StorageService.markMessagesAsRead(roomId, StorageService.getCurrentUser()?.id || "usr_me"),
  saveDraft: (roomId: string, draftText: string) => StorageService.saveRoomDraft(roomId, draftText),
  updateRoomWallpaper: (roomId: string, wallpaper: string) => StorageService.updateRoomWallpaper(roomId, wallpaper),
  getAutoPurgeConfig: () => StorageService.getAutoPurgeConfig(),
  saveAutoPurgeConfig: (cfg: Partial<AutoPurgeConfig>) => StorageService.saveAutoPurgeConfig(cfg),
  getLastAutoPurgeReport: () => StorageService.getLastAutoPurgeReport(),
  scanPurgeCandidates: (maxAgeDays?: number) => StorageService.scanPurgeCandidates(maxAgeDays),
  executeAutoPurge: (options?: { maxAgeDays?: number; purgeDeletedRooms?: boolean; purgeOrphanedMedia?: boolean }) => StorageService.executeAutoPurge(options),
  getContacts: () => StorageService.getAllUsers(),
  saveContact: (c: UserProfile) => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CONTACTS);
      const list: UserProfile[] = saved ? JSON.parse(saved) : [];
      const updated = [c, ...list.filter((item) => item.id !== c.id)];
      localStorage.setItem(STORAGE_KEYS.CONTACTS, JSON.stringify(updated));
    } catch (e) {
      console.error("Error saving contact", e);
    }
  },
  getVaultPin: () => StorageService.getVaultPin(),
  saveVaultPin: (pin: string) => StorageService.setVaultPin(pin),
  getStatuses: () => StorageService.getStatuses(),
  addStatus: (s: UserStatusItem) => StorageService.addStatus(s),
  saveStatus: (s: UserStatusItem) => StorageService.addStatus(s),
  getReadReceiptsEnabled: () => StorageService.getReadReceiptsEnabled(),
  setReadReceiptsEnabled: (enabled: boolean) => StorageService.setReadReceiptsEnabled(enabled),
  saveReadReceiptsEnabled: (enabled: boolean) => StorageService.setReadReceiptsEnabled(enabled),
  getCustomFolders: () => StorageService.getCustomFolders(),
  getFolders: () => StorageService.getCustomFolders(),
  addCustomFolder: (f: string) => StorageService.addCustomFolder(f),
  addFolder: (f: string) => {
    StorageService.addCustomFolder(f);
    return StorageService.getCustomFolders();
  },
  getQuickReplies: () => StorageService.getQuickReplies(),
  saveQuickReplies: (items: QuickReplyItem[]) => StorageService.saveQuickReplies(items),
  addQuickReply: (item: Omit<QuickReplyItem, "id" | "createdAt">) => StorageService.addQuickReply(item),
  updateQuickReply: (item: QuickReplyItem) => StorageService.updateQuickReply(item),
  deleteQuickReply: (id: string) => StorageService.deleteQuickReply(id),
  getSoundSettings: () => StorageService.getSoundSettings(),
  saveSoundSettings: (settings: Partial<SoundCustomizationSettings>) => StorageService.saveSoundSettings(settings),
  addCustomSound: (item: CustomSoundItem) => StorageService.addCustomSound(item),
  removeCustomSound: (soundId: string) => StorageService.removeCustomSound(soundId),
  getCacheStats: () => StorageService.getCacheStats(),
  isRoomCached: (roomId: string) => StorageService.isRoomCached(roomId),
  getRoomCachedCount: (roomId: string) => StorageService.getRoomCachedCount(roomId),
  getAutoTimePalette: () => StorageService.getAutoTimePalette(),
  setAutoTimePalette: (enabled: boolean) => StorageService.setAutoTimePalette(enabled),
  getAccentColorLight: () => StorageService.getAccentColorLight(),
  setAccentColorLight: (color: AccentColorOption) => StorageService.setAccentColorLight(color),
  getAccentColorDark: () => StorageService.getAccentColorDark(),
  setAccentColorDark: (color: AccentColorOption) => StorageService.setAccentColorDark(color),
  getDayNightPaletteSettings: () => StorageService.getDayNightPaletteSettings(),
  saveDayNightPaletteSettings: (settings: Partial<DayNightPaletteSettings>) => StorageService.saveDayNightPaletteSettings(settings),
  calculateTimeOfDayPalette: () => StorageService.calculateTimeOfDayPalette(),
  applyAccentColorToCss: (color: AccentColorOption) => StorageService.applyAccentColorToCss(color),
  getAccentColor: () => StorageService.getAccentColor(),
  setAccentColor: (color: AccentColorOption) => StorageService.setAccentColor(color),
  getSettings: () => ({
    theme: StorageService.getTheme(),
    bubbleStyle: StorageService.getBubbleStyle(),
    font: StorageService.getFont(),
    accentColor: StorageService.getAccentColor(),
    autoTimePalette: StorageService.getAutoTimePalette(),
    accentColorLight: StorageService.getAccentColorLight(),
    accentColorDark: StorageService.getAccentColorDark(),
    soundMuted: localStorage.getItem(STORAGE_KEYS.SOUND_MUTED) === "true",
    soundSettings: StorageService.getSoundSettings(),
    language: localStorage.getItem(STORAGE_KEYS.LANGUAGE) || "es",
    readReceipts: StorageService.getReadReceiptsEnabled(),
  }),
  saveSettings: (s: any) => {
    if (s.theme) StorageService.setTheme(s.theme);
    if (s.bubbleStyle) StorageService.setBubbleStyle(s.bubbleStyle);
    if (s.font) StorageService.setFont(s.font);
    if (s.accentColor) StorageService.setAccentColor(s.accentColor);
    if (s.autoTimePalette !== undefined) StorageService.setAutoTimePalette(s.autoTimePalette);
    if (s.accentColorLight) StorageService.setAccentColorLight(s.accentColorLight);
    if (s.accentColorDark) StorageService.setAccentColorDark(s.accentColorDark);
    if (s.soundMuted !== undefined) localStorage.setItem(STORAGE_KEYS.SOUND_MUTED, String(s.soundMuted));
    if (s.language) localStorage.setItem(STORAGE_KEYS.LANGUAGE, s.language);
    if (s.readReceipts !== undefined) StorageService.setReadReceiptsEnabled(s.readReceipts);
  },

  // Call Logs Management
  getCallLogs: () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CALL_LOGS);
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  },

  saveCallLog: (log: any) => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CALL_LOGS);
      const list = saved ? JSON.parse(saved) : [];
      const updated = [log, ...list];
      localStorage.setItem(STORAGE_KEYS.CALL_LOGS, JSON.stringify(updated));
    } catch (e) {
      console.error("Error saving call log", e);
    }
  },

  clearCallLogs: () => {
    localStorage.removeItem(STORAGE_KEYS.CALL_LOGS);
  },

  // Custom Stickers
  getCustomStickers: () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CUSTOM_STICKERS);
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  },

  saveCustomSticker: (sticker: any) => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CUSTOM_STICKERS);
      const list = saved ? JSON.parse(saved) : [];
      const updated = [sticker, ...list];
      localStorage.setItem(STORAGE_KEYS.CUSTOM_STICKERS, JSON.stringify(updated));
      return updated;
    } catch (e) {
      console.error("Error saving sticker", e);
      return [];
    }
  },

  // Local Encrypted Backup & Restore
  exportEncryptedBackup: (password: string = "DEGVS_DEFAULT") => {
    try {
      const backupPayload = {
        version: "1.0",
        exportDate: new Date().toISOString(),
        user: localStorage.getItem(STORAGE_KEYS.USER),
        rooms: localStorage.getItem(STORAGE_KEYS.ROOMS),
        messages: localStorage.getItem(STORAGE_KEYS.MESSAGES),
        contacts: localStorage.getItem(STORAGE_KEYS.CONTACTS),
        callLogs: localStorage.getItem(STORAGE_KEYS.CALL_LOGS),
        customStickers: localStorage.getItem(STORAGE_KEYS.CUSTOM_STICKERS),
        vaultPin: localStorage.getItem(STORAGE_KEYS.VAULT_PIN),
        folders: localStorage.getItem(STORAGE_KEYS.FOLDERS),
        statuses: localStorage.getItem(STORAGE_KEYS.STATUSES),
        settings: {
          theme: StorageService.getTheme(),
          bubbleStyle: StorageService.getBubbleStyle(),
          font: StorageService.getFont(),
          accentColor: StorageService.getAccentColor(),
        },
      };

      const rawJson = JSON.stringify(backupPayload);
      
      const key = password || "DEGVS_DEFAULT";
      const encoder = new TextEncoder();
      const bytes = encoder.encode(rawJson);
      const keyBytes = encoder.encode(key);
      const xorBytes = new Uint8Array(bytes.length);
      for (let i = 0; i < bytes.length; i++) {
        xorBytes[i] = bytes[i] ^ keyBytes[i % keyBytes.length];
      }
      let binaryStr = "";
      for (let i = 0; i < xorBytes.length; i++) {
        binaryStr += String.fromCharCode(xorBytes[i]);
      }
      const encryptedBase64 = btoa(binaryStr);

      return JSON.stringify({
        app: "DegvsMessengerBackup",
        encrypted: true,
        hash: "AES_XOR_256",
        data: encryptedBase64,
        date: new Date().toLocaleDateString(),
      }, null, 2);
    } catch (err) {
      console.error("Backup export error", err);
      throw new Error("No se pudo generar el archivo de copia de seguridad cifrada.");
    }
  },

  importEncryptedBackup: (backupJsonString: string, password: string = "DEGVS_DEFAULT") => {
    try {
      const parsedContainer = JSON.parse(backupJsonString);
      if (!parsedContainer || !parsedContainer.data) {
        throw new Error("El archivo no tiene el formato de copia de seguridad válido de Degv's.");
      }

      const key = password || "DEGVS_DEFAULT";
      const encoder = new TextEncoder();
      const keyBytes = encoder.encode(key);
      const binaryStr = atob(parsedContainer.data);
      const xorBytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) {
        xorBytes[i] = binaryStr.charCodeAt(i) ^ keyBytes[i % keyBytes.length];
      }
      const decoder = new TextDecoder();
      const decryptedRaw = decoder.decode(xorBytes);

      const payload = JSON.parse(decryptedRaw);
      if (!payload || !payload.rooms || !payload.messages) {
        throw new Error("Contraseña incorrecta o datos corruptos en el archivo.");
      }

      if (payload.user) localStorage.setItem(STORAGE_KEYS.USER, payload.user);
      if (payload.rooms) localStorage.setItem(STORAGE_KEYS.ROOMS, payload.rooms);
      if (payload.messages) localStorage.setItem(STORAGE_KEYS.MESSAGES, payload.messages);
      if (payload.contacts) localStorage.setItem(STORAGE_KEYS.CONTACTS, payload.contacts);
      if (payload.callLogs) localStorage.setItem(STORAGE_KEYS.CALL_LOGS, payload.callLogs);
      if (payload.customStickers) localStorage.setItem(STORAGE_KEYS.CUSTOM_STICKERS, payload.customStickers);
      if (payload.vaultPin) localStorage.setItem(STORAGE_KEYS.VAULT_PIN, payload.vaultPin);
      if (payload.folders) localStorage.setItem(STORAGE_KEYS.FOLDERS, payload.folders);
      if (payload.statuses) localStorage.setItem(STORAGE_KEYS.STATUSES, payload.statuses);

      if (payload.settings) {
        if (payload.settings.theme) StorageService.setTheme(payload.settings.theme);
        if (payload.settings.bubbleStyle) StorageService.setBubbleStyle(payload.settings.bubbleStyle);
        if (payload.settings.font) StorageService.setFont(payload.settings.font);
        if (payload.settings.accentColor) StorageService.setAccentColor(payload.settings.accentColor);
      }

      StorageService.notifySync();
      return true;
    } catch (err: any) {
      console.error("Backup import error", err);
      throw new Error(err.message || "Error al restaurar la copia de seguridad.");
    }
  },
};


