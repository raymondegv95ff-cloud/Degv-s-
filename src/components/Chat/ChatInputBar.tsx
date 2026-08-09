import React, { useState, useRef, useEffect } from "react";
import { Message, Room } from "../../types";
import { ImageFilterModal } from "../Modals/ImageFilterModal";
import { StickerPickerPanel } from "./StickerPickerPanel";
import {
  Smile,
  Paperclip,
  Send,
  Mic,
  Square,
  Sparkles,
  BarChart2,
  Image as ImageIcon,
  X,
  Volume2,
  Trash2,
  Wand2,
  Sticker,
  Radio,
  FileText,
  Loader2,
  MicOff,
  AudioLines,
} from "lucide-react";

interface ChatInputBarProps {
  activeChatId: string;
  onSendMessage: (content: string, type?: "text" | "image" | "audio" | "file" | "sticker", mediaUrl?: string) => void;
  onOpenPollCreator: () => void;
  replyToMessage: Message | null;
  onCancelReply: () => void;
  onDraftChange: (text: string) => void;
  initialDraft?: string;
  smartReplySuggestions: string[];
  onSelectSmartReply: (text: string) => void;
  messages?: Message[];
  chatName?: string;
}

export const ChatInputBar: React.FC<ChatInputBarProps> = ({
  activeChatId,
  onSendMessage,
  onOpenPollCreator,
  replyToMessage,
  onCancelReply,
  onDraftChange,
  initialDraft = "",
  smartReplySuggestions,
  onSelectSmartReply,
  messages = [],
  chatName = "Chat",
}) => {
  const [inputText, setInputText] = useState(initialDraft);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showStickerPicker, setShowStickerPicker] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);

  // AI Response Generator State
  const [isGeneratingAiResponse, setIsGeneratingAiResponse] = useState(false);
  const [aiVariations, setAiVariations] = useState<string[]>([]);

  // Voice Input Mode: "note" (Audio Note) vs "dictate" (Real-time Speech to Text)
  const [voiceInputMode, setVoiceInputMode] = useState<"note" | "dictate">("note");
  const [isDictating, setIsDictating] = useState(false);
  const recognitionRef = useRef<any>(null);

  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [voicePreviewUrl, setVoicePreviewUrl] = useState<string | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [showFilterModal, setShowFilterModal] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<any>(null);

  // Auto-focus input when activeChatId changes
  useEffect(() => {
    setInputText(initialDraft || "");
    setAiVariations([]);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, [activeChatId, initialDraft]);

  // Handle Generate Suggested AI Response based on last 3 messages
  const handleGenerateAiResponse = async () => {
    setIsGeneratingAiResponse(true);
    setAiVariations([]);

    try {
      const last3Messages = messages.slice(-3);
      const res = await fetch("/api/ai/context-response", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chatName,
          messages: last3Messages.map((m) => ({
            senderName: m.senderName,
            content: m.content,
            text: m.content,
            isMe: m.senderId !== "usr_ai_assistant",
          })),
        }),
      });

      const data = await res.json();
      if (data.suggestedResponse) {
        setInputText(data.suggestedResponse);
        onDraftChange(data.suggestedResponse);
      }
      if (Array.isArray(data.variations) && data.variations.length > 0) {
        setAiVariations(data.variations);
      }
    } catch (err) {
      console.error("AI response generation error:", err);
      const fallback = "¡Hola! Entendido perfectamente, coordinemos los detalles a continuación.";
      setInputText(fallback);
      onDraftChange(fallback);
    } finally {
      setIsGeneratingAiResponse(false);
      inputRef.current?.focus();
    }
  };

  // Real-time Speech Dictation (SpeechToText)
  const startDictation = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      // Fallback: use voice note recording if Web Speech API isn't supported in iframe
      startRecording();
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "es-ES";

      recognition.onstart = () => {
        setIsDictating(true);
      };

      recognition.onresult = (event: any) => {
        let currentTranscript = "";
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          currentTranscript += event.results[i][0].transcript;
        }
        if (currentTranscript) {
          setInputText((prev) => {
            const updated = prev ? `${prev} ${currentTranscript}` : currentTranscript;
            onDraftChange(updated);
            return updated;
          });
        }
      };

      recognition.onerror = (err: any) => {
        console.warn("Speech recognition error:", err);
        stopDictation();
      };

      recognition.onend = () => {
        setIsDictating(false);
      };

      recognition.start();
      recognitionRef.current = recognition;
    } catch (e) {
      console.warn("Speech recognition initialization failed:", e);
      startRecording();
    }
  };

  const stopDictation = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
      recognitionRef.current = null;
    }
    setIsDictating(false);
  };

  // Handle typing & save draft
  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputText(val);
    onDraftChange(val);
  };

  // Handle Send Text or Image
  const handleSend = () => {
    if (imagePreviewUrl) {
      onSendMessage(inputText, "image", imagePreviewUrl);
      setImagePreviewUrl(null);
      setInputText("");
      onDraftChange("");
      return;
    }

    if (!inputText.trim()) return;

    onSendMessage(inputText, "text");
    setInputText("");
    onDraftChange("");
    setShowEmojiPicker(false);
    setShowAttachMenu(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Voice Note Recording Simulator
  const startRecording = () => {
    setIsRecordingVoice(true);
    setRecordingSeconds(0);
    setVoicePreviewUrl(null);

    timerRef.current = setInterval(() => {
      setRecordingSeconds((prev) => prev + 1);
    }, 1000);
  };

  const stopRecordingAndPreview = () => {
    clearInterval(timerRef.current);
    setIsRecordingVoice(false);
    // Generated audio wave mock data url
    setVoicePreviewUrl("mock_audio_data");
  };

  const cancelRecording = () => {
    clearInterval(timerRef.current);
    setIsRecordingVoice(false);
    setRecordingSeconds(0);
    setVoicePreviewUrl(null);
  };

  const sendRecordedVoice = () => {
    onSendMessage("Nota de voz", "audio");
    cancelRecording();
  };

  // Image Upload Simulation
  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setImagePreviewUrl(event.target?.result as string);
        setShowAttachMenu(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const commonEmojis = ["😊", "🔥", "❤️", "👍", "🚀", "🎉", "⚡", "🤖", "😎", "🙏", "💯", "✨"];

  return (
    <div className="p-4 md:p-6 bg-[#0a0a0a]/90 backdrop-blur-md border-t border-white/5 relative z-20">
      {/* Top Bar: AI Response Generator + Smart Suggestions */}
      <div className="flex items-center gap-2 mb-3 overflow-x-auto no-scrollbar pb-0.5">
        <button
          onClick={handleGenerateAiResponse}
          disabled={isGeneratingAiResponse}
          className="px-3 py-1.5 rounded-xl text-xs font-bold bg-[#00E676]/15 hover:bg-[#00E676]/25 border border-[#00E676]/40 text-[#00E676] transition shadow-[0_0_10px_rgba(0,230,118,0.1)] flex items-center gap-1.5 shrink-0 active:scale-95 disabled:opacity-50"
          title="Generar respuesta sugerida con Gemini basada en el contexto de los últimos 3 mensajes"
        >
          {isGeneratingAiResponse ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin text-[#00E676]" />
              <span>Generando respuesta...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5 animate-pulse text-[#00E676]" />
              <span>Generar respuesta con IA</span>
            </>
          )}
        </button>

        {/* Generated AI Variations */}
        {aiVariations.map((varText, idx) => (
          <button
            key={idx}
            onClick={() => {
              setInputText(varText);
              onDraftChange(varText);
            }}
            className="px-2.5 py-1 rounded-xl text-xs bg-white/5 hover:bg-[#00E676]/20 hover:text-[#00E676] text-slate-300 border border-white/10 shrink-0 truncate max-w-[200px] transition"
            title={varText}
          >
            "{varText}"
          </button>
        ))}

        {/* Smart Reply Suggestions */}
        {smartReplySuggestions.length > 0 &&
          !isRecordingVoice &&
          !voicePreviewUrl &&
          smartReplySuggestions.map((sug, idx) => (
            <button
              key={idx}
              onClick={() => onSelectSmartReply(sug)}
              className="px-3 py-1 rounded-xl text-xs font-medium bg-white/5 hover:bg-[#00E676]/20 hover:text-[#00E676] text-slate-300 border border-white/10 transition whitespace-nowrap shrink-0"
            >
              {sug}
            </button>
          ))}
      </div>

      {/* Voice Mode Quick Switcher Bar */}
      <div className="flex items-center justify-between mb-2.5 px-1">
        <div className="flex items-center gap-1 p-0.5 bg-white/5 rounded-xl border border-white/10 text-[11px] font-medium">
          <button
            onClick={() => setVoiceInputMode("note")}
            className={`px-2.5 py-1 rounded-lg transition flex items-center gap-1.5 ${
              voiceInputMode === "note"
                ? "bg-[#00E676] text-black font-bold shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
            title="Modo Nota de Voz (Grabar audio)"
          >
            <Mic className="w-3 h-3" />
            <span>Nota de Voz</span>
          </button>
          <button
            onClick={() => setVoiceInputMode("dictate")}
            className={`px-2.5 py-1 rounded-lg transition flex items-center gap-1.5 ${
              voiceInputMode === "dictate"
                ? "bg-[#00E676] text-black font-bold shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
            title="Modo Dictado por Voz en tiempo real (Voz a texto)"
          >
            <AudioLines className="w-3 h-3" />
            <span>Dictado por Voz</span>
          </button>
        </div>

        {isDictating && (
          <span className="text-[11px] font-bold text-[#00E676] flex items-center gap-1 animate-pulse">
            <span className="w-2 h-2 rounded-full bg-[#00E676]" /> Dictando en vivo...
          </span>
        )}
      </div>

      {/* Quoted Reply Preview */}
      {replyToMessage && (
        <div className="mb-3 p-2.5 rounded-2xl bg-white/5 border-l-4 border-[#00E676] flex items-center justify-between text-xs">
          <div>
            <span className="font-bold text-[10px] text-[#00E676] uppercase tracking-wider block">
              Respondiendo a {replyToMessage.senderName}
            </span>
            <p className="text-slate-300 line-clamp-1">{replyToMessage.content}</p>
          </div>
          <button
            onClick={onCancelReply}
            className="p-1 rounded-full text-slate-400 hover:text-slate-100 hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Attached Image Preview */}
      {imagePreviewUrl && (
        <div className="mb-3 relative inline-block group">
          <img
            src={imagePreviewUrl}
            alt="Vista previa"
            className="h-28 rounded-2xl object-cover ring-2 ring-[#00E676] shadow-lg shadow-[#00E676]/20"
          />
          <button
            onClick={() => setImagePreviewUrl(null)}
            className="absolute -top-2 -right-2 p-1 bg-rose-600 text-white rounded-full shadow-md hover:bg-rose-500 transition-transform active:scale-90"
            title="Eliminar foto"
          >
            <X className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setShowFilterModal(true)}
            className="absolute bottom-2 left-2 right-2 py-1 px-2.5 bg-slate-950/90 hover:bg-[#00E676] hover:text-slate-950 text-[#00E676] font-bold text-[10px] rounded-xl border border-[#00E676]/40 shadow-lg backdrop-blur-md flex items-center justify-center gap-1 transition-all"
          >
            <Wand2 className="w-3 h-3" />
            <span>Filtros IA</span>
          </button>
        </div>
      )}

      {/* AI Image Processing Filter Modal */}
      {showFilterModal && imagePreviewUrl && (
        <ImageFilterModal
          isOpen={showFilterModal}
          imageUrl={imagePreviewUrl}
          onClose={() => setShowFilterModal(false)}
          onApply={(filteredDataUrl) => {
            setImagePreviewUrl(filteredDataUrl);
          }}
        />
      )}

      {/* Sticker Picker Popover Panel */}
      {showStickerPicker && (
        <StickerPickerPanel
          onSelectSticker={(stickerUrl) => {
            onSendMessage("[Sticker]", "sticker", stickerUrl);
            setShowStickerPicker(false);
          }}
          onClose={() => setShowStickerPicker(false)}
        />
      )}

      {/* Emoji Picker Popover */}
      {showEmojiPicker && (
        <div className="absolute bottom-20 left-4 bg-[#0a0a0a] border border-white/10 rounded-2xl p-3 shadow-2xl z-50 grid grid-cols-6 gap-2 w-64 animate-in zoom-in duration-150 backdrop-blur-xl">
          {commonEmojis.map((emoji) => (
            <button
              key={emoji}
              onClick={() => {
                setInputText((prev) => prev + emoji);
                setShowEmojiPicker(false);
                inputRef.current?.focus();
              }}
              className="p-2 text-lg hover:bg-white/10 rounded-xl transition-colors text-center"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {/* Attachments Menu Popover */}
      {showAttachMenu && (
        <div className="absolute bottom-20 left-12 bg-[#0a0a0a] border border-white/10 rounded-2xl p-2 shadow-2xl z-50 flex flex-col gap-1 w-48 text-xs text-slate-200 backdrop-blur-xl">
          <label className="p-2.5 hover:bg-white/10 rounded-xl cursor-pointer flex items-center gap-2.5 transition-colors">
            <ImageIcon className="w-4 h-4 text-[#00E676]" />
            <span>Adjuntar Imagen</span>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageFileChange}
              className="hidden"
            />
          </label>
          <button
            onClick={() => {
              setShowAttachMenu(false);
              onOpenPollCreator();
            }}
            className="p-2.5 hover:bg-white/10 rounded-xl text-left flex items-center gap-2.5 transition-colors"
          >
            <BarChart2 className="w-4 h-4 text-[#00E676]" />
            <span>Crear Encuesta</span>
          </button>
        </div>
      )}

      {/* Active Voice Recorder UI vs Standard Input Bar */}
      {isRecordingVoice ? (
        <div className="flex items-center justify-between p-2 rounded-2xl bg-white/5 border border-red-500/50">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-red-500 animate-ping" />
            <span className="font-mono text-xs font-bold text-red-400">
              Grabando {recordingSeconds}s
            </span>
          </div>

          <div className="flex items-center gap-1 h-6 px-4">
            {[40, 80, 50, 90, 30, 100, 70, 40, 90, 60, 80, 50].map((h, i) => (
              <span
                key={i}
                style={{ height: `${h}%` }}
                className="w-1 bg-red-500 rounded-full animate-pulse"
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={cancelRecording}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 transition-colors"
              title="Cancelar"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={stopRecordingAndPreview}
              className="p-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold transition-colors"
              title="Detener y Previsualizar"
            >
              <Square className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : voicePreviewUrl ? (
        <div className="flex items-center justify-between p-2 rounded-2xl bg-white/5 border border-[#00E676]/50">
          <div className="flex items-center gap-2">
            <Volume2 className="w-5 h-5 text-[#00E676]" />
            <span className="text-xs font-bold text-slate-200">
              Nota de voz lista ({recordingSeconds}s)
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={cancelRecording}
              className="p-2 rounded-xl bg-white/10 text-slate-300 hover:bg-white/20 transition-colors text-xs"
            >
              Descartar
            </button>
            <button
              onClick={sendRecordedVoice}
              className="px-3 py-2 rounded-xl bg-[#00E676] text-black font-bold text-xs hover:scale-105 transition-transform"
            >
              Enviar Nota
            </button>
          </div>
        </div>
      ) : (
        /* Standard Geometric Balance Input Control */
        <div className="flex items-center gap-3 bg-white/5 p-2 rounded-2xl border border-white/10 group focus-within:border-[#00E676]/30 transition-all">
          {/* Emoji Toggle */}
          <button
            onClick={() => {
              setShowEmojiPicker(!showEmojiPicker);
              setShowStickerPicker(false);
            }}
            className="p-2 text-slate-400 hover:text-[#00E676] transition-colors shrink-0"
            title="Emojis"
          >
            <Smile className="w-6 h-6" />
          </button>

          {/* Stickers Toggle */}
          <button
            onClick={() => {
              setShowStickerPicker(!showStickerPicker);
              setShowEmojiPicker(false);
            }}
            className="p-2 text-slate-400 hover:text-[#00E676] transition-colors shrink-0"
            title="Panel de Stickers"
          >
            <Sticker className="w-6 h-6" />
          </button>

          {/* Attachments Toggle */}
          <button
            onClick={() => setShowAttachMenu(!showAttachMenu)}
            className="p-2 text-slate-400 hover:text-[#00E676] transition-colors shrink-0"
            title="Adjuntar archivo o encuesta"
          >
            <Paperclip className="w-6 h-6" />
          </button>

          {/* Text Input */}
          <input
            ref={inputRef}
            type="text"
            value={inputText}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            id="chat-message-input"
            className="flex-1 bg-transparent border-none focus:ring-0 focus:outline-none text-sm py-2 text-slate-100 placeholder:text-slate-500"
          />

          {/* Send or Voice Record Button */}
          {inputText.trim() || imagePreviewUrl ? (
            <button
              onClick={handleSend}
              id="send-message-btn"
              className="p-3 bg-[#00E676] text-black rounded-xl hover:scale-105 transition-transform active:scale-95 shadow-[0_0_10px_rgba(0,230,118,0.3)] shrink-0"
              title="Enviar Mensaje"
            >
              <Send className="w-5 h-5" />
            </button>
          ) : voiceInputMode === "dictate" ? (
            <button
              onClick={isDictating ? stopDictation : startDictation}
              className={`p-2.5 transition-all shrink-0 rounded-xl ${
                isDictating
                  ? "bg-[#00E676] text-black animate-pulse shadow-[0_0_12px_rgba(0,230,118,0.4)]"
                  : "text-slate-400 hover:text-[#00E676]"
              }`}
              title={isDictating ? "Detener Dictado por Voz" : "Iniciar Dictado por Voz (Voz a texto)"}
            >
              <AudioLines className="w-6 h-6" />
            </button>
          ) : (
            <button
              onClick={startRecording}
              className="p-2.5 text-slate-400 hover:text-[#00E676] transition-colors shrink-0"
              title="Grabar Nota de Voz"
            >
              <Mic className="w-6 h-6" />
            </button>
          )}
        </div>
      )}
    </div>
  );
};
