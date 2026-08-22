import { useState, useEffect } from "react";
import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import {
  getFirestore,
  initializeFirestore,
  collection,
  addDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  doc,
  setDoc,
  updateDoc,
  getDocs,
  getDoc,
  serverTimestamp,
  Unsubscribe,
  Firestore,
  disableNetwork,
  enableNetwork,
  setLogLevel,
} from "firebase/firestore";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInAnonymously,
  signOut,
  onAuthStateChanged,
  updateProfile,
  User as FirebaseUser,
} from "firebase/auth";
import firebaseConfig from "../../firebase-applet-config.json";
import { Message, Room, UserProfile, Reaction } from "../types";
import { indexedDbQueueService } from "./indexedDbQueueService";
import {
  sendMessage as unifiedSendMessage,
  listenForConversationMessages,
  normalizeMessage,
} from "./messengerService";

// 1. Initialize Firebase App instance
export const app: FirebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// 2. Initialize Firestore directly with database ID if configured
export const db: Firestore = (() => {
  const dbId =
    firebaseConfig.firestoreDatabaseId &&
    firebaseConfig.firestoreDatabaseId !== "(default)"
      ? firebaseConfig.firestoreDatabaseId
      : undefined;

  if (dbId) {
    try {
      return getFirestore(app, dbId);
    } catch (e1) {
      console.warn(`[Firebase] getFirestore(app, "${dbId}") failed, attempting initializeFirestore:`, e1);
      try {
        return initializeFirestore(app, { ignoreUndefinedProperties: true }, dbId);
      } catch (e2) {
        console.warn(`[Firebase] initializeFirestore with custom dbId failed, falling back to default instance:`, e2);
      }
    }
  }

  try {
    return getFirestore(app);
  } catch (e3) {
    console.warn(`[Firebase] getFirestore(app) failed, attempting initializeFirestore default:`, e3);
    try {
      return initializeFirestore(app, { ignoreUndefinedProperties: true });
    } catch (e4) {
      console.error("[Firebase] Fatal error initializing Firestore:", e4);
      // Fallback instance to prevent crashing on root evaluation
      return getFirestore(app);
    }
  }
})();

// Silence internal Firestore log spam on quota limits
try {
  setLogLevel("silent");
} catch {}

// 3. Initialize Firebase Authentication
export const auth = getAuth(app);

/**
 * Safely pause Firestore network to stop backoff loops when free quota is exceeded
 */
export async function pauseFirestoreNetwork(): Promise<void> {
  try {
    await disableNetwork(db);
    console.log("[Firestore] 🛑 Network safely paused to prevent quota overload / backoff loops.");
  } catch (e) {
    // ignore
  }
}

/**
 * Resume Firestore network
 */
export async function resumeFirestoreNetwork(): Promise<void> {
  try {
    await enableNetwork(db);
    console.log("[Firestore] 🟢 Network resumed.");
  } catch (e) {
    // ignore
  }
}

// Hook into indexedDbQueueService quota lifecycle
indexedDbQueueService.onQuotaPause = () => {
  pauseFirestoreNetwork();
};

indexedDbQueueService.onQuotaResume = () => {
  resumeFirestoreNetwork();
};

// If quota is already marked as exhausted on initialization, pause network immediately
if (typeof window !== "undefined") {
  if (indexedDbQueueService.isQuotaExhausted()) {
    pauseFirestoreNetwork();
  }
}

// Helper to convert Firebase User to UserProfile
export function mapFirebaseUserToProfile(fbUser: FirebaseUser, extra: Partial<UserProfile> = {}): UserProfile {
  const username = extra.username || fbUser.displayName || fbUser.email?.split("@")[0] || `user_${fbUser.uid.slice(0, 6)}`;
  return {
    id: fbUser.uid,
    username,
    email: fbUser.email || `${username}@degvs.app`,
    firstName: extra.firstName || username,
    lastName: extra.lastName || "",
    avatarUrl: extra.avatarUrl || fbUser.photoURL || `https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80`,
    bio: extra.bio || "¡Hola! Estoy usando Degv's Messenger 🚀",
    status: "online",
    phone: fbUser.phoneNumber || undefined,
  };
}

function getDeviceMetadata() {
  if (typeof window === "undefined") return {};

  let deviceUniqueId = "";
  try {
    deviceUniqueId = localStorage.getItem("degvs_device_unique_id") || "";
    if (!deviceUniqueId) {
      deviceUniqueId = `dev_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      localStorage.setItem("degvs_device_unique_id", deviceUniqueId);
    }
  } catch {}

  return {
    deviceId: deviceUniqueId,
    userAgent: typeof navigator !== "undefined" ? navigator.userAgent || "Unknown" : "Unknown",
    platform: typeof navigator !== "undefined" ? navigator.platform || "Web" : "Web",
    language: typeof navigator !== "undefined" ? navigator.language || "es" : "es",
    screenResolution: typeof window !== "undefined" && typeof window.screen !== "undefined" ? `${window.screen.width}x${window.screen.height}` : "desktop",
    timezone: (typeof Intl !== "undefined" && Intl?.DateTimeFormat?.()?.resolvedOptions?.()?.timeZone) || "UTC",
    isMobile: typeof navigator !== "undefined" && /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || ""),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Autenticación Anónima Automática y Persistente en Firebase Auth
 */
export async function initAnonymousUser(existingProfile?: Partial<UserProfile>): Promise<UserProfile> {
  try {
    let fbUser = auth.currentUser;
    if (!fbUser) {
      const userCredential = await signInAnonymously(auth);
      fbUser = userCredential.user;
    }

    const username = existingProfile?.username || `user_${fbUser.uid.slice(0, 6)}`;
    const profile: UserProfile = mapFirebaseUserToProfile(fbUser, {
      username,
      firstName: existingProfile?.firstName || username,
      lastName: existingProfile?.lastName || "",
      avatarUrl: existingProfile?.avatarUrl,
      bio: existingProfile?.bio || "¡Hola! Estoy usando Degv's Messenger 🚀",
      ...existingProfile,
    });

    await registerUser(profile);
    return profile;
  } catch (error) {
    console.warn("[FirebaseAuth] Anonymous auth notice:", error);
    // Safe fallback if network error
    const fallbackId = auth.currentUser?.uid || `usr_anon_${Date.now()}`;
    const fallbackProfile: UserProfile = {
      id: fallbackId,
      username: existingProfile?.username || `user_${fallbackId.slice(0, 6)}`,
      firstName: existingProfile?.firstName || "Usuario",
      lastName: existingProfile?.lastName || "",
      avatarUrl: existingProfile?.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${fallbackId}`,
      email: `${existingProfile?.username || fallbackId}@degvs.app`,
      status: "online",
    };
    return fallbackProfile;
  }
}

const registeredUsersCache = new Set<string>();

/**
 * Guarda o actualiza la información básica del usuario en la colección 'users' de Firestore con metadatos del dispositivo
 */
export async function registerUser(user: UserProfile): Promise<void> {
  if (!user?.id) return;
  if (registeredUsersCache.has(user.id)) return;
  if (indexedDbQueueService.isQuotaExhausted()) return;

  try {
    registeredUsersCache.add(user.id);
    const userDocRef = doc(db, "users", user.id);
    const device = getDeviceMetadata();

    await setDoc(
      userDocRef,
      {
        id: user.id,
        username: user.username,
        email: user.email || `${user.username}@degvs.app`,
        firstName: user.firstName || user.username,
        lastName: user.lastName || "",
        avatarUrl: user.avatarUrl || null,
        bio: user.bio || "En línea",
        status: user.status || "online",
        phone: user.phone || null,
        device,
        lastSeen: Date.now(),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (error: any) {
    if (error?.code === "resource-exhausted" || error?.message?.includes("Quota limit exceeded")) {
      indexedDbQueueService.markQuotaExhausted(60);
      console.warn("[Firestore] Quota limit reached in registerUser. Continuing in local-first mode.");
    } else {
      console.warn("[Firestore] Notice in registerUser:", error?.message || error);
    }
  }
}

/**
 * Obtiene el perfil de un usuario registrado en Firestore por su ID o username
 */
export async function getFirestoreUser(userId: string): Promise<UserProfile | null> {
  try {
    const cleanId = (userId || "").trim();
    if (!cleanId) return null;

    // 1. Intento por Doc ID directo
    const userDocRef = doc(db, "users", cleanId);
    const snap = await getDoc(userDocRef);
    if (snap.exists()) {
      const data = snap.data();
      return {
        id: snap.id,
        username: data.username || snap.id,
        firstName: data.firstName || data.username || "Usuario",
        lastName: data.lastName || "",
        email: data.email || `${data.username || snap.id}@degvs.app`,
        avatarUrl: data.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(data.username || snap.id)}`,
        bio: data.bio || "",
        phone: data.phone || "",
        status: data.status || "online",
      };
    }

    // 2. Consulta 'where' en Firestore si pairId corresponde a un campo username o id
    const usersRef = collection(db, "users");
    const qUsername = query(usersRef, where("username", "==", cleanId));
    let snapQuery = await getDocs(qUsername);
    if (snapQuery.empty) {
      const qId = query(usersRef, where("id", "==", cleanId));
      snapQuery = await getDocs(qId);
    }

    if (!snapQuery.empty) {
      const docData = snapQuery.docs[0].data();
      return {
        id: snapQuery.docs[0].id,
        username: docData.username || snapQuery.docs[0].id,
        firstName: docData.firstName || docData.username || "Usuario",
        lastName: docData.lastName || "",
        email: docData.email || `${docData.username || snapQuery.docs[0].id}@degvs.app`,
        avatarUrl: docData.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(docData.username || snapQuery.docs[0].id)}`,
        bio: docData.bio || "",
        phone: docData.phone || "",
        status: docData.status || "online",
      };
    }
  } catch (err) {
    console.warn("[Firestore] Error fetching user by ID or where query:", err);
  }
  return null;
}

/**
 * Busca una sala existente entre dos usuarios mediante consulta 'participants' en Firestore o crea una nueva
 */
export async function findOrCreateDirectRoom(
  currentUser: UserProfile,
  targetUser: UserProfile
): Promise<Room> {
  const directRoomId = getDirectChatRoomId(currentUser.id, targetUser.id);
  const targetName = `${targetUser.firstName || ""} ${targetUser.lastName || ""}`.trim() || targetUser.username;

  try {
    // 1. Verificar por ID determinista
    const roomRef = doc(db, "rooms", directRoomId);
    const snap = await getDoc(roomRef);

    if (snap.exists()) {
      const data = snap.data();
      return {
        id: directRoomId,
        name: targetName,
        avatarUrl: targetUser.avatarUrl || data.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(targetUser.username)}`,
        unreadCount: data.unreadCount || 0,
        lastMessage: data.lastMessage || "Chat conectado 🚀",
        lastMessageTime: data.lastMessageTime || new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        participants: [currentUser, targetUser],
        isGroup: false,
      };
    }

    // 2. Consulta 'where' por array de 'participants' en rooms y chats_rooms
    const roomsRef = collection(db, "rooms");
    const q = query(roomsRef, where("participants", "array-contains", currentUser.id));
    const roomsSnap = await getDocs(q);

    for (const roomDoc of roomsSnap.docs) {
      const rData = roomDoc.data();
      const parts = rData.participants || [];
      if (parts.includes(targetUser.id)) {
        return {
          id: roomDoc.id,
          name: targetName,
          avatarUrl: targetUser.avatarUrl || rData.avatarUrl,
          unreadCount: rData.unreadCount || 0,
          lastMessage: rData.lastMessage || "Chat conectado 🚀",
          lastMessageTime: rData.lastMessageTime || new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          participants: [currentUser, targetUser],
          isGroup: false,
        };
      }
    }

    // Consulta fallback en chats_rooms
    const chatsRoomsRef = collection(db, "chats_rooms");
    const qChats = query(chatsRoomsRef, where("participants", "array-contains", currentUser.id));
    const chatsSnap = await getDocs(qChats);
    for (const roomDoc of chatsSnap.docs) {
      const rData = roomDoc.data();
      const parts = rData.participants || [];
      if (parts.includes(targetUser.id)) {
        return {
          id: roomDoc.id,
          name: targetName,
          avatarUrl: targetUser.avatarUrl || rData.avatarUrl,
          unreadCount: rData.unreadCount || 0,
          lastMessage: rData.lastMessage || "Chat conectado 🚀",
          lastMessageTime: rData.lastMessageTime || new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          participants: [currentUser, targetUser],
          isGroup: false,
        };
      }
    }
  } catch (e) {
    console.warn("[Firestore] Notice checking direct room:", e);
  }

  // Create new room document in Firestore
  const newRoom: Room = {
    id: directRoomId,
    name: targetName,
    avatarUrl: targetUser.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(targetUser.username)}`,
    unreadCount: 0,
    lastMessage: "Chat en tiempo real conectado 🚀",
    lastMessageTime: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    participants: [currentUser, targetUser],
    isGroup: false,
  };

  await saveRoomToFirestore(newRoom);
  return newRoom;
}

/**
 * Escucha en tiempo real todas las salas donde el usuario es participante
 */
export function listenForUserRooms(
  userId: string,
  onRoomsUpdate: (rooms: Room[]) => void
): Unsubscribe {
  try {
    const roomsCollection = collection(db, "rooms");
    const q = query(
      roomsCollection,
      where("participants", "array-contains", userId)
    );

    return onSnapshot(
      q,
      (snapshot) => {
        const rooms: Room[] = snapshot.docs.map((docSnap) => {
          const d = docSnap.data();
          return {
            id: docSnap.id,
            name: d.name || "Chat",
            avatarUrl: d.avatarUrl,
            lastMessage: d.lastMessage || "",
            lastMessageTime: d.lastMessageTime || "",
            unreadCount: d.unreadCount || 0,
            isGroup: !!d.isGroup,
            isChannel: !!d.isChannel,
            isVaultSecret: !!(d.isVaultSecret || d.isSecretVault),
            participants: d.participants || [userId],
            timestamp: d.timestamp || Date.now(),
          };
        });
        onRoomsUpdate(rooms);
      },
      (error) => {
        console.warn("[Firestore] listenForUserRooms notice:", error.message);
      }
    );
  } catch (error) {
    console.warn("[Firestore] Error in listenForUserRooms:", error);
    return () => {};
  }
}

/**
 * Custom Hook: useAuth
 * Maneja el estado de autenticación anónima/persistente y registro con metadatos
 */
export function useAuth() {
  const [user, setUser] = useState<UserProfile | null>(() => {
    try {
      const stored = localStorage.getItem("degvs_user");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    // Escuchar el estado de autenticación de Firebase con persistencia de sesión
    const unsubscribe = subscribeToFirebaseAuth(async (fbUser) => {
      if (!isMounted) return;
      if (fbUser) {
        setUser(fbUser);
        try {
          localStorage.setItem("degvs_user", JSON.stringify(fbUser));
          // Registrar metadatos del dispositivo al detectar sesión
          await registerUser(fbUser);
        } catch (regErr) {
          console.warn("[useAuth] registerUser notice:", regErr);
        }
        if (isMounted) setLoading(false);
      } else {
        try {
          const stored = localStorage.getItem("degvs_user");
          const existingProfile = stored ? JSON.parse(stored) : undefined;
          const anon = await initAnonymousUser(existingProfile);
          if (isMounted) {
            setUser(anon);
            localStorage.setItem("degvs_user", JSON.stringify(anon));
            await registerUser(anon);
            setLoading(false);
          }
        } catch (err: any) {
          if (isMounted) {
            setError(err?.message || "Error al inicializar sesión");
            setLoading(false);
          }
        }
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  const loginGuest = async () => {
    setLoading(true);
    try {
      const guest = await loginGuestWithFirebase();
      setUser(guest);
      localStorage.setItem("degvs_user", JSON.stringify(guest));
      await registerUser(guest);
      return guest;
    } catch (err: any) {
      setError(err?.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const loginEmail = async (emailOrUsername: string, pass: string) => {
    setLoading(true);
    try {
      const logged = await loginWithFirebase(emailOrUsername, pass);
      setUser(logged);
      localStorage.setItem("degvs_user", JSON.stringify(logged));
      await registerUser(logged);
      return logged;
    } catch (err: any) {
      setError(err?.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const registerEmail = async (username: string, email: string, pass: string) => {
    setLoading(true);
    try {
      const registered = await registerWithFirebase(username, email, pass);
      setUser(registered);
      localStorage.setItem("degvs_user", JSON.stringify(registered));
      await registerUser(registered);
      return registered;
    } catch (err: any) {
      setError(err?.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    await logoutFromFirebase();
    setUser(null);
    try {
      localStorage.removeItem("degvs_user");
    } catch {}
  };

  return {
    user,
    setUser,
    isAuthenticated: !!user,
    loading,
    error,
    loginGuest,
    loginEmail,
    registerEmail,
    logout,
  };
}

/**
 * Autenticación Real de Usuarios con Firebase Auth
 */
export async function registerWithFirebase(
  username: string,
  email: string,
  pass: string
): Promise<UserProfile> {
  const cleanEmail = email.trim().toLowerCase();
  const cleanUsername = username.trim().toLowerCase().replace(/\s+/g, "_");

  // Create Firebase Auth user
  const userCredential = await createUserWithEmailAndPassword(auth, cleanEmail, pass);
  const fbUser = userCredential.user;

  // Update Auth Profile
  await updateProfile(fbUser, {
    displayName: cleanUsername,
    photoURL: `https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80`,
  });

  const profile = mapFirebaseUserToProfile(fbUser, {
    username: cleanUsername,
    email: cleanEmail,
  });

  // Persist User Profile in Firestore
  await syncUserProfileToFirestore(profile);
  return profile;
}

export async function loginWithFirebase(emailOrUsername: string, pass: string): Promise<UserProfile> {
  let targetEmail = emailOrUsername.trim().toLowerCase();

  // If user passed a username instead of email, check if email exists in Firestore
  if (!targetEmail.includes("@")) {
    try {
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("username", "==", targetEmail));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const found = snap.docs[0].data();
        if (found.email) {
          targetEmail = found.email;
        }
      } else {
        targetEmail = `${targetEmail}@degvs.app`;
      }
    } catch {
      targetEmail = `${targetEmail}@degvs.app`;
    }
  }

  const userCredential = await signInWithEmailAndPassword(auth, targetEmail, pass);
  const fbUser = userCredential.user;

  // Retrieve user document from Firestore if present
  let extraData: Partial<UserProfile> = {};
  try {
    const userDocSnap = await getDoc(doc(db, "users", fbUser.uid));
    if (userDocSnap.exists()) {
      extraData = userDocSnap.data() as Partial<UserProfile>;
    }
  } catch (e) {
    console.warn("Could not fetch user document from Firestore:", e);
  }

  const profile = mapFirebaseUserToProfile(fbUser, extraData);
  return profile;
}

export async function loginGuestWithFirebase(): Promise<UserProfile> {
  const userCredential = await signInAnonymously(auth);
  const fbUser = userCredential.user;
  const username = `anon_${fbUser.uid.slice(0, 6)}`;
  const profile = mapFirebaseUserToProfile(fbUser, {
    username,
    bio: "Usuario Invitado en Degv's Messenger",
  });
  await syncUserProfileToFirestore(profile);
  return profile;
}

export async function logoutFromFirebase(): Promise<void> {
  await signOut(auth);
}

export function subscribeToFirebaseAuth(onUserChanged: (user: UserProfile | null) => void): Unsubscribe {
  return onAuthStateChanged(auth, async (fbUser) => {
    if (fbUser) {
      try {
        const userDoc = await getDoc(doc(db, "users", fbUser.uid));
        const extra = userDoc.exists() ? (userDoc.data() as Partial<UserProfile>) : {};
        onUserChanged(mapFirebaseUserToProfile(fbUser, extra));
      } catch {
        onUserChanged(mapFirebaseUserToProfile(fbUser));
      }
    } else {
      onUserChanged(null);
    }
  });
}

/**
 * Sincronización del Perfil de Usuario en Firestore
 */
export async function syncUserProfileToFirestore(user: UserProfile): Promise<void> {
  if (indexedDbQueueService.isQuotaExhausted()) return;
  try {
    const userDocRef = doc(db, "users", user.id);
    await setDoc(
      userDocRef,
      {
        id: user.id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        avatarUrl: user.avatarUrl,
        bio: user.bio,
        status: user.status,
        lastSeen: Date.now(),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (error: any) {
    if (error?.code === "resource-exhausted" || error?.message?.includes("Quota limit exceeded")) {
      indexedDbQueueService.markQuotaExhausted(15);
      console.warn("[Firestore] Quota limit reached in syncUserProfileToFirestore.");
    } else {
      console.warn("[Firestore] Notice syncing user profile:", error?.message || error);
    }
  }
}

/**
 * Genera un Room ID determinista y único para chats 1 a 1 entre dos usuarios
 */
export function getDirectChatRoomId(userAId: string, userBId: string): string {
  const cleanA = (userAId || "").trim();
  const cleanB = (userBId || "").trim();
  return `dm_${[cleanA, cleanB].sort().join("_")}`;
}

/**
 * Escucha la lista global de usuarios registrados en Firestore en tiempo real
 */
export function listenForFirestoreUsers(onUsersUpdate: (users: UserProfile[]) => void): Unsubscribe {
  try {
    const usersCollection = collection(db, "users");
    const q = query(usersCollection, orderBy("lastSeen", "desc"));

    return onSnapshot(
      q,
      (snapshot) => {
        const users: UserProfile[] = snapshot.docs.map((docSnap) => {
          const d = docSnap.data();
          return {
            id: docSnap.id,
            username: d.username || docSnap.id,
            firstName: d.firstName || d.username || "Usuario",
            lastName: d.lastName || "",
            email: d.email || `${d.username || docSnap.id}@degvs.app`,
            avatarUrl: d.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(docSnap.id)}`,
            bio: d.bio || "",
            status: d.status || "online",
            phone: d.phone,
          };
        });
        onUsersUpdate(users);
      },
      (err) => {
        console.warn("[Firestore] User list listener notice:", err.message);
      }
    );
  } catch (err) {
    console.warn("[Firestore] Failed to listen to firestore users:", err);
    return () => {};
  }
}

/**
 * 1. Enviar mensaje centralizado mediante Messenger Service
 */
export async function sendMessage(
  senderId: string,
  receiverId: string,
  text: string,
  extraData: Partial<Message> = {}
): Promise<string> {
  const conversationId = extraData.conversationId || extraData.roomId || getDirectChatRoomId(senderId, receiverId);
  const participants = extraData.participants || [senderId, receiverId];

  const result = await unifiedSendMessage({
    senderId,
    senderName: extraData.senderName,
    senderAvatar: extraData.senderAvatar,
    recipientId: receiverId,
    participants,
    conversationId,
    type: extraData.type || "text",
    text,
    content: text,
    attachment: extraData.attachment,
    mediaUrl: extraData.mediaUrl,
    audioDuration: extraData.audioDuration,
    audioTranscript: extraData.audioTranscript,
    poll: extraData.poll,
    replyTo: extraData.replyTo,
    replyToSnippet: extraData.replyToSnippet,
    clientMessageId: extraData.clientMessageId,
    customId: extraData.id,
  });

  return result.messageId;
}

/**
 * 2. Escuchar los mensajes entrantes en tiempo real para el usuario actual
 */
export function listenForMessages(
  currentUserId: string,
  onNewMessage: (message: Message) => void
): Unsubscribe {
  try {
    const q = query(
      collection(db, "messages"),
      where("receiverId", "==", currentUserId)
    );

    return onSnapshot(
      q,
      (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === "added") {
            const data = change.doc.data();
            
            if (data.senderId === currentUserId) {
              return;
            }

            const targetRecipient = data.recipientId || data.receiverId;
            const isExplicitRecipient = targetRecipient === currentUserId || targetRecipient === "usr_all";
            if (!isExplicitRecipient) {
              return;
            }

            const messageObj = normalizeMessage({ id: change.doc.id, ...data }, data.roomId);
            onNewMessage(messageObj);
          }
        });
      },
      (error) => {
        console.warn("[Firestore] listenForMessages notice:", error.message);
      }
    );
  } catch (err) {
    console.warn("[Firestore] Failed to set up listener:", err);
    return () => {};
  }
}

/**
 * 3. Escuchar todos los mensajes de una sala específica en tiempo real
 */
export function listenForRoomMessages(
  roomId: string,
  onMessagesUpdate: (messages: Message[]) => void
): Unsubscribe {
  return listenForConversationMessages(roomId, onMessagesUpdate);
}

/**
 * 4. Actualizar reacción a un mensaje en Firestore
 */
export async function updateMessageReactionInFirestore(
  messageId: string,
  reactions: Reaction[]
): Promise<void> {
  if (indexedDbQueueService.isQuotaExhausted()) return;
  try {
    const msgRef = doc(db, "messages", messageId);
    await updateDoc(msgRef, { reactions });
  } catch (e: any) {
    if (e?.code === "resource-exhausted" || e?.message?.includes("Quota limit exceeded")) {
      indexedDbQueueService.markQuotaExhausted(30);
    } else {
      console.warn("[Firestore] Reaction update notice:", e?.message || e);
    }
  }
}

/**
 * 5. Guardar o actualizar sala de chat en Firestore
 */
export async function saveRoomToFirestore(room: Room): Promise<void> {
  if (indexedDbQueueService.isQuotaExhausted()) return;
  try {
    const roomRef = doc(db, "rooms", room.id);
    const participantIds = Array.isArray(room.participants)
      ? room.participants.map((p) => (typeof p === "string" ? p : p.id))
      : [];

    const roomPayload = {
      id: room.id,
      name: room.name,
      avatarUrl: room.avatarUrl || null,
      lastMessage: room.lastMessage || null,
      lastMessageTime: room.lastMessageTime || null,
      unreadCount: room.unreadCount || 0,
      isGroup: !!room.isGroup,
      isChannel: !!room.isChannel,
      isVaultSecret: !!(room.isVaultSecret || room.isSecretVault),
      participants: participantIds,
      updatedAt: serverTimestamp(),
    };

    await setDoc(roomRef, roomPayload, { merge: true });
  } catch (e: any) {
    if (e?.code === "resource-exhausted" || e?.message?.includes("Quota limit exceeded")) {
      indexedDbQueueService.markQuotaExhausted(15);
    } else {
      console.warn("[Firestore] saveRoomToFirestore notice:", e.message || e);
    }
  }
}

/**
 * 6. Publicar actualización y sincronización de plataforma en Firestore
 */
export async function publishPlatformUpdateToFirestore(payload: {
  version: string;
  channel?: string;
  sourcePlatform?: string;
  platformsSynced?: string[];
  latencyMs?: number;
  freedBytes?: number;
  metadata?: any;
}): Promise<string | null> {
  if (indexedDbQueueService.isQuotaExhausted()) {
    console.log("[Firestore Updates] Quota in cooldown. Skipping cloud publish.");
    return `local_update_${Date.now()}`;
  }
  try {
    const updatesCol = collection(db, "platform_updates");
    const docData = {
      version: payload.version,
      channel: payload.channel || "Production",
      sourcePlatform: payload.sourcePlatform || "web_pwa",
      platformsSynced: payload.platformsSynced || [],
      latencyMs: payload.latencyMs || 0,
      freedBytes: payload.freedBytes || 0,
      metadata: payload.metadata || {},
      publisherId: auth.currentUser?.uid || "system_client",
      publisherEmail: auth.currentUser?.email || "anonymous@degvs.app",
      timestamp: Date.now(),
      createdAt: serverTimestamp(),
    };

    console.log(`[Firestore Updates] 🚀 Publicando versión '${payload.version}' en Firestore ('platform_updates')...`, docData);
    const docRef = await addDoc(updatesCol, docData);

    // Also update current active version marker in system_status
    try {
      const statusRef = doc(db, "system_status", "latest_version");
      await setDoc(
        statusRef,
        {
          currentVersion: payload.version,
          latestUpdateDocId: docRef.id,
          lastSyncedAt: Date.now(),
          updatedAt: serverTimestamp(),
          source: payload.sourcePlatform || "client",
        },
        { merge: true }
      );
    } catch (err2) {
      console.warn("[Firestore Updates] Warning writing latest_version doc:", err2);
    }

    console.log(`[Firestore Updates] ✅ Versión publicada con éxito. Doc ID: ${docRef.id}`);
    return docRef.id;
  } catch (error: any) {
    if (error?.code === "resource-exhausted" || error?.message?.includes("Quota limit exceeded")) {
      indexedDbQueueService.markQuotaExhausted(15);
      console.warn("[Firestore Updates] Quota limit reached. Saved locally.");
      return `local_update_${Date.now()}`;
    }
    console.warn("[Firestore Updates] Notice publicando actualización en Firestore:", error?.message || error);
    return null;
  }
}

/**
 * 7. Escuchar actualizaciones de plataforma en tiempo real desde Firestore
 */
export function listenForPlatformUpdatesFromFirestore(
  callback: (updates: any[]) => void
): Unsubscribe {
  try {
    const updatesCol = collection(db, "platform_updates");

    console.log("[Firestore Updates] 📡 Inicializando listener reactivo onSnapshot en 'platform_updates'...");

    return onSnapshot(
      updatesCol,
      (snapshot) => {
        const list: any[] = [];
        snapshot.forEach((docSnap) => {
          list.push({
            id: docSnap.id,
            ...docSnap.data(),
          });
        });
        // Ordenar en memoria por timestamp descendente
        list.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        console.log(`[Firestore Updates] 📥 [onSnapshot] ${list.length} registros de actualización recibidos desde Firestore.`);
        callback(list);
      },
      (error) => {
        console.warn("[Firestore Updates] Notice en listener de 'platform_updates':", error.message || error);
      }
    );
  } catch (err) {
    console.warn("[Firestore Updates] Excepción en listenForPlatformUpdatesFromFirestore:", err);
    return () => {};
  }
}

/**
 * 8. Obtener información de estado de Firebase y Firestore
 */
export function getFirebaseDatabaseInfo() {
  return {
    appName: app.name,
    databaseId: (firebaseConfig as any).firestoreDatabaseId || "(default)",
    projectId: (firebaseConfig as any).projectId || "degvs-messenger",
    isAuthReady: !!auth,
    currentUser: auth.currentUser ? { uid: auth.currentUser.uid, email: auth.currentUser.email } : null,
  };
}

// Exportación del módulo de mensajería unificada (Messenger API)
export * from "./messengerService";

