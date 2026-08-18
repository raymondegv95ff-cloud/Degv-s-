import { initializeApp, getApps, getApp } from "firebase/app";
import {
  initializeAppCheck,
  ReCaptchaV3Provider,
  CustomProvider,
  type AppCheck,
} from "firebase/app-check";
import {
  getFirestore,
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

// 1. Initialize Firebase App instance
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// 2. Initialize Firebase AppCheck for security token validation
export let appCheck: AppCheck | null = null;
if (typeof window !== "undefined") {
  try {
    const recaptchaSiteKey =
      (import.meta as any).env?.VITE_RECAPTCHA_SITE_KEY ||
      (window as any).FIREBASE_APPCHECK_RECAPTCHA_KEY ||
      "6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI";

    // Enable debug token in development or test runs
    if (
      (import.meta as any).env?.DEV ||
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1"
    ) {
      (self as any).FIREBASE_APPCHECK_DEBUG_TOKEN = (self as any).FIREBASE_APPCHECK_DEBUG_TOKEN || true;
    }

    appCheck = initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider(recaptchaSiteKey),
      isTokenAutoRefreshEnabled: true,
    });
    console.log("[Firebase AppCheck] Security layer initialized with auto-refresh token enabled.");
  } catch (err) {
    console.warn("[Firebase AppCheck] Security layer initialization notice:", err);
  }
}

// 2. Initialize Firestore with Database ID if custom
export const db =
  firebaseConfig.firestoreDatabaseId &&
  firebaseConfig.firestoreDatabaseId !== "(default)"
    ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
    : getFirestore(app);

// 3. Initialize Firebase Authentication
export const auth = getAuth(app);

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
  } catch (error) {
    console.error("[Firestore] Error syncing user profile:", error);
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
 * 1. Enviar mensaje a Firestore en tiempo real garantizando destino correcto
 */
export async function sendMessage(
  senderId: string,
  receiverId: string,
  text: string,
  extraData: Partial<Message> = {}
): Promise<string> {
  try {
    const roomId = extraData.roomId || getDirectChatRoomId(senderId, receiverId);
    const messagesCollection = collection(db, "messages");

    const messageData = {
      senderId,
      receiverId,
      recipientId: receiverId, // Dual-key compatibility for strict routing
      text,
      content: text,
      roomId,
      senderName: extraData.senderName || "Usuario",
      senderAvatar: extraData.senderAvatar || "",
      type: extraData.type || "text",
      mediaUrl: extraData.mediaUrl || null,
      poll: extraData.poll || null,
      isRead: false,
      createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      timestamp: Date.now(),
      firestoreTimestamp: serverTimestamp(),
      reactions: extraData.reactions || [],
      ...extraData,
    };

    const docRef = await addDoc(messagesCollection, messageData);

    // Update or create room in Firestore for persistent real-time rooms
    const roomRef = doc(db, "rooms", roomId);
    await setDoc(
      roomRef,
      {
        id: roomId,
        lastMessage: text || (extraData.type === "image" ? "📷 Imagen" : extraData.type === "audio" ? "🎤 Nota de voz" : "Nuevo mensaje"),
        lastMessageTime: messageData.createdAt,
        timestamp: Date.now(),
        updatedAt: serverTimestamp(),
        participants: [senderId, receiverId],
      },
      { merge: true }
    );

    return docRef.id;
  } catch (error) {
    console.error("[Firestore] Error sending message:", error);
    throw error;
  }
}

/**
 * 2. Escuchar los mensajes entrantes en tiempo real para el usuario actual
 * Diferencia estrictamente entre senderId y recipientId/receiverId para evitar ecos/reflejos
 */
export function listenForMessages(
  currentUserId: string,
  onNewMessage: (message: Message) => void
): Unsubscribe {
  try {
    const q = query(
      collection(db, "messages"),
      where("receiverId", "==", currentUserId),
      orderBy("timestamp", "asc")
    );

    return onSnapshot(
      q,
      (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === "added") {
            const data = change.doc.data();
            
            // Diferenciación estricta: NO reflejar mensajes enviados por el propio usuario
            if (data.senderId === currentUserId) {
              return;
            }

            // Validación explícita de destinatario (recipientId / receiverId)
            const targetRecipient = data.recipientId || data.receiverId;
            const isExplicitRecipient = targetRecipient === currentUserId || targetRecipient === "usr_all";
            if (!isExplicitRecipient) {
              return;
            }

            const messageObj: Message = {
              id: change.doc.id,
              roomId: data.roomId || getDirectChatRoomId(data.senderId, currentUserId),
              senderId: data.senderId,
              senderName: data.senderName || "Usuario",
              senderAvatar: data.senderAvatar,
              content: data.text || data.content || "",
              type: data.type || "text",
              mediaUrl: data.mediaUrl,
              poll: data.poll,
              createdAt: data.createdAt || new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
              timestamp: data.timestamp || Date.now(),
              isRead: !!data.isRead,
              reactions: data.reactions || [],
            };
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
  try {
    const q = query(
      collection(db, "messages"),
      where("roomId", "==", roomId),
      orderBy("timestamp", "asc")
    );

    return onSnapshot(
      q,
      (snapshot) => {
        const msgs: Message[] = snapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            roomId: data.roomId || roomId,
            senderId: data.senderId,
            senderName: data.senderName || "Usuario",
            senderAvatar: data.senderAvatar,
            content: data.text || data.content || "",
            type: data.type || "text",
            mediaUrl: data.mediaUrl,
            poll: data.poll,
            createdAt: data.createdAt || new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            timestamp: data.timestamp || Date.now(),
            isRead: !!data.isRead,
            reactions: data.reactions || [],
          };
        });
        onMessagesUpdate(msgs);
      },
      (error) => {
        console.warn("[Firestore] Room listener notice:", error.message);
      }
    );
  } catch (err) {
    console.warn("[Firestore] Failed to set up room listener:", err);
    return () => {};
  }
}

/**
 * 4. Actualizar reacción a un mensaje en Firestore
 */
export async function updateMessageReactionInFirestore(
  messageId: string,
  reactions: Reaction[]
): Promise<void> {
  try {
    const msgRef = doc(db, "messages", messageId);
    await updateDoc(msgRef, { reactions });
  } catch (e) {
    console.warn("[Firestore] Reaction update notice:", e);
  }
}

/**
 * 5. Guardar o actualizar sala de chat en Firestore
 */
export async function saveRoomToFirestore(room: Room): Promise<void> {
  try {
    const roomRef = doc(db, "rooms", room.id);
    await setDoc(
      roomRef,
      {
        id: room.id,
        name: room.name,
        avatarUrl: room.avatarUrl || null,
        lastMessage: room.lastMessage || null,
        lastMessageTime: room.lastMessageTime || null,
        unreadCount: room.unreadCount || 0,
        isGroup: !!room.isGroup,
        isChannel: !!room.isChannel,
        isVaultSecret: !!(room.isVaultSecret || room.isSecretVault),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (e) {
    console.warn("[Firestore] saveRoomToFirestore notice:", e);
  }
}
