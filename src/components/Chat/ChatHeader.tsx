import React, { useState } from "react";
import { Room } from "../../types";
import { storageService } from "../../services/storageService";
import {
  Phone,
  Video,
  Search,
  MoreVertical,
  ShieldCheck,
  Download,
  Image,
  Star,
  ArrowLeft,
  Bot,
  Users,
  Radio,
  Lock,
  Trash2,
  Clock,
  Maximize2,
  Minimize2,
  KeyRound,
  Sparkles,
  HardDrive,
  CheckCircle2,
  Zap,
} from "lucide-react";

interface ChatHeaderProps {
  room: Room;
  onBackMobile: () => void;
  onOpenContactDrawer: () => void;
  onOpenSearchInChat: () => void;
  onStartCall: (isVideo: boolean) => void;
  onExportChat: () => void;
  onOpenWallpaperSelector: () => void;
  onOpenE2EEModal: () => void;
  onOpenStarredMessages: () => void;
  onDeleteChat?: (roomId: string) => void;
  onOpenLockSetup?: () => void;
  onOpenSmartSummary?: () => void;
  isTyping?: boolean;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  room,
  onBackMobile,
  onOpenContactDrawer,
  onOpenSearchInChat,
  onStartCall,
  onExportChat,
  onOpenWallpaperSelector,
  onOpenE2EEModal,
  onOpenStarredMessages,
  onDeleteChat,
  onOpenLockSetup,
  onOpenSmartSummary,
  isTyping,
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [showCacheInfo, setShowCacheInfo] = useState(false);
  const isAi = room.isAiChat;
  const isCurrentlyTyping = isTyping || room.isTyping;
  const cachedMessagesCount = storageService.getRoomCachedCount(room.id);

  return (
    <header className="h-20 px-6 flex items-center justify-between border-b border-white/5 bg-[#0a0a0a]/90 backdrop-blur-md z-10 select-none">
      {/* Contact Info & Back Button */}
      <div className="flex items-center gap-4 min-w-0">
        <button
          onClick={onBackMobile}
          className="p-1.5 rounded-xl text-slate-400 hover:text-[#00E676] md:hidden hover:bg-white/5 transition-colors"
          title="Volver a la lista de chats"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div
          onClick={onOpenContactDrawer}
          className="flex items-center gap-4 cursor-pointer group min-w-0"
        >
          <div className="relative shrink-0">
            <img
              src={
                room.avatarUrl ||
                "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80"
              }
              alt={room.name}
              className={`w-11 h-11 rounded-full object-cover ring-2 ${
                isAi ? "ring-[#00E676] shadow-[0_0_10px_rgba(0,230,118,0.3)]" : "ring-[#00E676]/20"
              }`}
            />
            <span className="absolute bottom-0 right-0 w-3 h-3 bg-[#00E676] border-2 border-[#0a0a0a] rounded-full" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h2 className="font-bold text-slate-100 group-hover:text-[#00E676] transition-colors truncate">
                {room.name}
              </h2>
              {isAi && (
                <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold bg-[#00E676]/20 text-[#00E676] border border-[#00E676]/30 uppercase">
                  DEGV'S AI
                </span>
              )}
              {room.isLocked && (
                <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center gap-0.5">
                  <Lock className="w-2.5 h-2.5" /> PIN
                </span>
              )}
              {room.disappearingTimer && room.disappearingTimer !== "off" && (
                <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center gap-0.5">
                  <Clock className="w-2.5 h-2.5" /> {room.disappearingTimer}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 mt-0.5">
              {isCurrentlyTyping ? (
                <span className="text-[11px] text-[#00E676] font-bold flex items-center gap-1.5 animate-in fade-in duration-150">
                  <span>Escribiendo</span>
                  <span className="flex items-center gap-0.5 ml-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#00E676] animate-bounce [animation-delay:-0.3s]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-[#00E676] animate-bounce [animation-delay:-0.15s]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-[#00E676] animate-bounce" />
                  </span>
                </span>
              ) : (
                <span className="text-[11px] text-[#00E676] flex items-center gap-1 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00E676] animate-pulse" /> online
                </span>
              )}

              {/* Offline Cache Indicator Badge */}
              <div className="relative">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowCacheInfo(!showCacheInfo);
                  }}
                  className="px-1.5 py-0.5 rounded-full bg-cyan-950/70 border border-cyan-500/40 hover:border-cyan-400 text-cyan-300 text-[10px] font-bold flex items-center gap-1 transition shadow-sm hover:scale-105"
                  title="Historial en Caché Local disponible offline"
                >
                  <Zap className="w-2.5 h-2.5 text-cyan-400 fill-cyan-400" />
                  <span>Caché</span>
                  <span className="text-[9px] text-cyan-400/80 font-mono hidden sm:inline">({cachedMessagesCount})</span>
                </button>

                {showCacheInfo && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="absolute left-0 top-6 w-60 p-3 bg-slate-950 border border-cyan-500/40 rounded-2xl shadow-2xl z-50 text-xs text-slate-200 animate-in fade-in zoom-in-95 duration-150"
                  >
                    <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
                      <div className="flex items-center gap-1.5 font-bold text-cyan-300">
                        <HardDrive className="w-3.5 h-3.5" />
                        <span>Caché Local Offline</span>
                      </div>
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-cyan-900 text-cyan-200">
                        Activo
                      </span>
                    </div>
                    <div className="space-y-1.5 pt-2 text-[11px]">
                      <p className="text-slate-300">
                        Historial completo guardado en tu dispositivo para carga instantánea <strong>(0ms)</strong>.
                      </p>
                      <div className="flex justify-between text-slate-400 pt-1 font-mono text-[10px]">
                        <span>Mensajes en caché:</span>
                        <strong className="text-[#00E676]">{cachedMessagesCount}</strong>
                      </div>
                      <div className="flex justify-between text-slate-400 font-mono text-[10px]">
                        <span>Modo sin conexión:</span>
                        <strong className="text-cyan-400">100% Listo</strong>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Action Icons & Menu */}
      <div className="flex items-center gap-3 md:gap-4 text-slate-400">
        {onOpenSmartSummary && (
          <button
            onClick={onOpenSmartSummary}
            className="px-2.5 py-1.5 rounded-xl bg-[#00E676]/10 border border-[#00E676]/30 text-[#00E676] hover:bg-[#00E676]/20 transition flex items-center gap-1.5 text-xs font-bold shadow-[0_0_10px_rgba(0,230,118,0.15)]"
            title="Generar Resumen Inteligente con Degv's AI"
          >
            <Sparkles className="w-4 h-4 animate-pulse" />
            <span className="hidden sm:inline">Resumen IA</span>
          </button>
        )}

        <button
          onClick={() => onStartCall(false)}
          className="hover:text-[#00E676] transition-colors"
          title="Llamada de voz"
        >
          <Phone className="w-5 h-5" />
        </button>

        <button
          onClick={() => onStartCall(true)}
          className="hover:text-[#00E676] transition-colors"
          title="Videollamada"
        >
          <Video className="w-5 h-5" />
        </button>

        <button
          onClick={onOpenSearchInChat}
          className="hover:text-[#00E676] transition-colors"
          title="Buscar en el chat"
        >
          <Search className="w-5 h-5" />
        </button>

        {/* Dropdown Menu */}
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="hover:text-[#00E676] transition-colors"
            title="Opciones de chat"
          >
            <MoreVertical className="w-5 h-5" />
          </button>

          {showMenu && (
            <div
              className="absolute right-0 mt-3 w-56 bg-[#0a0a0a] border border-white/10 rounded-2xl shadow-2xl p-2 z-50 text-xs text-slate-200 animate-in fade-in duration-150 backdrop-blur-xl"
              onMouseLeave={() => setShowMenu(false)}
            >
              {onOpenSmartSummary && (
                <button
                  onClick={() => {
                    setShowMenu(false);
                    onOpenSmartSummary();
                  }}
                  className="w-full text-left px-3 py-2 rounded-xl hover:bg-white/5 hover:text-[#00E676] flex items-center gap-2.5 transition-colors font-bold text-[#00E676]"
                >
                  <Sparkles className="w-4 h-4 text-[#00E676]" />
                  <span>Resumen Inteligente (IA)</span>
                </button>
              )}

              <button
                onClick={() => {
                  setShowMenu(false);
                  onOpenContactDrawer();
                }}
                className="w-full text-left px-3 py-2 rounded-xl hover:bg-white/5 hover:text-[#00E676] flex items-center gap-2.5 transition-colors"
              >
                <Users className="w-4 h-4 text-[#00E676]" />
                <span>Ver información</span>
              </button>

              <button
                onClick={() => {
                  setShowMenu(false);
                  if (onOpenLockSetup) onOpenLockSetup();
                }}
                className="w-full text-left px-3 py-2 rounded-xl hover:bg-white/5 hover:text-[#00E676] flex items-center gap-2.5 transition-colors"
              >
                <KeyRound className="w-4 h-4 text-[#00E676]" />
                <span>{room.isLocked ? "Configurar PIN de Chat" : "Bloquear con PIN"}</span>
              </button>

              <button
                onClick={() => {
                  setShowMenu(false);
                  onOpenWallpaperSelector();
                }}
                className="w-full text-left px-3 py-2 rounded-xl hover:bg-white/5 hover:text-[#00E676] flex items-center gap-2.5 transition-colors"
              >
                <Image className="w-4 h-4 text-[#00E676]" />
                <span>Fondo de pantalla</span>
              </button>

              <button
                onClick={() => {
                  setShowMenu(false);
                  onOpenStarredMessages();
                }}
                className="w-full text-left px-3 py-2 rounded-xl hover:bg-white/5 hover:text-[#00E676] flex items-center gap-2.5 transition-colors"
              >
                <Star className="w-4 h-4 text-[#00E676]" />
                <span>Mensajes destacados</span>
              </button>

              <button
                onClick={() => {
                  setShowMenu(false);
                  onOpenE2EEModal();
                }}
                className="w-full text-left px-3 py-2 rounded-xl hover:bg-white/5 hover:text-[#00E676] flex items-center gap-2.5 transition-colors"
              >
                <ShieldCheck className="w-4 h-4 text-[#00E676]" />
                <span>Seguridad QR</span>
              </button>

              <button
                onClick={() => {
                  setShowMenu(false);
                  onExportChat();
                }}
                className="w-full text-left px-3 py-2 rounded-xl hover:bg-white/5 hover:text-[#00E676] flex items-center gap-2.5 transition-colors text-slate-300"
              >
                <Download className="w-4 h-4 text-[#00E676]" />
                <span>Exportar chat JSON</span>
              </button>

              <div className="my-1 border-t border-slate-800" />

              <button
                onClick={() => {
                  setShowMenu(false);
                  if (onDeleteChat) {
                    onDeleteChat(room.id);
                  }
                }}
                className="w-full text-left px-3 py-2 rounded-xl hover:bg-rose-500/10 hover:text-rose-400 text-rose-500 font-semibold flex items-center gap-2.5 transition-colors"
              >
                <Trash2 className="w-4 h-4 text-rose-500" />
                <span>Eliminar chat</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

