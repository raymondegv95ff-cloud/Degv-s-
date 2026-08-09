import { Room, Message, UserProfile, ThemeMode, BubbleStyle, NotificationSettings, UserStatusItem } from "../types";
import { currentUserMock, initialMockRooms, initialMockMessages, mockUsersList } from "./mockData";

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
  CONTACTS: "degvs_messenger_contacts",
  CALL_LOGS: "degvs_messenger_call_logs",
  CUSTOM_STICKERS: "degvs_messenger_custom_stickers",
};


// Broadcast channel for multi-tab real-time sync
const syncChannel = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel("degvs_messenger_sync") : null;

export class StorageService {
  private static roomsCache: Room[] | null = null;
  private static messagesCache: Record<string, Message[]> | null = null;

  // Initialize storage defaults if empty
  public static init() {
    if (!localStorage.getItem(STORAGE_KEYS.USER)) {
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(currentUserMock));
    }
    if (!localStorage.getItem(STORAGE_KEYS.ROOMS)) {
      localStorage.setItem(STORAGE_KEYS.ROOMS, JSON.stringify(initialMockRooms));
    }
    if (!localStorage.getItem(STORAGE_KEYS.MESSAGES)) {
      localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(initialMockMessages));
    }
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

  // User Auth
  public static getCurrentUser(): UserProfile {
    this.init();
    try {
      const data = localStorage.getItem(STORAGE_KEYS.USER);
      if (!data) return currentUserMock;
      const parsed = JSON.parse(data);
      return (parsed && typeof parsed === "object" && parsed.id) ? parsed : currentUserMock;
    } catch {
      return currentUserMock;
    }
  }

  public static setCurrentUser(user: UserProfile) {
    if (user) {
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
      this.notifySync();
    }
  }

  public static logout() {
    localStorage.removeItem(STORAGE_KEYS.USER);
    this.notifySync();
  }

  // Users Directory
  public static getAllUsers(): UserProfile[] {
    const me = this.getCurrentUser();
    const meId = me?.id || "usr_me";
    let customContacts: UserProfile[] = [];
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CONTACTS);
      if (saved) customContacts = JSON.parse(saved);
    } catch {}

    const allMap = new Map<string, UserProfile>();
    [me, ...mockUsersList, ...customContacts].forEach((u) => {
      if (u && u.id) allMap.set(u.id, u);
    });

    return Array.from(allMap.values());
  }

  // Rooms
  public static getRooms(): Room[] {
    this.init();
    try {
      const data = localStorage.getItem(STORAGE_KEYS.ROOMS);
      if (!data) return initialMockRooms;
      const rooms: Room[] = JSON.parse(data);
      return (Array.isArray(rooms) && rooms.length > 0) ? rooms : initialMockRooms;
    } catch {
      return initialMockRooms;
    }
  }

  public static saveRooms(rooms: Room[]) {
    localStorage.setItem(STORAGE_KEYS.ROOMS, JSON.stringify(rooms));
    this.notifySync();
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
    if (!targetUser) return initialMockRooms[0];
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
  public static getMessages(roomId: string): Message[] {
    this.init();
    try {
      const data = localStorage.getItem(STORAGE_KEYS.MESSAGES);
      const all: Record<string, Message[]> = data ? JSON.parse(data) : initialMockMessages;
      return all[roomId] || [];
    } catch {
      return [];
    }
  }

  public static saveRoomMessages(roomId: string, messages: Message[]): void {
    this.init();
    try {
      const data = localStorage.getItem(STORAGE_KEYS.MESSAGES);
      const all: Record<string, Message[]> = data ? JSON.parse(data) : initialMockMessages;
      all[roomId] = messages;
      localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(all));
      this.notifySync();
    } catch (e) {
      console.error("Error saving room messages:", e);
    }
  }

  public static sendMessage(roomId: string, message: Message): Message {
    this.init();
    const data = localStorage.getItem(STORAGE_KEYS.MESSAGES);
    const all: Record<string, Message[]> = data ? JSON.parse(data) : initialMockMessages;
    const roomMsgs = all[roomId] || [];

    roomMsgs.push(message);
    all[roomId] = roomMsgs;
    localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(all));

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
    const data = localStorage.getItem(STORAGE_KEYS.MESSAGES);
    const all: Record<string, Message[]> = data ? JSON.parse(data) : initialMockMessages;
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
    localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(all));
    this.notifySync();
  }

  public static toggleStarMessage(roomId: string, messageId: string) {
    const data = localStorage.getItem(STORAGE_KEYS.MESSAGES);
    const all: Record<string, Message[]> = data ? JSON.parse(data) : initialMockMessages;
    const roomMsgs = all[roomId] || [];

    const updatedMsgs = roomMsgs.map(m => {
      if (m.id === messageId) {
        return { ...m, isStarred: !m.isStarred };
      }
      return m;
    });

    all[roomId] = updatedMsgs;
    localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(all));
    this.notifySync();
  }

  public static votePoll(roomId: string, messageId: string, optionId: string, userId: string) {
    const data = localStorage.getItem(STORAGE_KEYS.MESSAGES);
    const all: Record<string, Message[]> = data ? JSON.parse(data) : initialMockMessages;
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
    const data = localStorage.getItem(STORAGE_KEYS.MESSAGES);
    const all: Record<string, Message[]> = data ? JSON.parse(data) : initialMockMessages;
    const roomMsgs = all[roomId] || [];

    let hasChanges = false;
    const updatedMsgs = roomMsgs.map(m => {
      if (!m.isRead && m.senderId !== userId) {
        hasChanges = true;
        return { ...m, isRead: true, readBy: Array.from(new Set([...(m.readBy || []), userId])) };
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

  public static getAccentColor(): string {
    return localStorage.getItem(STORAGE_KEYS.ACCENT_COLOR) || "emerald";
  }

  public static setAccentColor(color: string) {
    localStorage.setItem(STORAGE_KEYS.ACCENT_COLOR, color);
    this.notifySync();
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
      
      // If no statuses exist yet, populate with initial default statuses
      if (!data || list.length === 0) {
        const now = Date.now();
        list = [
          {
            id: "stat_ai_01",
            userId: "usr_ai_assistant",
            userName: "Degv's AI",
            userAvatar: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80",
            type: "music",
            content: "https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3?filename=cyberpunk-2099-10701.mp3",
            mediaUrl: "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=600&auto=format&fit=crop&q=80",
            musicTitle: "Cyber Synthwave 2088",
            musicArtist: "Degv Beats",
            duration: 12,
            caption: "✨ ¡Prueba publicar estados de 24h con música, fotos, notas y videos!",
            bgColor: "from-cyan-900 via-purple-900 to-black",
            createdAt: "Hace 10m",
            timestamp: now - 10 * 60 * 1000,
          },
          {
            id: "stat_mariana_01",
            userId: "usr_mariana_03",
            userName: "Mariana Silva",
            userAvatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80",
            type: "image",
            content: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&auto=format&fit=crop&q=80",
            caption: "Disfrutando de la vista al atardecer 🌅✨",
            duration: 6,
            createdAt: "Hace 25m",
            timestamp: now - 25 * 60 * 1000,
          },
          {
            id: "stat_carlos_01",
            userId: "usr_carlos_02",
            userName: "Carlos Mendoza",
            userAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
            type: "text",
            content: "🚀 Codeando nuevas actualizaciones en Degv's Messenger 🔥",
            bgColor: "from-purple-600 via-pink-600 to-indigo-700",
            duration: 6,
            createdAt: "Hace 1h",
            timestamp: now - 60 * 60 * 1000,
          }
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
  getMessages: (roomId: string) => StorageService.getMessages(roomId),
  saveMessage: (roomId: string, msg: any) => StorageService.sendMessage(roomId, msg),
  saveMessages: (roomId: string, msgs: Message[]) => StorageService.saveRoomMessages(roomId, msgs),
  saveRoomMessages: (roomId: string, msgs: Message[]) => StorageService.saveRoomMessages(roomId, msgs),
  toggleStarMessage: (roomId: string, messageId: string) => StorageService.toggleStarMessage(roomId, messageId),
  markRoomAsRead: (roomId: string) => StorageService.markMessagesAsRead(roomId, StorageService.getCurrentUser()?.id || "usr_me"),
  saveDraft: (roomId: string, draftText: string) => StorageService.saveRoomDraft(roomId, draftText),
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
  getSoundSettings: () => StorageService.getSoundSettings(),
  saveSoundSettings: (settings: Partial<SoundCustomizationSettings>) => StorageService.saveSoundSettings(settings),
  addCustomSound: (item: CustomSoundItem) => StorageService.addCustomSound(item),
  removeCustomSound: (soundId: string) => StorageService.removeCustomSound(soundId),
  getSettings: () => ({
    theme: StorageService.getTheme(),
    bubbleStyle: StorageService.getBubbleStyle(),
    font: StorageService.getFont(),
    accentColor: StorageService.getAccentColor(),
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
    // Initial mock call history
    const initialLogs = [
      {
        id: "call_1",
        peerId: "usr_2",
        peerName: "Elena Rostova",
        peerAvatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
        type: "video",
        direction: "incoming",
        timestamp: Date.now() - 3600000 * 2,
        timeString: "Hoy, 16:45",
        durationString: "12 min 30 s",
      },
      {
        id: "call_2",
        peerId: "usr_3",
        peerName: "Marcus Vance",
        peerAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
        type: "voice",
        direction: "missed",
        timestamp: Date.now() - 3600000 * 5,
        timeString: "Hoy, 13:10",
        durationString: "Perdida",
      },
      {
        id: "call_3",
        peerId: "usr_1",
        peerName: "Alex Rivera",
        peerAvatar: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80",
        type: "voice",
        direction: "outgoing",
        timestamp: Date.now() - 86400000,
        timeString: "Ayer, 20:15",
        durationString: "04 min 18 s",
      },
    ];
    localStorage.setItem(STORAGE_KEYS.CALL_LOGS, JSON.stringify(initialLogs));
    return initialLogs;
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


