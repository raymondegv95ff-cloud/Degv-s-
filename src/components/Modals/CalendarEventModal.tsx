import React, { useState } from "react";
import {
  X,
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  FileText,
  ExternalLink,
  Download,
  Check,
  Sparkles,
  Share2,
} from "lucide-react";
import { SmartReplyService, DetectedEntity } from "../../services/smartReplyService";

interface CalendarEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  entity: DetectedEntity | null;
  chatName?: string;
  onConfirmReply?: (messageText: string) => void;
}

export const CalendarEventModal: React.FC<CalendarEventModalProps> = ({
  isOpen,
  onClose,
  entity,
  chatName = "Chat",
  onConfirmReply,
}) => {
  const [title, setTitle] = useState(entity?.metadata?.eventTitle || `Reunión con ${chatName}`);
  const [dateStr, setDateStr] = useState<string>(() => {
    const d = entity?.metadata?.eventDate ? new Date(entity.metadata.eventDate) : new Date();
    return d.toISOString().split("T")[0];
  });
  const [timeStr, setTimeStr] = useState<string>(() => {
    const d = entity?.metadata?.eventDate ? new Date(entity.metadata.eventDate) : new Date();
    const h = d.getHours().toString().padStart(2, "0");
    const m = d.getMinutes().toString().padStart(2, "0");
    return `${h}:${m}`;
  });
  const [durationMinutes, setDurationMinutes] = useState<number>(60);
  const [location, setLocation] = useState<string>("");
  const [description, setDescription] = useState<string>(entity?.rawText ? `Mensaje de chat: "${entity.rawText}"` : "");
  const [copied, setCopied] = useState<boolean>(false);

  if (!isOpen || !entity) return null;

  // Build target Date
  const getEventDate = (): Date => {
    const [year, month, day] = dateStr.split("-").map(Number);
    const [hours, minutes] = timeStr.split(":").map(Number);
    const d = new Date();
    d.setFullYear(year, month - 1, day);
    d.setHours(hours || 10, minutes || 0, 0, 0);
    return d;
  };

  const handleOpenGoogleCalendar = () => {
    const eventDate = getEventDate();
    const endDate = new Date(eventDate.getTime() + durationMinutes * 60 * 1000);
    const formatGCalDate = (d: Date) => d.toISOString().replace(/-|:|\.\d+/g, "");
    const gCalDates = `${formatGCalDate(eventDate)}/${formatGCalDate(endDate)}`;

    const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${gCalDates}&details=${encodeURIComponent(description)}&location=${encodeURIComponent(location)}`;
    window.open(url, "_blank");

    if (onConfirmReply) {
      const formattedDate = eventDate.toLocaleDateString("es-ES", { weekday: "short", day: "numeric", month: "short" });
      onConfirmReply(`📅 Evento agendado: "${title}" para el ${formattedDate} a las ${timeStr}.`);
    }
    onClose();
  };

  const handleDownloadIcs = () => {
    const eventDate = getEventDate();
    SmartReplyService.downloadIcsFile(title, eventDate, durationMinutes, description, location);
    if (onConfirmReply) {
      onConfirmReply(`📅 Archivo de calendario (.ics) generado para: "${title}".`);
    }
    onClose();
  };

  const handleCopyDetails = () => {
    const eventDate = getEventDate();
    const text = `📅 Evento: ${title}\n🕒 Fecha: ${eventDate.toLocaleDateString("es-ES")} a las ${timeStr}\n⏱️ Duración: ${durationMinutes} min\n📍 Lugar: ${location || "Por definir"}\n📝 Nota: ${description}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5 text-slate-100 max-h-[90vh] overflow-y-auto custom-scrollbar relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
          <div className="p-3 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 text-[#00E676]">
            <CalendarIcon className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-black text-lg tracking-tight text-white flex items-center gap-2">
              Añadir al Calendario
              <span className="text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-full bg-[#00E676]/20 text-[#00E676] border border-[#00E676]/30">
                IA Smart Reply
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Entidad de fecha/reunión detectada automáticamente en el mensaje de chat.
            </p>
          </div>
        </div>

        {/* Form */}
        <div className="space-y-3.5 text-xs">
          {/* Title */}
          <div>
            <label className="text-slate-400 font-bold block mb-1">Título del Evento</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-[#00E676]"
              placeholder="Ej: Reunión con cliente"
            />
          </div>

          {/* Date and Time Row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-slate-400 font-bold block mb-1 flex items-center gap-1">
                <CalendarIcon className="w-3.5 h-3.5 text-cyan-400" />
                <span>Fecha</span>
              </label>
              <input
                type="date"
                value={dateStr}
                onChange={(e) => setDateStr(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-[#00E676]"
              />
            </div>

            <div>
              <label className="text-slate-400 font-bold block mb-1 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span>Hora de Inicio</span>
              </label>
              <input
                type="time"
                value={timeStr}
                onChange={(e) => setTimeStr(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-[#00E676]"
              />
            </div>
          </div>

          {/* Duration & Location */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-slate-400 font-bold block mb-1">Duración</label>
              <select
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-[#00E676]"
              >
                <option value={15}>15 minutos</option>
                <option value={30}>30 minutos</option>
                <option value={45}>45 minutos</option>
                <option value={60}>1 hora (60 min)</option>
                <option value={90}>1.5 horas</option>
                <option value={120}>2 horas</option>
              </select>
            </div>

            <div>
              <label className="text-slate-400 font-bold block mb-1 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-rose-400" />
                <span>Lugar / Enlace</span>
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Ej: Google Meet o Café Central"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-[#00E676]"
              />
            </div>
          </div>

          {/* Notes / Description */}
          <div>
            <label className="text-slate-400 font-bold block mb-1 flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 text-indigo-400" />
              <span>Descripción / Mensaje Original</span>
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-[#00E676] resize-none"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2 pt-2">
          <button
            onClick={handleOpenGoogleCalendar}
            className="w-full py-3 px-4 rounded-2xl bg-[#00E676] text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-[#00E676]/20 hover:scale-101 active:scale-98 transition"
          >
            <ExternalLink className="w-4 h-4" />
            <span>Abrir en Google Calendar</span>
          </button>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleDownloadIcs}
              className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 transition"
            >
              <Download className="w-3.5 h-3.5 text-cyan-400" />
              <span>Descargar .ICS (iCal/Outlook)</span>
            </button>

            <button
              onClick={handleCopyDetails}
              className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 transition"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-[#00E676]" />
                  <span className="text-[#00E676]">¡Copiado!</span>
                </>
              ) : (
                <>
                  <Share2 className="w-3.5 h-3.5 text-amber-400" />
                  <span>Copiar Detalles</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
