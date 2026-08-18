import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Message, BubbleStyle } from "../../types";
import {
  Check,
  CheckCheck,
  Reply,
  Star,
  Pin,
  Share2,
  Smile,
  Globe,
  Play,
  Pause,
  FileText,
  Sparkles,
  Bot,
  X,
  ZoomIn,
  Download,
  Clock,
} from "lucide-react";

interface MessageBubbleProps {
  message: Message;
  isMe: boolean;
  bubbleStyle: BubbleStyle;
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

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  isMe,
  bubbleStyle,
  onReply,
  onReact,
  onStar,
  onPin,
  onForward,
  onVotePoll,
  onTranscribeAudio,
  onTranslateText,
  readReceiptsEnabled = true,
}) => {
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [isAutoTranscribing, setIsAutoTranscribing] = useState(false);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);

  // Auto-transcribe audio messages automatically when received/viewed
  useEffect(() => {
    if (message.type === "audio" && !message.audioTranscript && !isAutoTranscribing) {
      setIsAutoTranscribing(true);
      onTranscribeAudio(message);
    }
  }, [message.id, message.type, message.audioTranscript]);

  const isAiSender = message.senderId === "usr_ai_assistant";

  // Expanded emoji reaction list
  const emojiList = ["👍", "❤️", "😂", "😮", "🔥", "🙏", "🎉", "👏", "⚡", "💩", "😍", "🥳"];

  const getBubbleRadiusClass = () => {
    switch (bubbleStyle) {
      case "square":
        return "rounded-md";
      case "gradient":
        return "rounded-3xl";
      case "neon":
        return "rounded-2xl ring-1 ring-[#00E676]/40";
      default:
        return isMe ? "rounded-2xl rounded-tr-xs" : "rounded-2xl rounded-tl-xs";
    }
  };

  return (
    <motion.div
      id={`msg-bubble-${message.id}`}
      initial={{ opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className={`group relative flex flex-col my-1 max-w-[85%] md:max-w-[70%] select-text transition-all ${
        isMe ? "ml-auto items-end" : "mr-auto items-start"
      }`}
    >
      {/* Reaction Popover on Hover/Click */}
      {showReactionPicker && (
        <div
          className={`absolute -top-10 z-30 flex items-center gap-1.5 p-1.5 bg-slate-900 border border-slate-700/80 rounded-full shadow-2xl animate-in fade-in zoom-in duration-150 ${
            isMe ? "right-0" : "left-0"
          }`}
          onMouseLeave={() => setShowReactionPicker(false)}
        >
          {emojiList.map((emoji) => (
            <button
              key={emoji}
              onClick={() => {
                onReact(message.id, emoji);
                setShowReactionPicker(false);
              }}
              className="p-1 hover:scale-125 transition text-base"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {/* Main Bubble */}
      <div
        className={`relative p-3 shadow-md backdrop-blur-sm transition-all text-sm ${getBubbleRadiusClass()} ${
          isMe
            ? "bg-[#00E676]/20 border border-[#00E676]/30 text-slate-100 rounded-2xl rounded-tr-none"
            : isAiSender
            ? "bg-[#00E676]/10 border border-[#00E676]/20 text-slate-100 rounded-2xl rounded-tl-none ring-1 ring-[#00E676]/30"
            : "bg-white/10 border border-white/5 text-slate-100 rounded-2xl rounded-tl-none"
        }`}
      >
        {/* Quick Action Overlay Icons on Hover */}
        <div
          className={`absolute -top-2.5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 p-1 bg-slate-900/90 border border-slate-700/80 rounded-full shadow-md z-20 ${
            isMe ? "right-2" : "left-2"
          }`}
        >
          <button
            onClick={() => setShowReactionPicker(!showReactionPicker)}
            className="p-1 hover:bg-slate-800 text-amber-300 rounded-full"
            title="Añadir Reacción"
          >
            <Smile className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onReply(message)}
            className="p-1 hover:bg-slate-800 text-slate-300 rounded-full"
            title="Responder"
          >
            <Reply className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onStar(message.id)}
            className={`p-1 hover:bg-slate-800 rounded-full ${message.isStarred ? "text-amber-400" : "text-slate-300"}`}
            title="Destacar mensaje"
          >
            <Star className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onPin(message.id)}
            className={`p-1 hover:bg-slate-800 rounded-full ${message.isPinned ? "text-[#00E676]" : "text-slate-300"}`}
            title="Fijar mensaje en el chat"
          >
            <Pin className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onForward(message)}
            className="p-1 hover:bg-slate-800 text-slate-300 rounded-full"
            title="Reenviar"
          >
            <Share2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Sender Name in Group Chat */}
        {!isMe && message.senderName && (
          <div className="flex items-center gap-1.5 mb-1">
            <span
              className={`text-[11px] font-bold tracking-tight ${
                isAiSender ? "text-indigo-300" : "text-[#00E676]"
              }`}
            >
              {message.senderName}
            </span>
            {isAiSender && (
              <span className="p-0.5 rounded bg-indigo-500/30 text-indigo-300 text-[9px] font-extrabold flex items-center gap-0.5">
                <Bot className="w-2.5 h-2.5" /> IA
              </span>
            )}
          </div>
        )}

        {/* Reply Quote Snippet */}
        {message.replyToSnippet && (
          <div
            className={`p-2 mb-2 rounded-xl text-xs border-l-4 cursor-pointer opacity-90 ${
              isMe
                ? "bg-slate-950/20 border-slate-950 text-slate-900"
                : "bg-slate-950/60 border-[#00E676] text-slate-300"
            }`}
          >
            <p className="font-bold text-[10px] uppercase tracking-wider mb-0.5">
              {message.replyToSnippet.senderName}
            </p>
            <p className="line-clamp-1 italic text-[11px]">
              {message.replyToSnippet.text}
            </p>
          </div>
        )}

        {/* Content according to type */}
        {message.type === "text" && (
          <div className="space-y-1">
            <p className="text-xs leading-relaxed whitespace-pre-wrap break-words">
              {message.content}
            </p>

            {/* Translated Text Box if present */}
            {message.translatedText && (
              <div className="mt-2 p-2 rounded-xl bg-indigo-950/50 border border-indigo-500/30 text-indigo-200 text-xs">
                <div className="flex items-center gap-1 font-bold text-[10px] text-indigo-400 mb-1">
                  <Globe className="w-3 h-3" />
                  <span>Traducción IA:</span>
                </div>
                <p className="italic">{message.translatedText}</p>
              </div>
            )}
          </div>
        )}

        {/* Image or Sticker Attachment */}
        {(message.type === "image" || message.type === "sticker") && message.mediaUrl && (
          <div className="space-y-1.5 relative group/img">
            <div
              onClick={() => setIsImageModalOpen(true)}
              className="relative overflow-hidden rounded-xl cursor-pointer"
            >
              <img
                src={message.mediaUrl}
                alt={message.type === "sticker" ? "Sticker" : "Adjunto"}
                className={`${
                  message.type === "sticker"
                    ? "w-32 h-32 md:w-40 md:h-40 object-contain drop-shadow-[0_0_15px_rgba(0,230,118,0.3)] hover:scale-105 transition-transform"
                    : "rounded-xl max-h-64 w-full object-cover shadow-md hover:opacity-95 transition-opacity"
                }`}
              />
              {message.type !== "sticker" && (
                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                  <span className="p-2 rounded-full bg-black/60 text-[#00E676] border border-[#00E676]/40 shadow-lg">
                    <ZoomIn className="w-5 h-5" />
                  </span>
                </div>
              )}
            </div>
            {message.content && message.type !== "sticker" && (
              <p className="text-xs mt-1">{message.content}</p>
            )}
          </div>
        )}

        {/* Audio / Voice Note Player */}
        {message.type === "audio" && (
          <div className="space-y-2 min-w-[220px]">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsPlayingAudio(!isPlayingAudio)}
                className={`p-2.5 rounded-full transition shadow-md ${
                  isMe
                    ? "bg-slate-950 text-[#00E676] hover:bg-slate-900"
                    : "bg-[#00E676] text-slate-950 hover:bg-[#00E676]/90"
                }`}
              >
                {isPlayingAudio ? (
                  <Pause className="w-4 h-4 fill-current" />
                ) : (
                  <Play className="w-4 h-4 fill-current ml-0.5" />
                )}
              </button>

              {/* Waveform Visualization */}
              <div className="flex-1 flex items-center gap-0.5 h-6">
                {[40, 70, 30, 90, 50, 80, 100, 60, 40, 90, 70, 50, 80, 40, 60, 30].map(
                  (height, idx) => (
                    <span
                      key={idx}
                      style={{ height: `${height}%` }}
                      className={`w-1 rounded-full transition-all ${
                        isPlayingAudio && idx < 8
                          ? isMe
                            ? "bg-slate-950"
                            : "bg-[#00E676]"
                          : isMe
                          ? "bg-slate-900/40"
                          : "bg-slate-700/60"
                      }`}
                    />
                  )
                )}
              </div>

              {/* Playback speed toggle */}
              <button
                onClick={() =>
                  setPlaybackSpeed((prev) =>
                    prev === 1 ? 1.5 : prev === 1.5 ? 2 : 1
                  )
                }
                className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-black/20 hover:bg-black/30 transition"
              >
                {playbackSpeed}x
              </button>
            </div>

            {/* Automatic Audio Transcript Display */}
            {message.audioTranscript ? (
              <div className="p-2.5 rounded-2xl bg-slate-950/70 text-slate-200 text-xs border border-indigo-500/30 shadow-inner">
                <p className="font-extrabold text-[10px] text-indigo-400 mb-0.5 flex items-center gap-1 uppercase tracking-wider">
                  <Sparkles className="w-3 h-3 text-[#00E676]" /> Transcripción Automática:
                </p>
                <p className="italic text-[11px] leading-relaxed text-slate-200">{message.audioTranscript}</p>
              </div>
            ) : (
              <div className="p-2 rounded-xl bg-slate-950/40 text-slate-400 text-[11px] border border-white/5 flex items-center justify-center gap-1.5 animate-pulse">
                <Sparkles className="w-3 h-3 text-indigo-400 animate-spin" />
                <span>Transcribiendo voz a texto por IA...</span>
              </div>
            )}
          </div>
        )}

        {/* Poll Card */}
        {message.type === "poll" && message.poll && (
          <div className="space-y-2 min-w-[240px]">
            <h4 className="font-bold text-xs tracking-tight border-b border-black/10 pb-1.5">
              📊 {message.poll.question}
            </h4>

            <div className="space-y-1.5">
              {message.poll.options.map((opt) => {
                const total = message.poll?.totalVotes || 1;
                const percentage = Math.round((opt.votes.length / (total || 1)) * 100);

                return (
                  <button
                    key={opt.id}
                    onClick={() => onVotePoll(message.id, opt.id)}
                    className="w-full text-left p-2 rounded-xl bg-slate-950/30 border border-black/10 hover:border-[#00E676] transition relative overflow-hidden group"
                  >
                    {/* Fill bar */}
                    <div
                      style={{ width: `${percentage}%` }}
                      className="absolute inset-y-0 left-0 bg-[#00E676]/30 transition-all duration-300"
                    />
                    <div className="relative flex items-center justify-between text-xs font-medium">
                      <span>{opt.text}</span>
                      <span className="font-bold text-[11px] shrink-0 ml-2">
                        {percentage}% ({opt.votes.length})
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
            <p className="text-[10px] text-right opacity-80 font-semibold">
              Total de votos: {message.poll.totalVotes}
            </p>
          </div>
        )}

        {/* AI Translate button for text messages */}
        {!isMe && message.type === "text" && !message.translatedText && (
          <button
            onClick={() => onTranslateText(message)}
            className="mt-1 text-[10px] text-indigo-400 hover:text-indigo-300 font-bold flex items-center gap-1 transition"
          >
            <Globe className="w-3 h-3" />
            <span>Traducir</span>
          </button>
        )}

        {/* Time & Status Read Bar */}
        <div className="flex items-center justify-end gap-1.5 mt-1 text-[10px] opacity-80 shrink-0 select-none">
          {message.isStarred && <Star className="w-3 h-3 text-amber-300 fill-current" />}
          <span>{message.createdAt}</span>

          {isMe && (
            <span>
              {message.status === "queued" || message.status === "sending" ? (
                <span title="En cola local (IndexedDB) - esperando conexión">
                  <Clock className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                </span>
              ) : message.isRead && readReceiptsEnabled !== false ? (
                <CheckCheck className="w-3.5 h-3.5 text-[#00E676]" />
              ) : message.isRead ? (
                <CheckCheck className="w-3.5 h-3.5 text-slate-400" />
              ) : (
                <Check className="w-3.5 h-3.5 text-slate-400" />
              )}
            </span>
          )}
        </div>
      </div>

      {/* Interactive Reaction Badges below bubble */}
      {message.reactions && message.reactions.length > 0 && (
        <div
          className={`flex items-center gap-1.5 mt-1 px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 text-[11px] shadow-lg backdrop-blur-md cursor-pointer hover:border-[#00E676]/40 transition ${
            isMe ? "mr-1" : "ml-1"
          }`}
          onClick={() => setShowReactionPicker(!showReactionPicker)}
        >
          {Array.from(new Set(message.reactions.map((r) => r.emoji))).map((emoji) => {
            const count = message.reactions?.filter((r) => r.emoji === emoji).length || 0;
            return (
              <button
                key={emoji}
                onClick={(e) => {
                  e.stopPropagation();
                  onReact(message.id, emoji);
                }}
                className="flex items-center gap-0.5 hover:scale-125 transition text-xs active:scale-95"
                title={`Reaccionar con ${emoji}`}
              >
                <span>{emoji}</span>
                {count > 1 && (
                  <span className="text-[10px] font-extrabold text-slate-300 ml-0.5">{count}</span>
                )}
              </button>
            );
          })}
          <span className="text-[10px] font-bold text-[#00E676] ml-1 hover:underline">+</span>
        </div>
      )}

      {/* High-Definition Fullscreen Image Modal Viewer */}
      {isImageModalOpen && message.mediaUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col items-center justify-between p-4 md:p-8 animate-in fade-in duration-200"
          onClick={() => setIsImageModalOpen(false)}
        >
          {/* Header Controls */}
          <div
            className="w-full flex items-center justify-between z-10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-300">
                {message.senderName || "Imagen adjunta"}
              </span>
              <span className="text-[10px] text-slate-500">({message.createdAt})</span>
            </div>

            <div className="flex items-center gap-3">
              <a
                href={message.mediaUrl}
                download="imagen_degvs_messenger.jpg"
                target="_blank"
                rel="noreferrer"
                className="p-2.5 rounded-full bg-white/10 text-slate-200 hover:text-white hover:bg-[#00E676] hover:text-black transition flex items-center gap-1 text-xs font-bold"
                title="Descargar imagen"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Descargar</span>
              </a>

              <button
                onClick={() => setIsImageModalOpen(false)}
                className="p-2.5 rounded-full bg-white/10 text-slate-300 hover:text-white hover:bg-white/20 transition"
                title="Cerrar vista completa"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Fullscreen HD Image */}
          <div
            className="flex-1 flex items-center justify-center my-4 overflow-hidden w-full max-w-5xl"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={message.mediaUrl}
              alt="Adjunto en alta definición"
              className="max-h-[82vh] max-w-full object-contain rounded-2xl shadow-2xl border border-white/10"
            />
          </div>

          {/* Caption footer if present */}
          {message.content && (
            <p className="text-xs text-slate-300 bg-slate-900/80 px-4 py-2 rounded-xl border border-white/10 max-w-lg text-center">
              {message.content}
            </p>
          )}
        </div>
      )}
    </motion.div>
  );
};
