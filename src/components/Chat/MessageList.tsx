import React, { useEffect, useRef } from "react";
import { Message, Room, BubbleStyle, UserProfile } from "../../types";
import { MessageBubble } from "./MessageBubble";
import { Pin, ShieldCheck, Lock } from "lucide-react";

interface MessageListProps {
  messages: Message[];
  currentUserId: string;
  room: Room;
  bubbleStyle: BubbleStyle;
  searchQueryInChat: string;
  onReply: (message: Message) => void;
  onReact: (messageId: string, emoji: string) => void;
  onStar: (messageId: string) => void;
  onPin: (messageId: string) => void;
  onForward: (message: Message) => void;
  onVotePoll: (messageId: string, optionId: string) => void;
  onTranscribeAudio: (message: Message) => void;
  onTranslateText: (message: Message) => void;
  readReceiptsEnabled?: boolean;
}

export const MessageList: React.FC<MessageListProps> = ({
  messages,
  currentUserId,
  room,
  bubbleStyle,
  searchQueryInChat,
  onReply,
  onReact,
  onStar,
  onPin,
  onForward,
  onVotePoll,
  onTranscribeAudio,
  onTranslateText,
  readReceiptsEnabled,
}) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto scroll down whenever messages array updates
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Filter messages if search query active
  const filteredMessages = searchQueryInChat.trim()
    ? messages.filter((m) =>
        m.content.toLowerCase().includes(searchQueryInChat.toLowerCase())
      )
    : messages;

  // Find pinned message if any
  const pinnedMsg = messages.find((m) => m.isPinned || m.id === room.pinnedMessageId);

  const scrollToPinned = (msgId: string) => {
    const el = document.getElementById(`msg-bubble-${msgId}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("ring-2", "ring-[#00E676]");
      setTimeout(() => {
        el.classList.remove("ring-2", "ring-[#00E676]");
      }, 2000);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-3 relative custom-scrollbar">
      {/* Pinned Message Sticky Banner */}
      {pinnedMsg && (
        <button
          onClick={() => scrollToPinned(pinnedMsg.id)}
          className="sticky top-0 z-20 w-full max-w-md mx-auto p-2.5 rounded-2xl bg-slate-900/90 border border-[#00E676]/40 shadow-xl backdrop-blur-md flex items-center justify-between text-xs text-slate-100 hover:bg-slate-800/90 transition text-left cursor-pointer"
        >
          <div className="flex items-center gap-2 min-w-0">
            <Pin className="w-4 h-4 text-[#00E676] shrink-0" />
            <div className="min-w-0">
              <span className="font-bold text-[10px] text-[#00E676] uppercase tracking-wider block">
                Mensaje fijado en este chat
              </span>
              <p className="truncate text-slate-200 text-xs">{pinnedMsg.content}</p>
            </div>
          </div>
        </button>
      )}

      {/* End to End Encryption Security Badge Banner */}
      <div className="mx-auto max-w-xs text-center p-2.5 rounded-2xl bg-slate-900/50 border border-slate-800/80 text-[11px] text-slate-400 space-y-1 shadow-sm">
        <div className="flex items-center justify-center gap-1.5 text-[#00E676] font-semibold">
          <Lock className="w-3.5 h-3.5" />
          <span>Mensajes cifrados de extremo a extremo</span>
        </div>
        <p className="text-[10px] text-slate-500">
          Nadie fuera de este chat, ni siquiera Degv's Messenger, puede leerlos ni escucharlos.
        </p>
      </div>

      {/* Message List */}
      {filteredMessages.length > 0 ? (
        filteredMessages.map((msg) => (
          <MessageBubble
            key={msg.id}
            message={msg}
            isMe={msg.senderId === currentUserId}
            bubbleStyle={bubbleStyle}
            onReply={onReply}
            onReact={onReact}
            onStar={onStar}
            onPin={onPin}
            onForward={onForward}
            onVotePoll={onVotePoll}
            onTranscribeAudio={onTranscribeAudio}
            onTranslateText={onTranslateText}
            readReceiptsEnabled={readReceiptsEnabled}
          />
        ))
      ) : (
        <div className="text-center py-10 text-slate-500 text-xs">
          No hay mensajes coincidentes en esta conversación.
        </div>
      )}

      {/* Bottom Scroll Anchor */}
      <div ref={bottomRef} />
    </div>
  );
};
