import React, { useState, useEffect } from "react";
import { Phone, Video, Mic, MicOff, VideoOff, PhoneOff, Volume2 } from "lucide-react";
import { soundService } from "../../services/soundService";

interface CallModalProps {
  isOpen: boolean;
  onClose: () => void;
  contactName: string;
  avatarUrl?: string;
  isVideo: boolean;
}

export const CallModal: React.FC<CallModalProps> = ({
  isOpen,
  onClose,
  contactName,
  avatarUrl,
  isVideo,
}) => {
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(isVideo);

  useEffect(() => {
    let timer: any;
    if (isOpen) {
      setCallDuration(0);
      timer = setInterval(() => setCallDuration((prev) => prev + 1), 1000);
      
      // Play initial ringing sound customized by user
      if (isVideo) {
        soundService.playVideoCallRingSound();
      } else {
        soundService.playCallRingSound();
      }
    }
    return () => clearInterval(timer);
  }, [isOpen, isVideo]);

  if (!isOpen) return null;

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-xl animate-in fade-in duration-200">
      <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-6 text-slate-100 text-center relative overflow-hidden">
        {/* Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-[#00E676]/10 rounded-full blur-3xl pointer-events-none" />

        {/* Contact Info */}
        <div className="space-y-3 relative z-10">
          <img
            src={avatarUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80"}
            alt={contactName}
            className="w-24 h-24 mx-auto rounded-3xl object-cover ring-4 ring-[#00E676] shadow-2xl animate-pulse"
          />
          <div>
            <h2 className="text-xl font-black text-slate-100">{contactName}</h2>
            <p className="text-xs font-mono text-[#00E676] font-bold mt-1">
              Llamada en curso • {formatTime(callDuration)}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-center gap-4 relative z-10 pt-4">
          <button
            onClick={() => setIsMuted(!isMuted)}
            className={`p-3.5 rounded-2xl border transition ${
              isMuted
                ? "bg-red-950/80 border-red-500/50 text-red-400"
                : "bg-slate-800/80 border-slate-700 text-slate-200"
            }`}
          >
            {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          <button
            onClick={() => setIsVideoOn(!isVideoOn)}
            className={`p-3.5 rounded-2xl border transition ${
              !isVideoOn
                ? "bg-red-950/80 border-red-500/50 text-red-400"
                : "bg-slate-800/80 border-slate-700 text-slate-200"
            }`}
          >
            {isVideoOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
          </button>

          <button
            onClick={onClose}
            className="p-4 rounded-2xl bg-red-600 hover:bg-red-500 text-white shadow-xl shadow-red-600/30 transition"
            title="Finalizar Llamada"
          >
            <PhoneOff className="w-6 h-6" />
          </button>
        </div>
      </div>
    </div>
  );
};
