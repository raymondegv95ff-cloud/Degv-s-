import React, { useState, useEffect } from "react";
import { UserProfile, Room, Message, ThemeMode, BubbleStyle, LanguageCode, FontOption, AccentColorOption } from "./types";
import { storageService } from "./services/storageService";
import { soundService } from "./services/soundService";
import { notificationService } from "./services/notificationService";
import { indexedDbQueueService } from "./services/indexedDbQueueService";
import { websocketService } from "./services/websocketService";
import {
  sendMessage as unifiedSendMessage,
  createClientMessageId,
  getPrivateConversationId,
  flushMessageQueue,
  listenForConversationMessages,
} from "./services/messengerService";
import {
  db,
  sendMessage as sendFirestoreMessage,
  listenForMessages,
  listenForRoomMessages,
  updateMessageReactionInFirestore,
  saveRoomToFirestore,
  subscribeToFirebaseAuth,
  listenForFirestoreUsers,
  getDirectChatRoomId,
  initAnonymousUser,
  registerUser,
  getFirestoreUser,
  findOrCreateDirectRoom,
  listenForUserRooms,
} from "./services/firebase";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";

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
import { IncomingCallModal } from "./components/Modals/IncomingCallModal";
import { AndroidGuideModal } from "./components/Modals/AndroidGuideModal";
import { PublishDeployModal } from "./components/Modals/PublishDeployModal";
import { GitHubActionsModal } from "./components/Modals/GitHubActionsModal";
import { RoomLockModal } from "./components/Modals/RoomLockModal";
import { RoomLockSetupModal } from "./components/Modals/RoomLockSetupModal";
import { BackupModal } from "./components/Modals/BackupModal";
import { StarredMessagesModal } from "./components/Modals/StarredMessagesModal";
import { ForwardModal } from "./components/Modals/ForwardModal";
import { CreateGroupChannelModal } from "./components/Modals/CreateGroupChannelModal";
import { SupportBotModal } from "./components/Modals/SupportBotModal";
import { StorageCleanerModal } from "./components/Modals/StorageCleanerModal";
import { PlatformUpdateModal } from "./components/Modals/PlatformUpdateModal";
import { OracleCloudModal } from "./components/Modals/OracleCloudModal";
import { SmartReplyService } from "./services/smartReplyService";
import { platformUpdateService } from "./services/platformUpdateService";
import { CrossPlatformUpdateState } from "./types";
import { useWebRTC } from "./hooks/useWebRTC";


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
  const [isGitHubActionsModalOpen, setIsGitHubActionsModalOpen] = useState(false);
  const [isPlatformUpdateOpen, setIsPlatformUpdateOpen] = useState(false);
  const [isOracleCloudModalOpen, setIsOracleCloudModalOpen] = useState(false);
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
  const [firestoreUsers, setFirestoreUsers] = useState<UserProfile[]>([]);

  // Group & Channel Creation State
  const [isCreateGroupChannelOpen, setIsCreateGroupChannelOpen] = useState(false);
  const [createGroupChannelMode, setCreateGroupChannelMode] = useState<"group" | "channel">("group");

  // Real-Time WebRTC Calling Hook (Google STUN + Firestore Signaling)
  const {
    activeCall,
    incomingCall,
    isCalling,
    isConnected: isWebRtcConnected,
    localStream: webRtcLocalStream,
    remoteStream: webRtcRemoteStream,
    isMuted: isWebRtcMuted,
    isVideoOn: isWebRtcVideoOn,
    callDuration: webRtcCallDuration,
    startCall: startWebRtcCall,
    answerCall: answerWebRtcCall,
    declineCall: declineWebRtcCall,
    endCall: endWebRtcCall,
    toggleMute: toggleWebRtcMute,
    toggleVideo: toggleWebRtcVideo,
  } = useWebRTC(currentUser);

  // Offline Connection Loss Detection & IndexedDB Queue State
  const [isOnline, setIsOnline] = useState<boolean>(() => indexedDbQueueService.isOnline());
  const [queuedOfflineCount, setQueuedOfflineCount] = useState<number>(0);
  const [isQuotaExhausted, setIsQuotaExhausted] = useState<boolean>(false);
  const [isSyncingQueue, setIsSyncingQueue] = useState<boolean>(false);
  const [syncToastMessage, setSyncToastMessage] = useState<string | null>(null);

  // Firebase Auth State & Anonymous Bootstrap Listener
  useEffect(() => {
    const unsubscribe = subscribeToFirebaseAuth((fbUser) => {
      if (fbUser) {
        setCurrentUser(fbUser);
        storageService.saveUser(fbUser);
        registerUser(fbUser);
        setIsAuthModalOpen(false);
      }
    });

    // Automatically ensure anonymous authentication on startup if not authenticated
    const bootstrapAuth = async () => {
      const stored = storageService.getUser();
      if (!stored || stored.id.startsWith("usr_default") || stored.id.startsWith("user_1")) {
        const anon = await initAnonymousUser(stored || undefined);
        setCurrentUser(anon);
        storageService.saveUser(anon);
      } else {
        registerUser(stored);
      }
    };
    bootstrapAuth();

    return () => unsubscribe();
  }, []);

  // Listen for all real-time Firestore registered users
  useEffect(() => {
    const unsubscribe = listenForFirestoreUsers((cloudUsers) => {
      setFirestoreUsers(cloudUsers);
      cloudUsers.forEach((u) => {
        if (!currentUser || u.id !== currentUser.id) {
          storageService.saveContact(u);
        }
      });
    });
    return () => unsubscribe();
  }, [currentUser?.id]);

  // Combined contacts list (local storage + real-time Firestore users)
  const mergedContactsList = React.useMemo(() => {
    const local = storageService.getContacts();
    const map = new Map<string, UserProfile>();
    local.forEach((u) => {
      if (u && (!currentUser || u.id !== currentUser.id)) {
        map.set(u.id, u);
      }
    });
    firestoreUsers.forEach((u) => {
      if (u && (!currentUser || u.id !== currentUser.id)) {
        map.set(u.id, u);
      }
    });
    return Array.from(map.values());
  }, [firestoreUsers, currentUser?.id]);

  // Listen for user rooms in Firestore to sync latest lastMessage and rooms list
  useEffect(() => {
    if (!currentUser?.id) return;
    const unsubscribe = listenForUserRooms(currentUser.id, (cloudRooms) => {
      if (cloudRooms.length > 0) {
        setRooms((prev) => {
          const cloudMap = new Map<string, Room>();
          cloudRooms.forEach((r) => cloudMap.set(r.id, r));

          const merged = prev.map((localR) => {
            const cloudR = cloudMap.get(localR.id);
            if (cloudR) {
              cloudMap.delete(localR.id);
              return {
                ...localR,
                lastMessage: cloudR.lastMessage || localR.lastMessage,
                lastMessageTime: cloudR.lastMessageTime || localR.lastMessageTime,
                unreadCount: localR.id === activeChatId ? 0 : (cloudR.unreadCount ?? localR.unreadCount),
                participants: cloudR.participants || localR.participants,
              };
            }
            return localR;
          });

          const remainingCloud = Array.from(cloudMap.values());
          const finalList = [...remainingCloud, ...merged];
          storageService.saveRooms(finalList);
          return finalList;
        });
      }
    });
    return () => unsubscribe();
  }, [currentUser?.id, activeChatId]);

  // Firestore Real-Time Message Listener for direct inbox
  useEffect(() => {
    if (!currentUser?.id) return;
    const unsubscribe = listenForMessages(currentUser.id, (incomingMsg) => {
      // 1. Ensure room exists in state and storage
      setRooms((prevRooms) => {
        const roomExists = prevRooms.some((r) => r.id === incomingMsg.roomId);
        if (!roomExists) {
          const newRoom: Room = {
            id: incomingMsg.roomId,
            name: incomingMsg.senderName || "Contacto",
            avatarUrl: incomingMsg.senderAvatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(incomingMsg.senderId)}`,
            unreadCount: 1,
            lastMessage: incomingMsg.content || "Nuevo mensaje",
            lastMessageTime: incomingMsg.createdAt || new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            participants: [
              currentUser,
              {
                id: incomingMsg.senderId,
                username: incomingMsg.senderName?.toLowerCase().replace(/\s+/g, "_") || "contacto",
                firstName: incomingMsg.senderName || "Contacto",
                lastName: "",
                avatarUrl: incomingMsg.senderAvatar,
                status: "online",
              },
            ],
          };
          storageService.saveRoom(newRoom);
          return [newRoom, ...prevRooms];
        } else {
          const updated = prevRooms.map((r) =>
            r.id === incomingMsg.roomId
              ? {
                  ...r,
                  lastMessage: incomingMsg.content,
                  lastMessageTime: incomingMsg.createdAt,
                  unreadCount: r.id === activeChatId ? 0 : (r.unreadCount || 0) + 1,
                }
              : r
          );
          storageService.saveRooms(updated);
          return updated;
        }
      });

      // 2. Append message
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
  }, [currentUser, soundMuted, activeChatId]);

  // Deep-linking / Real-time QR & URL pairing listener
  useEffect(() => {
    if (typeof window === "undefined" || !currentUser) return;

    const handleDeepLinkPairing = async () => {
      const hash = window.location.hash ? window.location.hash.replace(/^#/, "") : "";
      const search = window.location.search ? window.location.search.replace(/^\?/, "") : "";
      const params = new URLSearchParams(hash || search);

      const pairId = params.get("pair")?.trim();
      const pairName = params.get("name")?.trim() || params.get("user")?.trim() || "Contacto";
      const pairUsername = params.get("user")?.trim() || (pairId ? `user_${pairId.slice(0, 6)}` : "usuario");
      const pairAvatar = params.get("avatar") || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(pairUsername)}`;

      if (pairId && pairId !== currentUser.id) {
        try {
          // 1. Validación y consulta real a la colección 'users' de Firestore
          let targetUser: UserProfile | null = null;
          const userDocRef = doc(db, "users", pairId);
          const userSnap = await getDoc(userDocRef);

          if (userSnap.exists()) {
            const d = userSnap.data();
            targetUser = {
              id: userSnap.id,
              username: d.username || pairUsername,
              firstName: d.firstName || pairName,
              lastName: d.lastName || "",
              email: d.email || `${d.username || pairUsername}@degvs.app`,
              avatarUrl: d.avatarUrl || pairAvatar,
              bio: d.bio || "",
              phone: d.phone,
              status: "online",
            };
          } else {
            // Consulta fallback por username en 'users'
            const usersRef = collection(db, "users");
            const qUsers = query(usersRef, where("username", "==", pairId));
            const querySnap = await getDocs(qUsers);
            if (!querySnap.empty) {
              const d = querySnap.docs[0].data();
              targetUser = {
                id: querySnap.docs[0].id,
                username: d.username || pairUsername,
                firstName: d.firstName || pairName,
                lastName: d.lastName || "",
                email: d.email || `${d.username || pairUsername}@degvs.app`,
                avatarUrl: d.avatarUrl || pairAvatar,
                bio: d.bio || "",
                phone: d.phone,
                status: "online",
              };
            }
          }

          // Si el usuario no está aún en 'users', registrarlo formalmente en Firestore
          if (!targetUser) {
            targetUser = {
              id: pairId,
              username: pairUsername,
              firstName: pairName,
              lastName: "",
              email: `${pairUsername}@degvs.app`,
              avatarUrl: pairAvatar,
              status: "online",
            };
            await registerUser(targetUser);
          }

          storageService.saveContact(targetUser);

          // 2. Consulta real a la colección 'chats_rooms' verificando participantes: currentUser.id y pairId
          let foundRoomId: string | null = null;
          let foundRoomData: any = null;
          const targetDisplayName = `${targetUser.firstName || ""} ${targetUser.lastName || ""}`.trim() || targetUser.username;

          const chatsRoomsRef = collection(db, "chats_rooms");
          const qChatsRooms = query(chatsRoomsRef, where("participants", "array-contains", currentUser.id));
          const chatsRoomsSnap = await getDocs(qChatsRooms);

          for (const roomDoc of chatsRoomsSnap.docs) {
            const data = roomDoc.data();
            const participants = data.participants || [];
            const hasPair = participants.some((p: any) => {
              const pId = typeof p === "string" ? p : p?.id;
              return pId === targetUser!.id || pId === pairId;
            });
            if (hasPair) {
              foundRoomId = roomDoc.id;
              foundRoomData = data;
              break;
            }
          }

          // Verificación complementaria en colección 'rooms'
          if (!foundRoomId) {
            const roomsRef = collection(db, "rooms");
            const qRooms = query(roomsRef, where("participants", "array-contains", currentUser.id));
            const roomsSnap = await getDocs(qRooms);

            for (const roomDoc of roomsSnap.docs) {
              const data = roomDoc.data();
              const participants = data.participants || [];
              const hasPair = participants.some((p: any) => {
                const pId = typeof p === "string" ? p : p?.id;
                return pId === targetUser!.id || pId === pairId;
              });
              if (hasPair) {
                foundRoomId = roomDoc.id;
                foundRoomData = data;
                break;
              }
            }
          }

          let roomObj: Room;

          // 3. Si la sala no existe en Firestore, crearla
          if (!foundRoomId) {
            const directRoomId = getDirectChatRoomId(currentUser.id, targetUser.id);
            const newRoomPayload = {
              id: directRoomId,
              name: targetDisplayName,
              avatarUrl: targetUser.avatarUrl,
              unreadCount: 0,
              lastMessage: "Chat en tiempo real conectado 🚀",
              lastMessageTime: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
              participants: [currentUser.id, targetUser.id],
              isGroup: false,
              isChannel: false,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            };

            if (!indexedDbQueueService.isQuotaExhausted()) {
              await setDoc(doc(db, "rooms", directRoomId), newRoomPayload, { merge: true }).catch((err) => {
                if (err?.code === "resource-exhausted") indexedDbQueueService.markQuotaExhausted(15);
              });
            }

            roomObj = {
              id: directRoomId,
              name: targetDisplayName,
              avatarUrl: targetUser.avatarUrl,
              unreadCount: 0,
              lastMessage: "Chat en tiempo real conectado 🚀",
              lastMessageTime: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
              participants: [currentUser, targetUser],
              isGroup: false,
            };
          } else {
            roomObj = {
              id: foundRoomId,
              name: targetDisplayName,
              avatarUrl: targetUser.avatarUrl || foundRoomData?.avatarUrl,
              unreadCount: foundRoomData?.unreadCount || 0,
              lastMessage: foundRoomData?.lastMessage || "Chat conectado 🚀",
              lastMessageTime: foundRoomData?.lastMessageTime || new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
              participants: [currentUser, targetUser],
              isGroup: false,
            };
          }

          // 4. Redirigir al chat resultante
          setRooms((prev) => [roomObj, ...prev.filter((r) => r.id !== roomObj.id)]);
          storageService.saveRoom(roomObj);
          setActiveChatId(roomObj.id);
          setShowMobileChat(true);

          // Limpiar parámetros de enlace profundo
          if (window.history && window.history.replaceState) {
            window.history.replaceState(null, "", window.location.pathname);
          }
        } catch (error) {
          console.warn("[DeepLinkPairing] Error processing deep link pairing:", error);
        }
      }
    };

    handleDeepLinkPairing();
    window.addEventListener("hashchange", handleDeepLinkPairing);
    return () => window.removeEventListener("hashchange", handleDeepLinkPairing);
  }, [currentUser]);

  // Firestore Real-Time Room Messages Listener
  useEffect(() => {
    if (!activeChatId) return;
    const unsubscribe = listenForRoomMessages(activeChatId, (cloudMsgs) => {
      console.log(`[App Chat] 📥 [listenForRoomMessages Callback in App.tsx] Received ${cloudMsgs.length} messages for room '${activeChatId}':`, cloudMsgs);
      setMessagesMap((prev) => {
        const localMsgs = prev[activeChatId] || [];
        const mergedMap = new Map<string, Message>();
        localMsgs.forEach((m) => mergedMap.set(m.id, m));
        cloudMsgs.forEach((m) => mergedMap.set(m.id, m));
        const mergedList = Array.from(mergedMap.values()).sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
        console.log(`[App Chat] 🔄 [Merged State Updated] Room '${activeChatId}' now has ${mergedList.length} total messages in React state.`);
        storageService.saveRoomMessages(activeChatId, mergedList);
        return { ...prev, [activeChatId]: mergedList };
      });
    });
    return () => unsubscribe();
  }, [activeChatId]);

  useEffect(() => {
    websocketService.init();
    platformUpdateService.init();
    const unsubscribe = platformUpdateService.subscribe((st) => {
      setPlatformUpdateState(st);
    });

    // Explicit listener for DEGV_SW_UPDATE_READY events emitted by SW or registration lifecycle
    const handleSwUpdateReady = (event: any) => {
      console.log("[App] DEGV_SW_UPDATE_READY event detected:", event.detail);
      setPlatformUpdateState((prev) => ({
        ...prev,
        isUpdateAvailable: true,
        newVersion: event.detail?.version || "v2.5.0",
      }));
    };

    window.addEventListener("DEGV_SW_UPDATE_READY", handleSwUpdateReady);
    return () => {
      unsubscribe();
      window.removeEventListener("DEGV_SW_UPDATE_READY", handleSwUpdateReady);
    };
  }, []);

  // Safe handler to execute atomic reload without blank screens
  const handleApplySwUpdate = () => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker.getRegistration().then((reg) => {
        if (reg?.waiting) {
          reg.waiting.postMessage({ type: "SKIP_WAITING" });
        }
        // Trigger clean reload once active cache is confirmed
        setTimeout(() => {
          window.location.reload();
        }, 150);
      }).catch(() => {
        window.location.reload();
      });
    } else {
      window.location.reload();
    }
  };

  useEffect(() => {
    const unsubscribe = indexedDbQueueService.subscribe((onlineStatus, count, quotaStatus) => {
      setIsOnline(onlineStatus);
      setQueuedOfflineCount(count);
      setIsQuotaExhausted(quotaStatus);
      if (onlineStatus && !quotaStatus && count > 0) {
        handleAutoSyncQueue();
      }
    });

    return () => unsubscribe();
  }, []);

  const handleAutoSyncQueue = async () => {
    setIsSyncingQueue(true);
    try {
      const result = await flushMessageQueue();
      if (result.synced > 0) {
        if (!soundMuted) soundService.playReceiveSound();
        setSyncToastMessage(`¡Conexión restablecida! ${result.synced} mensajes sincronizados con Firestore.`);
        setTimeout(() => setSyncToastMessage(null), 4000);
      }
    } catch (err) {
      console.warn("[App] Error during automatic queue synchronization:", err);
    } finally {
      setIsSyncingQueue(false);
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
  const handleStartCall = async (peerId: string, isVideo: boolean, peerName?: string) => {
    const targetRoom = rooms.find(
      (r) =>
        r.id === peerId ||
        r.participants?.some((p) => (typeof p === "string" ? p === peerId : p?.id === peerId))
    );
    const finalName = peerName || targetRoom?.name || activeRoom?.name || "Contacto";
    const finalAvatar = targetRoom?.avatarUrl || activeRoom?.avatarUrl;

    // Buscar perfil de usuario del destinatario
    let targetUser: UserProfile | undefined = targetRoom?.participants?.find((p) =>
      typeof p === "string" ? p !== currentUser?.id : p?.id !== currentUser?.id
    ) as UserProfile | undefined;

    if (!targetUser) {
      targetUser = firestoreUsers.find((u) => u.id === peerId) || {
        id: peerId,
        username: finalName.toLowerCase().replace(/\s+/g, "_"),
        firstName: finalName,
        lastName: "",
        avatarUrl: finalAvatar,
        email: `${peerId}@degvs.app`,
        status: "online",
      };
    }

    setActiveCallPeer({ id: targetUser.id, name: finalName, avatarUrl: finalAvatar });
    setCallIsVideo(isVideo);
    setIsCallOpen(true);

    console.log("[Degv's WebRTC] 📞 Emitiendo llamada WebRTC hacia:", targetUser);
    await startWebRtcCall(targetUser, isVideo, activeRoom?.id || peerId);

    // Save call log in storage
    storageService.saveCallLog({
      id: `call_${Date.now()}`,
      peerId: targetUser.id,
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

  // Send Message Handler via Centralized Messenger Service
  const handleSendMessage = async (
    content: string,
    type: "text" | "image" | "audio" | "file" | "sticker" = "text",
    mediaUrl?: string
  ) => {
    if (!activeChatId || !currentUser) return;

    const isCurrentlyOnline = indexedDbQueueService.isOnline();
    const clientMessageId = createClientMessageId();

    // Determine target recipient and participants list
    let targetRecipientId: string | undefined = undefined;
    let participants: string[] = [currentUser.id];

    if (activeRoom?.participants && activeRoom.participants.length > 0) {
      participants = activeRoom.participants.map((p) => (typeof p === "string" ? p : p?.id)).filter(Boolean);
      for (const pId of participants) {
        if (pId !== currentUser.id) {
          targetRecipientId = pId;
          break;
        }
      }
    }

    if (activeChatId.startsWith("dm_")) {
      const parts = activeChatId.replace(/^dm_/, "").split("_");
      const found = parts.find((p) => p && p !== currentUser.id);
      if (found) targetRecipientId = found;
      participants = [currentUser.id, targetRecipientId || ""].filter(Boolean);
    }

    const optimisticMessage: Message = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      roomId: activeChatId,
      conversationId: activeChatId,
      senderId: currentUser.id,
      senderName: `${currentUser.firstName} ${currentUser.lastName}`.trim(),
      senderAvatar: currentUser.avatarUrl,
      recipientId: targetRecipientId,
      receiverId: targetRecipientId,
      participants,
      type: type as any,
      content,
      text: content,
      mediaUrl,
      attachment: mediaUrl ? { url: mediaUrl } : undefined,
      createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      timestamp: Date.now(),
      isRead: true,
      status: isCurrentlyOnline ? "sending" : "pending",
      clientMessageId,
      replyTo: replyToMessage?.id || null,
      replyToMessageId: replyToMessage?.id,
      replyToSnippet: replyToMessage
        ? {
            id: replyToMessage.id,
            senderName: replyToMessage.senderName,
            text: replyToMessage.content,
          }
        : undefined,
    };

    console.log(`[Messenger][SEND] 📝 [App.tsx] Initiating sendMessage dispatch:`, {
      messageId: optimisticMessage.id,
      clientMessageId,
      conversationId: activeChatId,
      senderId: currentUser.id,
      recipientId: targetRecipientId,
      type,
      isOnline: isCurrentlyOnline,
    });

    // Play send audio sound
    if (!soundMuted) soundService.playSendSound();

    // Clear reply snippet
    setReplyToMessage(null);

    // Save optimistic message locally
    const initialUpdatedMessages = [...(messagesMap[activeChatId] || []), optimisticMessage];
    setMessagesMap((prev) => ({ ...prev, [activeChatId]: initialUpdatedMessages }));
    storageService.saveMessage(activeChatId, optimisticMessage);

    // Update Room preview
    const nowTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const updatedLastMsg =
      type === "image"
        ? "📷 Imagen"
        : type === "sticker"
        ? "⭐ Sticker"
        : type === "audio"
        ? "🎵 Nota de voz"
        : content;

    const updatedRoom: Room = {
      ...activeRoom,
      lastMessage: updatedLastMsg,
      lastMessageTime: nowTime,
      draftText: "",
    };

    setRooms((prev) => prev.map((r) => (r.id === activeChatId ? updatedRoom : r)));
    storageService.saveRoom(updatedRoom);
    saveRoomToFirestore(updatedRoom);

    const sendPayload = {
      senderId: currentUser.id,
      senderName: `${currentUser.firstName} ${currentUser.lastName}`.trim(),
      senderAvatar: currentUser.avatarUrl,
      recipientId: targetRecipientId,
      participants,
      conversationId: activeChatId,
      type: type as any,
      text: content,
      content,
      mediaUrl,
      attachment: mediaUrl ? { url: mediaUrl } : undefined,
      replyTo: replyToMessage?.id || null,
      replyToSnippet: optimisticMessage.replyToSnippet,
      clientMessageId,
      customId: optimisticMessage.id,
    };

    console.log(`[handleSendMessage] 🚀 [handleSendMessage: Firebase Write] Full payload object right before Firebase write operation:`, sendPayload);
    console.log(`[handleSendMessage] 📦 [handleSendMessage: Payload JSON String]:\n`, JSON.stringify(sendPayload, null, 2));

    // Dispatch through unifiedSendMessage
    try {
      const sendResult = await unifiedSendMessage(sendPayload);

      console.log(`[handleSendMessage] ✅ [handleSendMessage: Firebase Write Result] Message sent to Firestore successfully:`, sendResult);

      // Update message status upon confirmation
      if (sendResult.success) {
        setMessagesMap((prev) => {
          const currentList = prev[activeChatId] || [];
          const updated = currentList.map((m) =>
            m.clientMessageId === clientMessageId || m.id === optimisticMessage.id
              ? { ...m, id: sendResult.messageId, status: "sent" as const }
              : m
          );
          storageService.saveRoomMessages(activeChatId, updated);
          return { ...prev, [activeChatId]: updated };
        });
      }
    } catch (err: any) {
      console.error("[handleSendMessage] ❌ [handleSendMessage: Firebase Write Error] Error dispatching message to Firebase:", err);
    }

    // Record stats for analytics
    try {
      const todayKey = new Date().toISOString().split("T")[0];
      const raw = localStorage.getItem("degvs_messenger_daily_stats") || "{}";
      const statsObj = JSON.parse(raw);
      if (!statsObj[todayKey]) statsObj[todayKey] = { messages: 0, usageMinutes: 0 };
      statsObj[todayKey].messages = (statsObj[todayKey].messages || 0) + 1;
      localStorage.setItem("degvs_messenger_daily_stats", JSON.stringify(statsObj));
    } catch {}

    // Only handle AI response if the user is explicitly in the dedicated Degv's AI chat or typing /imagine
    if (isCurrentlyOnline && (activeRoom?.isAiChat || content.startsWith("/imagine"))) {
      handleAiResponse(activeChatId, content, initialUpdatedMessages);
    }
  };

  // AI Response Handler via Express Server API with robust Gemini Streaming
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

      // Prepare efficient context window: clean up history to the last 6 turns to avoid context saturation
      const contextHistory = history.slice(-6).map((m) => ({
        senderId: m.senderId,
        senderName: m.senderName,
        content: m.content,
        timestamp: m.timestamp,
      }));

      const aiMessageId = `msg_ai_${Date.now()}`;
      const initialAiMsg: Message = {
        id: aiMessageId,
        roomId,
        senderId: "usr_ai_assistant",
        senderName: "Degv's AI",
        type: "text",
        content: "...",
        createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        timestamp: Date.now(),
        isRead: true,
      };

      // Add placeholder message for streaming
      setMessagesMap((prev) => ({
        ...prev,
        [roomId]: [...(prev[roomId] || []), initialAiMsg],
      }));

      // Try streaming endpoint first
      let accumulatedText = "";
      let streamingSucceeded = false;

      try {
        const streamResponse = await fetch("/api/ai/chat/stream", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: userPrompt,
            history: contextHistory,
          }),
        });

        if (streamResponse.ok && streamResponse.body) {
          const reader = streamResponse.body.getReader();
          const decoder = new TextDecoder("utf-8");
          let buffer = "";

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
              const trimmed = line.trim();
              if (trimmed.startsWith("data:")) {
                const dataPayload = trimmed.replace(/^data:\s*/, "");
                if (dataPayload === "[DONE]") {
                  streamingSucceeded = true;
                  break;
                }
                try {
                  const parsed = JSON.parse(dataPayload);
                  if (parsed.text) {
                    accumulatedText += parsed.text;
                    setMessagesMap((prev) => {
                      const list = prev[roomId] || [];
                      return {
                        ...prev,
                        [roomId]: list.map((m) =>
                          m.id === aiMessageId ? { ...m, content: accumulatedText } : m
                        ),
                      };
                    });
                  }
                } catch {
                  // Fallback for raw text chunks
                  if (dataPayload) {
                    accumulatedText += dataPayload;
                  }
                }
              }
            }
          }
        }
      } catch (streamErr) {
        console.warn("[App] Streaming failed, falling back to unary chat:", streamErr);
      }

      // If streaming didn't produce text, use standard fallback
      if (!streamingSucceeded || !accumulatedText.trim()) {
        const res = await fetch("/api/ai/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: userPrompt, history: contextHistory }),
        });
        const data = await res.json();
        accumulatedText = data.text || data.reply || "Lo siento, tuve un problema procesando tu mensaje.";
      }

      const finalAiMsg: Message = {
        id: aiMessageId,
        roomId,
        senderId: "usr_ai_assistant",
        senderName: "Degv's AI",
        type: "text",
        content: accumulatedText,
        createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        timestamp: Date.now(),
        isRead: true,
      };

      setMessagesMap((prev) => {
        const list = prev[roomId] || [];
        const exists = list.some((m) => m.id === aiMessageId);
        const updated = exists
          ? list.map((m) => (m.id === aiMessageId ? finalAiMsg : m))
          : [...list, finalAiMsg];
        storageService.saveMessage(roomId, finalAiMsg);
        return { ...prev, [roomId]: updated };
      });

      if (!soundMuted) soundService.playReceiveSound();
      notificationService.sendNotification("Degv's AI", accumulatedText.slice(0, 100), roomId, "aiActivity");

      setRooms((prev) =>
        prev.map((r) =>
          r.id === roomId
            ? { ...r, lastMessage: accumulatedText.slice(0, 60), lastMessageTime: finalAiMsg.createdAt }
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
    if (!u || !currentUser || u.id === currentUser.id) return;
    storageService.saveContact(u);

    const directRoomId = getDirectChatRoomId(currentUser.id, u.id);
    let existing = rooms.find(
      (r) =>
        r.id === directRoomId ||
        (r && !r.isGroup && !r.isChannel && !r.isSecretVault && r.participants?.some((p) => p && p.id === u.id))
    );
    if (!existing) {
      existing = {
        id: directRoomId,
        name: `${u.firstName || ""} ${u.lastName || ""}`.trim() || u.username || "Contacto",
        avatarUrl: u.avatarUrl,
        unreadCount: 0,
        participants: [currentUser, u],
        lastMessage: "Conversación iniciada",
        lastMessageTime: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setRooms((prev) => [existing!, ...prev.filter((r) => r.id !== directRoomId)]);
      storageService.saveRoom(existing);
      saveRoomToFirestore(existing);
    }
    handleSelectRoom(existing.id);
    setSearchTerm("");
    setShowMobileChat(true);
  };

  return (
    <div className="flex h-full h-[100dvh] w-full fixed inset-0 overflow-hidden bg-[#050505] text-slate-100 font-sans antialiased selection:bg-[#00E676] selection:text-slate-950">
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
          onOpenGitHubActions={() => setIsGitHubActionsModalOpen(true)}
          onOpenOracleCloud={() => setIsOracleCloudModalOpen(true)}
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
        {(!isOnline || isQuotaExhausted) && (
          <div className="bg-amber-950/90 border-b border-amber-500/40 px-4 py-2 text-amber-200 text-xs font-bold flex items-center justify-between z-30 shadow-lg backdrop-blur-md shrink-0">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
              <span>{!isOnline ? "Modo Sin Conexión:" : "Almacenamiento Local Activo:"}</span>
              <span className="text-[11px] text-amber-300 font-normal">
                {queuedOfflineCount > 0
                  ? `${queuedOfflineCount} mensaje(s) guardado(s) en cola local (IndexedDB).`
                  : !isOnline
                  ? "Los mensajes se guardan de forma segura en IndexedDB y se sincronizarán al reconectar."
                  : "Cuota de nube en pausa. Todos los mensajes se guardan de forma instantánea en tu dispositivo (IndexedDB)."}
              </span>
            </div>
            <button
              onClick={() => {
                if (isQuotaExhausted) indexedDbQueueService.clearQuotaExhausted();
                handleAutoSyncQueue();
              }}
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
        users={mergedContactsList}
        currentUser={currentUser || undefined}
        onSelectUser={(u) => {
          if (!u || !currentUser || u.id === currentUser.id) return;
          const targetUser = u;

          // Ensure contact is saved in persistent storage
          storageService.saveContact(targetUser);

          const directRoomId = getDirectChatRoomId(currentUser.id, targetUser.id);
          // Check if room exists
          let existing = rooms.find(
            (r) =>
              r.id === directRoomId ||
              (r && !r.isGroup && !r.isChannel && !r.isSecretVault && r.participants?.some((p) => p && p.id === targetUser.id))
          );
          if (!existing) {
            existing = {
              id: directRoomId,
              name: `${targetUser.firstName || ""} ${targetUser.lastName || ""}`.trim() || targetUser.username || "Contacto",
              avatarUrl: targetUser.avatarUrl,
              unreadCount: 0,
              participants: [currentUser, targetUser],
              lastMessage: "Conversación iniciada",
              lastMessageTime: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            };
            setRooms((prev) => [existing!, ...prev.filter((r) => r.id !== directRoomId)]);
            storageService.saveRoom(existing);
            saveRoomToFirestore(existing);
          }
          handleSelectRoom(existing.id);
          setIsNewChatOpen(false);
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
          const directRoomId = currentUser ? getDirectChatRoomId(currentUser.id, newContact.id) : `room_${Date.now()}`;
          const newRoom: Room = {
            id: directRoomId,
            name,
            avatarUrl: newContact.avatarUrl,
            unreadCount: 0,
            participants: currentUser ? [currentUser, newContact] : [newContact],
            lastMessage: "Conversación iniciada",
            lastMessageTime: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          };
          setRooms((prev) => [newRoom, ...prev.filter((r) => r.id !== directRoomId)]);
          storageService.saveRoom(newRoom);
          saveRoomToFirestore(newRoom);
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
        allUsers={mergedContactsList}
        onCreateRoom={(newRoom) => {
          setRooms((prev) => [newRoom, ...prev]);
          storageService.saveRoom(newRoom);
          saveRoomToFirestore(newRoom);
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
        onOpenGitHubActions={() => setIsGitHubActionsModalOpen(true)}
        onOpenOracleCloud={() => setIsOracleCloudModalOpen(true)}
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

      {/* Oracle Cloud Always Free 24/7 Integration Modal */}
      <OracleCloudModal
        isOpen={isOracleCloudModalOpen}
        onClose={() => setIsOracleCloudModalOpen(false)}
      />

      {/* GitHub Actions CI/CD Synchronization & Diagnostic Modal */}
      <GitHubActionsModal
        isOpen={isGitHubActionsModalOpen}
        onClose={() => setIsGitHubActionsModalOpen(false)}
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

      {/* WebRTC Incoming Call Notification Modal */}
      <IncomingCallModal
        call={incomingCall}
        onAccept={answerWebRtcCall}
        onDecline={declineWebRtcCall}
      />

      {/* WebRTC Active Call & Video Modal */}
      <CallModal
        isOpen={isCallOpen || !!activeCall || isCalling}
        onClose={() => {
          setIsCallOpen(false);
          setActiveCallPeer(null);
          endWebRtcCall();
        }}
        contactName={
          activeCall?.calleeName ||
          activeCall?.callerName ||
          activeCallPeer?.name ||
          activeRoom?.name ||
          "Contacto"
        }
        avatarUrl={
          activeCall?.calleeAvatar ||
          activeCall?.callerAvatar ||
          activeCallPeer?.avatarUrl ||
          activeRoom?.avatarUrl
        }
        isVideo={callIsVideo || isWebRtcVideoOn || activeCall?.type === "video"}
        localStream={webRtcLocalStream}
        remoteStream={webRtcRemoteStream}
        isConnected={isWebRtcConnected}
        isMuted={isWebRtcMuted}
        isVideoOn={isWebRtcVideoOn}
        callDuration={webRtcCallDuration}
        onToggleMute={toggleWebRtcMute}
        onToggleVideo={toggleWebRtcVideo}
      />

      <AndroidGuideModal
        isOpen={isAndroidGuideOpen}
        onClose={() => setIsAndroidGuideOpen(false)}
      />

      <PublishDeployModal
        isOpen={isPublishDeployOpen}
        onClose={() => setIsPublishDeployOpen(false)}
        onOpenPlatformUpdate={() => setIsPlatformUpdateOpen(true)}
        onOpenGitHubActions={() => setIsGitHubActionsModalOpen(true)}
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
