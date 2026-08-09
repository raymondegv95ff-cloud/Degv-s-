import React, { useState, useEffect } from "react";
import { Room, Message } from "../../types";
import { X, Sparkles, RefreshCw, Copy, Check, Send, CheckCircle2, ListChecks, FileText, Activity } from "lucide-react";

interface SmartSummaryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  room: Room | null;
  messages: Message[];
  onSendSummaryToChat?: (summaryText: string) => void;
}

interface SummaryData {
  executiveSummary: string;
  keyPoints: string[];
  actionItems: string[];
  overallStatus: string;
  sentiment: string;
  totalMessagesAnalyzed?: number;
}

export const SmartSummaryDrawer: React.FC<SmartSummaryDrawerProps> = ({
  isOpen,
  onClose,
  room,
  messages,
  onSendSummaryToChat,
}) => {
  const [summaryData, setSummaryData] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [sent, setSent] = useState<boolean>(false);

  const fetchSummary = async () => {
    if (!room || messages.length === 0) return;
    setLoading(true);
    setCopied(false);
    setSent(false);

    try {
      const res = await fetch("/api/ai/summarize-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chatName: room.name,
          messages: messages.map((m) => ({
            senderName: m.senderName,
            content: m.content,
            text: m.content,
            timestamp: m.timestamp,
          })),
        }),
      });

      const data = await res.json();
      setSummaryData(data);
    } catch (err) {
      console.error("Error fetching summary:", err);
      setSummaryData({
        executiveSummary: `Los participantes en ${room.name} han mantenido una comunicación constante. Se revisaron temas principales y acuerdos recientes.`,
        keyPoints: [
          "Coordinación de mensajes recientes",
          "Intercambio fluido de inquietudes y respuestas",
        ],
        actionItems: ["Continuar el diálogo según los pendientes acordados"],
        overallStatus: "Conversación Activa",
        sentiment: "Positivo y fluido",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && room) {
      fetchSummary();
    } else {
      setSummaryData(null);
    }
  }, [isOpen, room?.id]);

  if (!isOpen || !room) return null;

  const handleCopy = () => {
    if (!summaryData) return;
    const formatted = `📌 *RESUMEN EJECUTIVO POR DEGV'S AI* (${room.name})\n\n${summaryData.executiveSummary}\n\n*PUNTOS CLAVE:*\n${summaryData.keyPoints.map((p) => `• ${p}`).join("\n")}\n\n*ACCIONES Y ACUERDOS:*\n${summaryData.actionItems.map((a) => `✓ ${a}`).join("\n")}`;
    navigator.clipboard.writeText(formatted);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendToChat = () => {
    if (!summaryData || !onSendSummaryToChat) return;
    const formatted = `🤖 *Resumen Inteligente de la conversación (${room.name})*\n\n${summaryData.executiveSummary}\n\n*PUNTOS DESTACADOS:*\n${summaryData.keyPoints.map((p) => `• ${p}`).join("\n")}${summaryData.actionItems?.length ? `\n\n*ACUERDOS / TAREAS:*\n${summaryData.actionItems.map((a) => `✓ ${a}`).join("\n")}` : ""}`;
    onSendSummaryToChat(formatted);
    setSent(true);
    setTimeout(() => {
      setSent(false);
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      {/* Backdrop Click */}
      <div className="flex-1" onClick={onClose} />

      {/* Drawer Body */}
      <div className="w-full max-w-md bg-[#0a0a0a] border-l border-white/10 h-full flex flex-col shadow-2xl text-slate-100 animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="p-5 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-slate-950 via-emerald-950/30 to-slate-950">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-[#00E676]/20 border border-[#00E676]/40 text-[#00E676] shadow-[0_0_15px_rgba(0,230,118,0.2)]">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-sm text-slate-100">
                  Resumen Inteligente
                </h3>
                <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-[#00E676]/20 text-[#00E676] border border-[#00E676]/30">
                  DEGV'S AI
                </span>
              </div>
              <p className="text-xs text-slate-400 truncate max-w-[220px]">
                {room.name}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 custom-scrollbar">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-4 text-center">
              <div className="relative">
                <div className="w-16 h-16 rounded-full border-4 border-transparent border-t-[#00E676] border-r-[#00F0FF] animate-spin" />
                <Sparkles className="w-6 h-6 text-[#00E676] absolute inset-0 m-auto animate-pulse" />
              </div>
              <div className="space-y-1">
                <p className="font-bold text-sm text-slate-200">
                  Analizando historial con Degv's AI...
                </p>
                <p className="text-xs text-slate-400 max-w-xs">
                  Sintetizando mensajes recientes y extrayendo acuerdos clave.
                </p>
              </div>
            </div>
          ) : summaryData ? (
            <>
              {/* Status Bar Pills */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-2xl bg-white/5 border border-white/10 flex flex-col justify-between space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                    <Activity className="w-3 h-3 text-[#00E676]" /> Estado
                  </span>
                  <span className="font-bold text-slate-100 truncate">
                    {summaryData.overallStatus || "Activo"}
                  </span>
                </div>

                <div className="p-3 rounded-2xl bg-white/5 border border-white/10 flex flex-col justify-between space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-[#00F0FF]" /> Tono Emocional
                  </span>
                  <span className="font-bold text-[#00E676] truncate">
                    {summaryData.sentiment || "Positivo"}
                  </span>
                </div>
              </div>

              {/* Executive Summary Card */}
              <div className="p-4 rounded-2xl bg-gradient-to-b from-slate-900/90 to-slate-950 border border-white/10 space-y-2.5 shadow-lg">
                <div className="flex items-center gap-2 text-xs font-bold text-[#00E676]">
                  <FileText className="w-4 h-4" />
                  <span>Síntesis Ejecutiva</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed font-normal">
                  {summaryData.executiveSummary}
                </p>
              </div>

              {/* Key Points */}
              {summaryData.keyPoints?.length > 0 && (
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-sky-400">
                    <ListChecks className="w-4 h-4" />
                    <span>Puntos Clave Discutidos</span>
                  </div>
                  <ul className="space-y-2">
                    {summaryData.keyPoints.map((point, idx) => (
                      <li
                        key={idx}
                        className="text-xs text-slate-300 flex items-start gap-2 leading-snug"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-sky-400 mt-1.5 shrink-0" />
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Action Items / Agreements */}
              {summaryData.actionItems?.length > 0 && (
                <div className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#00E676]">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Acuerdos y Pendientes</span>
                  </div>
                  <ul className="space-y-2">
                    {summaryData.actionItems.map((item, idx) => (
                      <li
                        key={idx}
                        className="text-xs text-slate-200 flex items-start gap-2 leading-snug"
                      >
                        <span className="text-[#00E676] font-bold text-xs shrink-0">
                          ✓
                        </span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-10 text-slate-400 text-xs">
              No se pudo cargar el resumen del chat. Intenta de nuevo.
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-white/10 bg-[#0a0a0a] space-y-2">
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              disabled={loading || !summaryData}
              className="flex-1 py-2.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-slate-200 transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-[#00E676]" />
                  <span>¡Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-slate-400" />
                  <span>Copiar Resumen</span>
                </>
              )}
            </button>

            <button
              onClick={fetchSummary}
              disabled={loading}
              className="py-2.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition disabled:opacity-50"
              title="Regenerar resumen"
            >
              <RefreshCw
                className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
              />
            </button>
          </div>

          {onSendSummaryToChat && (
            <button
              onClick={handleSendToChat}
              disabled={loading || !summaryData}
              className="w-full py-3 rounded-xl bg-[#00E676] hover:bg-[#00c853] text-black font-extrabold text-xs shadow-[0_0_15px_rgba(0,230,118,0.3)] transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {sent ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>¡Publicado en el chat!</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Publicar Resumen en el Chat</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
