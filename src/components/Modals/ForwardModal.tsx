import React, { useState } from "react";
import { Room, Message } from "../../types";
import { Share2, X, Send, Search, Check } from "lucide-react";

interface ForwardModalProps {
  isOpen: boolean;
  onClose: () => void;
  messageToForward: Message | null;
  rooms: Room[];
  onForwardToRoom: (targetRoomId: string, message: Message) => void;
}

export const ForwardModal: React.FC<ForwardModalProps> = ({
  isOpen,
  onClose,
  messageToForward,
  rooms,
  onForwardToRoom,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRoomIds, setSelectedRoomIds] = useState<string[]>([]);

  if (!isOpen || !messageToForward) return null;

  const filtered = rooms.filter((r) =>
    r.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleSelect = (roomId: string) => {
    setSelectedRoomIds((prev) =>
      prev.includes(roomId) ? prev.filter((id) => id !== roomId) : [...prev, roomId]
    );
  };

  const handleForward = () => {
    selectedRoomIds.forEach((id) => {
      onForwardToRoom(id, messageToForward);
    });
    setSelectedRoomIds([]);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-[#0a0a0a] border border-white/10 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/5">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-[#00E676]/20 text-[#00E676]">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-100">Reenviar Mensaje</h3>
              <p className="text-[11px] text-slate-400 line-clamp-1">
                "{messageToForward.content || "Archivo adjunto"}"
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

        {/* Search Bar */}
        <div className="p-3 border-b border-white/5">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar chat o contacto..."
              className="w-full pl-9 pr-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-[#00E676]"
            />
          </div>
        </div>

        {/* Room list */}
        <div className="p-3 overflow-y-auto space-y-1.5 flex-1 custom-scrollbar">
          {filtered.length > 0 ? (
            filtered.map((r) => {
              const isSelected = selectedRoomIds.includes(r.id);
              return (
                <div
                  key={r.id}
                  onClick={() => toggleSelect(r.id)}
                  className={`p-3 rounded-2xl border transition cursor-pointer flex items-center justify-between ${
                    isSelected
                      ? "bg-[#00E676]/15 border-[#00E676]/50 text-slate-100"
                      : "bg-white/5 border-white/5 hover:bg-white/10 text-slate-300"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={
                        r.avatarUrl ||
                        "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80"
                      }
                      alt={r.name}
                      className="w-9 h-9 rounded-full object-cover shrink-0 ring-1 ring-white/10"
                    />
                    <div className="min-w-0">
                      <p className="font-bold text-xs truncate">{r.name}</p>
                      <p className="text-[10px] text-slate-400 truncate">
                        {r.isGroup ? "Grupo" : r.isChannel ? "Canal" : "Chat privado"}
                      </p>
                    </div>
                  </div>

                  <div
                    className={`w-5 h-5 rounded-lg border flex items-center justify-center transition ${
                      isSelected
                        ? "bg-[#00E676] border-[#00E676] text-black"
                        : "border-white/20 bg-black/20"
                    }`}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-8 text-slate-500 text-xs">
              No se encontraron chats que coincidan.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-white/10 bg-white/5 flex items-center justify-between">
          <span className="text-xs text-slate-400">
            {selectedRoomIds.length} {selectedRoomIds.length === 1 ? "chat seleccionado" : "chats seleccionados"}
          </span>
          <button
            onClick={handleForward}
            disabled={selectedRoomIds.length === 0}
            className="px-4 py-2 rounded-xl bg-[#00E676] text-black font-bold text-xs hover:scale-105 active:scale-95 disabled:opacity-40 transition flex items-center gap-1.5 shadow-md shadow-[#00E676]/20"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Reenviar</span>
          </button>
        </div>
      </div>
    </div>
  );
};
