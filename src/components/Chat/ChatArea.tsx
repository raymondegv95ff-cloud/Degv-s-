import React, { useState, useEffect, useMemo } from "react";
import { Room, Message, BubbleStyle, UserProfile } from "../../types";
import { ChatHeader } from "./ChatHeader";
import { MessageList } from "./MessageList";
import { ChatInputBar } from "./ChatInputBar";
import { SmartSummaryDrawer } from "../Modals/SmartSummaryDrawer";
import { Bot, MessageSquare, ShieldCheck, Sparkles, Plus, Smartphone, Lock, Minimize2, Search, X, ChevronUp, ChevronDown } from "lucide-react";
import { listenForRoomMessages, db } from "../../services/firebase";
import { doc, onSnapshot } from "firebase/firestore";

interface ChatAreaProps {
  activeRoom: Room | null;
  messages?: Message[];
  currentUserId: string;
  bubbleStyle: BubbleStyle;
  onSendMessage: (content: string, type?: "text" | "image" | "audio" | "file", mediaUrl?: string) => void;
  onDeleteChat?: (roomId: string) => void;
  onBackMobile: () => void;
  onOpenContactDrawer: () => void;
  onOpenNewChat: () => void;
  onStartCall: (isVideo: boolean) => void;
  onExportChat: () => void;
  onOpenWallpaperSelector: () => void;
  onOpenE2EEModal: () => void;
  onOpenStarredMessages: () => void;
  onOpenPollCreator: () => void;
  onReplyMessage: (message: Message) => void;
  replyToMessage: Message | null;
  onCancelReply: () => void;
  onReactMessage: (messageId: string, emoji: string) => void;
  onStarMessage: (messageId: string) => void;
  onPinMessage: (messageId: string) => void;
  onForwardMessage: (message: Message) => void;
  onVotePoll: (messageId: string, optionId: string) => void;
  onTranscribeAudio: (message: Message) => void;
  onTranslateText: (message: Message) => void;
  onDraftChange: (text: string) => void;
  smartReplySuggestions: string[];
  onSelectSmartReply: (text: string) => void;
  readReceiptsEnabled?: boolean;
  onOpenLockSetup?: () => void;
  onToggleMuteChat?: (roomId: string) => void;
  onOpenWalkieTalkie?: () => void;
}

const getWallpaperStyles = (wallpaper?: string) => {
  if (!wallpaper || wallpaper === "default") {
    return { className: "bg-[#050505]" };
  }
  if (wallpaper.startsWith("http") || wallpaper.startsWith("data:image")) {
    return {
      className: "bg-cover bg-center bg-no-repeat",
      style: {
        backgroundImage: `linear-gradient(rgba(5, 5, 5, 0.75), rgba(5, 5, 5, 0.85)), url("${wallpaper}")`,
      },
    };
  }
  switch (wallpaper) {
    case "gradient_cyber":
      return { className: "bg-gradient-to-b from-[#0B0F19] via-slate-950 to-indigo-950" };
    case "neon_grid":
      return { className: "bg-[#0B0F19] bg-[radial-gradient(#00E676_1.5px,transparent_1.5px)] [background-size:18px_18px]" };
    case "emerald_night":
      return { className: "bg-gradient-to-br from-emerald-950 via-slate-950 to-teal-950" };
    case "violet_galaxy":
      return { className: "bg-gradient-to-br from-purple-950 via-slate-950 to-indigo-950" };
    case "sunset_glow":
      return { className: "bg-gradient-to-br from-amber-950 via-slate-950 to-rose-950" };
    case "minimal_dots":
      return { className: "bg-[#050505] bg-[radial-gradient(#38bdf8_1.5px,transparent_1.5px)] [background-size:16px_16px]" };
    case "deep_ocean":
      return { className: "bg-gradient-to-tr from-cyan-950 via-blue-950 to-slate-950" };
    default:
      return { className: "bg-[#050505]" };
  }
};

export const ChatArea: React.FC<ChatAreaProps> = ({
  activeRoom,
  messages,
  currentUserId,
  bubbleStyle,
  onSendMessage,
  onDeleteChat,
  onBackMobile,
  onOpenContactDrawer,
  onOpenNewChat,
  onStartCall,
  onExportChat,
  onOpenWallpaperSelector,
  onOpenE2EEModal,
  onOpenStarredMessages,
  onOpenPollCreator,
  onReplyMessage,
  replyToMessage,
  onCancelReply,
  onReactMessage,
  onStarMessage,
  onPinMessage,
  onForwardMessage,
  onVotePoll,
  onTranscribeAudio,
  onTranslateText,
  onDraftChange,
  smartReplySuggestions,
  onSelectSmartReply,
  readReceiptsEnabled,
  onOpenLockSetup,
  onToggleMuteChat,
  onOpenWalkieTalkie,
}) => {
  const [searchQueryInChat, setSearchQueryInChat] = useState("");
  const [showInChatSearch, setShowInChatSearch] = useState(false);
  const [isSummaryDrawerOpen, setIsSummaryDrawerOpen] = useState(false);

  // Direct onSnapshot Real-Time Listener for messages of active room
  const [realtimeMessages, setRealtimeMessages] = useState<Message[] | null>(null);
  const [firestoreRoom, setFirestoreRoom] = useState<Room | null>(activeRoom);

  // Listen for Ctrl+F or Cmd+F keyboard shortcut to toggle in-chat search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "f" && activeRoom) {
        e.preventDefault();
        setShowInChatSearch((prev) => !prev);
      } else if (e.key === "Escape" && showInChatSearch) {
        setShowInChatSearch(false);
        setSearchQueryInChat("");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeRoom, showInChatSearch]);

  useEffect(() => {
    if (!activeRoom?.id) {
      setRealtimeMessages(null);
      setFirestoreRoom(null);
      setSearchQueryInChat("");
      setShowInChatSearch(false);
      return;
    }

    setFirestoreRoom(activeRoom);
    setRealtimeMessages(null);

    console.log(`[ChatArea] 🔄 Iniciando suscripción onSnapshot para sala: ${activeRoom.id}`);

    // 1. Listen in real-time to messages for activeRoom.id directly from Firestore
    const unsubMessages = listenForRoomMessages(activeRoom.id, (cloudMsgs) => {
      setRealtimeMessages(cloudMsgs || []);
    });

    // 2. Listen in real-time to room document updates
    let unsubRoom = () => {};
    let unsubChatsRoom = () => {};
    try {
      const roomDocRef = doc(db, "rooms", activeRoom.id);
      unsubRoom = onSnapshot(roomDocRef, (snap) => {
        if (snap.exists()) {
          const d = snap.data();
          setFirestoreRoom((prev) => {
            if (!prev) return activeRoom;
            return {
              ...prev,
              lastMessage: d.lastMessage || prev.lastMessage,
              lastMessageTime: d.lastMessageTime || prev.lastMessageTime,
              unreadCount: d.unreadCount ?? prev.unreadCount,
              participants: d.participants || prev.participants,
              isTyping: d.isTyping ?? prev.isTyping,
              wallpaper: d.wallpaper !== undefined ? d.wallpaper : prev.wallpaper,
            };
          });
        }
      });

      const chatsRoomDocRef = doc(db, "chats_rooms", activeRoom.id);
      unsubChatsRoom = onSnapshot(chatsRoomDocRef, (snap) => {
        if (snap.exists()) {
          const d = snap.data();
          setFirestoreRoom((prev) => {
            if (!prev) return activeRoom;
            return {
              ...prev,
              lastMessage: d.lastMessage || prev.lastMessage,
              lastMessageTime: d.lastMessageTime || prev.lastMessageTime,
              unreadCount: d.unreadCount ?? prev.unreadCount,
              participants: d.participants || prev.participants,
              isTyping: d.isTyping ?? prev.isTyping,
              wallpaper: d.wallpaper !== undefined ? d.wallpaper : prev.wallpaper,
            };
          });
        }
      });
    } catch (e) {
      console.warn("[ChatArea] Notice attaching room onSnapshot:", e);
    }

    return () => {
      unsubMessages();
      unsubRoom();
      unsubChatsRoom();
    };
  }, [activeRoom?.id]);

  // Real-time Firestore messages stream seamlessly merged with local state
  const effectiveMessages = useMemo(() => {
    const propMsgs = messages || [];
    if (!realtimeMessages) return propMsgs;
    const msgMap = new Map<string, Message>();
    propMsgs.forEach((m) => msgMap.set(m.id, m));
    realtimeMessages.forEach((m) => msgMap.set(m.id, m));
    return Array.from(msgMap.values()).sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
  }, [realtimeMessages, messages]);

  const effectiveRoom = firestoreRoom || activeRoom;

  // Compute matched messages count when in-chat search is active
  const searchMatchesCount = useMemo(() => {
    if (!searchQueryInChat.trim()) return 0;
    const q = searchQueryInChat.toLowerCase();
    return effectiveMessages.filter((m) => {
      return (
        m.content?.toLowerCase().includes(q) ||
        m.translatedText?.toLowerCase().includes(q) ||
        m.audioTranscript?.toLowerCase().includes(q) ||
        m.poll?.question?.toLowerCase().includes(q) ||
        m.poll?.options?.some((o) => o.text.toLowerCase().includes(q))
      );
    }).length;
  }, [effectiveMessages, searchQueryInChat]);

  // If no chat selected, display clean welcome neutral state!
  if (!effectiveRoom) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-[#050505] text-center select-none relative overflow-hidden">
        {/* Background Radial Grid Pattern */}
        <div className="absolute inset-0 z-0 opacity-10 pointer-events-none">
          <div className="absolute inset-0 bg-[radial-gradient(#00E676_1px,transparent_1px)] [background-size:20px_20px]" />
        </div>

        <div className="relative z-10 max-w-md space-y-6">
          <div className="w-24 h-24 mx-auto rounded-3xl bg-gradient-to-br from-[#00FF66] via-[#00F0FF] to-[#00B248] p-0.5 shadow-[0_0_35px_rgba(0,255,102,0.4)] transition hover:scale-105 flex items-center justify-center bg-[#051210]">
            <img
              src="/icon.svg"
              alt="Degv's Cyber Icon"
              referrerPolicy="no-referrer"
              className="w-full h-full object-contain rounded-[22px]"
              onError={(e) => {
                (e.target as HTMLImageElement).src = "/icon-512.png";
              }}
            />
          </div>

          <div>
            <h2 className="text-2xl font-black bg-gradient-to-r from-white via-slate-100 to-[#00FF66] bg-clip-text text-transparent drop-shadow-[0_0_15px_rgba(0,255,102,0.3)]">
              Degv's Messenger
            </h2>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              Mensajería instantánea de alta velocidad con interfaz Geometric Balance, IA Gemini, notas de voz y cifrado.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 text-left">
            <div className="p-3 rounded-2xl bg-white/5 border border-white/10 text-xs">
              <div className="flex items-center gap-2 text-[#00E676] font-bold mb-1">
                <Bot className="w-4 h-4" />
                <span>Degv's AI</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Habla con la IA o usa /imagine para generar imágenes.
              </p>
            </div>

            <div className="p-3 rounded-2xl bg-white/5 border border-white/10 text-xs">
              <div className="flex items-center gap-2 text-[#00E676] font-bold mb-1">
                <Lock className="w-4 h-4" />
                <span>Bóveda Secreta</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Protege tus chats privados con PIN o Huella.
              </p>
            </div>
          </div>

          <button
            onClick={onOpenNewChat}
            className="px-6 py-3 rounded-2xl bg-[#00E676] text-black font-black text-xs shadow-[0_0_15px_rgba(0,230,118,0.3)] hover:scale-105 transition-transform inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Selecciona o inicia un chat</span>
          </button>
        </div>
      </div>
    );
  }

  const wpStyles = getWallpaperStyles(effectiveRoom.wallpaper);

  return (
    <div
      className={`flex-1 flex flex-col h-full relative ${wpStyles.className}`}
      style={wpStyles.style}
    >
      {/* Chat Radial Grid Background Overlay if default */}
      {(!effectiveRoom.wallpaper || effectiveRoom.wallpaper === "default") && (
        <div className="absolute inset-0 z-0 opacity-10 pointer-events-none">
          <div className="absolute inset-0 bg-[radial-gradient(#00E676_1px,transparent_1px)] [background-size:20px_20px]" />
        </div>
      )}
      {/* Header */}
      <ChatHeader
        room={effectiveRoom}
        onBackMobile={onBackMobile}
        onOpenContactDrawer={onOpenContactDrawer}
        onOpenSearchInChat={() => {
          setShowInChatSearch(!showInChatSearch);
          if (showInChatSearch) setSearchQueryInChat("");
        }}
        onStartCall={onStartCall}
        onOpenWalkieTalkie={onOpenWalkieTalkie}
        onExportChat={onExportChat}
        onOpenWallpaperSelector={onOpenWallpaperSelector}
        onOpenE2EEModal={onOpenE2EEModal}
        onOpenStarredMessages={onOpenStarredMessages}
        onDeleteChat={onDeleteChat}
        onOpenLockSetup={onOpenLockSetup}
        onOpenSmartSummary={() => setIsSummaryDrawerOpen(true)}
        onToggleMute={onToggleMuteChat}
        isTyping={effectiveRoom.isTyping}
      />

      {/* In-Chat Message Search Bar */}
      {showInChatSearch && (
        <div className="p-2.5 bg-[#0a0a0a]/95 backdrop-blur-md border-b border-white/10 flex items-center justify-between gap-3 text-xs px-5 animate-in slide-in-from-top-2 duration-150 z-10 shadow-lg">
          <div className="relative flex-1 flex items-center">
            <Search className="w-4 h-4 text-[#00E676] absolute left-3 pointer-events-none" />
            <input
              type="text"
              autoFocus
              value={searchQueryInChat}
              onChange={(e) => setSearchQueryInChat(e.target.value)}
              placeholder="Buscar palabras o contenido en este chat..."
              className="w-full bg-[#141414] border border-white/10 rounded-xl pl-9 pr-8 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-[#00E676] focus:ring-1 focus:ring-[#00E676]/40 transition"
            />
            {searchQueryInChat && (
              <button
                onClick={() => setSearchQueryInChat("")}
                className="absolute right-2.5 p-1 rounded-full text-slate-400 hover:text-white hover:bg-white/10"
                title="Limpiar búsqueda"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {searchQueryInChat.trim() && (
              <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-[#00E676]/15 text-[#00E676] border border-[#00E676]/30">
                {searchMatchesCount} {searchMatchesCount === 1 ? "coincidencia" : "coincidencias"}
              </span>
            )}
            <button
              onClick={() => {
                setShowInChatSearch(false);
                setSearchQueryInChat("");
              }}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 text-xs font-semibold flex items-center gap-1"
              title="Cerrar búsqueda (Esc)"
            >
              <X className="w-4 h-4" />
              <span className="hidden sm:inline">Cerrar</span>
            </button>
          </div>
        </div>
      )}

      {/* Messages Scroll Area */}
      <MessageList
        messages={effectiveMessages}
        currentUserId={currentUserId}
        room={effectiveRoom}
        bubbleStyle={bubbleStyle}
        searchQueryInChat={searchQueryInChat}
        onReply={onReplyMessage}
        onReact={onReactMessage}
        onStar={onStarMessage}
        onPin={onPinMessage}
        onForward={onForwardMessage}
        onVotePoll={onVotePoll}
        onTranscribeAudio={onTranscribeAudio}
        onTranslateText={onTranslateText}
        readReceiptsEnabled={readReceiptsEnabled}
      />

      {/* Bottom Input Controls */}
      <ChatInputBar
        activeChatId={effectiveRoom.id}
        onSendMessage={onSendMessage}
        onOpenPollCreator={onOpenPollCreator}
        replyToMessage={replyToMessage}
        onCancelReply={onCancelReply}
        onDraftChange={onDraftChange}
        initialDraft={effectiveRoom.draftText}
        smartReplySuggestions={smartReplySuggestions}
        onSelectSmartReply={onSelectSmartReply}
        messages={effectiveMessages}
        chatName={effectiveRoom.name}
      />

      {/* Smart Executive Summary Sliding Panel */}
      <SmartSummaryDrawer
        isOpen={isSummaryDrawerOpen}
        onClose={() => setIsSummaryDrawerOpen(false)}
        room={effectiveRoom}
        messages={effectiveMessages}
        onSendSummaryToChat={(summaryText) => onSendMessage(summaryText, "text")}
      />
    </div>
  );
};
