import React, { useState, useRef, useEffect } from "react";
import {
  LifeBuoy,
  X,
  Send,
  Loader2,
  Bug,
  HelpCircle,
  Cpu,
  CheckCircle2,
  Trash2,
  Sparkles,
  Bot,
  User,
  ShieldCheck,
  Zap,
  Info,
} from "lucide-react";
import { UserProfile } from "../../types";
import { soundService } from "../../services/soundService";

interface SupportMessage {
  id: string;
  text: string;
  isBot: boolean;
  timestamp: string;
  diagnosticsAttached?: boolean;
}

interface SupportBotModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: UserProfile;
}

export const SupportBotModal: React.FC<SupportBotModalProps> = ({
  isOpen,
  onClose,
  currentUser,
}) => {
  const [messages, setMessages] = useState<SupportMessage[]>([
    {
      id: "welcome_support_1",
      text: "¡Hola! 👋 Soy el **Bot de Soporte Técnico Especializado** de Degv's Messenger.\n\nEstoy aquí para ayudarte a resolver dudas sobre el funcionamiento de la app o registrar reportes de errores (bugs).\n\nPuedes escribir tu consulta o seleccionar una de las categorías rápidas abajo.",
      isBot: true,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);
  const [inputVal, setInputVal] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [attachDiagnostics, setAttachDiagnostics] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const quickPrompts = [
    { label: "🐛 Reportar un Error", prompt: "Quiero reportar un error que me ocurrió en la aplicación." },
    { label: "🔒 Bóveda Secreta / WebAuthn", prompt: "¿Cómo funciona el desbloqueo biométrico con huella y la Bóveda Secreta?" },
    { label: "📶 Modo Offline e IndexedDB", prompt: "¿Cómo funciona la cola de mensajes sin conexión en IndexedDB?" },
    { label: "🎵 Personalizar Tonos", prompt: "¿Cómo cambio los tonos y subo audios desde la galería de mi teléfono?" },
    { label: "🔄 Actualizaciones PWA", prompt: "¿Cómo se actualiza la app instalada en Android / PWA?" },
    { label: "📊 Estadísticas Recharts", prompt: "¿Dónde puedo ver mi tiempo de uso y estadísticas de mensajes?" },
  ];

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  }, [isOpen, messages]);

  if (!isOpen) return null;

  const getSystemDiagnostics = () => {
    return {
      appName: "Degv's Messenger",
      appVersion: "2.4.0 (AI Studio / PWA)",
      userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "Unknown",
      language: typeof navigator !== "undefined" ? navigator.language : "es",
      screenResolution: typeof window !== "undefined" ? `${window.innerWidth}x${window.innerHeight}` : "Unknown",
      isOnline: typeof navigator !== "undefined" ? navigator.onLine : true,
      webAuthnSupported: typeof window !== "undefined" && !!window.PublicKeyCredential,
      indexedDbSupported: typeof window !== "undefined" && !!window.indexedDB,
      timestamp: new Date().toISOString(),
      user: currentUser ? { id: currentUser.id, username: currentUser.username } : "guest",
    };
  };

  const handleSendMessage = async (customText?: string) => {
    const textToSend = customText || inputVal;
    if (!textToSend.trim() || isLoading) return;

    const userMsg: SupportMessage = {
      id: `user_${Date.now()}`,
      text: textToSend.trim(),
      isBot: false,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      diagnosticsAttached: attachDiagnostics,
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!customText) setInputVal("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/support/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: textToSend.trim(),
          history: messages.slice(-8),
          diagnosticInfo: attachDiagnostics ? getSystemDiagnostics() : null,
          userEmail: currentUser?.email || "",
        }),
      });

      const data = await response.json();
      const botText = data.reply || data.text || "He recibido tu consulta. Si necesitas asistencia adicional no dudes en indicármelo.";

      const botMsg: SupportMessage = {
        id: `bot_${Date.now()}`,
        text: botText,
        isBot: true,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, botMsg]);
      soundService.playReceiveSound();
    } catch (err) {
      console.error("Error communicating with support bot:", err);
      const fallbackMsg: SupportMessage = {
        id: `bot_err_${Date.now()}`,
        text: "He registrado tu solicitud técnica. Si el problema persiste, te sugerimos reiniciar la app o comprobar tu conexión a la red.",
        isBot: true,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, fallbackMsg]);
    } finally {
      setIsLoading(false);
      setAttachDiagnostics(false);
    }
  };

  const handleClearChat = () => {
    setMessages([
      {
        id: `welcome_${Date.now()}`,
        text: "¡Chat de soporte reiniciado! ¿En qué puedo asistirte ahora?",
        isBot: true,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ]);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl flex flex-col h-[85vh] max-h-[750px] overflow-hidden relative text-slate-100">
        {/* Header */}
        <div className="p-4 bg-slate-950/90 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shadow-md shadow-cyan-500/10">
                <LifeBuoy className="w-5 h-5" />
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-[#00E676] border-2 border-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-sm text-slate-100">Soporte Técnico Especializado</h3>
                <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 text-[9px] font-black uppercase tracking-wider">
                  Bot Oficial
                </span>
              </div>
              <p className="text-[11px] text-slate-400">Atención técnica, resolución de dudas y reporte de bugs</p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={handleClearChat}
              title="Limpiar chat de soporte"
              className="p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Quick Topic Chips */}
        <div className="p-2 bg-slate-950/50 border-b border-slate-800/80 flex items-center gap-1.5 overflow-x-auto custom-scrollbar shrink-0">
          {quickPrompts.map((item, idx) => (
            <button
              key={idx}
              onClick={() => handleSendMessage(item.prompt)}
              disabled={isLoading}
              className="px-2.5 py-1 rounded-xl bg-slate-800/90 hover:bg-cyan-950/60 hover:border-cyan-500/40 border border-slate-700/60 text-[11px] font-semibold text-slate-300 hover:text-cyan-300 transition whitespace-nowrap active:scale-95 disabled:opacity-50"
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Messages Stream */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5 custom-scrollbar bg-[#070b12]">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-2.5 ${msg.isBot ? "justify-start" : "justify-end"}`}
            >
              {msg.isBot && (
                <div className="w-8 h-8 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0 mt-0.5">
                  <Bot className="w-4 h-4" />
                </div>
              )}

              <div
                className={`max-w-[85%] rounded-2xl p-3.5 text-xs leading-relaxed space-y-1 shadow-md ${
                  msg.isBot
                    ? "bg-slate-900/95 border border-slate-800 text-slate-200"
                    : "bg-cyan-600 text-white rounded-br-none"
                }`}
              >
                {msg.diagnosticsAttached && (
                  <div className="mb-2 p-1.5 rounded-lg bg-cyan-900/50 border border-cyan-400/30 flex items-center gap-1.5 text-[10px] text-cyan-200 font-semibold">
                    <Cpu className="w-3 h-3 text-cyan-300" />
                    <span>Diagnóstico técnico del sistema adjunto</span>
                  </div>
                )}

                <div className="whitespace-pre-wrap font-normal">
                  {msg.text}
                </div>

                <div
                  className={`text-[10px] text-right pt-1 ${
                    msg.isBot ? "text-slate-500" : "text-cyan-200"
                  }`}
                >
                  {msg.timestamp}
                </div>
              </div>

              {!msg.isBot && (
                <div className="w-8 h-8 rounded-xl bg-cyan-600 flex items-center justify-center text-white shrink-0 mt-0.5 shadow-md">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-2.5 justify-start">
              <div className="w-8 h-8 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
                <Bot className="w-4 h-4" />
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 text-xs text-slate-300 flex items-center gap-2">
                <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />
                <span>Analizando consulta con el soporte técnico...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 space-y-2 shrink-0">
          {/* Diagnostic switch */}
          <div className="flex items-center justify-between px-1">
            <button
              type="button"
              onClick={() => setAttachDiagnostics((prev) => !prev)}
              className={`text-[11px] font-semibold flex items-center gap-1.5 px-2 py-1 rounded-xl transition ${
                attachDiagnostics
                  ? "bg-cyan-950 border border-cyan-500/40 text-cyan-300"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
              }`}
            >
              <Cpu className="w-3.5 h-3.5 text-cyan-400" />
              <span>
                {attachDiagnostics
                  ? "✓ Diagnóstico del sistema adjunto (OS, Red, Navegador)"
                  : "+ Adjuntar diagnóstico del sistema"}
              </span>
            </button>

            <span className="text-[10px] text-slate-500 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-400" />
              <span>Soporte Seguro Degv</span>
            </span>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              placeholder="Escribe tu duda técnica o describe el error que experimentas..."
              disabled={isLoading}
              className="flex-1 bg-slate-900 border border-slate-800 rounded-2xl px-4 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition"
            />
            <button
              type="submit"
              disabled={!inputVal.trim() || isLoading}
              className="p-2.5 rounded-2xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-white transition shadow-md shadow-cyan-600/20 active:scale-95 shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
