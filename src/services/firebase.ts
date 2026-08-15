import { initializeApp, getApps, getApp } from "firebase/app";
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
  serverTimestamp,
  Timestamp,
  Unsubscribe,
} from "firebase/firestore";
import firebaseConfig from "../../firebase-applet-config.json";
import { Message, Room } from "../types";

// Initialize Firebase App instance
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Firestore Database with database ID if custom
export const db =
  firebaseConfig.firestoreDatabaseId &&
  firebaseConfig.firestoreDatabaseId !== "(default)"
    ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
    : getFirestore(app);

/**
 * 1. Enviar mensaje al destinatario en Firestore
 */
export async function sendMessage(
  senderId: string,
  receiverId: string,
  text: string,
  extraData: Partial<Message> = {}
): Promise<string> {
  try {
    const messagesCollection = collection(db, "messages");
    const docRef = await addDoc(messagesCollection, {
      senderId,
      receiverId,
      text,
      content: text,
      roomId: extraData.roomId || `room_${[senderId, receiverId].sort().join("_")}`,
      senderName: extraData.senderName || "Usuario",
      senderAvatar: extraData.senderAvatar || "",
      type: extraData.type || "text",
      mediaUrl: extraData.mediaUrl || null,
      poll: extraData.poll || null,
      isRead: false,
      createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      timestamp: Date.now(),
      firestoreTimestamp: serverTimestamp(),
      ...extraData,
    });
    return docRef.id;
  } catch (error) {
    console.error("Error sending message to Firestore:", error);
    throw error;
  }
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
      where("receiverId", "==", currentUserId),
      orderBy("timestamp", "asc")
    );

    return onSnapshot(
      q,
      (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === "added") {
            const data = change.doc.data();
            const messageObj: Message = {
              id: change.doc.id,
              roomId: data.roomId || `room_${[data.senderId, data.receiverId].sort().join("_")}`,
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
        console.warn("Firestore listenForMessages notice:", error.message);
      }
    );
  } catch (err) {
    console.warn("Failed to set up Firestore listener:", err);
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
        console.warn("Firestore room snapshot notice:", error.message);
      }
    );
  } catch (err) {
    console.warn("Failed to set up room listener:", err);
    return () => {};
  }
}
