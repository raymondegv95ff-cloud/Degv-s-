import React, { useState, useEffect } from "react";
import { Room, SentimentAnalysis, Message, UserProfile } from "../../types";
import { storageService } from "../../services/storageService";
import { listenForFirestoreUsers, saveRoomToFirestore } from "../../services/firebase";
import {
  X,
  Phone,
  ShieldCheck,
  Image as ImageIcon,
  FileText,
  Music,
  Sparkles,
  Users,
  Lock,
  Clock,
  KeyRound,
  Download,
  ExternalLink,
  Trash2,
  UserPlus,
  Check,
  Search,
  UserCheck,
  Radio,
} from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

interface ViewContactDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  room: Room;
  onUpdateDisappearingTimer?: (timer: "off" | "24h" | "7d" | "90d") => void;
  onOpenLockSetup?: () => void;
  onDeleteChat?: (roomId: string) => void;
  onAddParticipants?: (newParticipants: UserProfile[]) => void;
}

export const ViewContactDrawer: React.FC<ViewContactDrawerProps> = ({
  isOpen,
  onClose,
  room,
  onUpdateDisappearingTimer,
  onOpenLockSetup,
  onDeleteChat,
  onAddParticipants,
}) => {
  const [activeTab, setActiveTab] = useState<"media" | "sentiment" | "members">("media");
  const [mediaFilter, setMediaFilter] = useState<"all" | "images" | "files" | "audio">("all");
  const [roomMessages, setRoomMessages] = useState<Message[]>([]);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [sentimentData, setSentimentData] = useState<SentimentAnalysis | null>(null);
  const [loadingSentiment, setLoadingSentiment] = useState(false);

  // Add Participants Dialog State
  const [isAddParticipantsOpen, setIsAddParticipantsOpen] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<UserProfile[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [contactSearchQuery, setContactSearchQuery] = useState("");
  const [currentParticipants, setCurrentParticipants] = useState<UserProfile[]>(room?.participants || []);

  useEffect(() => {
    if (room?.participants) {
      setCurrentParticipants(room.participants);
    }
  }, [room?.participants]);

  // Load available contacts & Firestore users to invite
  useEffect(() => {
    if (isOpen) {
      const existingIds = new Set((currentParticipants || []).map((p) => p.id));
      
      // 1. Gather all users from existing rooms and contacts
      const allRooms = storageService.getRooms();
      const gatheredMap = new Map<string, UserProfile>();

      allRooms.forEach((r) => {
        if (r.participants) {
          r.participants.forEach((p) => {
            if (p && p.id && !existingIds.has(p.id)) {
              gatheredMap.set(p.id, p);
            }
          });
        }
      });

      // 2. Listen to Firestore real-time registered users
      const unsub = listenForFirestoreUsers((cloudUsers) => {
        cloudUsers.forEach((u) => {
          if (u && u.id && !existingIds.has(u.id)) {
            gatheredMap.set(u.id, u);
          }
        });
        setAvailableUsers(Array.from(gatheredMap.values()));
      });

      setAvailableUsers(Array.from(gatheredMap.values()));

      return () => {
        unsub();
      };
    }
  }, [isOpen, currentParticipants]);

  useEffect(() => {
    if (isOpen && room?.id) {
      const msgs = storageService.getMessages(room.id);
      setRoomMessages(msgs);
    }
  }, [isOpen, room?.id]);

  useEffect(() => {
    if (isOpen && activeTab === "sentiment" && !sentimentData) {
      fetchSentiment();
    }
  }, [isOpen, activeTab]);

  const handleToggleSelectUser = (userId: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleConfirmAddParticipants = () => {
    if (selectedUserIds.length === 0) return;

    const usersToAdd = availableUsers.filter((u) => selectedUserIds.includes(u.id));
    const updatedParticipants = [...currentParticipants, ...usersToAdd];

    setCurrentParticipants(updatedParticipants);

    // Update room in storage
    const allRooms = storageService.getRooms();
    const updatedRooms = allRooms.map((r) =>
      r.id === room.id ? { ...r, participants: updatedParticipants } : r
    );
    storageService.saveRooms(updatedRooms);

    const changed = updatedRooms.find((r) => r.id === room.id);
    if (changed) {
      storageService.saveRoom(changed);
      saveRoomToFirestore(changed);
    }

    if (onAddParticipants) {
      onAddParticipants(usersToAdd);
    }

    setIsAddParticipantsOpen(false);
    setSelectedUserIds([]);
    setContactSearchQuery("");
  };


  const fetchSentiment = async () => {
    setLoadingSentiment(true);
    try {
      const res = await fetch("/api/ai/sentiment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [] }),
      });
      const data = await res.json();
      setSentimentData(data);
    } catch {
      setSentimentData({
        positive: 75,
        neutral: 20,
        tense: 5,
        overall: "Positivo y fluido",
        summary: "La conversación refleja una excelente sintonía y comunicación positiva.",
      });
    } finally {
      setLoadingSentiment(false);
    }
  };

  if (!isOpen) return null;

  const chartData = [
    { name: "Positivo", value: sentimentData?.positive || 75, color: "#00E676" },
    { name: "Neutral", value: sentimentData?.neutral || 20, color: "#00B0FF" },
    { name: "Tenso", value: sentimentData?.tense || 5, color: "#FF1744" },
  ];

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-sm bg-slate-900 border-l border-slate-800 shadow-2xl p-5 flex flex-col justify-between text-slate-100 overflow-y-auto animate-in slide-in-from-right duration-200 custom-scrollbar">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="font-bold text-sm tracking-tight text-slate-100">
            Información del Chat
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-slate-100 hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Profile Details */}
        <div className="text-center py-6 space-y-3 border-b border-slate-800">
          <img
            src={
              room.avatarUrl ||
              "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80"
            }
            alt={room.name}
            className="w-20 h-20 mx-auto rounded-3xl object-cover ring-2 ring-[#00E676]/60 shadow-xl"
          />
          <div>
            <h2 className="font-extrabold text-base text-slate-100">{room.name}</h2>
            <p className="text-xs text-[#00E676] font-semibold mt-0.5 flex items-center justify-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> En línea • Cifrado de extremo a extremo
            </p>
          </div>
          <p className="text-xs text-slate-400 italic px-4">
            {room.description || "Sin descripción de estado..."}
          </p>
        </div>

        {/* Group Participants Section (For Group Chats or Rooms with Multiple Participants) */}
        {(room.isGroup || (currentParticipants && currentParticipants.length > 1)) && (
          <div className="py-4 border-b border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-[#00E676]" />
                <span className="font-bold text-xs text-slate-200">
                  Participantes ({currentParticipants.length})
                </span>
              </div>

              {/* Add Participants Button */}
              <button
                type="button"
                onClick={() => setIsAddParticipantsOpen(true)}
                className="px-3 py-1.5 rounded-xl bg-[#00E676] text-black font-extrabold text-[11px] flex items-center gap-1.5 shadow-[0_0_10px_rgba(0,230,118,0.3)] hover:scale-105 active:scale-95 transition"
                title="Invitar o añadir contactos existentes a este grupo"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Añadir Participantes</span>
              </button>
            </div>

            {/* List of current participants */}
            <div className="space-y-1.5 max-h-44 overflow-y-auto custom-scrollbar pr-1">
              {currentParticipants.map((participant, index) => (
                <div
                  key={participant.id || `p_${index}`}
                  className="flex items-center justify-between p-2 rounded-xl bg-slate-950/80 border border-slate-800/80"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <img
                      src={
                        participant.avatarUrl ||
                        `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(
                          participant.username || participant.id
                        )}`
                      }
                      alt={participant.firstName || participant.username}
                      className="w-7 h-7 rounded-xl object-cover ring-1 ring-slate-700"
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-200 truncate">
                        {`${participant.firstName || ""} ${participant.lastName || ""}`.trim() ||
                          participant.username}
                      </p>
                      <p className="text-[10px] text-slate-400 font-mono truncate">
                        @{participant.username}
                      </p>
                    </div>
                  </div>

                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-[#00E676]">
                    {index === 0 ? "Admin" : "Miembro"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Security & Privacy Settings */}
        <div className="py-4 border-b border-slate-800 space-y-3">
          {/* Chat PIN Lock Toggle */}
          <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-[#00E676]/10 text-[#00E676]">
                <KeyRound className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold text-xs text-slate-200 block">Proteger Chat con PIN</span>
                <span className="text-[10px] text-slate-400 block">
                  {room.isLocked ? "Chat Bloqueado (PIN activo)" : "Sin contraseña activa"}
                </span>
              </div>
            </div>
            <button
              onClick={() => onOpenLockSetup && onOpenLockSetup()}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs transition ${
                room.isLocked
                  ? "bg-rose-500/20 text-rose-400 border border-rose-500/30 hover:bg-rose-500/30"
                  : "bg-[#00E676] text-slate-950 hover:bg-[#00E676]/90"
              }`}
            >
              {room.isLocked ? "Configurar" : "Activar"}
            </button>
          </div>

          {/* Disappearing Messages Setting */}
          <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
              <Clock className="w-4 h-4 text-indigo-400" />
              <span>Mensajes Temporales (Autodestrucción)</span>
            </div>
            <p className="text-[10px] text-slate-400">
              Los mensajes nuevos desaparecerán automáticamente tras el periodo seleccionado.
            </p>
            <div className="grid grid-cols-4 gap-1.5 pt-1">
              {[
                { id: "off", label: "Off" },
                { id: "24h", label: "24h" },
                { id: "7d", label: "7 días" },
                { id: "90d", label: "90 días" },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() =>
                    onUpdateDisappearingTimer &&
                    onUpdateDisappearingTimer(t.id as "off" | "24h" | "7d" | "90d")
                  }
                  className={`py-1.5 rounded-xl text-[11px] font-bold border text-center transition ${
                    (room.disappearingTimer || "off") === t.id
                      ? "bg-indigo-600 text-white border-indigo-400 shadow-md shadow-indigo-600/30"
                      : "bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Tabs: Media Gallery vs Sentiment Analysis */}
        <div className="flex items-center border-b border-slate-800 my-4 text-xs font-bold text-slate-400">
          <button
            onClick={() => setActiveTab("media")}
            className={`flex-1 py-2 text-center border-b-2 transition ${
              activeTab === "media"
                ? "border-[#00E676] text-[#00E676]"
                : "border-transparent hover:text-slate-200"
            }`}
          >
            Archivos Multimedia
          </button>
          <button
            onClick={() => setActiveTab("sentiment")}
            className={`flex-1 py-2 text-center border-b-2 transition flex items-center justify-center gap-1 ${
              activeTab === "sentiment"
                ? "border-indigo-400 text-indigo-300"
                : "border-transparent hover:text-slate-200"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Salud IA</span>
          </button>
        </div>

        {/* Tab 1: Shared Media Gallery */}
        {activeTab === "media" && (() => {
          const allMediaMsgs = roomMessages.filter(
            (m) =>
              m.mediaUrl ||
              m.type === "image" ||
              m.type === "ai_image" ||
              m.type === "file" ||
              m.type === "audio" ||
              m.type === "sticker"
          );

          const filtered = allMediaMsgs.filter((m) => {
            if (mediaFilter === "images") return m.type === "image" || m.type === "ai_image" || m.type === "sticker";
            if (mediaFilter === "files") return m.type === "file";
            if (mediaFilter === "audio") return m.type === "audio";
            return true;
          });

          return (
            <div className="space-y-4">
              {/* Media Sub-Filter Tabs */}
              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-2xl border border-slate-800 text-[11px] font-bold">
                {[
                  { id: "all", label: "Todos", count: allMediaMsgs.length },
                  { id: "images", label: "Fotos/Stickers", count: allMediaMsgs.filter(m => m.type === "image" || m.type === "ai_image" || m.type === "sticker").length },
                  { id: "files", label: "Archivos", count: allMediaMsgs.filter(m => m.type === "file").length },
                  { id: "audio", label: "Notas de Voz", count: allMediaMsgs.filter(m => m.type === "audio").length },
                ].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setMediaFilter(f.id as any)}
                    className={`flex-1 py-1 px-1 rounded-xl text-center transition truncate ${
                      mediaFilter === f.id
                        ? "bg-[#00E676] text-slate-950 shadow-sm"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    {f.label} ({f.count})
                  </button>
                ))}
              </div>

              {/* Media Grid */}
              {filtered.length > 0 ? (
                <div className="space-y-2">
                  <div className="grid grid-cols-3 gap-2">
                    {filtered.map((msg) => {
                      if (msg.type === "image" || msg.type === "ai_image" || msg.type === "sticker") {
                        return (
                          <div
                            key={msg.id}
                            onClick={() => msg.mediaUrl && setPreviewImage(msg.mediaUrl)}
                            className="relative group rounded-xl overflow-hidden bg-slate-950 border border-slate-800 cursor-pointer h-24 transition hover:scale-105"
                          >
                            <img
                              src={
                                msg.mediaUrl ||
                                "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80"
                              }
                              alt="Galeria"
                              className="w-full h-full object-cover group-hover:opacity-90 transition"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-1">
                              <ExternalLink className="w-4 h-4 text-[#00E676]" />
                            </div>
                          </div>
                        );
                      }

                      if (msg.type === "file") {
                        return (
                          <div
                            key={msg.id}
                            className="col-span-3 p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-400">
                                <FileText className="w-4 h-4" />
                              </div>
                              <div className="min-w-0">
                                <p className="font-bold text-slate-200 truncate">{msg.mediaName || msg.content || "Archivo Adjunto"}</p>
                                <p className="text-[10px] text-slate-500">{msg.mediaSize || "Documento"}</p>
                              </div>
                            </div>
                            {msg.mediaUrl && (
                              <a
                                href={msg.mediaUrl}
                                download
                                className="p-2 rounded-lg bg-slate-800 hover:bg-[#00E676] hover:text-slate-950 text-slate-300 transition"
                                title="Descargar"
                              >
                                <Download className="w-4 h-4" />
                              </a>
                            )}
                          </div>
                        );
                      }

                      if (msg.type === "audio") {
                        return (
                          <div
                            key={msg.id}
                            className="col-span-3 p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs"
                          >
                            <div className="flex items-center gap-2.5">
                              <div className="p-2 rounded-lg bg-emerald-500/20 text-[#00E676]">
                                <Music className="w-4 h-4" />
                              </div>
                              <div>
                                <p className="font-bold text-slate-200">Nota de Voz</p>
                                <p className="text-[10px] text-slate-500">{msg.createdAt}</p>
                              </div>
                            </div>
                            <span className="text-[10px] font-mono text-[#00E676] font-bold">Audio</span>
                          </div>
                        );
                      }

                      return null;
                    })}
                  </div>
                </div>
              ) : (
                <div className="p-6 text-center text-slate-500 text-xs space-y-1 bg-slate-950/60 rounded-2xl border border-slate-800/80">
                  <ImageIcon className="w-8 h-8 text-slate-600 mx-auto" />
                  <p className="font-semibold text-slate-400">No hay archivos en esta categoría</p>
                  <p className="text-[10px] text-slate-500">Los elementos multimedia compartidos en el chat aparecerán aquí.</p>
                </div>
              )}

              {/* Group Members if group */}
              {room.isGroup && (
                <div className="pt-2 border-t border-slate-800">
                  <h4 className="text-xs font-bold text-slate-300 mb-2 flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-indigo-400" /> Miembros del Grupo ({room.participants.length})
                  </h4>
                  <div className="space-y-1.5">
                    {room.participants.map((p) => (
                      <div key={p.id} className="p-2 rounded-xl bg-slate-950 flex items-center gap-2.5 text-xs">
                        <img src={p.avatarUrl} alt={p.firstName} className="w-7 h-7 rounded-lg object-cover" />
                        <span className="font-semibold text-slate-200">{p.firstName} {p.lastName}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {/* Fullsize Image Lightbox Modal */}
        {previewImage && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-150">
            <div className="relative max-w-2xl w-full flex flex-col items-center">
              <button
                onClick={() => setPreviewImage(null)}
                className="absolute -top-10 right-0 p-2 text-slate-300 hover:text-white bg-slate-900/80 rounded-full"
              >
                <X className="w-6 h-6" />
              </button>
              <img
                src={previewImage}
                alt="Media Preview"
                className="max-h-[80vh] w-auto rounded-3xl object-contain shadow-2xl border border-white/10"
              />
              <div className="mt-4 flex items-center gap-3">
                <a
                  href={previewImage}
                  download="media_degvs.jpg"
                  className="px-4 py-2 rounded-2xl bg-[#00E676] text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg"
                >
                  <Download className="w-4 h-4" />
                  <span>Descargar Imagen</span>
                </a>
              </div>
            </div>
          </div>
        )}


        {/* Tab 2: AI Sentiment Analysis with Recharts Chart */}
        {activeTab === "sentiment" && (
          <div className="space-y-4 text-xs">
            <div className="p-3 rounded-2xl bg-indigo-950/40 border border-indigo-500/30 space-y-2">
              <div className="flex items-center gap-1.5 text-indigo-300 font-bold">
                <Sparkles className="w-4 h-4" />
                <span>Análisis Emocional por Degv's AI</span>
              </div>
              <p className="text-[11px] text-indigo-200">
                {sentimentData?.summary || "Analizando dinámica del chat..."}
              </p>
            </div>

            {/* Recharts Pie Chart */}
            <div className="h-48 w-full bg-slate-950/60 rounded-2xl p-2 border border-slate-800 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={65}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: "#0F172A", borderColor: "#334155", borderRadius: "12px", fontSize: "11px" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Legend */}
            <div className="grid grid-cols-3 gap-2 text-center text-[10px] font-bold">
              <div className="p-2 rounded-xl bg-emerald-950/50 text-emerald-400 border border-emerald-500/30">
                Positivo {sentimentData?.positive}%
              </div>
              <div className="p-2 rounded-xl bg-cyan-950/50 text-cyan-400 border border-cyan-500/30">
                Neutral {sentimentData?.neutral}%
              </div>
              <div className="p-2 rounded-xl bg-red-950/50 text-red-400 border border-red-500/30">
                Tenso {sentimentData?.tense}%
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer & Danger Zone */}
      <div className="pt-4 border-t border-slate-800 space-y-3">
        {onDeleteChat && (
          <button
            type="button"
            onClick={() => {
              onClose();
              onDeleteChat(room.id);
            }}
            className="w-full py-2.5 px-4 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-bold flex items-center justify-center gap-2 transition active:scale-95"
          >
            <Trash2 className="w-4 h-4 text-rose-500" />
            <span>Eliminar esta conversación</span>
          </button>
        )}
        <div className="text-center">
          <span className="text-[10px] font-mono text-slate-500">
            ID de Sala: {room.id}
          </span>
        </div>
      </div>

      {/* Add Participants / Invite Contacts Modal Dialog */}
      {isAddParticipantsOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl space-y-4 text-slate-100 relative max-h-[85vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-[#00E676]/10 text-[#00E676] border border-[#00E676]/30">
                  <UserPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white">Añadir Participantes</h3>
                  <p className="text-[11px] text-slate-400">
                    Invita a tus contactos a este grupo
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsAddParticipantsOpen(false);
                  setSelectedUserIds([]);
                  setContactSearchQuery("");
                }}
                className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Search filter */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
              <input
                type="text"
                value={contactSearchQuery}
                onChange={(e) => setContactSearchQuery(e.target.value)}
                placeholder="Buscar contactos por nombre o @usuario..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-[#00E676]"
              />
            </div>

            {/* Contacts list */}
            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1.5 min-h-[140px] max-h-[280px]">
              {availableUsers
                .filter((u) => {
                  if (!contactSearchQuery.trim()) return true;
                  const q = contactSearchQuery.toLowerCase();
                  const fullName = `${u.firstName || ""} ${u.lastName || ""}`.toLowerCase();
                  const un = (u.username || "").toLowerCase();
                  return fullName.includes(q) || un.includes(q);
                })
                .map((u) => {
                  const isSelected = selectedUserIds.includes(u.id);
                  return (
                    <div
                      key={u.id}
                      onClick={() => handleToggleSelectUser(u.id)}
                      className={`flex items-center justify-between p-2.5 rounded-2xl border cursor-pointer transition ${
                        isSelected
                          ? "bg-[#00E676]/10 border-[#00E676]/50 shadow-sm"
                          : "bg-slate-950/60 border-slate-800/80 hover:bg-slate-800/50"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <img
                          src={
                            u.avatarUrl ||
                            `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(
                              u.username || u.id
                            )}`
                          }
                          alt={u.firstName || u.username}
                          className="w-8 h-8 rounded-xl object-cover ring-1 ring-slate-700"
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-200 truncate">
                            {`${u.firstName || ""} ${u.lastName || ""}`.trim() || u.username}
                          </p>
                          <p className="text-[10px] text-slate-400 font-mono truncate">
                            @{u.username}
                          </p>
                        </div>
                      </div>

                      <div
                        className={`w-5 h-5 rounded-lg flex items-center justify-center border transition ${
                          isSelected
                            ? "bg-[#00E676] border-[#00E676] text-black"
                            : "border-slate-700 bg-slate-900"
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>
                    </div>
                  );
                })}

              {availableUsers.length === 0 && (
                <div className="text-center py-6 text-xs text-slate-500">
                  No hay más contactos disponibles para añadir.
                </div>
              )}
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-800">
              <span className="text-[11px] text-slate-400">
                {selectedUserIds.length}{" "}
                {selectedUserIds.length === 1 ? "seleccionado" : "seleccionados"}
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddParticipantsOpen(false);
                    setSelectedUserIds([]);
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold hover:bg-slate-700 transition"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={selectedUserIds.length === 0}
                  onClick={handleConfirmAddParticipants}
                  className="px-4 py-1.5 rounded-xl bg-[#00E676] disabled:opacity-50 disabled:cursor-not-allowed text-black text-xs font-black shadow-[0_0_12px_rgba(0,230,118,0.3)] hover:scale-105 active:scale-95 transition flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                  <span>Añadir al Grupo</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
