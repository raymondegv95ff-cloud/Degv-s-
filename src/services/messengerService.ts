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

  // Safe defaults & validations
  const safeSenderId = senderId || "usr_me_01";
  const safeConversationId = conversationId || "room_ai_assistant";
  const safeParticipants = participants && participants.length > 0 ? participants : [safeSenderId];

  // Prevent generic "usr_all" in new private chats
  let cleanRecipientId = recipientId;
  if (cleanRecipientId === "usr_all" && safeConversationId.startsWith("dm_")) {
    const parts = safeConversationId.replace(/^dm_/, "").split("_");
    const other = parts.find((p) => p && p !== safeSenderId);
    if (other) cleanRecipientId = other;
  }

  const isOnline = indexedDbQueueService.isOnline();
  const messageDocRef = customId
    ? doc(db, "conversations", safeConversationId, "messages", customId)
    : doc(collection(db, "conversations", safeConversationId, "messages"));

  const messageId = messageDocRef.id;

  const outgoingMessage: Message = {
    id: messageId,
    roomId: safeConversationId,
    conversationId: safeConversationId,
    senderId: safeSenderId,
    senderName,
    senderAvatar,
    recipientId: cleanRecipientId,
    receiverId: cleanRecipientId,
    participants: Array.from(new Set([...safeParticipants, safeSenderId, cleanRecipientId].filter(Boolean) as string[])),
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
    status: isOnline ? "sent" : "pending",
    clientMessageId,
  };

  console.log(`[Messenger][SEND] 📤 Sending message:`, {
    messageId,
    clientMessageId,
    conversationId: safeConversationId,
    senderId: safeSenderId,
    recipientId: cleanRecipientId,
    type,
    isOnline,
    hasMedia: !!(mediaUrl || attachment),
  });

  // OFFLINE OR QUOTA EXHAUSTED HANDLING: Enqueue in IndexedDB and return pending message
  if (!isOnline || indexedDbQueueService.isQuotaExhausted()) {
    console.log(
      `[Messenger][QUEUE] 💾 Device is ${!isOnline ? "offline" : "in quota-limited mode"}. Persisting [${clientMessageId}] into IndexedDB queue.`
    );
    await indexedDbQueueService.enqueueMessage(safeConversationId, outgoingMessage);
    return {
      success: true,
      messageId,
      clientMessageId,
      message: { ...outgoingMessage, status: "pending" },
      isQueued: true,
    };
  }

  // ONLINE HANDLING: Check idempotency, then write to Firestore atomically
  try {
    console.log(`[Messenger][FIRESTORE] 🚀 Executing idempotent write to Firestore: ${safeConversationId}/messages/${messageId}`);

    // Atomic document creation in primary conversation path: conversations/{conversationId}/messages/{messageId}
    const firestorePayload = {
      id: messageId,
      clientMessageId,
      conversationId: safeConversationId,
      roomId: safeConversationId,
      senderId: safeSenderId,
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

    console.log(`[sendMessage] 🚀 [sendMessage: Firebase Write] Full payload object right before Firebase write operation:`, firestorePayload);

    // Primary write
    await setDoc(messageDocRef, firestorePayload, { merge: true });

    // Dual-write to legacy /messages collection for cross-compatibility
    try {
      const legacyDocRef = doc(db, "messages", messageId);
      await setDoc(legacyDocRef, firestorePayload, { merge: true });
    } catch {}

    // Update rooms document lastMessage preview in Firestore
    try {
      const roomDocRef = doc(db, "rooms", safeConversationId);
      await setDoc(
        roomDocRef,
        {
          id: safeConversationId,
          lastMessage: resolvedText || (type === "image" ? "📷 Imagen" : type === "audio" ? "🎵 Audio" : "Mensaje"),
          lastMessageTime: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          updatedAt: Date.now(),
        },
        { merge: true }
      );
    } catch {}

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
    const isQuotaErr =
      err?.code === "resource-exhausted" ||
      err?.message?.includes("Quota limit exceeded") ||
      err?.message?.includes("resource-exhausted");

    const isUnavailable = err?.code === "unavailable" || err?.message?.includes("unavailable");

    if (isQuotaErr) {
      indexedDbQueueService.markQuotaExhausted(15);
      console.warn(`[Messenger][FIRESTORE] 🛑 Quota limit reached in Firestore. Seamlessly saving message in IndexedDB.`);
    } else if (isUnavailable) {
      console.warn(`[Messenger][FIRESTORE] 🔌 Firestore backend is temporarily unreachable. Saving message in IndexedDB.`);
    } else {
      console.error(`[Messenger][FIRESTORE] ❌ Network/Firestore error while sending message:`, err);
    }

    // Fallback: enqueue in IndexedDB on write failure
    await indexedDbQueueService.enqueueMessage(conversationId, outgoingMessage);

    return {
      success: false,
      messageId,
      clientMessageId,
      message: { ...outgoingMessage, status: "pending" },
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
  if (!indexedDbQueueService.isOnline() || indexedDbQueueService.isQuotaExhausted()) return;
  try {
    const msgRef = doc(db, "conversations", conversationId, "messages", messageId);
    await updateDoc(msgRef, { status: "delivered", updatedAt: serverTimestamp() });
  } catch (e: any) {
    if (e?.code === "resource-exhausted") indexedDbQueueService.markQuotaExhausted(15);
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
  if (!indexedDbQueueService.isOnline() || indexedDbQueueService.isQuotaExhausted()) return;
  try {
    const msgRef = doc(db, "conversations", conversationId, "messages", messageId);
    await updateDoc(msgRef, { isRead: true, status: "read", updatedAt: serverTimestamp() });
  } catch (e: any) {
    if (e?.code === "resource-exhausted") indexedDbQueueService.markQuotaExhausted(15);
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
  const primaryQuery = query(primaryCol);

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
    console.log(`[listenForRoomMessages: onSnapshot] 📦 [Merged Messages] Full normalized messages array inside listener callback for room '${conversationId}' (${sorted.length} messages):`, sorted);
    callback(sorted);
  };

  const unsubPrimary = onSnapshot(
    primaryQuery,
    (snapshot) => {
      const rawDocs = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }));

      console.log(`[listenForRoomMessages: onSnapshot] 📥 [Primary Collection: conversations/${conversationId}/messages] Snapshot received from Firestore:`, {
        conversationId,
        docsCount: snapshot.docs.length,
        changesCount: snapshot.docChanges().length,
        fullDocsPayload: rawDocs,
      });
      console.log(`[listenForRoomMessages: onSnapshot] 📦 [Primary Collection Payload JSON]:\n`, JSON.stringify(rawDocs, null, 2));

      primaryMsgs = snapshot.docs.map((docSnap) => {
        return normalizeMessage({ id: docSnap.id, ...docSnap.data() }, conversationId);
      });
      emitMerged();
    },
    (error) => {
      console.warn(`[listenForRoomMessages: onSnapshot] ⚠️ Primary query error notice for '${conversationId}':`, error.message);
    }
  );

  // Legacy messages subscription for seamless backward compatibility
  const legacyCol = collection(db, "messages");
  const legacyQuery = query(legacyCol, where("roomId", "==", conversationId));

  const unsubLegacy = onSnapshot(
    legacyQuery,
    (snapshot) => {
      const rawLegacyDocs = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }));

      console.log(`[listenForRoomMessages: onSnapshot] 📥 [Legacy Collection: messages] Snapshot received from Firestore for room '${conversationId}':`, {
        roomId: conversationId,
        docsCount: snapshot.docs.length,
        fullDocsPayload: rawLegacyDocs,
      });

      legacyMsgs = snapshot.docs.map((docSnap) => {
        return normalizeMessage({ id: docSnap.id, ...docSnap.data() }, conversationId);
      });
      emitMerged();
    },
    (error) => {
      console.warn(`[listenForRoomMessages: onSnapshot] ⚠️ Legacy query error notice for '${conversationId}':`, error.message);
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
