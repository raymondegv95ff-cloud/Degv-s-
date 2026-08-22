import React, { useState, useEffect } from "react";
import { DailyDigestData, Message, Room } from "../../types";
import { storageService } from "../../services/storageService";
import {
  Sparkles,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Flame,
  MessageSquare,
  Users,
  Copy,
  Check,
  RefreshCw,
  X,
  FileText,
  Calendar,
  Share2,
  Download,
  Zap,
} from "lucide-react";

interface DailyDigestModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DailyDigestModal: React.FC<DailyDigestModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [digest, setDigest] = useState<DailyDigestData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hoursWindow, setHoursWindow] = useState<number>(24);
  const [copied, setCopied] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const generateDigest = async (hours: number = 24) => {
    setIsLoading(true);
    setErrorMessage("");

    try {
      // Gather all messages across all rooms
      const allMsgsMap = storageService.getAllMessagesMap();
      const rooms = storageService.getRooms();
      const roomsMap = new Map(rooms.map((r) => [r.id, r.name]));

      const cutoffTime = Date.now() - hours * 60 * 60 * 1000;
      const recentMessages: any[] = [];

      Object.entries(allMsgsMap).forEach(([roomId, msgs]) => {
        const roomName = roomsMap.get(roomId) || "Chat";
        const messageList = (msgs as Message[]) || [];
        messageList.forEach((m) => {
          const msgTime = m.timestamp || new Date(m.createdAt).getTime();
          // Include if created within time window or fallback to last 30 msgs
          if (!isNaN(msgTime) && msgTime >= cutoffTime) {
            recentMessages.push({
              ...m,
              roomId,
              roomName,
            });
          }
        });
      });

      // If no messages strictly in 24h, take recent messages across rooms for a rich report
      let messagesToAnalyze = recentMessages;
      if (messagesToAnalyze.length === 0) {
        Object.entries(allMsgsMap).forEach(([roomId, msgs]) => {
          const roomName = roomsMap.get(roomId) || "Chat";
          const messageList = (msgs as Message[]) || [];
          messageList.slice(-10).forEach((m) => {
            messagesToAnalyze.push({
              ...m,
              roomId,
              roomName,
            });
          });
        });
      }

      const response = await fetch("/api/ai/daily-digest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: messagesToAnalyze,
          hours,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data: DailyDigestData = await response.json();
      setDigest(data);
    } catch (err: any) {
      console.error("Error generating daily digest:", err);
      setErrorMessage(
        "No se pudo conectar con Degv's AI. Mostrando resumen preliminar generado en caché."
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      generateDigest(hoursWindow);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopySummary = () => {
    if (!digest) return;
    const text = `📊 RESUMEN DIARIO - DEGV'S MESSENGER (${digest.period})
🕒 Generado: ${new Date(digest.generatedAt).toLocaleString()}
💬 Mensajes analizados: ${digest.totalMessagesAnalyzed} en ${digest.activeRoomsCount} chats

📝 RESUMEN EJECUTIVO:
${digest.executiveSummary}

🌟 PUNTOS CLAVE & DESTACADOS:
${digest.keyHighlights.map((k) => `• [${k.roomName}] ${k.senderName ? k.senderName + ': ' : ''}${k.highlight} (${k.urgencyLevel ? 'Urgencia: ' + k.urgencyLevel : ''})`).join("\n")}

📋 PENDIENTES & ACCIONES REQUERIDAS:
${digest.pendingActionItems.map((p) => `✓ ${p}`).join("\n")}

🎯 Tono general: ${digest.overallTone}
👥 Participantes principales: ${digest.topParticipants.join(", ")}`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4 text-slate-100 max-h-[90vh] flex flex-col relative">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-[#00E676] text-slate-950 shadow-lg shadow-[#00E676]/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-100 flex items-center gap-2">
                <span>Resumen Diario Ejecutivo</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#00E676]/20 text-[#00E676] border border-[#00E676]/30 font-bold uppercase">
                  Degv's AI
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Reporte sintético con los mensajes, acuerdos y tareas más importantes de las últimas 24 horas
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Time Window Tabs & Refresh Button */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
            {[
              { hours: 24, label: "Últimas 24h" },
              { hours: 48, label: "Últimas 48h" },
              { hours: 168, label: "Últimos 7 días" },
            ].map((tab) => (
              <button
                key={tab.hours}
                onClick={() => {
                  setHoursWindow(tab.hours);
                  generateDigest(tab.hours);
                }}
                className={`text-xs px-3 py-1.5 rounded-lg font-bold transition ${
                  hoursWindow === tab.hours
                    ? "bg-[#00E676] text-slate-950 shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => generateDigest(hoursWindow)}
              disabled={isLoading}
              className="py-1.5 px-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-[#00E676]/50 text-xs text-slate-300 font-bold flex items-center gap-1.5 transition disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-[#00E676]" : ""}`} />
              <span>{isLoading ? "Analizando..." : "Actualizar"}</span>
            </button>

            {digest && (
              <button
                onClick={handleCopySummary}
                className="py-1.5 px-3 rounded-xl bg-[#00E676]/20 border border-[#00E676]/40 hover:bg-[#00E676]/30 text-xs text-[#00E676] font-bold flex items-center gap-1.5 transition"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-[#00E676]" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? "¡Copiado!" : "Copiar Reporte"}</span>
              </button>
            )}
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1 custom-scrollbar min-h-[300px]">
          {isLoading ? (
            <div className="py-16 text-center space-y-4">
              <div className="w-12 h-12 mx-auto rounded-full bg-[#00E676]/20 border border-[#00E676]/40 flex items-center justify-center animate-pulse">
                <Sparkles className="w-6 h-6 text-[#00E676] animate-spin" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-extrabold text-slate-200">
                  Degv's AI está analizando tus conversaciones...
                </p>
                <p className="text-xs text-slate-400">
                  Sintetizando mensajes clave, acuerdos y tareas de las últimas {hoursWindow} horas
                </p>
              </div>
            </div>
          ) : errorMessage && !digest ? (
            <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs space-y-2">
              <div className="flex items-center gap-2 font-bold">
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                <span>Error al generar resumen</span>
              </div>
              <p>{errorMessage}</p>
              <button
                onClick={() => generateDigest(hoursWindow)}
                className="py-1 px-3 rounded-lg bg-rose-500/20 text-rose-200 font-bold hover:bg-rose-500/30 transition"
              >
                Reintentar
              </button>
            </div>
          ) : digest ? (
            <>
              {/* Quick Stat Highlights */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 text-center">
                  <p className="text-[10px] text-slate-400 font-medium">Mensajes analizados</p>
                  <p className="text-lg font-black text-[#00E676] font-mono">{digest.totalMessagesAnalyzed}</p>
                </div>
                <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 text-center">
                  <p className="text-[10px] text-slate-400 font-medium">Chats activos</p>
                  <p className="text-lg font-black text-cyan-400 font-mono">{digest.activeRoomsCount}</p>
                </div>
                <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 text-center col-span-2">
                  <p className="text-[10px] text-slate-400 font-medium">Tono general del día</p>
                  <p className="text-xs font-bold text-slate-200 truncate mt-1">
                    {digest.overallTone || "Productivo y Activo"}
                  </p>
                </div>
              </div>

              {/* Executive Summary Card */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-950 via-slate-950/90 to-emerald-950/20 border border-[#00E676]/30 space-y-2">
                <h3 className="text-xs font-black text-[#00E676] uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" />
                  <span>Resumen Ejecutivo Global</span>
                </h3>
                <p className="text-xs text-slate-200 leading-relaxed whitespace-pre-line">
                  {digest.executiveSummary}
                </p>
              </div>

              {/* Key Highlights by Conversation */}
              {digest.keyHighlights && digest.keyHighlights.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-black text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-amber-400" />
                    <span>Puntos Relevantes por Conversación</span>
                  </h3>
                  <div className="grid grid-cols-1 gap-2">
                    {digest.keyHighlights.map((k, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-2xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition space-y-1"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-extrabold text-xs text-slate-100 flex items-center gap-1.5">
                            <MessageSquare className="w-3 h-3 text-[#00E676]" />
                            <span>{k.roomName}</span>
                          </span>
                          {k.urgencyLevel && (
                            <span
                              className={`text-[9px] font-mono uppercase px-2 py-0.5 rounded-full font-black border ${
                                k.urgencyLevel === "alta"
                                  ? "bg-rose-500/20 text-rose-300 border-rose-500/40"
                                  : k.urgencyLevel === "media"
                                  ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                                  : "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                              }`}
                            >
                              {k.urgencyLevel}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed">
                          {k.senderName && (
                            <span className="font-semibold text-[#00E676]">{k.senderName}: </span>
                          )}
                          {k.highlight}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Items / Follow-ups */}
              {digest.pendingActionItems && digest.pendingActionItems.length > 0 && (
                <div className="p-4 rounded-2xl bg-slate-950 border border-indigo-500/30 space-y-2.5">
                  <h3 className="text-xs font-black text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Tareas y Acciones Pendientes Detectadas</span>
                  </h3>
                  <div className="space-y-1.5">
                    {digest.pendingActionItems.map((item, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-xs text-slate-200">
                        <span className="w-4 h-4 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                          ✓
                        </span>
                        <span className="leading-relaxed">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Top Participants */}
              {digest.topParticipants && digest.topParticipants.length > 0 && (
                <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center gap-2 flex-wrap text-xs text-slate-400">
                  <Users className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span className="font-bold text-slate-300">Contactos más activos:</span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {digest.topParticipants.map((name, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 rounded-lg bg-slate-900 border border-slate-800 text-[11px] text-slate-200 font-medium"
                      >
                        {name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : null}
        </div>

        {/* Footer */}
        <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span className="text-[11px] text-slate-500 flex items-center gap-1">
            <Clock className="w-3 h-3 text-[#00E676]" />
            <span>Actualizado en tiempo real</span>
          </span>

          <button
            onClick={onClose}
            className="py-1.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
