import React, { useState, useEffect } from "react";
import { UserProfile, Room, Message, ThemeMode, BubbleStyle, LanguageCode, FontOption, AccentColorOption } from "./types";
import { storageService } from "./services/storageService";
import { soundService } from "./services/soundService";
import { notificationService } from "./services/notificationService";
import { indexedDbQueueService } from "./services/indexedDbQueueService";
import {
  sendMessage as sendFirestoreMessage,
  listenForMessages,
  listenForRoomMessages,
  updateMessageReactionInFirestore,
  saveRoomToFirestore,
  subscribeToFirebaseAuth,
} from "./services/firebase";

// Sidebar components
import { SidebarHeader } from "./components/Sidebar/SidebarHeader";
import { SearchBar } from "./components/Sidebar/SearchBar";
import { CategoryTabs } from "./components/Sidebar/CategoryTabs";
import { ChatList } from "./components/Sidebar/ChatList";
import { CallsList } from "./components/Sidebar/CallsList";

import { StatusView } from "./components/Sidebar/StatusView";
import { UserStatusItem } from "./types";
import { ChatArea } from "./components/Chat/ChatArea";
import { Clock, Plus } from "lucide-react";

// Modals
import { PhoneAuthModal } from "./components/Modals/PhoneAuthModal";
import { NewChatModal } from "./components/Modals/NewChatModal";
import { SecretVaultModal } from "./components/Modals/SecretVaultModal";
import { ViewContactDrawer } from "./components/Modals/ViewContactDrawer";
import { SettingsModal } from "./components/Modals/SettingsModal";
import { PollCreatorModal } from "./components/Modals/PollCreatorModal";
import { WallpaperSelectorModal } from "./components/Modals/WallpaperSelectorModal";
import { E2EEModal } from "./components/Modals/E2EEModal";
import { CallModal } from "./components/Modals/CallModal";
import { AndroidGuideModal } from "./components/Modals/AndroidGuideModal";
import { PublishDeployModal } from "./components/Modals/PublishDeployModal";
import { RoomLockModal } from "./components/Modals/RoomLockModal";
import { RoomLockSetupModal } from "./components/Modals/RoomLockSetupModal";
import { BackupModal } from "./components/Modals/BackupModal";
import { StarredMessagesModal } from "./components/Modals/StarredMessagesModal";
import { ForwardModal } from "./components/Modals/ForwardModal";
import { CreateGroupChannelModal } from "./components/Modals/CreateGroupChannelModal";
import { SupportBotModal } from "./components/Modals/SupportBotModal";
import { StorageCleanerModal } from "./components/Modals/StorageCleanerModal";
import { PlatformUpdateModal } from "./components/Modals/PlatformUpdateModal";
import { SmartReplyService } from "./services/smartReplyService";
import { platformUpdateService } from "./services/platformUpdateService";
import { CrossPlatformUpdateState } from "./types";


export const App: React.FC = () => {
  // Global State
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => storageService.getUser());
  const [rooms, setRooms] = useState<Room[]>(() => storageService.getRooms());
  const [activeChatId, setActiveChatId] = useState<string | null>("room_ai");
  const [activeCategory, setActiveCategory] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [showMobileChat, setShowMobileChat] = useState(false);

  // User Preferences & Features
  const [theme, setTheme] = useState<ThemeMode>(() => (storageService.getSettings().theme as ThemeMode) || "dark");
  const [bubbleStyle, setBubbleStyle] = useState<BubbleStyle>(() => storageService.getSettings().bubbleStyle || "rounded");
  const [font, setFont] = useState<FontOption>(() => (storageService.getSettings().font as FontOption) || "sans");
  const [accentColor, setAccentColor] = useState<AccentColorOption>(() => (storageService.getSettings().accentColor as AccentColorOption) || "emerald");
  const [autoTimePalette, setAutoTimePalette] = useState<boolean>(() => storageService.getAutoTimePalette());
  const [accentColorLight, setAccentColorLight] = useState<AccentColorOption>(() => storageService.getAccentColorLight());
  const [accentColorDark, setAccentColorDark] = useState<AccentColorOption>(() => storageService.getAccentColorDark());
  const [soundMuted, setSoundMuted] = useState(() => storageService.getSettings().soundMuted);
  const [language, setLanguage] = useState<LanguageCode>(() => (storageService.getSettings().language as LanguageCode) || "es");
  const [readReceiptsEnabled, setReadReceiptsEnabled] = useState(() => storageService.getReadReceiptsEnabled());
  const [customFolders, setCustomFolders] = useState<string[]>(() => storageService.getFolders());
  const [statuses, setStatuses] = useState<UserStatusItem[]>(() => storageService.getStatuses());

  // Modals Visibility
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(!currentUser);
  const [isNewChatOpen, setIsNewChatOpen] = useState(false);
  const [isVaultOpen, setIsVaultOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSupportBotOpen, setIsSupportBotOpen] = useState(false);
  const [isContactDrawerOpen, setIsContactDrawerOpen] = useState(false);
  const [isPollCreatorOpen, setIsPollCreatorOpen] = useState(false);
  const [isWallpaperOpen, setIsWallpaperOpen] = useState(false);
  const [isE2EEOpen, setIsE2EEOpen] = useState(false);
  const [isCallOpen, setIsCallOpen] = useState(false);
  const [callIsVideo, setCallIsVideo] = useState(false);
  const [isAndroidGuideOpen, setIsAndroidGuideOpen] = useState(false);
  const [isPublishDeployOpen, setIsPublishDeployOpen] = useState(false);
  const [isPlatformUpdateOpen, setIsPlatformUpdateOpen] = useState(false);
  const [platformUpdateState, setPlatformUpdateState] = useState<CrossPlatformUpdateState>(() =>
    platformUpdateService.getState()
  );
  const [unlockedRooms, setUnlockedRooms] = useState<Set<string>>(new Set());
  const [isRoomLockModalOpen, setIsRoomLockModalOpen] = useState(false);
  const [isLockSetupModalOpen, setIsLockSetupModalOpen] = useState(false);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
  const [isStorageCleanerOpen, setIsStorageCleanerOpen] = useState(false);
  const [isStarredModalOpen, setIsStarredModalOpen] = useState(false);
  const [forwardMessage, setForwardMessage] = useState<Message | null>(null);

  // Group & Channel Creation State
  const [isCreateGroupChannelOpen, setIsCreateGroupChannelOpen] = useState(false);
  const [createGroupChannelMode, setCreateGroupChannelMode] = useState<"group" | "channel">("group");

  // Offline Connection Loss Detection & IndexedDB Queue State
  const [isOnline, setIsOnline] = useState<boolean>(() => indexedDbQueueService.isOnline());
  const [queuedOfflineCount, setQueuedOfflineCount] = useState<number>(0);
  const [isSyncingQueue, setIsSyncingQueue] = useState<boolean>(false);
  const [syncToastMessage, setSyncToastMessage] = useState<string | null>(null);

  // Firebase Auth State Listener
  useEffect(() => {
    const unsubscribe = subscribeToFirebaseAuth((fbUser) => {
      if (fbUser) {
        setCurrentUser(fbUser);
        storageService.saveUser(fbUser);
        setIsAuthModalOpen(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // Firestore Real-Time Message Listener for direct inbox
  useEffect(() => {
    if (!currentUser?.id) return;
    const unsubscribe = listenForMessages(currentUser.id, (incomingMsg) => {
      setMessagesMap((prev) => {
        const roomMsgs = prev[incomingMsg.roomId] || [];
        if (roomMsgs.some((m) => m.id === incomingMsg.id || (m.timestamp === incomingMsg.timestamp && m.content === incomingMsg.content))) {
          return prev;
        }
        const updated = [...roomMsgs, incomingMsg];
        storageService.saveRoomMessages(incomingMsg.roomId, updated);
        return { ...prev, [incomingMsg.roomId]: updated };
      });

      if (incomingMsg.senderId !== currentUser.id) {
        if (!soundMuted) soundService.playReceiveSound();
        notificationService.sendNotification(
          incomingMsg.senderName || "Nuevo mensaje",
          incomingMsg.content,
          incomingMsg.roomId,
          "messages"
        );
      }
    });

    return () => unsubscribe();
  }, [currentUser?.id, soundMuted]);

  // Firestore Real-Time Room Messages Listener
  useEffect(() => {
    if (!activeChatId) return;
    const unsubscribe = listenForRoomMessages(activeChatId, (cloudMsgs) => {
      if (cloudMsgs.length > 0) {
        setMessagesMap((prev) => {
          const localMsgs = prev[activeChatId] || [];
          const mergedMap = new Map<string, Message>();
          localMsgs.forEach((m) => mergedMap.set(m.id, m));
          cloudMsgs.forEach((m) => mergedMap.set(m.id, m));
          const mergedList = Array.from(mergedMap.values()).sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
          storageService.saveRoomMessages(activeChatId, mergedList);
          return { ...prev, [activeChatId]: mergedList };
        });
      }
    });
    return () => unsubscribe();
  }, [activeChatId]);

  useEffect(() => {
    platformUpdateService.init();
    const unsubscribe = platformUpdateService.subscribe((st) => {
      setPlatformUpdateState(st);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsubscribe = indexedDbQueueService.subscribe((onlineStatus, count) => {
      setIsOnline(onlineStatus);
      setQueuedOfflineCount(count);
      if (onlineStatus && count > 0) {
        handleAutoSyncQueue();
      }
    });

    return () => unsubscribe();
  }, []);

  const handleAutoSyncQueue = async () => {
    setIsSyncingQueue(true);
    const result = await indexedDbQueueService.syncQueue(async (item) => {
      const updatedMsg: Message = { ...item.message, status: "sent" };
      setMessagesMap((prev) => {
        const roomList = prev[item.roomId] || [];
        const nextList = roomList.map((m) => (m.id === item.messageId ? updatedMsg : m));
        storageService.saveRoomMessages(item.roomId, nextList);
        return { ...prev, [item.roomId]: nextList };
      });
      return true;
    });

    setIsSyncingQueue(false);
    if (result.syncedCount > 0) {
      if (!soundMuted) soundService.playReceiveSound();
      setSyncToastMessage(`¡Conexión restablecida! ${result.syncedCount} mensajes sincronizados desde IndexedDB.`);
      setTimeout(() => setSyncToastMessage(null), 4000);
    }
  };

  // Star Message Handler
  const handleStarMessage = (messageId: string) => {
    if (!activeChatId) return;
    setMessagesMap((prev) => {
      const msgs = prev[activeChatId] || [];
      const updated = msgs.map((m) =>
        m.id === messageId ? { ...m, isStarred: !m.isStarred } : m
      );
      storageService.saveRoomMessages(activeChatId, updated);
      return { ...prev, [activeChatId]: updated };
    });
  };

  // Forward Message Handler
  const handleForwardToRoom = (targetRoomId: string, msgToForward: Message) => {
    const newMsg: Message = {
      id: `msg_fw_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      roomId: targetRoomId,
      senderId: currentUser?.id || "usr_me",
      senderName: `${currentUser?.firstName || "Yo"} ${currentUser?.lastName || ""}`.trim(),
      senderAvatar: currentUser?.avatarUrl,
      content: msgToForward.content,
      type: msgToForward.type,
      mediaUrl: msgToForward.mediaUrl,
      createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      timestamp: Date.now(),
      isRead: true,
    };

    setMessagesMap((prev) => {
      const existing = prev[targetRoomId] || [];
      const updated = [...existing, newMsg];
      storageService.saveRoomMessages(targetRoomId, updated);
      return { ...prev, [targetRoomId]: updated };
    });

    setRooms((prev) =>
      prev.map((r) =>
        r.id === targetRoomId
          ? {
              ...r,
              lastMessage: newMsg.content || "Mensaje reenviado",
              lastMessageTime: newMsg.createdAt,
            }
          : r
      )
    );
  };

  // Call peer info state
  const [activeCallPeer, setActiveCallPeer] = useState<{ id: string; name: string; avatarUrl?: string } | null>(null);

  // Trigger call and save call log
  const handleStartCall = (peerId: string, isVideo: boolean, peerName?: string) => {
    const targetRoom = rooms.find((r) => r.id === peerId || r.participants?.some((p) => p.id === peerId));
    const finalName = peerName || targetRoom?.name || activeRoom?.name || "Contacto";
    const finalAvatar = targetRoom?.avatarUrl || activeRoom?.avatarUrl;

    setActiveCallPeer({ id: peerId, name: finalName, avatarUrl: finalAvatar });
    setCallIsVideo(isVideo);
    setIsCallOpen(true);

    // Save call log in storage
    storageService.saveCallLog({
      id: `call_${Date.now()}`,
      peerId,
      peerName: finalName,
      peerAvatar: finalAvatar,
      type: isVideo ? "video" : "voice",
      direction: "outgoing",
      timestamp: Date.now(),
      timeString: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    });
  };

  // Active Chat Message Reply Quote State
  const [replyToMessage, setReplyToMessage] = useState<Message | null>(null);

  // All Messages by Room ID
  const [messagesMap, setMessagesMap] = useState<Record<string, Message[]>>(() => {
    const map: Record<string, Message[]> = {};
    const storedRooms = storageService.getRooms();
    storedRooms.forEach((r) => {
      map[r.id] = storageService.getMessages(r.id);
    });
    return map;
  });

  // Request notification permissions
  useEffect(() => {
    notificationService.requestPermission();
  }, []);

  // Dynamic Day/Night Automatic Palette Engine
  useEffect(() => {
    const applyDynamicPalette = () => {
      if (autoTimePalette) {
        const calculated = storageService.calculateTimeOfDayPalette();
        if (calculated.theme !== theme) {
          setTheme(calculated.theme);
        }
        if (calculated.accentColor !== accentColor) {
          setAccentColor(calculated.accentColor);
        }
        storageService.applyAccentColorToCss(calculated.accentColor);
      } else {
        storageService.applyAccentColorToCss(accentColor);
      }
    };

    applyDynamicPalette();
    const interval = setInterval(applyDynamicPalette, 30000); // check periodically every 30s
    return () => clearInterval(interval);
  }, [autoTimePalette, accentColorLight, accentColorDark, accentColor, theme]);

  // Sync theme & font changes to html/body
  useEffect(() => {
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    document.body.className = `font-${font}-app bg-[#050505] text-slate-100 antialiased selection:bg-[#00E676]/30 overflow-hidden`;
  }, [theme, font]);

  // Active room object
  const activeRoom = rooms.find((r) => r.id === activeChatId) || null;

  // Active messages with Disappearing Messages (ephemeral) filter applied
  const rawActiveMessages = activeChatId ? messagesMap[activeChatId] || [] : [];
  const activeMessages = React.useMemo(() => {
    if (!activeRoom || !activeRoom.disappearingTimer || activeRoom.disappearingTimer === "off") {
      return rawActiveMessages;
    }
    const now = Date.now();
    let maxAgeMs = 0;
    if (activeRoom.disappearingTimer === "24h") maxAgeMs = 24 * 3600 * 1000;
    else if (activeRoom.disappearingTimer === "7d") maxAgeMs = 7 * 24 * 3600 * 1000;
    else if (activeRoom.disappearingTimer === "90d") maxAgeMs = 90 * 24 * 3600 * 1000;

    if (maxAgeMs <= 0) return rawActiveMessages;

    return rawActiveMessages.filter((m) => {
      if (m.isStarred) return true;
      const msgTime = m.timestamp || new Date(m.createdAt).getTime();
      return now - msgTime < maxAgeMs;
    });
  }, [activeRoom, rawActiveMessages]);

  // Total unread count
  const unreadTotal = rooms.reduce((acc, r) => acc + r.unreadCount, 0);

  // Select room handler with Lock Check
  const handleSelectRoom = (roomId: string) => {
    const targetRoom = rooms.find((r) => r.id === roomId);
    setActiveChatId(roomId);
    setShowMobileChat(true);

    // Reset unread count
    setRooms((prev) =>
      prev.map((r) => (r.id === roomId ? { ...r, unreadCount: 0 } : r))
    );
    storageService.markRoomAsRead(roomId);

    // Check if room is locked and not unlocked yet
    if (targetRoom?.isLocked && !unlockedRooms.has(roomId)) {
      setIsRoomLockModalOpen(true);
    }
  };

  // Handler for Updating Disappearing Timer
  const handleUpdateDisappearingTimer = (timer: "off" | "24h" | "7d" | "90d") => {
    if (!activeChatId) return;
    const updatedRooms = rooms.map((r) =>
      r.id === activeChatId ? { ...r, disappearingTimer: timer } : r
    );
    setRooms(updatedRooms);
    storageService.saveRooms(updatedRooms);
  };

  // Handler for Configuring Chat Lock PIN
  const handleSaveRoomPin = (pin: string | null) => {
    if (!activeChatId) return;
    const updatedRooms = rooms.map((r) => {
      if (r.id === activeChatId) {
        return {
          ...r,
          isLocked: !!pin,
          pinCode: pin || undefined,
        };
      }
      return r;
    });
    setRooms(updatedRooms);
    storageService.saveRooms(updatedRooms);
    if (pin) {
      setUnlockedRooms((prev) => new Set(prev).add(activeChatId));
    }
  };

  // Auth completion handler
  const handleAuthComplete = (user: UserProfile) => {
    setCurrentUser(user);
    storageService.saveUser(user);
    setIsAuthModalOpen(false);
  };

  // Pin Message Handler
  const handlePinMessage = (messageId: string) => {
    if (!activeChatId) return;
    setRooms((prev) =>
      prev.map((r) => {
        if (r.id === activeChatId) {
          const newPinnedId = r.pinnedMessageId === messageId ? undefined : messageId;
          const updated = { ...r, pinnedMessageId: newPinnedId };
          storageService.saveRoom(updated);
          return updated;
        }
        return r;
      })
    );
  };

  // Custom Folders Handler
  const handleAddFolder = (folderName: string) => {
    const updated = storageService.addFolder(folderName);
    setCustomFolders(updated);
  };

  // Toggle Archive Handler
  const handleToggleArchive = (roomId: string) => {
    setRooms((prev) =>
      prev.map((r) => {
        if (r.id === roomId) {
          const updated = { ...r, isArchived: !r.isArchived };
          storageService.saveRoom(updated);
          return updated;
        }
        return r;
      })
    );
  };

  // Assign Folder Handler
  const handleAssignFolder = (roomId: string, folderName: string | undefined) => {
    setRooms((prev) =>
      prev.map((r) => {
        if (r.id === roomId) {
          const updated = { ...r, folder: folderName };
          storageService.saveRoom(updated);
          return updated;
        }
        return r;
      })
    );
  };

  // Add Status Handler
  const handleAddStatus = (newStatus: UserStatusItem) => {
    const updated = storageService.saveStatus(newStatus);
    setStatuses(updated);
  };

  // Toggle Read Receipts
  const handleToggleReadReceipts = () => {
    const next = !readReceiptsEnabled;
    setReadReceiptsEnabled(next);
    storageService.saveReadReceiptsEnabled(next);
  };

  // Update Avatar Handler
  const handleUpdateAvatar = (avatarUrl: string) => {
    if (!currentUser) return;
    const updatedUser = { ...currentUser, avatarUrl };
    setCurrentUser(updatedUser);
    storageService.saveUser(updatedUser);
  };

  // Draft change handler
  const handleDraftChange = (text: string) => {
    setRooms((prev) =>
      prev.map((r) => (r.id === activeChatId ? { ...r, draftText: text } : r))
    );
    storageService.saveDraft(activeChatId, text);
  };

  // Smart Reply Suggestions Generator with Entity Detection
  const getSmartReplySuggestions = (): string[] => {
    if (!activeMessages.length) return ["¡Hola! 👋", "¿Cómo estás?", "¡Genial! 🚀"];
    const lastMsg = activeMessages[activeMessages.length - 1];
    if (lastMsg.senderId === currentUser?.id) return [];

    const analysis = SmartReplyService.analyzeMessage(lastMsg, activeRoom?.name || "Chat");
    return analysis.suggestions;
  };

  // Send Message Handler
  const handleSendMessage = async (
    content: string,
    type: "text" | "image" | "audio" | "file" | "sticker" = "text",
    mediaUrl?: string
  ) => {
    if (!activeChatId || !currentUser) return;

    const isCurrentlyOnline = indexedDbQueueService.isOnline();

    const newMsg: Message = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      roomId: activeChatId,
      senderId: currentUser.id,
      senderName: `${currentUser.firstName} ${currentUser.lastName}`,
      type: type as any,
      content,
      mediaUrl,
      createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      timestamp: Date.now(),
      isRead: true,
      status: isCurrentlyOnline ? "sent" : "queued",
      replyToSnippet: replyToMessage
        ? {
            id: replyToMessage.id,
            senderName: replyToMessage.senderName,
            text: replyToMessage.content,
          }
        : undefined,
    };

    // If online, dispatch message to Firebase Firestore in real-time
    if (isCurrentlyOnline && activeRoom) {
      const otherParticipant = activeRoom.participants?.find((p) => p && p.id !== currentUser.id);
      const targetReceiverId = otherParticipant ? otherParticipant.id : "usr_all";

      sendFirestoreMessage(currentUser.id, targetReceiverId, content, {
        id: newMsg.id,
        roomId: activeChatId,
        senderName: `${currentUser.firstName || "Yo"} ${currentUser.lastName || ""}`.trim(),
        senderAvatar: currentUser.avatarUrl,
        type: newMsg.type,
        mediaUrl: newMsg.mediaUrl,
        poll: newMsg.poll,
      }).catch((err) => {
        console.warn("Firestore send warning:", err);
      });
    }

    // If offline, save in IndexedDB queue
    if (!isCurrentlyOnline) {
      indexedDbQueueService.enqueueMessage(activeChatId, newMsg);
    }

    // Record stats for Recharts
    try {
      const todayKey = new Date().toISOString().split("T")[0];
      const raw = localStorage.getItem("degvs_messenger_daily_stats") || "{}";
      const statsObj = JSON.parse(raw);
      if (!statsObj[todayKey]) statsObj[todayKey] = { messages: 0, usageMinutes: 0 };
      statsObj[todayKey].messages = (statsObj[todayKey].messages || 0) + 1;
      localStorage.setItem("degvs_messenger_daily_stats", JSON.stringify(statsObj));
    } catch {}

    // Play send audio sound
    if (!soundMuted) soundService.playSendSound();

    // Clear reply snippet
    setReplyToMessage(null);

    // Save message locally
    const updatedMessages = [...(messagesMap[activeChatId] || []), newMsg];
    setMessagesMap((prev) => ({ ...prev, [activeChatId]: updatedMessages }));
    storageService.saveMessage(activeChatId, newMsg);

    // Update Room last message info
    const nowTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    setRooms((prev) =>
      prev.map((r) =>
        r.id === activeChatId
          ? {
              ...r,
              lastMessage: type === "image" ? "📷 Imagen" : type === "sticker" ? "⭐ Sticker" : type === "audio" ? "🎵 Nota de voz" : content,
              lastMessageTime: nowTime,
              draftText: "",
            }
          : r
      )
    );

    // Only handle AI response if the user is explicitly in the dedicated Degv's AI chat or typing /imagine
    if (isCurrentlyOnline && (activeRoom?.isAiChat || content.startsWith("/imagine"))) {
      handleAiResponse(activeChatId, content, updatedMessages);
    }
  };

  // AI Response Handler via Express Server API
  const handleAiResponse = async (roomId: string, userPrompt: string, history: Message[]) => {
    try {
      if (userPrompt.startsWith("/imagine")) {
        // AI Image Generation Endpoint
        const promptText = userPrompt.replace("/imagine", "").trim();
        const res = await fetch("/api/ai/generate-image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: promptText || "futuristic cyber city neon light" }),
        });
        const data = await res.json();

        const aiMsg: Message = {
          id: `msg_ai_${Date.now()}`,
          roomId,
          senderId: "usr_ai_assistant",
          senderName: "Degv's AI",
          type: "image",
          content: `Imagen generada para: "${promptText}"`,
          mediaUrl: data.imageUrl || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80",
          createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          timestamp: Date.now(),
          isRead: true,
        };

        if (!soundMuted) soundService.playReceiveSound();
        setMessagesMap((prev) => ({ ...prev, [roomId]: [...(prev[roomId] || []), aiMsg] }));
        storageService.saveMessage(roomId, aiMsg);
        notificationService.sendNotification("Degv's AI", `Imagen generada: "${promptText}"`, roomId, "aiActivity");
        return;
      }

      // Standard Gemini Chat Endpoint
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: userPrompt, history: history.slice(-6) }),
      });
      const data = await res.json();

      const aiText = data.text || "Lo siento, tuve un problema procesando tu mensaje.";

      const aiMsg: Message = {
        id: `msg_ai_${Date.now()}`,
        roomId,
        senderId: "usr_ai_assistant",
        senderName: "Degv's AI",
        type: "text",
        content: aiText,
        createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        timestamp: Date.now(),
        isRead: true,
      };

      if (!soundMuted) soundService.playReceiveSound();
      setMessagesMap((prev) => ({ ...prev, [roomId]: [...(prev[roomId] || []), aiMsg] }));
      storageService.saveMessage(roomId, aiMsg);
      notificationService.sendNotification("Degv's AI", aiText, roomId, "aiActivity");

      setRooms((prev) =>
        prev.map((r) =>
          r.id === roomId
            ? { ...r, lastMessage: aiText, lastMessageTime: aiMsg.createdAt }
            : r
        )
      );
    } catch (err) {
      console.error("Error in AI response:", err);
    }
  };

  // Reactions & Poll voting handlers
  const handleReactMessage = (messageId: string, emoji: string) => {
    if (!activeChatId || !currentUser) return;
    setMessagesMap((prev) => {
      const msgs = prev[activeChatId] || [];
      const updated = msgs.map((m) => {
        if (m.id === messageId) {
          const reactions = m.reactions || [];
          const existingReactionIndex = reactions.findIndex((r) => r.emoji === emoji);
          let newReactions;
          if (existingReactionIndex >= 0) {
            const current = reactions[existingReactionIndex];
            const hasVoted = current.users.includes(currentUser.id);
            if (hasVoted) {
              newReactions = reactions
                .map((r, idx) =>
                  idx === existingReactionIndex
                    ? { ...r, count: r.count - 1, users: r.users.filter((u) => u !== currentUser.id) }
                    : r
                )
                .filter((r) => r.count > 0);
            } else {
              newReactions = reactions.map((r, idx) =>
                idx === existingReactionIndex ? { ...r, count: r.count + 1, users: [...r.users, currentUser.id] } : r
              );
            }
          } else {
            newReactions = [...reactions, { emoji, count: 1, users: [currentUser.id] }];
          }

          // Persist to Firestore
          updateMessageReactionInFirestore(messageId, newReactions);

          return {
            ...m,
            reactions: newReactions,
          };
        }
        return m;
      });
      storageService.saveRoomMessages(activeChatId, updated);
      return { ...prev, [activeChatId]: updated };
    });
  };

  const handleVotePoll = (messageId: string, optionId: string) => {
    if (!activeChatId || !currentUser) return;
    setMessagesMap((prev) => {
      const msgs = prev[activeChatId] || [];
      const updated = msgs.map((m) => {
        if (m.id === messageId && m.poll) {
          const newOptions = m.poll.options.map((opt) => {
            if (opt.id === optionId && !opt.votes.includes(currentUser.id)) {
              return { ...opt, votes: [...opt.votes, currentUser.id] };
            }
            return opt;
          });
          return {
            ...m,
            poll: { ...m.poll, options: newOptions, totalVotes: m.poll.totalVotes + 1 },
          };
        }
        return m;
      });
      return { ...prev, [activeChatId]: updated };
    });
  };

  const handleTranscribeAudio = async (message: Message) => {
    try {
      const res = await fetch("/api/ai/transcribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ audioUrl: message.mediaUrl }),
      });
      const data = await res.json();
      const transcript = data.transcript || "Nota de voz transcrita: ¡Hola! ¿Cómo estás?";

      setMessagesMap((prev) => {
        const msgs = prev[message.roomId] || [];
        const updated = msgs.map((m) => (m.id === message.id ? { ...m, audioTranscript: transcript } : m));
        return { ...prev, [message.roomId]: updated };
      });
    } catch {
      // Fallback
      setMessagesMap((prev) => {
        const msgs = prev[message.roomId] || [];
        const updated = msgs.map((m) => (m.id === message.id ? { ...m, audioTranscript: "Transcripción: Mensaje de audio recibido." } : m));
        return { ...prev, [message.roomId]: updated };
      });
    }
  };

  const handleTranslateText = async (message: Message) => {
    try {
      const res = await fetch("/api/ai/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: message.content, targetLanguage: "es" }),
      });
      const data = await res.json();
      const translated = data.translatedText || `[Traducción]: ${message.content}`;

      setMessagesMap((prev) => {
        const msgs = prev[message.roomId] || [];
        const updated = msgs.map((m) => (m.id === message.id ? { ...m, translatedText: translated } : m));
        return { ...prev, [message.roomId]: updated };
      });
    } catch {
      // Fallback
    }
  };

  const handleCreatePoll = (question: string, options: string[]) => {
    if (!activeChatId || !currentUser) return;
    const pollMessage: Message = {
      id: `msg_poll_${Date.now()}`,
      roomId: activeChatId,
      senderId: currentUser.id,
      senderName: `${currentUser.firstName} ${currentUser.lastName}`,
      type: "poll",
      content: `Encuesta: ${question}`,
      poll: {
        question,
        options: options.map((opt, i) => ({ id: `opt_${i}`, text: opt, votes: [] })),
        totalVotes: 0,
      },
      createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      timestamp: Date.now(),
      isRead: true,
    };

    setMessagesMap((prev) => ({ ...prev, [activeChatId]: [...(prev[activeChatId] || []), pollMessage] }));
    storageService.saveMessage(activeChatId, pollMessage);
  };

  // Delete Chat Handler
  const handleDeleteChat = (roomId: string) => {
    setRooms((prev) => prev.filter((r) => r.id !== roomId));
    storageService.deleteRoom(roomId);
    if (activeChatId === roomId) {
      const remaining = rooms.filter((r) => r.id !== roomId);
      setActiveChatId(remaining[0]?.id || null);
      if (remaining.length === 0) setShowMobileChat(false);
    }
  };

  // Export Chat JSON Handler
  const handleExportChat = () => {
    if (!activeRoom) return;
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(activeMessages, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `Degv_Chat_${activeRoom.name}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Select User from Search Bar
  const handleSelectUserFromSearch = (u: UserProfile) => {
    if (!u) return;
    storageService.saveContact(u);

    let existing = rooms.find((r) => r && r.participants && r.participants.some((p) => p && p.id === u.id));
    if (!existing) {
      existing = {
        id: `room_${u.id}_${Date.now()}`,
        name: `${u.firstName || ""} ${u.lastName || ""}`.trim() || u.username || "Contacto",
        avatarUrl: u.avatarUrl,
        unreadCount: 0,
        participants: [u],
        lastMessage: "Conversación iniciada",
        lastMessageTime: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setRooms((prev) => [existing!, ...prev]);
      storageService.saveRoom(existing);
    }
    handleSelectRoom(existing.id);
    setSearchTerm("");
    setShowMobileChat(true);
  };

  return (
    <div className="flex h-screen h-[100dvh] w-screen w-[100dvw] max-h-[100dvh] max-w-[100dvw] fixed inset-0 overflow-hidden bg-[#050505] text-slate-100 font-sans antialiased selection:bg-[#00E676] selection:text-slate-950">
      {/* LEFT SIDEBAR COLUMN (Hidden on Mobile when chat active) */}
      <div
        className={`w-full md:w-80 lg:w-[320px] flex flex-col h-full bg-[#0a0a0a]/80 backdrop-blur-xl border-r border-white/5 z-10 shrink-0 transition-all ${
          showMobileChat ? "hidden md:flex" : "flex"
        }`}
      >
        {/* Header with profile and action icons */}
        <SidebarHeader
          currentUser={currentUser || {
            id: "guest",
            username: "invitado",
            firstName: "Usuario",
            lastName: "",
            phone: "",
            countryCode: "",
            avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
            status: "online",
          }}
          activeFilter={activeCategory}
          onFilterChange={setActiveCategory}
          onOpenNewChat={() => setIsNewChatOpen(true)}
          onOpenVault={() => setIsVaultOpen(true)}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onOpenAndroidGuide={() => setIsAndroidGuideOpen(true)}
          onOpenPublishDeploy={() => setIsPublishDeployOpen(true)}
          onOpenPlatformUpdate={() => setIsPlatformUpdateOpen(true)}
          isUpdateAvailable={platformUpdateState.isUpdateAvailable}
          isOptimizing={platformUpdateState.isUpdating}
          theme={theme}
          onToggleTheme={() => {
            const next = theme === "dark" ? "light" : "dark";
            setTheme(next);
            storageService.saveSettings({ theme: next });
          }}
          serverStatus={isOnline ? "online" : "offline"}
        />

        {/* Global Search Bar */}
        <SearchBar
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          onClear={() => setSearchTerm("")}
        />

        {/* Category Pill Tabs */}
        <CategoryTabs
          activeCategory={activeCategory}
          onCategoryChange={setActiveCategory}
          unreadTotal={unreadTotal}
          customFolders={customFolders}
          onAddFolder={handleAddFolder}
        />

        {/* Scrollable Content: Calls, Statuses, or Chats */}
        {activeCategory === "calls" ? (
          <CallsList onStartCall={handleStartCall} />
        ) : activeCategory === "status" ? (
          <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-[#060a12]">
            <div className="bg-slate-900/90 border border-[#00E676]/40 rounded-3xl p-5 text-center space-y-3.5 shadow-xl">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#00E676] to-emerald-700 text-black flex items-center justify-center mx-auto shadow-[0_0_20px_rgba(0,230,118,0.4)]">
                <Clock className="w-7 h-7 stroke-[2.5]" />
              </div>
              <div>
                <h3 className="font-black text-white text-base">Carpeta de Estados 24h</h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Publica o mira estados de tus contactos estilo WhatsApp con música, fotos, notas y videos.
                </p>
              </div>
              <button
                id="btn-sidebar-publish-status"
                onClick={() => {
                  const mainPublishBtn = document.getElementById("btn-publish-status-main");
                  if (mainPublishBtn) {
                    mainPublishBtn.click();
                  } else {
                    // Fallback toggle
                    setActiveCategory("status");
                  }
                }}
                className="w-full py-3 px-4 rounded-2xl bg-[#00E676] hover:bg-[#00c853] text-black font-black text-xs shadow-[0_0_20px_rgba(0,230,118,0.4)] flex items-center justify-center gap-2 transition hover:scale-102"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>Publicar Nuevo Estado</span>
              </button>
            </div>

            {/* Quick status preview list */}
            <div className="space-y-2.5 pt-2">
              <span className="text-[11px] font-black text-[#00E676] uppercase tracking-wider px-1">
                Estados Activos ({statuses.length})
              </span>
              {statuses.length === 0 ? (
                <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800 text-center text-xs text-slate-500">
                  No hay estados activos actualmente.
                </div>
              ) : (
                <div className="space-y-2">
                  {statuses.slice(0, 6).map((st) => (
                    <div
                      key={st.id}
                      onClick={() => {
                        const targetCard = document.getElementById(`status-card-group-${st.userId}`);
                        if (targetCard) targetCard.click();
                      }}
                      className="flex items-center gap-3 p-3 rounded-2xl bg-slate-900/70 hover:bg-slate-800/90 border border-slate-800 cursor-pointer transition shadow-sm group"
                    >
                      <div className="relative">
                        <img
                          src={st.userAvatar}
                          alt={st.userName}
                          className="w-10 h-10 rounded-full object-cover ring-2 ring-[#00E676] p-0.5"
                        />
                        <span className="absolute -bottom-1 -right-1 text-xs">
                          {st.type === "music" ? "🎵" : st.type === "video" ? "🎥" : st.type === "image" ? "📷" : "📝"}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-extrabold text-xs text-slate-200 group-hover:text-[#00E676] transition truncate">
                          {st.userName}
                        </p>
                        <p className="text-[10px] text-slate-400 truncate">
                          {st.type === "music" ? st.musicTitle || "Música" : st.type === "image" ? "Foto / Imagen" : st.type === "video" ? "Video de 15s" : st.content}
                        </p>
                      </div>
                      <span className="text-[10px] text-emerald-400 font-bold">{st.createdAt}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <ChatList
            rooms={rooms}
            activeChatId={activeChatId}
            onSelectRoom={handleSelectRoom}
            activeCategory={activeCategory}
            onCategoryChange={setActiveCategory}
            searchTerm={searchTerm}
            onOpenNewChat={() => setIsNewChatOpen(true)}
            customFolders={customFolders}
            onToggleArchive={handleToggleArchive}
            onAssignFolder={handleAssignFolder}
            onDeleteChat={handleDeleteChat}
            allUsers={storageService.getContacts()}
            currentUser={currentUser || undefined}
            onSelectUser={handleSelectUserFromSearch}
            onOpenCreateGroup={() => {
              setCreateGroupChannelMode("group");
              setIsCreateGroupChannelOpen(true);
            }}
            onOpenCreateChannel={() => {
              setCreateGroupChannelMode("channel");
              setIsCreateGroupChannelOpen(true);
            }}
          />
        )}

      </div>

      {/* RIGHT MAIN CHAT AREA COLUMN */}
      <div
        className={`flex-1 flex flex-col h-full bg-[#050505] transition-all relative overflow-hidden ${
          !showMobileChat && activeCategory !== "status" ? "hidden md:flex" : "flex"
        }`}
      >
        {/* Offline Connection Loss Detection & IndexedDB Queue Banner */}
        {!isOnline && (
          <div className="bg-amber-950/90 border-b border-amber-500/40 px-4 py-2 text-amber-200 text-xs font-bold flex items-center justify-between z-30 shadow-lg backdrop-blur-md shrink-0">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
              <span>Modo Sin Conexión:</span>
              <span className="text-[11px] text-amber-300 font-normal">
                {queuedOfflineCount > 0
                  ? `${queuedOfflineCount} mensaje(s) guardado(s) en cola local (IndexedDB) esperando reconexión.`
                  : "Los mensajes enviados se guardarán en IndexedDB y se sincronizarán al reconectar."}
              </span>
            </div>
            <button
              onClick={() => handleAutoSyncQueue()}
              disabled={isSyncingQueue}
              className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 text-[11px] font-black rounded-xl transition shadow active:scale-95 shrink-0"
            >
              {isSyncingQueue ? "Sincronizando..." : "Reintentar Sincronización"}
            </button>
          </div>
        )}

        {/* Sync Toast Notification */}
        {syncToastMessage && (
          <div className="bg-emerald-950/90 border-b border-emerald-500/40 px-4 py-2 text-emerald-300 text-xs font-extrabold flex items-center justify-between z-30 shadow-lg backdrop-blur-md animate-in slide-in-from-top duration-200 shrink-0">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>{syncToastMessage}</span>
            </div>
            <button
              onClick={() => setSyncToastMessage(null)}
              className="text-emerald-400 hover:text-emerald-200 text-xs font-bold px-2 py-0.5"
            >
              ✕
            </button>
          </div>
        )}
        {activeCategory === "status" ? (
          <StatusView
            currentUser={
              currentUser || {
                id: "guest",
                username: "invitado",
                firstName: "Usuario",
                lastName: "",
                phone: "",
                countryCode: "",
                avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
                status: "online",
              }
            }
            statuses={statuses}
            onAddStatus={handleAddStatus}
            onClose={() => setActiveCategory("all")}
            onSendMessageToUser={(userId, text) => {
              const targetRoom = rooms.find((r) => r.participants?.some((p) => p.id === userId)) || rooms[0];
              if (targetRoom) {
                handleSelectRoom(targetRoom.id);
                handleSendMessage(text, "text");
                setActiveCategory("all");
              }
            }}
          />
        ) : (
          <ChatArea
            activeRoom={activeRoom}
            messages={activeMessages}
            currentUserId={currentUser?.id || "usr_me"}
            bubbleStyle={bubbleStyle}
            onSendMessage={handleSendMessage}
            onDeleteChat={handleDeleteChat}
            onBackMobile={() => setShowMobileChat(false)}
            onOpenContactDrawer={() => setIsContactDrawerOpen(true)}
            onOpenNewChat={() => setIsNewChatOpen(true)}
            onStartCall={(isVideo) => {
              setCallIsVideo(isVideo);
              setIsCallOpen(true);
            }}
            onExportChat={handleExportChat}
            onOpenWallpaperSelector={() => setIsWallpaperOpen(true)}
            onOpenE2EEModal={() => setIsE2EEOpen(true)}
            onOpenStarredMessages={() => setIsStarredModalOpen(true)}
            onOpenPollCreator={() => setIsPollCreatorOpen(true)}
            onReplyMessage={(msg) => setReplyToMessage(msg)}
            replyToMessage={replyToMessage}
            onCancelReply={() => setReplyToMessage(null)}
            onReactMessage={handleReactMessage}
            onStarMessage={handleStarMessage}
            onPinMessage={handlePinMessage}
            onForwardMessage={(msg) => setForwardMessage(msg)}
            onVotePoll={handleVotePoll}
            onTranscribeAudio={handleTranscribeAudio}
            onTranslateText={handleTranslateText}
            onDraftChange={handleDraftChange}
            smartReplySuggestions={getSmartReplySuggestions()}
            onSelectSmartReply={(text) => handleSendMessage(text, "text")}
            readReceiptsEnabled={readReceiptsEnabled}
            onOpenLockSetup={() => setIsLockSetupModalOpen(true)}
          />
        )}
      </div>

      {/* MODALS & DRAWERS */}
      <PhoneAuthModal
        isOpen={isAuthModalOpen}
        onComplete={handleAuthComplete}
      />

      <NewChatModal
        isOpen={isNewChatOpen}
        onClose={() => setIsNewChatOpen(false)}
        users={storageService.getContacts()}
        currentUser={currentUser || undefined}
        onSelectUser={(u) => {
          if (!u) return;
          let targetUser = u;
          // Guard against selecting currentUser
          if (currentUser && targetUser.id === currentUser.id) {
            targetUser = {
              ...targetUser,
              id: `usr_contact_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
              firstName: `${targetUser.firstName || "Contacto"} (Contacto)`,
            };
          }

          // Ensure contact is saved in persistent storage
          storageService.saveContact(targetUser);

          // Check if room exists
          let existing = rooms.find((r) => r && !r.isGroup && !r.isChannel && !r.isSecretVault && r.participants && r.participants.some((p) => p && p.id === targetUser.id));
          if (!existing) {
            existing = {
              id: `room_${targetUser.id}_${Date.now()}`,
              name: `${targetUser.firstName || ""} ${targetUser.lastName || ""}`.trim() || targetUser.username || "Contacto",
              avatarUrl: targetUser.avatarUrl,
              unreadCount: 0,
              participants: [targetUser],
            };
            setRooms((prev) => [existing!, ...prev.filter((r) => r.id !== existing!.id)]);
            storageService.saveRoom(existing);
          }
          handleSelectRoom(existing.id);
        }}
        onAddNewContact={({ name, email, phone }) => {
          const derivedUsername = email ? email.split("@")[0].toLowerCase() : name.toLowerCase().replace(/\s+/g, "_");
          const newContact: UserProfile = {
            id: `usr_${Date.now()}`,
            username: derivedUsername,
            firstName: name,
            lastName: "",
            email: email || `${derivedUsername}@degvs.app`,
            phone: phone || "+58 412 0000000",
            countryCode: "+58",
            avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(email || name)}`,
            status: "online",
          };
          storageService.saveContact(newContact);
          const newRoom: Room = {
            id: `room_${Date.now()}`,
            name,
            avatarUrl: newContact.avatarUrl,
            unreadCount: 0,
            participants: [newContact],
          };
          setRooms((prev) => [newRoom, ...prev]);
          storageService.saveRoom(newRoom);
          handleSelectRoom(newRoom.id);
        }}
        onOpenCreateGroup={() => {
          setCreateGroupChannelMode("group");
          setIsCreateGroupChannelOpen(true);
        }}
        onOpenCreateChannel={() => {
          setCreateGroupChannelMode("channel");
          setIsCreateGroupChannelOpen(true);
        }}
      />

      <CreateGroupChannelModal
        isOpen={isCreateGroupChannelOpen}
        onClose={() => setIsCreateGroupChannelOpen(false)}
        initialMode={createGroupChannelMode}
        currentUser={
          currentUser || {
            id: "guest",
            username: "invitado",
            firstName: "Usuario",
            lastName: "",
            email: "usuario@degvs.app",
            phone: "+58 412 0000000",
            countryCode: "+58",
            avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
            status: "online",
          }
        }
        allUsers={storageService.getContacts()}
        onCreateRoom={(newRoom) => {
          setRooms((prev) => [newRoom, ...prev]);
          storageService.saveRoom(newRoom);
          handleSelectRoom(newRoom.id);
          setIsCreateGroupChannelOpen(false);
        }}
      />

      <SecretVaultModal
        isOpen={isVaultOpen}
        onClose={() => setIsVaultOpen(false)}
        savedPin={storageService.getVaultPin()}
        onSavePin={(pin) => storageService.saveVaultPin(pin)}
        onUnlockSuccess={() => {
          // Open vault secret room
          let vaultRoom = rooms.find((r) => r.isSecretVault);
          if (!vaultRoom) {
            vaultRoom = {
              id: "room_vault_secret",
              name: "🔒 Bóveda Secreta Privada",
              avatarUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80",
              unreadCount: 0,
              isSecretVault: true,
              participants: [],
            };
            setRooms((prev) => [vaultRoom!, ...prev]);
            storageService.saveRoom(vaultRoom);
          }
          handleSelectRoom(vaultRoom.id);
        }}
      />

      {activeRoom && (
        <ViewContactDrawer
          isOpen={isContactDrawerOpen}
          onClose={() => setIsContactDrawerOpen(false)}
          room={activeRoom}
          onUpdateDisappearingTimer={handleUpdateDisappearingTimer}
          onOpenLockSetup={() => {
            setIsContactDrawerOpen(false);
            setIsLockSetupModalOpen(true);
          }}
        />
      )}

      {/* Individual Chat PIN/Biometric Lock Modal */}
      {activeRoom && activeRoom.isLocked && (
        <RoomLockModal
          isOpen={isRoomLockModalOpen}
          roomName={activeRoom.name}
          correctPin={activeRoom.pinCode || "1234"}
          onUnlockSuccess={() => {
            setIsRoomLockModalOpen(false);
            if (activeChatId) {
              setUnlockedRooms((prev) => new Set(prev).add(activeChatId));
            }
          }}
          onClose={() => {
            setIsRoomLockModalOpen(false);
            // Go back to unselected or first safe room
            const safeRoom = rooms.find((r) => !r.isLocked);
            if (safeRoom) {
              setActiveChatId(safeRoom.id);
            }
          }}
        />
      )}

      {/* Lock Setup Modal for Configuring Chat PIN */}
      {activeRoom && (
        <RoomLockSetupModal
          isOpen={isLockSetupModalOpen}
          roomName={activeRoom.name}
          isCurrentlyLocked={!!activeRoom.isLocked}
          onClose={() => setIsLockSetupModalOpen(false)}
          onSaveLockPin={handleSaveRoomPin}
        />
      )}

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        currentUser={currentUser || { id: "guest", username: "guest", firstName: "Usuario", lastName: "", phone: "", countryCode: "", avatarUrl: "", status: "online" }}
        theme={theme}
        onThemeChange={(t) => {
          setTheme(t);
          storageService.saveSettings({ theme: t });
        }}
        bubbleStyle={bubbleStyle}
        onBubbleStyleChange={(b) => {
          setBubbleStyle(b);
          storageService.saveSettings({ bubbleStyle: b });
        }}
        font={font}
        onFontChange={(f) => {
          setFont(f);
          storageService.saveSettings({ font: f });
        }}
        accentColor={accentColor}
        onAccentColorChange={(c) => {
          setAccentColor(c);
          storageService.saveSettings({ accentColor: c });
          storageService.applyAccentColorToCss(c);
        }}
        autoTimePalette={autoTimePalette}
        onAutoTimePaletteChange={(enabled) => {
          setAutoTimePalette(enabled);
          storageService.setAutoTimePalette(enabled);
        }}
        accentColorLight={accentColorLight}
        onAccentColorLightChange={(c) => {
          setAccentColorLight(c);
          storageService.setAccentColorLight(c);
        }}
        accentColorDark={accentColorDark}
        onAccentColorDarkChange={(c) => {
          setAccentColorDark(c);
          storageService.setAccentColorDark(c);
        }}
        soundMuted={soundMuted}
        onToggleSound={() => {
          const next = !soundMuted;
          setSoundMuted(next);
          storageService.saveSettings({ soundMuted: next });
        }}
        language={language}
        onLanguageChange={(l) => {
          setLanguage(l);
          storageService.saveSettings({ language: l });
        }}
        readReceiptsEnabled={readReceiptsEnabled}
        onToggleReadReceipts={handleToggleReadReceipts}
        onUpdateAvatar={handleUpdateAvatar}
        onOpenAndroidGuide={() => setIsAndroidGuideOpen(true)}
        onOpenPublishDeploy={() => setIsPublishDeployOpen(true)}
        onOpenPlatformUpdate={() => setIsPlatformUpdateOpen(true)}
        onOpenBackupModal={() => setIsBackupModalOpen(true)}
        onOpenSupportBot={() => setIsSupportBotOpen(true)}
        onOpenStorageCleaner={() => setIsStorageCleanerOpen(true)}
        onLogout={() => {
          storageService.saveUser(null);
          setCurrentUser(null);
          setIsSettingsOpen(false);
          setIsAuthModalOpen(true);
        }}
      />

      {/* Space Cleaner (Limpiador de Espacio) Modal */}
      <StorageCleanerModal
        isOpen={isStorageCleanerOpen}
        onClose={() => setIsStorageCleanerOpen(false)}
        onStorageCleared={() => {
          const loadedRooms = storageService.getRooms();
          setRooms(loadedRooms);
          const map: Record<string, Message[]> = {};
          loadedRooms.forEach((r) => {
            map[r.id] = storageService.getMessages(r.id);
          });
          setMessagesMap(map);
        }}
      />

      {/* Specialized Technical Support Bot Modal */}
      <SupportBotModal
        isOpen={isSupportBotOpen}
        onClose={() => setIsSupportBotOpen(false)}
        currentUser={currentUser || undefined}
      />

      <BackupModal
        isOpen={isBackupModalOpen}
        onClose={() => setIsBackupModalOpen(false)}
        onBackupRestored={() => {
          const loadedRooms = storageService.getRooms();
          setRooms(loadedRooms);
          const map: Record<string, Message[]> = {};
          loadedRooms.forEach((r) => {
            map[r.id] = storageService.getMessages(r.id);
          });
          setMessagesMap(map);
        }}
      />


      <PollCreatorModal
        isOpen={isPollCreatorOpen}
        onClose={() => setIsPollCreatorOpen(false)}
        onCreatePoll={handleCreatePoll}
      />

      <WallpaperSelectorModal
        isOpen={isWallpaperOpen}
        onClose={() => setIsWallpaperOpen(false)}
        currentWallpaper={activeRoom?.wallpaper}
        onSelectWallpaper={(preset) => {
          if (!activeChatId) return;
          const updatedRooms = rooms.map((r) => (r.id === activeChatId ? { ...r, wallpaper: preset } : r));
          setRooms(updatedRooms);
          storageService.saveRooms(updatedRooms);
        }}
      />

      <E2EEModal
        isOpen={isE2EEOpen}
        onClose={() => setIsE2EEOpen(false)}
        roomName={activeRoom?.name || "Contacto"}
      />

      <CallModal
        isOpen={isCallOpen}
        onClose={() => {
          setIsCallOpen(false);
          setActiveCallPeer(null);
        }}
        contactName={activeCallPeer?.name || activeRoom?.name || "Contacto"}
        avatarUrl={activeCallPeer?.avatarUrl || activeRoom?.avatarUrl}
        isVideo={callIsVideo}
      />

      <AndroidGuideModal
        isOpen={isAndroidGuideOpen}
        onClose={() => setIsAndroidGuideOpen(false)}
      />

      <PublishDeployModal
        isOpen={isPublishDeployOpen}
        onClose={() => setIsPublishDeployOpen(false)}
        onOpenPlatformUpdate={() => setIsPlatformUpdateOpen(true)}
      />

      {/* Universal Cross-Platform Update & Optimizer Modal */}
      <PlatformUpdateModal
        isOpen={isPlatformUpdateOpen}
        onClose={() => setIsPlatformUpdateOpen(false)}
        onOpenPublishDeploy={() => setIsPublishDeployOpen(true)}
      />

      {/* Floating Cyber Update Notification Toast when new build/SW is detected */}
      {platformUpdateState.isUpdateAvailable && (
        <div className="fixed bottom-6 right-6 z-50 p-4 rounded-3xl bg-slate-950/95 border-2 border-cyan-400 text-white shadow-[0_0_30px_rgba(0,229,255,0.4)] backdrop-blur-xl flex items-center gap-3.5 animate-in slide-in-from-bottom-5 duration-300 max-w-md">
          <div className="p-2.5 rounded-2xl bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 shrink-0">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping inline-block" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-black text-xs text-cyan-300 flex items-center gap-1.5">
              <span>¡Nueva versión disponible!</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-200 border border-cyan-500/40">
                {platformUpdateState.newVersion || "v2.5.0"}
              </span>
            </p>
            <p className="text-[11px] text-slate-300 mt-0.5 truncate">
              Actualiza y optimiza Web, PWA, Android APK, TWA y Termux.
            </p>
          </div>
          <button
            onClick={() => setIsPlatformUpdateOpen(true)}
            className="px-3.5 py-2 rounded-2xl bg-[#00E676] hover:bg-[#00c864] text-slate-950 font-black text-xs shadow-lg shadow-[#00E676]/30 transition shrink-0 active:scale-95"
          >
            Actualizar
          </button>
        </div>
      )}

      <StarredMessagesModal
        isOpen={isStarredModalOpen}
        onClose={() => setIsStarredModalOpen(false)}
        messages={activeMessages}
        onUnstar={handleStarMessage}
      />

      <ForwardModal
        isOpen={!!forwardMessage}
        onClose={() => setForwardMessage(null)}
        messageToForward={forwardMessage}
        rooms={rooms}
        onForwardToRoom={handleForwardToRoom}
      />
    </div>
  );
};

export default App;
