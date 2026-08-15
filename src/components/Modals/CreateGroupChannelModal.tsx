import React, { useState } from "react";
import { UserProfile, Room } from "../../types";
import { Users, Radio, X, Check, Search, Image as ImageIcon, Sparkles, Shield, UserPlus } from "lucide-react";

interface CreateGroupChannelModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: "group" | "channel";
  contacts?: UserProfile[];
  allUsers?: UserProfile[];
  currentUser: UserProfile;
  onCreateRoom: (room: Room) => void;
}

export const CreateGroupChannelModal: React.FC<CreateGroupChannelModalProps> = ({
  isOpen,
  onClose,
  initialMode = "group",
  contacts,
  allUsers,
  currentUser,
  onCreateRoom,
}) => {
  const [mode, setMode] = useState<"group" | "channel">(initialMode);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [avatarSeed, setAvatarSeed] = useState(`seed_${Date.now()}`);
  const [customAvatarUrl, setCustomAvatarUrl] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [errorMsg, setErrorMsg] = useState("");

  if (!isOpen) return null;

  const isGroup = mode === "group";

  // Filter contacts excluding currentUser
  const userList = contacts || allUsers || [];
  const availableContacts = userList.filter(
    (u) => u && !u.isAi && u.id !== currentUser.id
  );

  const filteredContacts = availableContacts.filter((u) => {
    const q = searchTerm.toLowerCase();
    return (
      (u.firstName || "").toLowerCase().includes(q) ||
      (u.lastName || "").toLowerCase().includes(q) ||
      (u.username || "").toLowerCase().includes(q)
    );
  });

  const toggleSelectUser = (userId: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg(`Por favor ingresa un nombre para el ${isGroup ? "grupo" : "canal"}.`);
      return;
    }

    const selectedUsers = availableContacts.filter((u) => selectedUserIds.includes(u.id));
    const avatarUrl =
      customAvatarUrl.trim() ||
      (isGroup
        ? `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(name.trim() + avatarSeed)}`
        : `https://api.dicebear.com/7.x/shapes/svg?seed=${encodeURIComponent(name.trim() + avatarSeed)}`);

    const newRoom: Room = {
      id: `${isGroup ? "group" : "channel"}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: name.trim(),
      description:
        description.trim() ||
        (isGroup
          ? `Grupo creado por ${currentUser.firstName || currentUser.username}`
          : `Canal oficial de ${currentUser.firstName || currentUser.username}`),
      isGroup: isGroup,
      isChannel: !isGroup,
      avatarUrl: avatarUrl,
      unreadCount: 0,
      participants: isGroup ? [currentUser, ...selectedUsers] : [currentUser, ...selectedUsers],
      createdAt: new Date().toISOString(),
      lastMessage: isGroup
        ? `¡Grupo "${name.trim()}" creado exitosamente!`
        : `¡Canal "${name.trim()}" creado exitosamente!`,
      lastMessageTime: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    onCreateRoom(newRoom);
    onClose();
    // Reset state
    setName("");
    setDescription("");
    setSelectedUserIds([]);
    setErrorMsg("");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl space-y-4 text-slate-100 relative overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2.5 rounded-2xl bg-[#00E676]/10 text-[#00E676] border border-[#00E676]/20">
              {isGroup ? <Users className="w-5 h-5" /> : <Radio className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="font-extrabold text-sm text-slate-100">
                {isGroup ? "Crear Nuevo Grupo" : "Crear Nuevo Canal"}
              </h2>
              <p className="text-[10px] text-slate-400">
                {isGroup
                  ? "Chatea con múltiples amigos y miembros a la vez"
                  : "Difunde noticias y actualizaciones a tus suscriptores"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Switcher */}
        <div className="grid grid-cols-2 p-1 bg-slate-950 rounded-2xl border border-slate-800 text-xs">
          <button
            type="button"
            onClick={() => {
              setMode("group");
              setErrorMsg("");
            }}
            className={`py-2 rounded-xl font-bold transition flex items-center justify-center gap-1.5 ${
              isGroup ? "bg-[#00E676] text-black shadow-md" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Grupo</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("channel");
              setErrorMsg("");
            }}
            className={`py-2 rounded-xl font-bold transition flex items-center justify-center gap-1.5 ${
              !isGroup ? "bg-[#00E676] text-black shadow-md" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>Canal</span>
          </button>
        </div>

        {errorMsg && (
          <div className="p-2.5 rounded-xl bg-red-950/60 border border-red-500/40 text-red-300 text-xs font-semibold">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleCreate} className="space-y-3">
          {/* Name & Avatar Input */}
          <div className="flex items-center gap-3">
            <div className="relative group shrink-0">
              <img
                src={
                  customAvatarUrl.trim() ||
                  (isGroup
                    ? `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(name || avatarSeed)}`
                    : `https://api.dicebear.com/7.x/shapes/svg?seed=${encodeURIComponent(name || avatarSeed)}`)
                }
                alt="Avatar Preview"
                className="w-12 h-12 rounded-2xl bg-slate-950 object-cover ring-2 ring-[#00E676]/40"
              />
              <button
                type="button"
                onClick={() => setAvatarSeed(`seed_${Date.now()}_${Math.random()}`)}
                className="absolute -bottom-1 -right-1 p-1 bg-[#00E676] text-black rounded-full text-[9px] shadow hover:scale-110 transition"
                title="Cambiar avatar"
              >
                <Sparkles className="w-3 h-3" />
              </button>
            </div>

            <div className="flex-1 space-y-1">
              <input
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (errorMsg) setErrorMsg("");
                }}
                placeholder={isGroup ? "Nombre del Grupo..." : "Nombre del Canal..."}
                autoFocus
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-[#00E676]"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={isGroup ? "Descripción breve del grupo (opcional)" : "Descripción del canal (opcional)"}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-[#00E676]"
            />
          </div>

          {/* Add Members Section */}
          <div className="space-y-2 pt-1 border-t border-slate-800/80">
            <div className="flex items-center justify-between text-xs font-bold text-slate-300">
              <span className="flex items-center gap-1.5">
                <UserPlus className="w-3.5 h-3.5 text-[#00E676]" />
                <span>{isGroup ? "Añadir Participantes" : "Añadir Miembros/Suscriptores"}</span>
              </span>
              <span className="text-[10px] text-[#00E676]">
                {selectedUserIds.length} seleccionado{selectedUserIds.length !== 1 ? "s" : ""}
              </span>
            </div>

            {/* Search Box */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar en mis contactos..."
                className="w-full pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-[#00E676]"
              />
            </div>

            {/* Contacts Select List */}
            <div className="max-h-40 overflow-y-auto space-y-1.5 custom-scrollbar pr-1">
              {filteredContacts.length === 0 ? (
                <p className="text-[11px] text-slate-500 text-center py-3">
                  No se encontraron contactos. Puedes crear el {isGroup ? "grupo" : "canal"} e invitar más tarde.
                </p>
              ) : (
                filteredContacts.map((contact) => {
                  const isSelected = selectedUserIds.includes(contact.id);
                  return (
                    <div
                      key={contact.id}
                      onClick={() => toggleSelectUser(contact.id)}
                      className={`p-2 rounded-xl border transition cursor-pointer flex items-center justify-between ${
                        isSelected
                          ? "bg-[#00E676]/10 border-[#00E676] text-slate-100"
                          : "bg-slate-950/60 border-slate-800/80 hover:border-slate-700 text-slate-300"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <img
                          src={contact.avatarUrl}
                          alt={contact.firstName}
                          className="w-8 h-8 rounded-full object-cover shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="font-bold text-xs truncate">
                            {contact.firstName} {contact.lastName || ""}
                          </p>
                          <p className="text-[10px] text-slate-400 truncate">@{contact.username}</p>
                        </div>
                      </div>

                      <div
                        className={`w-5 h-5 rounded-lg border flex items-center justify-center transition shrink-0 ${
                          isSelected
                            ? "bg-[#00E676] border-[#00E676] text-black font-bold"
                            : "border-slate-700 bg-slate-900"
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs hover:bg-slate-700 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-[#00E676] text-black font-extrabold text-xs hover:bg-[#00E676]/90 transition shadow-lg shadow-[#00E676]/20 flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isGroup ? "Crear Grupo" : "Crear Canal"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
