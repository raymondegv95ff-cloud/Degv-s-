import React from "react";
import { Room } from "../../types";
import { Trash2, AlertTriangle, X } from "lucide-react";

interface DeleteChatModalProps {
  isOpen: boolean;
  room: Room | null;
  messagesCount?: number;
  onClose: () => void;
  onConfirm: () => void;
}

export const DeleteChatModal: React.FC<DeleteChatModalProps> = ({
  isOpen,
  room,
  messagesCount = 0,
  onClose,
  onConfirm,
}) => {
  if (!isOpen || !room) return null;

  return (
    <div
      id="delete-chat-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-150 relative text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition"
          title="Cerrar"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Warning Icon & Title */}
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-500 shrink-0 shadow-lg">
            <Trash2 className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-extrabold text-base text-slate-100">
              ¿Eliminar esta conversación?
            </h3>
            <p className="text-xs text-rose-400/90 font-semibold flex items-center gap-1 mt-0.5">
              <AlertTriangle className="w-3 h-3" /> Esta acción no se puede deshacer
            </p>
          </div>
        </div>

        {/* Target Room Preview Card */}
        <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800/80 flex items-center gap-3">
          <img
            src={
              room.avatarUrl ||
              "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80"
            }
            alt={room.name}
            className="w-11 h-11 rounded-full object-cover ring-2 ring-slate-800 shrink-0"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-sm text-slate-200 truncate">{room.name}</h4>
              <span className="text-[10px] text-slate-500 font-mono shrink-0">
                {messagesCount > 0 ? `${messagesCount} mensajes` : "Conversación activa"}
              </span>
            </div>
            <p className="text-xs text-slate-400 truncate mt-0.5">
              {room.isGroup ? "Grupo" : room.isChannel ? "Canal de difusión" : room.isAiChat ? "Asistente IA" : "Chat directo"}
            </p>
          </div>
        </div>

        {/* Warning text */}
        <p className="text-xs text-slate-300 leading-relaxed">
          Se eliminarán permanentemente todos los mensajes, archivos multimedia y notas de voz intercambiados en{" "}
          <strong className="text-white">{room.name}</strong> tanto de tu dispositivo como de los servidores en la nube.
        </p>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition active:scale-95"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black shadow-lg shadow-rose-900/30 flex items-center gap-2 transition active:scale-95"
          >
            <Trash2 className="w-4 h-4" />
            <span>Eliminar Chat</span>
          </button>
        </div>
      </div>
    </div>
  );
};
