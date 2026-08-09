import React, { useState, useEffect } from "react";
import { CallLog } from "../../types";
import { storageService } from "../../services/storageService";
import { Phone, Video, PhoneIncoming, PhoneOutgoing, PhoneMissed, Trash2, PhoneCall } from "lucide-react";

interface CallsListProps {
  onStartCall: (peerId: string, isVideo: boolean, peerName?: string) => void;
}

export const CallsList: React.FC<CallsListProps> = ({ onStartCall }) => {
  const [callLogs, setCallLogs] = useState<CallLog[]>([]);
  const [filter, setFilter] = useState<"all" | "missed">("all");

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = () => {
    const logs = storageService.getCallLogs();
    setCallLogs(logs);
  };

  const handleClear = () => {
    if (confirm("¿Deseas borrar todo el historial de llamadas?")) {
      storageService.clearCallLogs();
      setCallLogs([]);
    }
  };

  const filteredLogs = callLogs.filter((log) => {
    if (filter === "missed") return log.direction === "missed";
    return true;
  });

  return (
    <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
      {/* Header Controls */}
      <div className="flex items-center justify-between pb-2 border-b border-white/5">
        <div className="flex items-center gap-1 bg-slate-900/80 p-1 rounded-xl border border-white/5">
          <button
            onClick={() => setFilter("all")}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
              filter === "all"
                ? "bg-[#00E676] text-slate-950 shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Todas ({callLogs.length})
          </button>
          <button
            onClick={() => setFilter("missed")}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
              filter === "missed"
                ? "bg-rose-500 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Perdidas ({callLogs.filter((l) => l.direction === "missed").length})
          </button>
        </div>

        {callLogs.length > 0 && (
          <button
            onClick={handleClear}
            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition"
            title="Borrar historial"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Call History Item Cards */}
      {filteredLogs.length > 0 ? (
        <div className="space-y-2">
          {filteredLogs.map((log) => {
            const isMissed = log.direction === "missed";
            const isOutgoing = log.direction === "outgoing";

            return (
              <div
                key={log.id}
                className="p-3 rounded-2xl bg-slate-900/60 hover:bg-slate-800/80 border border-white/5 hover:border-emerald-500/30 transition flex items-center justify-between group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative shrink-0">
                    <img
                      src={
                        log.peerAvatar ||
                        "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80"
                      }
                      alt={log.peerName}
                      className="w-11 h-11 rounded-2xl object-cover ring-2 ring-white/10 group-hover:ring-[#00E676] transition"
                    />
                    <span
                      className={`absolute -bottom-1 -right-1 p-1 rounded-full text-slate-950 shadow-md ${
                        isMissed
                          ? "bg-rose-500 text-white"
                          : isOutgoing
                          ? "bg-emerald-400 text-slate-950"
                          : "bg-cyan-400 text-slate-950"
                      }`}
                    >
                      {isMissed ? (
                        <PhoneMissed className="w-2.5 h-2.5" />
                      ) : isOutgoing ? (
                        <PhoneOutgoing className="w-2.5 h-2.5" />
                      ) : (
                        <PhoneIncoming className="w-2.5 h-2.5" />
                      )}
                    </span>
                  </div>

                  <div className="min-w-0 flex-1">
                    <p
                      className={`font-extrabold text-xs truncate ${
                        isMissed ? "text-rose-400" : "text-slate-100"
                      }`}
                    >
                      {log.peerName}
                    </p>

                    <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                      <span className="flex items-center gap-1 font-medium">
                        {log.type === "video" ? (
                          <Video className="w-3 h-3 text-cyan-400" />
                        ) : (
                          <Phone className="w-3 h-3 text-[#00E676]" />
                        )}
                        <span>{log.type === "video" ? "Videollamada" : "Voz"}</span>
                      </span>
                      <span>•</span>
                      <span>{log.timeString}</span>
                    </div>

                    {log.durationString && !isMissed && (
                      <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                        Duración: {log.durationString}
                      </p>
                    )}
                  </div>
                </div>

                {/* Redial Action Button */}
                <button
                  onClick={() => onStartCall(log.peerId, log.type === "video", log.peerName)}
                  className="p-2.5 rounded-xl bg-[#00E676]/10 hover:bg-[#00E676] text-[#00E676] hover:text-slate-950 font-bold text-xs transition flex items-center gap-1.5 shrink-0 shadow-sm"
                  title="Volver a llamar"
                >
                  <PhoneCall className="w-4 h-4" />
                  <span className="hidden sm:inline">Llamar</span>
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 text-center text-slate-400 space-y-2">
          <Phone className="w-10 h-10 text-slate-600 animate-pulse" />
          <p className="text-xs font-bold text-slate-300">
            {filter === "missed"
              ? "No tienes llamadas perdidas"
              : "No hay historial de llamadas registrado"}
          </p>
          <p className="text-[11px] text-slate-500 max-w-xs">
            Inicia una llamada de voz o videollamada desde cualquier chat para ver el registro aquí.
          </p>
        </div>
      )}
    </div>
  );
};
