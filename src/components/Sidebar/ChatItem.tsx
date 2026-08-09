import React, { useState, useRef, useEffect } from "react";
import { Room } from "../../types";
import { Bot, Users, Radio, Pin, Archive, Folder, MoreVertical, FolderCheck, Trash2 } from "lucide-react";

interface ChatItemProps {
  room: Room;
  isActive: boolean;
  onSelectRoom: (roomId: string) => void;
  customFolders?: string[];
  onToggleArchive?: (roomId: string) => void;
  onAssignFolder?: (roomId: string, folderName: string | undefined) => void;
  onDeleteChat?: (roomId: string) => void;
}

export const ChatItem: React.FC<ChatItemProps> = ({
  room,
  isActive,
  onSelectRoom,
  customFolders = ["Trabajo", "Personal", "Familia"],
  onToggleArchive,
  onAssignFolder,
  onDeleteChat,
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [showFoldersMenu, setShowFoldersMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const isAi = room.isAiChat;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
        setShowFoldersMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!isAi) {
      setShowMenu(true);
    }
  };

  if (isAi) {
    return (
      <div className="px-1 py-1">
        <div
          onClick={() => onSelectRoom(room.id)}
          id={`chat-item-${room.id}`}
          className={`bg-[#00E676]/10 border border-[#00E676]/20 rounded-2xl p-3 flex items-center gap-3 cursor-pointer transition-all ring-1 ring-[#00E676]/30 ${
            isActive ? "bg-[#00E676]/20 ring-[#00E676]/50 shadow-[0_0_15px_rgba(0,230,118,0.2)]" : "hover:bg-[#00E676]/15"
          }`}
        >
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#00E676] to-[#00B248] flex items-center justify-center text-black font-black shadow-lg shrink-0">
            <Bot className="w-6 h-6 text-black" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-center mb-0.5">
              <h3 className="text-sm font-semibold text-[#00E676] truncate">{room.name}</h3>
              <span className="text-[10px] bg-[#00E676] text-black px-1.5 py-0.5 rounded font-bold uppercase tracking-wider shrink-0">
                Fijado
              </span>
            </div>
            <p className="text-xs text-slate-300 truncate">
              {room.draftText ? `Borrador: ${room.draftText}` : room.lastMessage || "¿En qué puedo ayudarte hoy?"}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={() => onSelectRoom(room.id)}
      onContextMenu={handleContextMenu}
      id={`chat-item-${room.id}`}
      className={`relative flex items-center gap-3 p-3 rounded-2xl cursor-pointer transition-colors group ${
        isActive
          ? "bg-white/10 border border-white/10"
          : "hover:bg-white/5 border border-transparent"
      }`}
    >
      {/* Avatar Container */}
      <div className="relative shrink-0">
        <img
          src={room.avatarUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80"}
          alt={room.name}
          className="w-12 h-12 rounded-full object-cover transition-all"
        />

        {room.isGroup ? (
          <span className="absolute -bottom-1 -right-1 p-0.5 bg-[#00E676] text-black rounded-full border border-[#0a0a0a]">
            <Users className="w-2.5 h-2.5" />
          </span>
        ) : room.isChannel ? (
          <span className="absolute -bottom-1 -right-1 p-0.5 bg-cyan-400 text-black rounded-full border border-[#0a0a0a]">
            <Radio className="w-2.5 h-2.5" />
          </span>
        ) : (
          <span className="absolute bottom-0 right-0 w-3 h-3 bg-[#00E676] border-2 border-[#0a0a0a] rounded-full" />
        )}
      </div>

      {/* Details Container */}
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-center mb-0.5">
          <div className="flex items-center gap-1.5 min-w-0">
            <h3 className={`text-sm font-medium truncate ${isActive ? "text-[#00E676]" : "text-slate-100"}`}>
              {room.name}
            </h3>
            {room.folder && (
              <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-800 text-[#00E676] border border-[#00E676]/30 font-bold shrink-0">
                {room.folder}
              </span>
            )}
          </div>
          <span className="text-[10px] text-slate-500 shrink-0">{room.lastMessageTime}</span>
        </div>

        <div className="flex justify-between items-center">
          <p className="text-xs text-slate-400 truncate pr-2">
            {room.draftText ? (
              <span className="text-amber-400 font-medium">Borrador: {room.draftText}</span>
            ) : (
              room.lastMessage || "Sin mensajes..."
            )}
          </p>

          <div className="flex items-center gap-1.5 shrink-0">
            {room.unreadCount > 0 && (
              <div className="w-4 h-4 bg-[#00E676] rounded-full text-[10px] flex items-center justify-center text-black font-bold">
                {room.unreadCount}
              </div>
            )}

            {/* Menu Trigger Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(!showMenu);
              }}
              className="opacity-0 group-hover:opacity-100 p-1 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition"
            >
              <MoreVertical className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Context Dropdown Menu */}
      {showMenu && (
        <div
          ref={menuRef}
          className="absolute right-3 top-10 z-30 w-48 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-1.5 text-xs text-slate-200 animate-in fade-in duration-100 space-y-1"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Archive / Unarchive */}
          <button
            onClick={() => {
              if (onToggleArchive) onToggleArchive(room.id);
              setShowMenu(false);
            }}
            className="w-full flex items-center gap-2 px-2.5 py-2 hover:bg-slate-800 rounded-xl transition text-left text-slate-200"
          >
            <Archive className="w-4 h-4 text-[#00E676]" />
            <span>{room.isArchived ? "Desarchivar Chat" : "Archivar Chat"}</span>
          </button>

          {/* Move to folder */}
          <div className="relative">
            <button
              onClick={() => setShowFoldersMenu(!showFoldersMenu)}
              className="w-full flex items-center justify-between px-2.5 py-2 hover:bg-slate-800 rounded-xl transition text-left text-slate-200"
            >
              <div className="flex items-center gap-2">
                <Folder className="w-4 h-4 text-cyan-400" />
                <span>Mover a carpeta</span>
              </div>
              <span className="text-[10px] text-slate-500">›</span>
            </button>

            {showFoldersMenu && (
              <div className="mt-1 p-1 bg-slate-950 border border-slate-800 rounded-xl space-y-0.5">
                <button
                  onClick={() => {
                    if (onAssignFolder) onAssignFolder(room.id, undefined);
                    setShowMenu(false);
                    setShowFoldersMenu(false);
                  }}
                  className={`w-full text-left px-2 py-1.5 rounded-lg text-[11px] hover:bg-slate-800 transition ${
                    !room.folder ? "text-[#00E676] font-bold" : "text-slate-400"
                  }`}
                >
                  Sin carpeta
                </button>
                {customFolders.map((f) => (
                  <button
                    key={f}
                    onClick={() => {
                      if (onAssignFolder) onAssignFolder(room.id, f);
                      setShowMenu(false);
                      setShowFoldersMenu(false);
                    }}
                    className={`w-full text-left px-2 py-1.5 rounded-lg text-[11px] hover:bg-slate-800 transition flex items-center justify-between ${
                      room.folder === f ? "text-[#00E676] font-bold" : "text-slate-300"
                    }`}
                  >
                    <span>{f}</span>
                    {room.folder === f && <FolderCheck className="w-3 h-3 text-[#00E676]" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

