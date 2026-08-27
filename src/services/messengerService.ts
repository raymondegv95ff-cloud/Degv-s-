import {
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
  deleteDoc,
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
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `msg_${Math.random().toString(36).substring(2, 9)}_${Date.now()}`;
}

/**
 * Creates deterministic canonical conversation ID for private chats (userA + userB)
 * Sorts user IDs alphabetically to ensure commutative consistency across devices
 */
export function getCanonicalConversationId(userAId: string, userBId: string): string {
  const cleanA = (userAId || "").trim();
  const cleanB = (userBId || "").trim();
  if (!cleanA || !cleanB) {
    return `dm_${cleanA || "unknown"}_${cleanB || "unknown"}`;
  }
  const sorted = [cleanA, cleanB].sort();
  return `dm_${sorted[0]}_${sorted[1]}`;
}

export function getPrivateConversationId(userA: string, userB: string): string {
  return getCanonicalConversationId(userA, userB);
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

  // Robust Timestamp & formatted time resolution with serverTimestamp normalization
  let timestamp: number = 0;
  let createdAtStr = typeof raw.createdAt === "string" ? raw.createdAt : "";

  if (raw.createdAt && typeof raw.createdAt.toMillis === "function") {
    timestamp = raw.createdAt.toMillis();
  } else if (raw.createdAt && typeof raw.createdAt.toDate === "function") {
    timestamp = raw.createdAt.toDate().getTime();
  } else if (raw.createdAt && typeof raw.createdAt.seconds === "number") {
    timestamp = raw.createdAt.seconds * 1000 + Math.round((raw.createdAt.nanoseconds || 0) / 1000000);
  } else if (raw.createdAt && typeof raw.createdAt._seconds === "number") {
    timestamp = raw.createdAt._seconds * 1000 + Math.round((raw.createdAt._nanoseconds || 0) / 1000000);
  } else if (raw.firestoreTimestamp && typeof raw.firestoreTimestamp.toMillis === "function") {
    timestamp = raw.firestoreTimestamp.toMillis();
  } else if (raw.firestoreTimestamp && typeof raw.firestoreTimestamp.toDate === "function") {
    timestamp = raw.firestoreTimestamp.toDate().getTime();
  } else if (typeof raw.timestamp === "number" && raw.timestamp > 0) {
    timestamp = raw.timestamp;
  } else if (typeof raw.createdAt === "number" && raw.createdAt > 0) {
    timestamp = raw.createdAt;
  } else if (typeof raw.createdAt === "string" && !isNaN(Date.parse(raw.createdAt))) {
    timestamp = Date.parse(raw.createdAt);
  } else {
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

  // Prevent generic "usr_all" in new private chats and ensure recipient is correctly resolved
  let cleanRecipientId = recipientId;
  if ((!cleanRecipientId || cleanRecipientId === "usr_all") && safeConversationId.startsWith("dm_")) {
    const parts = safeConversationId.replace(/^dm_/, "").split("_");
    const other = parts.find((p) => p && p !== safeSenderId);
    if (other) cleanRecipientId = other;
  }

  const safeParticipants = participants && participants.length > 0
    ? Array.from(new Set([...participants, safeSenderId, cleanRecipientId].filter(Boolean) as string[]))
    : Array.from(new Set([safeSenderId, cleanRecipientId].filter(Boolean) as string[]));

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
    participants: safeParticipants,
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
    participants: safeParticipants,
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

    // Atomic document creation in primary canonical conversation path: conversations/{conversationId}/messages/{messageId}
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
      participants: safeParticipants,
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

    // Primary canonical write to conversations/{conversationId}/messages/{messageId}
    await setDoc(messageDocRef, firestorePayload, { merge: true });

    // Update rooms document in Firestore so recipient gets room in their sidebar in real-time
    try {
      const roomDocRef = doc(db, "rooms", safeConversationId);
      await setDoc(
        roomDocRef,
        {
          id: safeConversationId,
          lastMessage: resolvedText || (type === "image" ? "📷 Imagen" : type === "audio" ? "🎵 Audio" : "Mensaje"),
          lastMessageTime: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          participants: safeParticipants,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    } catch (roomErr: any) {
      console.warn(`[Messenger][ROOM] Notice updating room metadata:`, roomErr?.message || roomErr);
    }

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
    if (e?.code === "resource-exhausted") {
      indexedDbQueueService.markQuotaExhausted(15);
      console.warn(`[Messenger][DELIVERED] Firestore quota exhausted while marking '${messageId}' delivered.`);
    } else {
      console.warn(`[Messenger][DELIVERED] Notice updating delivery status for '${messageId}':`, e?.message || e);
    }
  }
}

/**
 * Marks a message as read in Firestore
 */
export async function markMessageAsRead(
  conversationId: string,
  messageId: string,
  currentUserId: string
): Promise<void> {
  if (!indexedDbQueueService.isOnline() || indexedDbQueueService.isQuotaExhausted() || !messageId) return;
  try {
    const msgRef = doc(db, "conversations", conversationId, "messages", messageId);
    await updateDoc(msgRef, {
      isRead: true,
      status: "read",
      readAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (e: any) {
    if (e?.code === "resource-exhausted") {
      indexedDbQueueService.markQuotaExhausted(15);
      console.warn(`[Messenger][READ] Firestore quota exhausted while marking '${messageId}' as read.`);
    } else {
      console.warn(`[Messenger][READ] Notice updating read status for '${messageId}':`, e?.message || e);
    }
  }
}

/**
 * Batch marks all unread incoming messages in a conversation as read by the recipient
 * Only triggers when the recipient has actually opened and focused the active chat session.
 */
export async function markRoomMessagesAsRead(
  conversationId: string,
  currentUserId: string,
  messagesToMark: Message[],
  isChatSessionActive: boolean = true
): Promise<void> {
  if (!isChatSessionActive) {
    console.log(`[Messenger][READ] ⏭️ Skipping read receipt update: Chat session '${conversationId}' is not actively rendered.`);
    return;
  }
  if (!conversationId || !currentUserId || !messagesToMark || messagesToMark.length === 0) return;
  if (!indexedDbQueueService.isOnline() || indexedDbQueueService.isQuotaExhausted()) return;

  // Filter ONLY incoming unread messages from other senders
  const unreadFromOthers = messagesToMark.filter(
    (m) => m && m.id && m.senderId && m.senderId !== currentUserId && (!m.isRead || m.status !== "read")
  );

  if (unreadFromOthers.length === 0) return;

  console.log(`[Messenger][READ] 👁️ Recipient '${currentUserId}' is actively viewing chat '${conversationId}'. Marking ${unreadFromOthers.length} messages as READ in Firestore.`);

  const updatePromises = unreadFromOthers.map(async (msg) => {
    const updatePayload = {
      isRead: true,
      status: "read",
      readAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    // Update in canonical subcollection conversations/{conversationId}/messages/{msg.id}
    try {
      const msgRef = doc(db, "conversations", conversationId, "messages", msg.id);
      await updateDoc(msgRef, updatePayload);
    } catch (err: any) {
      if (err?.code === "resource-exhausted") {
        indexedDbQueueService.markQuotaExhausted(15);
        console.warn(`[Messenger][READ] Firestore quota exhausted while updating read receipt for message '${msg.id}'.`);
      } else {
        console.warn(`[Messenger][READ] Error updating read receipt for message '${msg.id}':`, err?.message || err);
      }
    }
  });

  await Promise.allSettled(updatePromises);
}

/**
 * Real-time listener for all messages in a specific conversation/room
 * Canonical source of truth: `conversations/{id}/messages`
 */
export function listenForConversationMessages(
  conversationId: string,
  callback: (messages: Message[]) => void
): Unsubscribe {
  console.log(`[Messenger][LISTENER] 👂 Subscribing canonical onSnapshot for conversation: '${conversationId}'`);

  const primaryCol = collection(db, "conversations", conversationId, "messages");
  const primaryQuery = query(primaryCol);

  const unsubPrimary = onSnapshot(
    primaryQuery,
    (snapshot) => {
      const idMap = new Map<string, Message>();
      const clientMap = new Map<string, string>(); // clientMessageId -> messageId

      snapshot.docs.forEach((docSnap) => {
        const rawData = docSnap.data();
        const msg = normalizeMessage({ id: docSnap.id, ...rawData }, conversationId);

        // Deduplicate using clientMessageId and messageId
        if (msg.clientMessageId && clientMap.has(msg.clientMessageId)) {
          const prevId = clientMap.get(msg.clientMessageId)!;
          idMap.delete(prevId);
        }
        if (msg.id) {
          idMap.set(msg.id, msg);
          if (msg.clientMessageId) clientMap.set(msg.clientMessageId, msg.id);
        }
      });

      const sorted = Array.from(idMap.values()).sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
      callback(sorted);
    },
    (error) => {
      console.warn(`[Messenger][LISTENER] ⚠️ Canonical query notice for '${conversationId}':`, error.message);
    }
  );

  return () => {
    console.log(`[Messenger][LISTENER] 🔌 Unsubscribing from '${conversationId}'`);
    unsubPrimary();
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

/**
 * Delete a conversation and its messages from Firestore and IndexedDB
 */
export async function deleteConversation(conversationId: string): Promise<boolean> {
  try {
    console.log(`[Messenger][DELETE] 🗑️ Deleting conversation '${conversationId}'...`);
    
    // 1. Delete room document in Firestore
    try {
      const roomRef = doc(db, "rooms", conversationId);
      await deleteDoc(roomRef);
    } catch (e: any) {
      console.warn("[Messenger][DELETE] Room doc deletion notice:", e?.message || e);
    }

    // 2. Fetch and delete messages in subcollection /conversations/{conversationId}/messages
    try {
      const msgsCol = collection(db, "conversations", conversationId, "messages");
      const snap = await getDocs(msgsCol);
      if (!snap.empty) {
        const batch = writeBatch(db);
        snap.docs.forEach((d) => {
          batch.delete(d.ref);
        });
        await batch.commit();
      }
    } catch (e: any) {
      console.warn("[Messenger][DELETE] Subcollection messages deletion notice:", e?.message || e);
    }

    // 3. Clear IndexedDB queue for this conversation
    await indexedDbQueueService.clearQueueForRoom(conversationId);

    console.log(`[Messenger][DELETE] ✅ Successfully deleted conversation '${conversationId}'`);
    return true;
  } catch (err) {
    console.error(`[Messenger][DELETE] Error deleting conversation '${conversationId}':`, err);
    return false;
  }
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
