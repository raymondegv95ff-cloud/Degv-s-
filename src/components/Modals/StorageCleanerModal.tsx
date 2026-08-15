import React, { useState, useEffect } from "react";
import {
  X,
  Trash2,
  HardDrive,
  Image as ImageIcon,
  Mic,
  Video as VideoIcon,
  FileText,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Clock,
  Filter,
  CheckSquare,
  Square,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { mediaStorageService, MediaFileItem, StorageBreakdown } from "../../services/mediaStorageService";

interface StorageCleanerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStorageCleared?: () => void;
}

type AgeFilter = "all" | "older_24h" | "older_7d" | "older_30d";
type CategoryFilter = "all" | "image" | "audio" | "video" | "file";

export const StorageCleanerModal: React.FC<StorageCleanerModalProps> = ({
  isOpen,
  onClose,
  onStorageCleared,
}) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [mediaFiles, setMediaFiles] = useState<MediaFileItem[]>([]);
  const [breakdown, setBreakdown] = useState<StorageBreakdown | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [ageFilter, setAgeFilter] = useState<AgeFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showConfirmAll, setShowConfirmAll] = useState<boolean>(false);

  const loadMedia = async () => {
    setLoading(true);
    try {
      const files = await mediaStorageService.scanMediaFiles();
      const stats = mediaStorageService.calculateBreakdown(files);
      setMediaFiles(files);
      setBreakdown(stats);
      setSelectedIds(new Set());
    } catch (e) {
      console.error("Error scanning media:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadMedia();
      setSuccessMessage(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Filter files based on selected filters
  const filteredFiles = mediaFiles.filter((file) => {
    // Category filter
    if (categoryFilter !== "all" && file.type !== categoryFilter) {
      return false;
    }
    // Age filter
    if (ageFilter === "older_24h" && file.ageDays < 1) {
      return false;
    }
    if (ageFilter === "older_7d" && file.ageDays < 7) {
      return false;
    }
    if (ageFilter === "older_30d" && file.ageDays < 30) {
      return false;
    }
    return true;
  });

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAllFiltered = () => {
    if (selectedIds.size === filteredFiles.length && filteredFiles.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredFiles.map((f) => f.id)));
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return;
    setIsDeleting(true);
    try {
      const itemsToDelete = mediaFiles.filter((f) => selectedIds.has(f.id));
      const res = await mediaStorageService.deleteMediaItems(itemsToDelete);
      setSuccessMessage(`¡Se han eliminado ${res.count} archivos y liberado ${res.freedFormatted} de espacio!`);
      await loadMedia();
      if (onStorageCleared) onStorageCleared();
    } catch (e) {
      console.error("Error deleting media items:", e);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteSingle = async (file: MediaFileItem) => {
    setIsDeleting(true);
    try {
      const res = await mediaStorageService.deleteMediaItems([file]);
      setSuccessMessage(`¡Liberados ${res.freedFormatted} de espacio!`);
      await loadMedia();
      if (onStorageCleared) onStorageCleared();
    } catch (e) {
      console.error("Error deleting item:", e);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleQuickCleanOld = async (days: number) => {
    setIsDeleting(true);
    try {
      const res = await mediaStorageService.deleteOlderThanDays(days);
      if (res.count > 0) {
        setSuccessMessage(`¡Limpieza rápida completada! ${res.count} archivos eliminados (${res.freedFormatted} liberados).`);
      } else {
        setSuccessMessage("No se encontraron archivos multimedia antiguos para eliminar.");
      }
      await loadMedia();
      if (onStorageCleared) onStorageCleared();
    } catch (e) {
      console.error("Error in quick clean:", e);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleClearAll = async () => {
    setIsDeleting(true);
    setShowConfirmAll(false);
    try {
      const res = await mediaStorageService.clearAllMedia();
      setSuccessMessage(`¡Bóveda multimedia vaciada! Se liberaron ${res.freedFormatted}.`);
      await loadMedia();
      if (onStorageCleared) onStorageCleared();
    } catch (e) {
      console.error("Error clearing all media:", e);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5 text-slate-100 max-h-[90vh] overflow-y-auto custom-scrollbar relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3.5 border-b border-slate-800 pb-4">
          <div className="p-3 rounded-2xl bg-gradient-to-tr from-rose-500/20 via-amber-500/20 to-emerald-500/20 border border-rose-500/30 text-rose-400">
            <Trash2 className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-black text-lg tracking-tight text-white flex items-center gap-2">
              Limpiador de Espacio
              <span className="text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-full bg-emerald-500/20 text-[#00E676] border border-emerald-500/30">
                IndexedDB & Multimedia
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Detecta y elimina fotos, notas de voz y videos antiguos guardados localmente para liberar memoria en tu dispositivo.
            </p>
          </div>
        </div>

        {/* Success Toast */}
        {successMessage && (
          <div className="p-3 bg-emerald-950/80 border border-emerald-500/40 rounded-2xl text-xs font-bold text-emerald-300 flex items-center justify-between animate-in slide-in-from-top duration-150">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#00E676] shrink-0" />
              <span>{successMessage}</span>
            </div>
            <button
              onClick={() => setSuccessMessage(null)}
              className="text-emerald-400 hover:text-white px-2"
            >
              ✕
            </button>
          </div>
        )}

        {/* Storage Summary Gauge Card */}
        <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-bold text-slate-200">Uso Total de Multimedia Local</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-base font-black text-[#00E676] font-mono">
                {breakdown?.totalFormatted || "0 B"}
              </span>
              <span className="text-[10px] text-slate-400">({breakdown?.totalCount || 0} archivos)</span>
            </div>
          </div>

          {/* Categorized Bar */}
          <div className="grid grid-cols-4 gap-2 pt-1">
            <div className="p-2 rounded-xl bg-slate-900 border border-slate-800/80 text-center">
              <div className="flex items-center justify-center gap-1 text-[10px] text-cyan-400 font-bold">
                <ImageIcon className="w-3 h-3" />
                <span>Fotos ({breakdown?.imageCount || 0})</span>
              </div>
              <p className="text-xs font-mono font-bold text-slate-200 mt-0.5">
                {mediaStorageService.formatBytes(breakdown?.imageBytes || 0)}
              </p>
            </div>

            <div className="p-2 rounded-xl bg-slate-900 border border-slate-800/80 text-center">
              <div className="flex items-center justify-center gap-1 text-[10px] text-emerald-400 font-bold">
                <Mic className="w-3 h-3" />
                <span>Audios ({breakdown?.audioCount || 0})</span>
              </div>
              <p className="text-xs font-mono font-bold text-slate-200 mt-0.5">
                {mediaStorageService.formatBytes(breakdown?.audioBytes || 0)}
              </p>
            </div>

            <div className="p-2 rounded-xl bg-slate-900 border border-slate-800/80 text-center">
              <div className="flex items-center justify-center gap-1 text-[10px] text-purple-400 font-bold">
                <VideoIcon className="w-3 h-3" />
                <span>Videos ({breakdown?.videoCount || 0})</span>
              </div>
              <p className="text-xs font-mono font-bold text-slate-200 mt-0.5">
                {mediaStorageService.formatBytes(breakdown?.videoBytes || 0)}
              </p>
            </div>

            <div className="p-2 rounded-xl bg-slate-900 border border-slate-800/80 text-center">
              <div className="flex items-center justify-center gap-1 text-[10px] text-amber-400 font-bold">
                <FileText className="w-3 h-3" />
                <span>Docs ({breakdown?.fileCount || 0})</span>
              </div>
              <p className="text-xs font-mono font-bold text-slate-200 mt-0.5">
                {mediaStorageService.formatBytes(breakdown?.fileBytes || 0)}
              </p>
            </div>
          </div>

          {/* Quick Actions Strip */}
          <div className="flex items-center gap-2 pt-2 border-t border-slate-800/60 flex-wrap">
            <button
              onClick={() => handleQuickCleanOld(7)}
              disabled={isDeleting || (breakdown?.totalCount || 0) === 0}
              className="py-1.5 px-3 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 font-bold text-[11px] flex items-center gap-1.5 transition disabled:opacity-50"
            >
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>Limpieza Rápida (&gt; 7 días)</span>
            </button>

            <button
              onClick={() => handleQuickCleanOld(30)}
              disabled={isDeleting || (breakdown?.totalCount || 0) === 0}
              className="py-1.5 px-3 rounded-xl bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/30 text-indigo-300 font-bold text-[11px] flex items-center gap-1.5 transition disabled:opacity-50"
            >
              <Clock className="w-3.5 h-3.5 text-indigo-400" />
              <span>Limpiar Antiguos (&gt; 30 días)</span>
            </button>

            <button
              onClick={() => setShowConfirmAll(true)}
              disabled={isDeleting || (breakdown?.totalCount || 0) === 0}
              className="py-1.5 px-3 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 font-bold text-[11px] flex items-center gap-1.5 transition ml-auto disabled:opacity-50"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
              <span>Vaciar Todo</span>
            </button>
          </div>
        </div>

        {/* Confirmation Modal for Clear All */}
        {showConfirmAll && (
          <div className="p-4 bg-rose-950/70 border border-rose-500/40 rounded-2xl space-y-3 animate-in zoom-in duration-150">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-rose-200">¿Deseas eliminar todos los archivos multimedia locales?</p>
                <p className="text-[11px] text-rose-300/80 mt-0.5">
                  Se liberarán {breakdown?.totalFormatted} de almacenamiento en IndexedDB. El historial de mensajes se mantendrá con un marcador limpio.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setShowConfirmAll(false)}
                className="px-3 py-1.5 rounded-xl bg-slate-900 text-slate-300 text-xs font-bold hover:bg-slate-800 transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleClearAll}
                className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black shadow-lg shadow-rose-950 transition"
              >
                Sí, Vaciar Todo
              </button>
            </div>
          </div>
        )}

        {/* Filter Controls Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            {/* Category tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-1">
              {[
                { id: "all", label: "Todos", icon: Filter },
                { id: "image", label: "Fotos", icon: ImageIcon },
                { id: "audio", label: "Audios", icon: Mic },
                { id: "video", label: "Videos", icon: VideoIcon },
                { id: "file", label: "Docs", icon: FileText },
              ].map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setCategoryFilter(tab.id as CategoryFilter)}
                    className={`py-1.5 px-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
                      categoryFilter === tab.id
                        ? "bg-[#00E676] text-slate-950"
                        : "bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Age Filter Dropdown */}
            <select
              value={ageFilter}
              onChange={(e) => setAgeFilter(e.target.value as AgeFilter)}
              className="p-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-[#00E676]"
            >
              <option value="all">Cualquier Antigüedad</option>
              <option value="older_24h">Más de 24 horas</option>
              <option value="older_7d">Más de 7 días</option>
              <option value="older_30d">Más de 30 días</option>
            </select>
          </div>

          {/* Selection Bar */}
          <div className="flex items-center justify-between px-2 py-1.5 bg-slate-950/60 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={handleSelectAllFiltered}
              className="flex items-center gap-1.5 text-slate-300 hover:text-white font-semibold"
            >
              {selectedIds.size === filteredFiles.length && filteredFiles.length > 0 ? (
                <CheckSquare className="w-4 h-4 text-[#00E676]" />
              ) : (
                <Square className="w-4 h-4 text-slate-500" />
              )}
              <span>
                {selectedIds.size > 0
                  ? `Seleccionados (${selectedIds.size}/${filteredFiles.length})`
                  : "Seleccionar todos"}
              </span>
            </button>

            {selectedIds.size > 0 && (
              <button
                onClick={handleDeleteSelected}
                disabled={isDeleting}
                className="py-1 px-3 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1.5 transition shadow"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Eliminar {selectedIds.size} seleccionados</span>
              </button>
            )}
          </div>
        </div>

        {/* Media Items List */}
        <div className="space-y-2 max-h-72 overflow-y-auto custom-scrollbar pr-1">
          {loading ? (
            <div className="p-8 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-[#00E676]" />
              <span>Escaneando almacenamiento local de IndexedDB...</span>
            </div>
          ) : filteredFiles.length === 0 ? (
            <div className="p-8 text-center bg-slate-950/40 rounded-2xl border border-dashed border-slate-800 space-y-2">
              <CheckCircle2 className="w-8 h-8 text-[#00E676] mx-auto" />
              <p className="text-xs font-bold text-slate-300">¡Tu almacenamiento está limpio y optimizado!</p>
              <p className="text-[11px] text-slate-500">
                No hay archivos multimedia que coincidan con los filtros seleccionados.
              </p>
            </div>
          ) : (
            filteredFiles.map((file) => {
              const isSelected = selectedIds.has(file.id);
              return (
                <div
                  key={file.id}
                  onClick={() => handleToggleSelect(file.id)}
                  className={`p-2.5 rounded-2xl border transition cursor-pointer flex items-center justify-between gap-3 ${
                    isSelected
                      ? "bg-slate-800/90 border-[#00E676] ring-1 ring-[#00E676]/50"
                      : "bg-slate-950 border-slate-800/80 hover:border-slate-700"
                  }`}
                >
                  {/* Left info */}
                  <div className="flex items-center gap-3 min-w-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleSelect(file.id);
                      }}
                      className="text-slate-400 hover:text-white"
                    >
                      {isSelected ? (
                        <CheckSquare className="w-4 h-4 text-[#00E676]" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-600" />
                      )}
                    </button>

                    {/* Preview Thumbnail */}
                    <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-800 overflow-hidden shrink-0 flex items-center justify-center">
                      {file.type === "image" && file.url ? (
                        <img
                          src={file.url}
                          alt="preview"
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                      ) : file.type === "audio" ? (
                        <Mic className="w-5 h-5 text-emerald-400" />
                      ) : file.type === "video" ? (
                        <VideoIcon className="w-5 h-5 text-purple-400" />
                      ) : (
                        <FileText className="w-5 h-5 text-amber-400" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs font-bold text-slate-200 truncate">
                          {file.type === "image"
                            ? "Foto / Imagen"
                            : file.type === "audio"
                            ? "Nota de Voz"
                            : file.type === "video"
                            ? "Video"
                            : "Documento"}
                        </p>
                        <span className="text-[10px] text-slate-400 font-mono">
                          • {file.chatName}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        Enviado por <span className="text-slate-300">{file.senderName}</span> • {file.dateStr} ({file.ageDays} d)
                      </p>
                    </div>
                  </div>

                  {/* Right actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs font-mono font-bold text-[#00E676] bg-slate-900 px-2 py-1 rounded-lg border border-slate-800">
                      {file.sizeFormatted}
                    </span>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteSingle(file);
                      }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
                      title="Eliminar este archivo de la memoria"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
          <p className="text-slate-500 text-[11px] flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-[#00E676]" />
            <span>Almacenamiento seguro en IndexedDB local • Sin afectar otros dispositivos</span>
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold transition"
          >
            Listo
          </button>
        </div>
      </div>
    </div>
  );
};
