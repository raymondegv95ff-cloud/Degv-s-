import React, { useRef, useEffect } from "react";
import { Video, Mic, MicOff, VideoOff, PhoneOff, ShieldCheck, Wifi } from "lucide-react";

interface CallModalProps {
  isOpen: boolean;
  onClose: () => void;
  contactName: string;
  avatarUrl?: string;
  isVideo: boolean;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isConnected: boolean;
  isMuted: boolean;
  isVideoOn: boolean;
  callDuration: number;
  onToggleMute: () => void;
  onToggleVideo: () => void;
}

export const CallModal: React.FC<CallModalProps> = ({
  isOpen,
  onClose,
  contactName,
  avatarUrl,
  isVideo,
  localStream,
  remoteStream,
  isConnected,
  isMuted,
  isVideoOn,
  callDuration,
  onToggleMute,
  onToggleVideo,
}) => {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);

  // Enlazar stream local al elemento de video
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      console.log("[Degv's WebRTC] Enlazando localStream al video preview local");
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream, isOpen, isVideoOn]);

  // Enlazar stream remoto al elemento de video o audio
  useEffect(() => {
    if (remoteStream) {
      console.log("[Degv's WebRTC] Enlazando remoteStream a los reproductores");
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStream;
      }
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = remoteStream;
      }
    }
  }, [remoteStream, isOpen]);

  if (!isOpen) return null;

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const hasRemoteVideo =
    isVideo && remoteStream && remoteStream.getVideoTracks().length > 0;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 bg-slate-950/90 backdrop-blur-xl animate-in fade-in duration-200">
      {/* Invisible element to guarantee remote audio playback on all devices */}
      <audio ref={remoteAudioRef} autoPlay playsInline />

      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden relative flex flex-col items-center justify-between min-h-[500px] text-slate-100 p-6">
        {/* Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-80 h-80 bg-[#00E676]/10 rounded-full blur-3xl pointer-events-none" />

        {/* Top Header Status */}
        <div className="w-full flex items-center justify-between z-10">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800/80 border border-slate-700/60 text-xs font-mono">
            <span
              className={`w-2 h-2 rounded-full ${
                isConnected ? "bg-[#00E676] animate-pulse" : "bg-amber-400 animate-ping"
              }`}
            />
            <span className="text-slate-300">
              {isConnected ? "Conexión P2P Activa" : "Conectando señalización..."}
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-bold bg-emerald-950/50 border border-emerald-500/30 px-3 py-1.5 rounded-full">
            <ShieldCheck className="w-4 h-4 text-[#00E676]" />
            <span>WebRTC E2EE</span>
          </div>
        </div>

        {/* Center: Video streams or Audio avatars */}
        <div className="w-full flex-1 flex flex-col items-center justify-center relative my-4 z-10">
          {hasRemoteVideo ? (
            /* Remote Video Display */
            <div className="relative w-full h-[320px] sm:h-[380px] bg-black rounded-2xl overflow-hidden border border-slate-800 flex items-center justify-center">
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-3 left-3 bg-slate-900/80 backdrop-blur-md px-3 py-1 rounded-xl text-xs font-bold border border-white/10">
                {contactName}
              </div>
            </div>
          ) : (
            /* Voice/Audio Call View */
            <div className="space-y-4 text-center">
              <div className="relative inline-block">
                <img
                  src={
                    avatarUrl ||
                    `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(contactName)}`
                  }
                  alt={contactName}
                  className={`w-28 h-28 mx-auto rounded-3xl object-cover ring-4 ring-[#00E676] shadow-2xl ${
                    !isConnected ? "animate-pulse" : ""
                  }`}
                />
                {isConnected && (
                  <div className="absolute -bottom-2 -right-2 p-2 rounded-xl bg-emerald-500 text-slate-950 shadow-lg">
                    <Wifi className="w-4 h-4" />
                  </div>
                )}
              </div>
              <div>
                <h2 className="text-2xl font-black text-white">{contactName}</h2>
                <p className="text-sm font-mono text-[#00E676] font-bold mt-1">
                  {isConnected ? `En llamada • ${formatTime(callDuration)}` : "Llamando..."}
                </p>
              </div>
            </div>
          )}

          {/* Local Video Picture-in-Picture (PiP) */}
          {isVideo && localStream && (
            <div className="absolute top-2 right-2 w-28 sm:w-36 h-36 sm:h-48 bg-slate-950 rounded-2xl overflow-hidden border-2 border-[#00E676]/60 shadow-2xl z-20">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover ${!isVideoOn ? "opacity-0" : ""}`}
              />
              {!isVideoOn && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-900 text-slate-400 text-xs font-bold">
                  Cámara Apagada
                </div>
              )}
              <span className="absolute bottom-1.5 left-1.5 bg-black/70 px-2 py-0.5 rounded-lg text-[10px] font-bold text-white">
                Tú
              </span>
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div className="w-full flex items-center justify-center gap-4 relative z-10 pt-2 border-t border-slate-800/80">
          <button
            onClick={onToggleMute}
            className={`p-3.5 sm:p-4 rounded-2xl border transition ${
              isMuted
                ? "bg-red-950/80 border-red-500/50 text-red-400"
                : "bg-slate-800/80 border-slate-700 hover:bg-slate-700 text-slate-200"
            }`}
            title={isMuted ? "Activar Micrófono" : "Silenciar Micrófono"}
          >
            {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          {isVideo && (
            <button
              onClick={onToggleVideo}
              className={`p-3.5 sm:p-4 rounded-2xl border transition ${
                !isVideoOn
                  ? "bg-red-950/80 border-red-500/50 text-red-400"
                  : "bg-slate-800/80 border-slate-700 hover:bg-slate-700 text-slate-200"
              }`}
              title={isVideoOn ? "Apagar Cámara" : "Encender Cámara"}
            >
              {isVideoOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
            </button>
          )}

          <button
            onClick={onClose}
            className="p-4 sm:p-4.5 rounded-2xl bg-red-600 hover:bg-red-500 text-white shadow-xl shadow-red-600/30 transition active:scale-95 flex items-center gap-2 font-bold px-6"
            title="Finalizar Llamada"
          >
            <PhoneOff className="w-5 h-5" />
            <span className="hidden sm:inline">Finalizar</span>
          </button>
        </div>
      </div>
    </div>
  );
};
