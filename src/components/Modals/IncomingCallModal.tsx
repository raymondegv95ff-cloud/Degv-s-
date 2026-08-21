import React from "react";
import { Phone, PhoneOff, Video, Mic, Volume2 } from "lucide-react";
import { CallSession } from "../../services/webrtcService";

interface IncomingCallModalProps {
  call: CallSession | null;
  onAccept: () => void;
  onDecline: () => void;
}

export const IncomingCallModal: React.FC<IncomingCallModalProps> = ({
  call,
  onAccept,
  onDecline,
}) => {
  if (!call) return null;

  const isVideo = call.type === "video";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in zoom-in-95 duration-200">
      <div className="w-full max-w-sm bg-slate-900 border-2 border-emerald-500/40 rounded-3xl p-6 shadow-2xl space-y-6 text-slate-100 text-center relative overflow-hidden">
        {/* Glowing aura */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-[#00E676]/20 rounded-full blur-3xl pointer-events-none animate-pulse" />

        {/* Header Indicator */}
        <div className="flex items-center justify-center gap-2 text-xs font-bold font-mono uppercase tracking-widest text-[#00E676]">
          {isVideo ? <Video className="w-4 h-4 animate-bounce" /> : <Phone className="w-4 h-4 animate-bounce" />}
          <span>{isVideo ? "Videollamada Entrante" : "Llamada de Voz Entrante"}</span>
        </div>

        {/* Contact Info */}
        <div className="space-y-3 relative z-10">
          <div className="relative inline-block">
            <img
              src={
                call.callerAvatar ||
                `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(call.callerName || "Caller")}`
              }
              alt={call.callerName}
              className="w-24 h-24 mx-auto rounded-3xl object-cover ring-4 ring-[#00E676] shadow-2xl animate-pulse"
            />
            <span className="absolute -bottom-2 -right-2 p-2 rounded-xl bg-slate-900 border border-[#00E676]/50 text-[#00E676]">
              {isVideo ? <Video className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </span>
          </div>

          <div>
            <h2 className="text-2xl font-black text-white tracking-tight">{call.callerName}</h2>
            <p className="text-xs text-slate-400 mt-1 flex items-center justify-center gap-1">
              <Volume2 className="w-3.5 h-3.5 text-[#00E676] animate-ping" />
              <span>Timbrando en Degv's Messenger...</span>
            </p>
          </div>
        </div>

        {/* Action Controls: Decline (Red) vs Accept (Green) */}
        <div className="flex items-center justify-center gap-6 relative z-10 pt-2">
          {/* Decline Button */}
          <button
            onClick={onDecline}
            className="flex flex-col items-center gap-2 group transition"
          >
            <div className="p-4 rounded-2xl bg-red-600/90 hover:bg-red-500 text-white shadow-lg shadow-red-600/30 group-hover:scale-110 active:scale-95 transition">
              <PhoneOff className="w-6 h-6" />
            </div>
            <span className="text-xs font-semibold text-red-400">Rechazar</span>
          </button>

          {/* Accept Button */}
          <button
            onClick={onAccept}
            className="flex flex-col items-center gap-2 group transition"
          >
            <div className="p-4 rounded-2xl bg-[#00E676] hover:bg-[#00c853] text-slate-950 shadow-xl shadow-[#00E676]/40 group-hover:scale-110 active:scale-95 transition font-black">
              {isVideo ? <Video className="w-6 h-6" /> : <Phone className="w-6 h-6" />}
            </div>
            <span className="text-xs font-bold text-[#00E676]">Aceptar</span>
          </button>
        </div>
      </div>
    </div>
  );
};
