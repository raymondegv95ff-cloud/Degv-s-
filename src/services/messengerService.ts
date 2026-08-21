import {
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
  collection,
  query,
  orderBy,
  where,
  Timestamp,
  Unsubscribe,
  writeBatch,
} from "firebase/firestore";
import { getStorage, ref, uploadString, getDownloadURL } from "firebase/storage";
import { db, app } from "./firebase";
import { Message, Reaction, PollData } from "../types";
import { indexedDbQueueService, QueuedMessageItem } from "./indexedDbQueueService";

export type MessageStatus =
  | "pending"
  | "sending"
  | "sent"
  | "delivered"
  | "read"
  | "failed"
  | "queued";

export interface MessengerMessage {
  id: string;
  clientMessageId: string;
  conversationId: string;
  roomId?: string;
  senderId: string;
  senderName?: string;
  senderAvatar?: string;
  recipientId?: string;
  receiverId?: string;
  participants: string[];
  type: "text" | "image" | "audio" | "video" | "file" | "poll" | "ai_image" | "sticker";
  text?: string;
  content?: string;
  attachment?: {
    url: string;
    name?: string;
    mimeType?: string;
    size?: number;
  };
  mediaUrl?: string;
  mediaName?: string;
  mediaSize?: string;
  audioDuration?: number;
  audioTranscript?: string;
  poll?: PollData;
  replyTo?: string | null;
  replyToMessageId?: string;
  replyToSnippet?: {
    id?: string;
    senderName: string;
    text: string;
  };
  isStarred?: boolean;
  isPinned?: boolean;
  isEphemerous?: boolean;
  reactions?: Reaction[];
  status: MessageStatus;
  createdAt?: any;
  updatedAt?: any;
  timestamp?: number;
}

export interface SendMessageParams {
  senderId: string;
  senderName?: string;
  senderAvatar?: string;
  recipientId?: string;
  participants: string[];
  conversationId: string;
  type?: Message["type"];
  text?: string;
  content?: string;
  attachment?: {
    url: string;
    name?: string;
    mimeType?: string;
    size?: number;
  };
  mediaUrl?: string;
  audioDuration?: number;
  audioTranscript?: string;
  poll?: PollData;
  replyTo?: string | null;
  replyToSnippet?: {
    id?: string;
    senderName: string;
    text: string;
  };
  clientMessageId?: string;
  customId?: string;
}

/**
 * Generates a unique, idempotent client message ID
 */
export function createClientMessageId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return `${crypto.randomUUID()}-${Date.now()}`;
  }
  return `msg_${Math.random().toString(36).substring(2, 9)}_${Date.now()}`;
}

/**
 * Creates deterministic conversation ID for private chats (userA + userB)
 * Sorts user IDs alphabetically to ensure commutative consistency
 */
export function getPrivateConversationId(userA: string, userB: string): string {
  const cleanA = (userA || "").trim();
  const cleanB = (userB || "").trim();
  const sorted = [cleanA, cleanB].sort();
  return `dm_${sorted[0]}_${sorted[1]}`;
}

/**
 * Creates deterministic conversation ID for group chats
 */
export function getGroupConversationId(groupId: string): string {
  const cleanId = (groupId || "").trim().replace(/^group_/, "");
  return `group_${cleanId}`;
}

/**
 * Normalizes any incoming Firestore doc or legacy document into standard Message format
 * Handles: recipientId, receiverId, to, recipient, participants, text, content, attachment, mediaUrl
 */
export function normalizeMessage(raw: any, fallbackRoomId?: string): Message {
  if (!raw) {
    return {
      id: `msg_${Date.now()}`,
      roomId: fallbackRoomId || "room_default",
      senderId: "usr_unknown",
      senderName: "Usuario",
      content: "",
      type: "text",
      createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      timestamp: Date.now(),
      isRead: false,
      status: "sent",
    };
  }

  const id = raw.id || raw.messageId || `msg_${Date.now()}`;
  const conversationId = raw.conversationId || raw.roomId || fallbackRoomId || "room_default";
  const roomId = conversationId;
  const senderId = raw.senderId || "usr_unknown";
  const senderName = raw.senderName || "Usuario";
  const senderAvatar = raw.senderAvatar;

  // Normalized recipient & participants resolution
  const recipientId = raw.recipientId || raw.receiverId || raw.to || raw.recipient || undefined;
  const receiverId = recipientId;
  const participants = Array.isArray(raw.participants)
    ? raw.participants
    : [senderId, recipientId].filter(Boolean);

  // Content / text resolution
  const text = raw.text || raw.content || "";
  const content = text;

  // Media / attachment resolution
  let attachment = raw.attachment;
  let mediaUrl = raw.mediaUrl;
  if (!attachment && mediaUrl) {
    attachment = {
      url: mediaUrl,
      name: raw.mediaName,
      size: raw.mediaSize ? parseInt(raw.mediaSize, 10) : undefined,
    };
  }
  if (!mediaUrl && attachment?.url) {
    mediaUrl = attachment.url;
  }

  // Timestamp & formatted time resolution
  let timestamp = raw.timestamp;
  let createdAtStr = typeof raw.createdAt === "string" ? raw.createdAt : "";

  if (raw.createdAt && typeof raw.createdAt.toDate === "function") {
    const d = raw.createdAt.toDate();
    timestamp = d.getTime();
    createdAtStr = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } else if (raw.firestoreTimestamp && typeof raw.firestoreTimestamp.toDate === "function") {
    const d = raw.firestoreTimestamp.toDate();
    timestamp = d.getTime();
    createdAtStr = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } else if (!timestamp) {
    timestamp = Date.now();
  }

  if (!createdAtStr) {
    createdAtStr = new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  const rawStatus = raw.status;
  const status: MessageStatus =
    rawStatus === "read"
      ? "read"
      : rawStatus === "delivered"
      ? "delivered"
      : rawStatus === "sent"
      ? "sent"
      : rawStatus === "sending"
      ? "sending"
      : rawStatus === "pending" || rawStatus === "queued"
      ? "pending"
      : rawStatus === "failed"
      ? "failed"
      : raw.isRead
      ? "read"
      : "sent";

  return {
    id,
    roomId,
    conversationId,
    senderId,
    senderName,
    senderAvatar,
    recipientId,
    receiverId,
    participants,
    content,
    text,
    type: raw.type || "text",
    mediaUrl,
    mediaName: raw.mediaName || attachment?.name,
    mediaSize: raw.mediaSize || (attachment?.size ? `${Math.round(attachment.size / 1024)} KB` : undefined),
    attachment,
    audioDuration: raw.audioDuration,
    audioTranscript: raw.audioTranscript,
    poll: raw.poll,
    createdAt: createdAtStr,
    timestamp,
    firestoreTimestamp: raw.createdAt || raw.firestoreTimestamp,
    isRead: status === "read" || !!raw.isRead,
    readBy: raw.readBy || [],
    replyTo: raw.replyTo,
    replyToMessageId: raw.replyToMessageId || raw.replyTo,
    replyToSnippet: raw.replyToSnippet,
    isStarred: !!raw.isStarred,
    isPinned: !!raw.isPinned,
    isEphemerous: !!raw.isEphemerous,
    reactions: raw.reactions || [],
    translatedText: raw.translatedText,
    status,
    clientMessageId: raw.clientMessageId,
    updatedAt: raw.updatedAt,
  };
}

/**
 * Uploads media attachment to Firebase Storage with safe fallback
 */
export async function uploadMediaAttachment(
  dataUrlOrBlob: string | Blob,
  fileName?: string,
  conversationId: string = "general"
): Promise<{ url: string; name?: string; mimeType?: string; size?: number }> {
  console.log(`[Messenger][STORAGE] 📦 Uploading attachment for conversation: ${conversationId}`);
  const storage = getStorage(app);
  const ext = fileName?.split(".").pop() || "bin";
  const uniqueName = `media_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${ext}`;
  const storageRef = ref(storage, `conversations/${conversationId}/${uniqueName}`);

  if (typeof dataUrlOrBlob === "string") {
    if (dataUrlOrBlob.startsWith("data:")) {
      try {
        console.log(`[Messenger][STORAGE] 🚀 Uploading data URL to Firebase Storage...`);
        await uploadString(storageRef, dataUrlOrBlob, "data_url");
        const downloadUrl = await getDownloadURL(storageRef);
        console.log(`[Messenger][STORAGE] ✅ Upload successful! URL: ${downloadUrl}`);
        return {
          url: downloadUrl,
          name: fileName || uniqueName,
          size: Math.round((dataUrlOrBlob.length * 3) / 4),
        };
      } catch (err) {
        console.warn("[Messenger][STORAGE] Storage upload fallback to data URL:", err);
        return {
          url: dataUrlOrBlob,
          name: fileName || uniqueName,
          size: Math.round((dataUrlOrBlob.length * 3) / 4),
        };
      }
    }
    return {
      url: dataUrlOrBlob,
      name: fileName || uniqueName,
    };
  }

  return {
    url: URL.createObjectURL(dataUrlOrBlob),
    name: fileName || uniqueName,
    size: dataUrlOrBlob.size,
  };
}

/**
 * Universal Central Message Dispatcher: sendMessage()
 * Every component in the application sends messages via this function!
 */
export async function sendMessage(params: SendMessageParams): Promise<{
  success: boolean;
  messageId: string;
  clientMessageId: string;
  message: Message;
  isQueued?: boolean;
}> {
  const {
    senderId,
    senderName = "Usuario",
    senderAvatar,
    recipientId,
    participants,
    conversationId,
    type = "text",
    text = "",
    content = "",
    attachment,
    mediaUrl,
    audioDuration,
    audioTranscript,
    poll,
    replyTo = null,
    replyToSnippet,
    clientMessageId = createClientMessageId(),
    customId,
  } = params;

  const resolvedText = (text || content || "").trim();

  // Validations
  if (!senderId) {
    throw new Error("[Messenger][SEND] senderId es obligatorio");
  }
  if (!conversationId) {
    throw new Error("[Messenger][SEND] conversationId es obligatorio");
  }
  if (!participants || participants.length === 0) {
    throw new Error("[Messenger][SEND] participants no puede estar vacío");
  }
  if (recipientId && recipientId === senderId) {
    throw new Error("[Messenger][SEND] El remitente y el destinatario no pueden ser iguales");
  }

  // Prevent generic "usr_all" in new private chats
  let cleanRecipientId = recipientId;
  if (cleanRecipientId === "usr_all" && conversationId.startsWith("dm_")) {
    const parts = conversationId.replace(/^dm_/, "").split("_");
    const other = parts.find((p) => p && p !== senderId);
    if (other) cleanRecipientId = other;
  }

  const isOnline = indexedDbQueueService.isOnline();
  const messageDocRef = customId
    ? doc(db, "conversations", conversationId, "messages", customId)
    : doc(collection(db, "conversations", conversationId, "messages"));

  const messageId = messageDocRef.id;

  const outgoingMessage: Message = {
    id: messageId,
    roomId: conversationId,
    conversationId,
    senderId,
    senderName,
    senderAvatar,
    recipientId: cleanRecipientId,
    receiverId: cleanRecipientId,
    participants: Array.from(new Set([...participants, senderId, cleanRecipientId].filter(Boolean) as string[])),
    type,
    text: resolvedText,
    content: resolvedText,
    attachment: attachment || (mediaUrl ? { url: mediaUrl } : undefined),
    mediaUrl: mediaUrl || attachment?.url,
    audioDuration,
    audioTranscript,
    poll,
    replyTo,
    replyToMessageId: replyTo || undefined,
    replyToSnippet,
    createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    timestamp: Date.now(),
    isRead: false,
    status: isOnline ? "sending" : "pending",
    clientMessageId,
  };

  console.log(`[Messenger][SEND] 📤 Sending message:`, {
    messageId,
    clientMessageId,
    conversationId,
    senderId,
    recipientId: cleanRecipientId,
    type,
    isOnline,
    hasMedia: !!(mediaUrl || attachment),
  });

  // OFFLINE HANDLING: Enqueue in IndexedDB and return pending message
  if (!isOnline) {
    console.log(`[Messenger][QUEUE] 💾 Device is offline. Persisting [${clientMessageId}] into IndexedDB queue.`);
    await indexedDbQueueService.enqueueMessage(conversationId, outgoingMessage);
    return {
      success: false,
      messageId,
      clientMessageId,
      message: { ...outgoingMessage, status: "pending" },
      isQueued: true,
    };
  }

  // ONLINE HANDLING: Check idempotency, then write to Firestore atomically
  try {
    console.log(`[Messenger][FIRESTORE] 🚀 Executing idempotent write to Firestore: ${conversationId}/messages/${messageId}`);

    // Idempotency check: see if clientMessageId already exists in this conversation
    const messagesCol = collection(db, "conversations", conversationId, "messages");
    const idempotencyQuery = query(messagesCol, where("clientMessageId", "==", clientMessageId));
    const existingSnap = await getDocs(idempotencyQuery);

    if (!existingSnap.empty) {
      const existingDoc = existingSnap.docs[0];
      console.log(`[Messenger][FIRESTORE] 🔁 Idempotent message found! Doc ID: ${existingDoc.id}. Updating status without duplicating.`);
      await updateDoc(existingDoc.ref, {
        status: "sent",
        updatedAt: serverTimestamp(),
      });
      return {
        success: true,
        messageId: existingDoc.id,
        clientMessageId,
        message: {
          ...outgoingMessage,
          id: existingDoc.id,
          status: "sent",
        },
      };
    }

    // Atomic document creation in conversations/{conversationId}/messages
    const firestorePayload = {
      id: messageId,
      clientMessageId,
      conversationId,
      roomId: conversationId,
      senderId,
      senderName,
      senderAvatar: senderAvatar || null,
      recipientId: cleanRecipientId || null,
      receiverId: cleanRecipientId || null,
      participants: outgoingMessage.participants,
      type,
      text: resolvedText,
      content: resolvedText,
      attachment: attachment || null,
      mediaUrl: mediaUrl || attachment?.url || null,
      audioDuration: audioDuration || null,
      audioTranscript: audioTranscript || null,
      poll: poll || null,
      replyTo: replyTo || null,
      replyToSnippet: replyToSnippet || null,
      status: "sent",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      timestamp: Date.now(),
      isRead: false,
      reactions: [],
    };

    // Dual-write support: write to `conversations/.../messages` AND update legacy `messages` + `rooms` metadata
    const legacyMsgRef = doc(db, "messages", messageId);
    const roomRef = doc(db, "rooms", conversationId);
    const chatsRoomRef = doc(db, "chats_rooms", conversationId);

    const previewText =
      type === "image"
        ? "📷 Imagen"
        : type === "audio"
        ? "🎤 Nota de voz"
        : type === "sticker"
        ? "⭐ Sticker"
        : type === "file"
        ? "📁 Archivo"
        : resolvedText || "Nuevo mensaje";

    const roomPayload = {
      id: conversationId,
      lastMessage: previewText,
      lastMessageTime: outgoingMessage.createdAt,
      updatedAt: serverTimestamp(),
      participants: outgoingMessage.participants,
    };

    await Promise.allSettled([
      setDoc(messageDocRef, firestorePayload, { merge: true }),
      setDoc(legacyMsgRef, firestorePayload, { merge: true }),
      setDoc(roomRef, roomPayload, { merge: true }),
      setDoc(chatsRoomRef, roomPayload, { merge: true }),
    ]);

    console.log(`[Messenger][FIRESTORE] ✅ Document write confirmed by Firestore: ${messageId}`);

    return {
      success: true,
      messageId,
      clientMessageId,
      message: {
        ...outgoingMessage,
        status: "sent",
      },
    };
  } catch (err: any) {
    console.error(`[Messenger][FIRESTORE] ❌ Network/Firestore error while sending message:`, err);

    // Fallback: enqueue in IndexedDB on write failure
    await indexedDbQueueService.enqueueMessage(conversationId, outgoingMessage);

    return {
      success: false,
      messageId,
      clientMessageId,
      message: { ...outgoingMessage, status: "failed" },
      isQueued: true,
    };
  }
}

/**
 * Marks a message as delivered
 */
export async function markMessageAsDelivered(
  conversationId: string,
  messageId: string,
  currentUserId: string
): Promise<void> {
  try {
    const msgRef = doc(db, "conversations", conversationId, "messages", messageId);
    const legacyRef = doc(db, "messages", messageId);
    await Promise.allSettled([
      updateDoc(msgRef, { status: "delivered", updatedAt: serverTimestamp() }),
      updateDoc(legacyRef, { status: "delivered", updatedAt: serverTimestamp() }),
    ]);
  } catch (e) {
    console.warn("[Messenger] Notice updating delivered status:", e);
  }
}

/**
 * Marks a message as read
 */
export async function markMessageAsRead(
  conversationId: string,
  messageId: string,
  currentUserId: string
): Promise<void> {
  try {
    const msgRef = doc(db, "conversations", conversationId, "messages", messageId);
    const legacyRef = doc(db, "messages", messageId);
    await Promise.allSettled([
      updateDoc(msgRef, { isRead: true, status: "read", updatedAt: serverTimestamp() }),
      updateDoc(legacyRef, { isRead: true, status: "read", updatedAt: serverTimestamp() }),
    ]);
  } catch (e) {
    console.warn("[Messenger] Notice updating read status:", e);
  }
}

/**
 * Real-time listener for all messages in a specific conversation/room
 * Merges primary `conversations/{id}/messages` and legacy `messages` collections
 */
export function listenForConversationMessages(
  conversationId: string,
  callback: (messages: Message[]) => void
): Unsubscribe {
  console.log(`[Messenger][LISTENER] 👂 Subscribing onSnapshot for conversation: '${conversationId}'`);

  const primaryCol = collection(db, "conversations", conversationId, "messages");
  const primaryQuery = query(primaryCol, orderBy("createdAt", "asc"));

  let primaryMsgs: Message[] = [];
  let legacyMsgs: Message[] = [];

  const emitMerged = () => {
    const map = new Map<string, Message>();
    legacyMsgs.forEach((m) => {
      if (m.id) map.set(m.id, m);
    });
    primaryMsgs.forEach((m) => {
      if (m.id) map.set(m.id, m);
    });
    const sorted = Array.from(map.values()).sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
    callback(sorted);
  };

  const unsubPrimary = onSnapshot(
    primaryQuery,
    (snapshot) => {
      primaryMsgs = snapshot.docs.map((docSnap) => {
        return normalizeMessage({ id: docSnap.id, ...docSnap.data() }, conversationId);
      });
      console.log(`[Messenger][LISTENER] 📥 Primary snapshot: ${primaryMsgs.length} messages in '${conversationId}'`);
      emitMerged();
    },
    (error) => {
      console.warn(`[Messenger][LISTENER] Primary query notice for '${conversationId}':`, error.message);
    }
  );

  // Legacy messages subscription for seamless backward compatibility
  const legacyCol = collection(db, "messages");
  const legacyQuery = query(legacyCol, where("roomId", "==", conversationId));

  const unsubLegacy = onSnapshot(
    legacyQuery,
    (snapshot) => {
      legacyMsgs = snapshot.docs.map((docSnap) => {
        return normalizeMessage({ id: docSnap.id, ...docSnap.data() }, conversationId);
      });
      emitMerged();
    },
    (error) => {
      console.warn(`[Messenger][LISTENER] Legacy query notice for '${conversationId}':`, error.message);
    }
  );

  return () => {
    console.log(`[Messenger][LISTENER] 🔌 Unsubscribing from '${conversationId}'`);
    unsubPrimary();
    unsubLegacy();
  };
}

/**
 * Flushes and synchronizes the offline IndexedDB queue by calling the REAL sendMessage()
 */
export async function flushMessageQueue(): Promise<{ synced: number; failed: number }> {
  console.log(`[Messenger][QUEUE] 🔄 Starting flushMessageQueue...`);
  const result = await indexedDbQueueService.syncQueue(async (item: QueuedMessageItem) => {
    try {
      const sendRes = await sendMessage({
        senderId: item.senderId,
        recipientId: item.recipientId,
        participants: item.participants,
        conversationId: item.conversationId || item.roomId,
        type: item.type as any,
        text: item.text || item.content,
        content: item.content || item.text,
        attachment: item.attachment,
        mediaUrl: item.mediaUrl,
        replyTo: item.replyTo,
        replyToSnippet: item.replyToSnippet,
        poll: item.poll,
        clientMessageId: item.clientMessageId,
        customId: item.messageId,
      });

      return sendRes.success;
    } catch (err) {
      console.error(`[Messenger][QUEUE] ❌ Failed to dispatch queued item [${item.clientMessageId}]:`, err);
      return false;
    }
  });

  return {
    synced: result.syncedCount,
    failed: result.failedCount,
  };
}

// Auto-attach online listener to trigger queue flush
if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    console.log("[Messenger][QUEUE] ⚡ Online event detected! Triggering flushMessageQueue...");
    flushMessageQueue().catch((e) => {
      console.warn("[Messenger][QUEUE] Notice during auto-flush:", e);
    });
  });
}
