import React from "react";
import { Message } from "../../types";
import { Star, X, Trash2, ArrowRight } from "lucide-react";

interface StarredMessagesModalProps {
  isOpen: boolean;
  onClose: () => void;
  messages: Message[];
  onUnstar: (messageId: string) => void;
}

export const StarredMessagesModal: React.FC<StarredMessagesModalProps> = ({
  isOpen,
  onClose,
  messages,
  onUnstar,
}) => {
  if (!isOpen) return null;

  const starred = messages.filter((m) => m.isStarred);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-[#0a0a0a] border border-white/10 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/5">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
              <Star className="w-5 h-5 fill-current" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-100">Mensajes Destacados</h3>
              <p className="text-[11px] text-slate-400">
                {starred.length} {starred.length === 1 ? "mensaje destacado" : "mensajes destacados"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/10 text-slate-400 hover:text-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* List */}
        <div className="p-4 overflow-y-auto space-y-3 flex-1 custom-scrollbar">
          {starred.length > 0 ? (
            starred.map((msg) => (
              <div
                key={msg.id}
                className="p-3 rounded-2xl bg-white/5 border border-white/10 flex items-start justify-between gap-3 group hover:border-[#00E676]/30 transition"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-xs text-[#00E676]">{msg.senderName}</span>
                    <span className="text-[10px] text-slate-500">{msg.createdAt}</span>
                  </div>
                  <p className="text-xs text-slate-200 break-words leading-relaxed">
                    {msg.content || (msg.type === "image" ? "📷 Imagen" : msg.type === "audio" ? "🎙️ Nota de voz" : "Archivo")}
                  </p>
                </div>

                <button
                  onClick={() => onUnstar(msg.id)}
                  className="p-1.5 rounded-xl text-slate-500 hover:text-amber-400 hover:bg-amber-400/10 transition shrink-0"
                  title="Quitar de destacados"
                >
                  <Star className="w-4 h-4 fill-current text-amber-400" />
                </button>
              </div>
            ))
          ) : (
            <div className="text-center py-12 text-slate-500 space-y-2">
              <Star className="w-10 h-10 mx-auto text-slate-600 opacity-40" />
              <p className="text-xs font-medium">No tienes mensajes destacados en esta conversación.</p>
              <p className="text-[11px] text-slate-600">Pasa el cursor o mantén presionado un mensaje para destacarlo con ⭐.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
