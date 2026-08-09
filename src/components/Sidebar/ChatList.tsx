import React from "react";
import { Room, UserProfile } from "../../types";
import { ChatItem } from "./ChatItem";
import { Archive, MessageSquareOff, Plus, UserPlus, MessageSquare, Users, Radio, Sparkles } from "lucide-react";
import { storageService } from "../../services/storageService";

interface ChatListProps {
  rooms: Room[];
  activeChatId: string | null;
  onSelectRoom: (roomId: string) => void;
  activeCategory: string;
  onCategoryChange?: (category: string) => void;
  searchTerm: string;
  onOpenNewChat: () => void;
  customFolders?: string[];
  onToggleArchive?: (roomId: string) => void;
  onAssignFolder?: (roomId: string, folderName: string | undefined) => void;
  onDeleteChat?: (roomId: string) => void;
  allUsers?: UserProfile[];
  currentUser?: UserProfile;
  onSelectUser?: (user: UserProfile) => void;
  onOpenCreateGroup?: () => void;
  onOpenCreateChannel?: () => void;
}

export const ChatList: React.FC<ChatListProps> = ({
  rooms,
  activeChatId,
  onSelectRoom,
  activeCategory,
  onCategoryChange,
  searchTerm,
  onOpenNewChat,
  customFolders,
  onToggleArchive,
  onAssignFolder,
  onDeleteChat,
  allUsers,
  currentUser,
  onSelectUser,
  onOpenCreateGroup,
  onOpenCreateChannel,
}) => {
  // Filter rooms according to search term and category
  const filteredRooms = rooms.filter((room) => {
    // Search matching
    if (searchTerm.trim()) {
      const matchName = room.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchParticipant = room.participants.some((p) =>
        `${p.firstName} ${p.lastName} ${p.username} ${p.phone} ${p.email || ""}`
          .toLowerCase()
          .includes(searchTerm.toLowerCase())
      );
      if (!matchName && !matchParticipant) return false;
    }

    // Category matching
    if (activeCategory === "unread") return !room.isArchived && room.unreadCount > 0;
    if (activeCategory === "ai") return !room.isArchived && room.isAiChat;
    if (activeCategory === "groups") return !room.isArchived && room.isGroup;
    if (activeCategory === "channels") return !room.isArchived && room.isChannel;
    if (activeCategory === "archived") return room.isArchived;

    // Custom folder matching (e.g. folder_Trabajo)
    if (activeCategory.startsWith("folder_")) {
      const folderName = activeCategory.replace("folder_", "");
      return !room.isArchived && room.folder === folderName;
    }

    // Default 'all': don't show archived unless category is archived
    return !room.isArchived;
  });

  // Pin AI Chat always to top in 'all' view
  const sortedRooms = [...filteredRooms].sort((a, b) => {
    if (a.isAiChat) return -1;
    if (b.isAiChat) return 1;
    return 0;
  });

  const archivedCount = rooms.filter((r) => r.isArchived).length;

  // Real-time Search matching users from directory
  const query = searchTerm.trim().toLowerCase();
  const directoryUsers = allUsers && allUsers.length > 0 ? allUsers : storageService.getContacts();
  const currentUserId = currentUser?.id || storageService.getUser()?.id;

  const matchedNewUsers = query
    ? directoryUsers.filter((u) => {
        if (!u || u.id === currentUserId) return false;
        const fullName = `${u.firstName || ""} ${u.lastName || ""}`.toLowerCase();
        const username = (u.username || "").toLowerCase();
        const phone = (u.phone || "").toLowerCase();
        const email = (u.email || "").toLowerCase();

        const isMatch =
          fullName.includes(query) ||
          username.includes(query) ||
          phone.includes(query) ||
          email.includes(query);

        // Filter out users who already have a room in sortedRooms
        const hasActiveRoom = sortedRooms.some((r) =>
          r.participants.some((p) => p.id === u.id)
        );

        return isMatch && !hasActiveRoom;
      })
    : [];

  return (
    <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
      {/* Archived Banner (if not currently viewing archived category) */}
      {activeCategory !== "archived" && archivedCount > 0 && !searchTerm && (
        <button
          onClick={() => onCategoryChange && onCategoryChange("archived")}
          className="w-full p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/60 hover:bg-slate-800/60 text-slate-300 text-xs flex items-center justify-between transition"
        >
          <div className="flex items-center gap-2">
            <Archive className="w-4 h-4 text-emerald-400" />
            <span className="font-medium">Chats Archivados</span>
          </div>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-800 text-slate-300 font-semibold">
            {archivedCount}
          </span>
        </button>
      )}

      {/* Prominent Create Group Button in Groups Tab */}
      {activeCategory === "groups" && !searchTerm && (
        <button
          onClick={onOpenCreateGroup}
          className="w-full p-3 rounded-2xl bg-gradient-to-r from-emerald-950 via-slate-900 to-slate-900 border border-[#00E676]/40 hover:border-[#00E676] text-white text-xs flex items-center justify-between transition shadow-md group"
          id="create-group-btn"
        >
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#00E676] text-black font-bold group-hover:scale-105 transition shadow">
              <Users className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div className="text-left">
              <p className="font-extrabold text-xs text-slate-100 group-hover:text-[#00E676] transition">Crear Nuevo Grupo</p>
              <p className="text-[10px] text-slate-400">Reúne a múltiples miembros</p>
            </div>
          </div>
          <Plus className="w-4 h-4 text-[#00E676]" />
        </button>
      )}

      {/* Prominent Create Channel Button in Channels Tab */}
      {activeCategory === "channels" && !searchTerm && (
        <button
          onClick={onOpenCreateChannel}
          className="w-full p-3 rounded-2xl bg-gradient-to-r from-cyan-950 via-slate-900 to-slate-900 border border-cyan-500/40 hover:border-cyan-400 text-white text-xs flex items-center justify-between transition shadow-md group"
          id="create-channel-btn"
        >
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-400 text-black font-bold group-hover:scale-105 transition shadow">
              <Radio className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div className="text-left">
              <p className="font-extrabold text-xs text-slate-100 group-hover:text-cyan-400 transition">Crear Nuevo Canal</p>
              <p className="text-[10px] text-slate-400">Difunde mensajes y noticias</p>
            </div>
          </div>
          <Plus className="w-4 h-4 text-cyan-400" />
        </button>
      )}

      {/* Real-Time Search New Users Section */}
      {query && matchedNewUsers.length > 0 && (
        <div className="space-y-1.5 pb-2 mb-2 border-b border-white/5">
          <div className="flex items-center justify-between px-2 text-[11px] font-bold uppercase tracking-wider text-emerald-400">
            <span className="flex items-center gap-1.5">
              <UserPlus className="w-3.5 h-3.5 text-[#00E676]" />
              <span>Nuevos Usuarios Encontrados ({matchedNewUsers.length})</span>
            </span>
            <span className="text-[10px] text-slate-500 font-normal">Clic para iniciar chat</span>
          </div>

          <div className="space-y-1">
            {matchedNewUsers.map((user) => (
              <div
                key={user.id}
                onClick={() => onSelectUser && onSelectUser(user)}
                className="p-2.5 rounded-xl bg-slate-900/80 hover:bg-emerald-950/40 border border-emerald-500/20 hover:border-[#00E676]/50 transition cursor-pointer flex items-center justify-between group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative shrink-0">
                    <img
                      src={user.avatarUrl}
                      alt={user.firstName}
                      className="w-10 h-10 rounded-full object-cover ring-2 ring-emerald-500/30 group-hover:ring-[#00E676] transition"
                    />
                    <span
                      className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full ring-2 ring-slate-950 ${
                        user.status === "online" ? "bg-[#00E676]" : "bg-slate-500"
                      }`}
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-xs text-slate-100 group-hover:text-[#00E676] transition truncate">
                      {user.firstName} {user.lastName}
                    </p>
                    <p className="text-[11px] text-slate-400 truncate flex items-center gap-1">
                      <span>@{user.username}</span>
                      {user.phone && <span className="text-slate-500">• {user.phone}</span>}
                    </p>
                  </div>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onSelectUser) onSelectUser(user);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-[#00E676] text-slate-950 font-bold text-[11px] hover:bg-[#00E676]/90 transition shadow-sm flex items-center gap-1 shrink-0"
                >
                  <MessageSquare className="w-3 h-3" />
                  <span>Chat</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Conversaciones / Chat Cards Section Header when searching */}
      {query && sortedRooms.length > 0 && matchedNewUsers.length > 0 && (
        <div className="px-2 pt-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
          <span>Conversaciones Existentes ({sortedRooms.length})</span>
        </div>
      )}

      {/* List of Chat Cards */}
      {sortedRooms.length > 0 ? (
        sortedRooms.map((room) => (
          <ChatItem
            key={room.id}
            room={room}
            isActive={activeChatId === room.id}
            onSelectRoom={onSelectRoom}
            customFolders={customFolders}
            onToggleArchive={onToggleArchive}
            onAssignFolder={onAssignFolder}
            onDeleteChat={onDeleteChat}
          />
        ))
      ) : matchedNewUsers.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-8 text-center text-slate-400 space-y-3">
          <MessageSquareOff className="w-10 h-10 text-slate-600" />
          <p className="text-xs font-medium">
            {searchTerm
              ? `No se encontraron chats ni usuarios para "${searchTerm}"`
              : activeCategory === "groups"
              ? "No tienes ningún grupo todavía"
              : activeCategory === "channels"
              ? "No te has unido a ningún canal todavía"
              : "No hay conversaciones aún"}
          </p>

          {activeCategory === "groups" ? (
            <button
              onClick={onOpenCreateGroup}
              className="px-4 py-2 rounded-xl text-xs font-extrabold bg-[#00E676] text-slate-950 hover:bg-[#00E676]/90 transition flex items-center gap-1.5 shadow-md shadow-[#00E676]/20"
            >
              <Users className="w-4 h-4 stroke-[2.5]" />
              <span>Crear Mi Primer Grupo</span>
            </button>
          ) : activeCategory === "channels" ? (
            <button
              onClick={onOpenCreateChannel}
              className="px-4 py-2 rounded-xl text-xs font-extrabold bg-cyan-400 text-slate-950 hover:bg-cyan-300 transition flex items-center gap-1.5 shadow-md shadow-cyan-400/20"
            >
              <Radio className="w-4 h-4 stroke-[2.5]" />
              <span>Crear Mi Primer Canal</span>
            </button>
          ) : (
            <button
              onClick={onOpenNewChat}
              className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-[#00E676] text-slate-950 hover:bg-[#00E676]/90 transition flex items-center gap-1.5 shadow-md shadow-[#00E676]/20"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Buscar o Agregar Contacto</span>
            </button>
          )}
        </div>
      ) : null}
    </div>
  );
};


