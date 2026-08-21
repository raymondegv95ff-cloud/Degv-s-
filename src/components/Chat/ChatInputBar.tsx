import React, { useState, useRef, useEffect, useMemo } from "react";
import { Message, Room } from "../../types";
import { ImageFilterModal } from "../Modals/ImageFilterModal";
import { StickerPickerPanel } from "./StickerPickerPanel";
import { CalendarEventModal } from "../Modals/CalendarEventModal";
import { SmartReplyService, DetectedEntity } from "../../services/smartReplyService";
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
  Calendar,
  MapPin,
  Phone,
  Mail,
  ExternalLink,
  CalendarPlus,
  Compass,
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

  // Contextual Smart Actions & Calendar Modal State
  const [selectedCalendarEntity, setSelectedCalendarEntity] = useState<DetectedEntity | null>(null);
  const [showCalendarModal, setShowCalendarModal] = useState<boolean>(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<any>(null);

  // Analyze latest message for entity detection (dates, locations, contacts)
  const lastMessage = useMemo(() => {
    if (!messages || messages.length === 0) return null;
    return messages[messages.length - 1];
  }, [messages]);

  const smartAnalysis = useMemo(() => {
    return SmartReplyService.analyzeMessage(lastMessage, chatName);
  }, [lastMessage, chatName]);

  // Combined smart suggestions (prioritize entity-aware suggestions)
  const combinedSuggestions = useMemo(() => {
    const set = new Set<string>();
    if (smartAnalysis && smartAnalysis.suggestions) {
      smartAnalysis.suggestions.forEach((s) => set.add(s));
    }
    if (smartReplySuggestions) {
      smartReplySuggestions.forEach((s) => set.add(s));
    }
    return Array.from(set).slice(0, 5);
  }, [smartAnalysis, smartReplySuggestions]);

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
  // Real MediaRecorder Refs for Voice Notes
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  const handleSend = () => {
    if (imagePreviewUrl) {
      console.log("[Degv's Chat] Enviando imagen adjunta a la sala:", activeChatId);
      onSendMessage(inputText || "📷 Foto", "image", imagePreviewUrl);
      setImagePreviewUrl(null);
      setInputText("");
      onDraftChange("");
      return;
    }

    if (!inputText.trim()) return;

    console.log("[Degv's Chat] Enviando mensaje de texto a la sala:", activeChatId, inputText);
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

  // Real Voice Note Recording via Web Audio / MediaRecorder API
  const startRecording = async () => {
    try {
      console.log("[Degv's Chat] 🎙️ Iniciando grabación de nota de voz con MediaRecorder...");
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      mediaStreamRef.current = stream;
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        console.log("[Degv's Chat] ⏹️ Grabación finalizada. Generando Data URL de audio...");
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64data = reader.result as string;
          setVoicePreviewUrl(base64data);
        };
        reader.readAsDataURL(audioBlob);

        // Liberar pistas del micrófono
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecordingVoice(true);
      setRecordingSeconds(0);
      setVoicePreviewUrl(null);

      timerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("[Degv's Chat] Error al acceder al micrófono:", err);
      setIsRecordingVoice(false);
    }
  };

  const stopRecordingAndPreview = () => {
    clearInterval(timerRef.current);
    setIsRecordingVoice(false);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
  };

  const cancelRecording = () => {
    clearInterval(timerRef.current);
    setIsRecordingVoice(false);
    setRecordingSeconds(0);
    setVoicePreviewUrl(null);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
    }
  };

  const sendRecordedVoice = () => {
    if (voicePreviewUrl) {
      console.log("[Degv's Chat] 📤 Enviando nota de voz real:", voicePreviewUrl.substring(0, 50) + "...");
      onSendMessage("🎤 Nota de voz", "audio", voicePreviewUrl);
    }
    cancelRecording();
  };

  // Real Image Upload & Processing
  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      console.log(`[Degv's Storage] 🖼️ Procesando imagen: ${file.name} (${file.size} bytes)...`);
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        setImagePreviewUrl(result);
        setShowAttachMenu(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const commonEmojis = ["😊", "🔥", "❤️", "👍", "🚀", "🎉", "⚡", "🤖", "😎", "🙏", "💯", "✨"];

  const handleEntityAction = (entity: DetectedEntity) => {
    if (entity.actionType === "calendar") {
      setSelectedCalendarEntity(entity);
      setShowCalendarModal(true);
    } else if (entity.actionType === "maps") {
      if (entity.metadata?.mapsUrl) {
        window.open(entity.metadata.mapsUrl, "_blank");
      }
    } else if (entity.actionType === "call") {
      if (entity.metadata?.phoneNumber) {
        window.open(`tel:${entity.metadata.phoneNumber}`);
      }
    } else if (entity.actionType === "email") {
      if (entity.metadata?.emailAddress) {
        window.open(`mailto:${entity.metadata.emailAddress}`);
      }
    } else if (entity.actionType === "link") {
      if (entity.metadata?.targetUrl) {
        window.open(entity.metadata.targetUrl, "_blank");
      }
    }
  };

  return (
    <div className="p-4 md:p-6 bg-[#0a0a0a]/90 backdrop-blur-md border-t border-white/5 relative z-20">
      {/* Contextual Smart Action Bar (Detected Entities: Dates/Calendars, Locations/Maps, etc.) */}
      {smartAnalysis.hasActionableEntities && !isRecordingVoice && !voicePreviewUrl && (
        <div className="flex items-center gap-2 mb-2.5 overflow-x-auto no-scrollbar pb-0.5 animate-in slide-in-from-bottom duration-200">
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-xl bg-emerald-950/60 border border-emerald-500/30 text-[10px] font-black uppercase text-[#00E676] shrink-0">
            <Sparkles className="w-3 h-3 text-[#00E676] animate-pulse" />
            <span>Acciones Inteligentes</span>
          </div>

          {smartAnalysis.entities.map((entity, idx) => {
            const isCal = entity.actionType === "calendar";
            const isMap = entity.actionType === "maps";
            const isCall = entity.actionType === "call";
            const isEmail = entity.actionType === "email";

            return (
              <button
                key={`ent_${idx}`}
                onClick={() => handleEntityAction(entity)}
                className={`py-1 px-3 rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0 transition active:scale-95 shadow-sm border ${
                  isCal
                    ? "bg-emerald-500/20 text-[#00E676] border-emerald-500/50 hover:bg-emerald-500/30"
                    : isMap
                    ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/50 hover:bg-cyan-500/30"
                    : isCall
                    ? "bg-amber-500/20 text-amber-300 border-amber-500/50 hover:bg-amber-500/30"
                    : isEmail
                    ? "bg-indigo-500/20 text-indigo-300 border-indigo-500/50 hover:bg-indigo-500/30"
                    : "bg-white/10 text-white border-white/20 hover:bg-white/20"
                }`}
                title={`Acción sugerida para: "${entity.displayValue}"`}
              >
                {isCal ? (
                  <CalendarPlus className="w-3.5 h-3.5" />
                ) : isMap ? (
                  <Compass className="w-3.5 h-3.5" />
                ) : isCall ? (
                  <Phone className="w-3.5 h-3.5" />
                ) : isEmail ? (
                  <Mail className="w-3.5 h-3.5" />
                ) : (
                  <ExternalLink className="w-3.5 h-3.5" />
                )}
                <span>{entity.actionLabel}:</span>
                <span className="font-normal opacity-90 truncate max-w-[150px]">{entity.displayValue}</span>
              </button>
            );
          })}
        </div>
      )}

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
        {combinedSuggestions.length > 0 &&
          !isRecordingVoice &&
          !voicePreviewUrl &&
          combinedSuggestions.map((sug, idx) => (
            <button
              key={idx}
              onClick={() => onSelectSmartReply(sug)}
              className="px-3 py-1 rounded-xl text-xs font-medium bg-white/5 hover:bg-[#00E676]/20 hover:text-[#00E676] text-slate-300 border border-white/10 transition whitespace-nowrap shrink-0 active:scale-95"
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

      {/* Calendar Event Quick Creator Modal */}
      <CalendarEventModal
        isOpen={showCalendarModal}
        onClose={() => setShowCalendarModal(false)}
        entity={selectedCalendarEntity}
        chatName={chatName}
        onConfirmReply={(replyText) => {
          onSendMessage(replyText, "text");
        }}
      />
    </div>
  );
};
