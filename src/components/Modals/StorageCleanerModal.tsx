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
  Calendar,
  Layers,
} from "lucide-react";
import { mediaStorageService, MediaFileItem, StorageBreakdown } from "../../services/mediaStorageService";
import { storageService } from "../../services/storageService";
import { AutoPurgeConfig, AutoPurgeReport } from "../../types";

interface StorageCleanerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStorageCleared?: () => void;
}

type ModalTab = "media" | "autopurge";
type AgeFilter = "all" | "older_24h" | "older_7d" | "older_30d";
type CategoryFilter = "all" | "image" | "audio" | "video" | "file";

export const StorageCleanerModal: React.FC<StorageCleanerModalProps> = ({
  isOpen,
  onClose,
  onStorageCleared,
}) => {
  const [activeTab, setActiveTab] = useState<ModalTab>("media");
  const [loading, setLoading] = useState<boolean>(true);
  const [mediaFiles, setMediaFiles] = useState<MediaFileItem[]>([]);
  const [breakdown, setBreakdown] = useState<StorageBreakdown | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [ageFilter, setAgeFilter] = useState<AgeFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showConfirmAll, setShowConfirmAll] = useState<boolean>(false);

  // Auto Purge Task State
  const [autoPurgeConfig, setAutoPurgeConfig] = useState<AutoPurgeConfig>(() =>
    storageService.getAutoPurgeConfig()
  );
  const [purgeCandidates, setPurgeCandidates] = useState<ReturnType<typeof storageService.scanPurgeCandidates> | null>(null);
  const [lastPurgeReport, setLastPurgeReport] = useState<AutoPurgeReport | null>(null);
  const [showPurgeConfirmDialog, setShowPurgeConfirmDialog] = useState<boolean>(false);

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

  const loadAutoPurgeData = () => {
    const config = storageService.getAutoPurgeConfig();
    setAutoPurgeConfig(config);
    const candidates = storageService.scanPurgeCandidates(config.maxAgeDays);
    setPurgeCandidates(candidates);
    const report = storageService.getLastAutoPurgeReport();
    setLastPurgeReport(report);
  };

  useEffect(() => {
    if (isOpen) {
      loadMedia();
      loadAutoPurgeData();
      setSuccessMessage(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleUpdateConfig = (patch: Partial<AutoPurgeConfig>) => {
    const updated = storageService.saveAutoPurgeConfig(patch);
    setAutoPurgeConfig(updated);
    const candidates = storageService.scanPurgeCandidates(updated.maxAgeDays);
    setPurgeCandidates(candidates);
  };

  const handleTriggerAutoPurge = async () => {
    if (autoPurgeConfig.requireConfirmation && !showPurgeConfirmDialog) {
      setShowPurgeConfirmDialog(true);
      return;
    }

    setIsDeleting(true);
    setShowPurgeConfirmDialog(false);
    try {
      const report = await storageService.executeAutoPurge({
        maxAgeDays: autoPurgeConfig.maxAgeDays,
        purgeDeletedRooms: autoPurgeConfig.purgeDeletedRooms,
        purgeOrphanedMedia: autoPurgeConfig.purgeOrphanedMedia,
      });
      setLastPurgeReport(report);
      setSuccessMessage(
        `¡Purga automática completada! Se liberaron ${report.freedFormatted} y se depuraron ${report.messagesRemoved} mensajes.`
      );
      loadAutoPurgeData();
      await loadMedia();
      if (onStorageCleared) onStorageCleared();
    } catch (e) {
      console.error("Error running auto purge:", e);
    } finally {
      setIsDeleting(false);
    }
  };

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

        {/* Tab Selection */}
        <div className="flex items-center gap-2 p-1 bg-slate-950 rounded-2xl border border-slate-800">
          <button
            onClick={() => setActiveTab("media")}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition ${
              activeTab === "media"
                ? "bg-[#00E676] text-black shadow-md shadow-[#00E676]/20"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Archivos Multimedia ({breakdown?.totalCount || 0})</span>
          </button>

          <button
            onClick={() => {
              setActiveTab("autopurge");
              loadAutoPurgeData();
            }}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition ${
              activeTab === "autopurge"
                ? "bg-[#00E676] text-black shadow-md shadow-[#00E676]/20"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Tarea Automática (Clear Cache)</span>
          </button>
        </div>

        {/* TAB 1: MEDIA EXPLORER */}
        {activeTab === "media" && (
          <div className="space-y-4 animate-in fade-in duration-150">
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
                  className="flex items-center gap-1.5 text-slate-300 hover:text-white font-bold"
                >
                  {selectedIds.size > 0 && selectedIds.size === filteredFiles.length ? (
                    <CheckSquare className="w-4 h-4 text-[#00E676]" />
                  ) : (
                    <Square className="w-4 h-4 text-slate-500" />
                  )}
                  <span>
                    {selectedIds.size > 0
                      ? `${selectedIds.size} seleccionados`
                      : "Seleccionar todos"}
                  </span>
                </button>

                {selectedIds.size > 0 && (
                  <button
                    onClick={handleDeleteSelected}
                    disabled={isDeleting}
                    className="py-1 px-3 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Eliminar ({selectedIds.size})</span>
                  </button>
                )}
              </div>
            </div>

            {/* Media Items Scrollable List */}
            <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar pr-1">
              {loading ? (
                <div className="py-12 flex flex-col items-center justify-center text-slate-500 gap-2">
                  <RefreshCw className="w-6 h-6 animate-spin text-[#00E676]" />
                  <span className="text-xs">Escaneando archivos en almacenamiento local...</span>
                </div>
              ) : filteredFiles.length === 0 ? (
                <div className="py-12 text-center text-slate-500 text-xs bg-slate-950/40 rounded-2xl border border-slate-800/40">
                  <CheckCircle2 className="w-8 h-8 text-[#00E676] mx-auto mb-2 opacity-80" />
                  <p className="font-bold text-slate-300">¡Tu almacenamiento está optimizado!</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    No se encontraron archivos que coincidan con los filtros seleccionados.
                  </p>
                </div>
              ) : (
                filteredFiles.map((file) => {
                  const isSelected = selectedIds.has(file.id);
                  return (
                    <div
                      key={file.id}
                      onClick={() => handleToggleSelect(file.id)}
                      className={`p-2.5 rounded-2xl border transition flex items-center justify-between gap-3 cursor-pointer ${
                        isSelected
                          ? "bg-[#00E676]/10 border-[#00E676]/40"
                          : "bg-slate-950/70 border-slate-800 hover:border-slate-700"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Checkbox */}
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
          </div>
        )}

        {/* TAB 2: AUTOMATED PURGE & CLEAR CACHE TASK */}
        {activeTab === "autopurge" && (
          <div className="space-y-4 animate-in fade-in duration-150">
            {/* Task Overview Card */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-[#00E676]/20 text-[#00E676]">
                    <Zap className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-white">Tarea Periódica de Depuración de Caché</h3>
                    <p className="text-[10px] text-slate-400">
                      Elimina de forma programada mensajes y archivos de salas eliminadas o que superen el límite de antigüedad.
                    </p>
                  </div>
                </div>

                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoPurgeConfig.enabled}
                    onChange={(e) => handleUpdateConfig({ enabled: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#00E676]"></div>
                </label>
              </div>

              {/* Task Configuration Controls */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-800/80">
                <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-800 space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Límite de Antigüedad para Purga</span>
                  </label>
                  <select
                    value={autoPurgeConfig.maxAgeDays}
                    onChange={(e) => handleUpdateConfig({ maxAgeDays: Number(e.target.value) })}
                    className="w-full p-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-[#00E676]"
                  >
                    <option value={7}>Más de 7 días</option>
                    <option value={14}>Más de 14 días</option>
                    <option value={30}>Más de 30 días (Recomendado)</option>
                    <option value={60}>Más de 60 días</option>
                    <option value={90}>Más de 90 días</option>
                  </select>
                </div>

                <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-800 space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Frecuencia de Verificación</span>
                  </label>
                  <select
                    value={autoPurgeConfig.intervalHours}
                    onChange={(e) => handleUpdateConfig({ intervalHours: Number(e.target.value) })}
                    className="w-full p-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-[#00E676]"
                  >
                    <option value={6}>Cada 6 horas</option>
                    <option value={12}>Cada 12 horas</option>
                    <option value={24}>Cada 24 horas (Diario)</option>
                    <option value={168}>Semanalmente</option>
                  </select>
                </div>
              </div>

              {/* Checkbox Toggles */}
              <div className="space-y-2 pt-2 border-t border-slate-800/80 text-xs">
                <label className="flex items-center gap-2.5 text-slate-300 cursor-pointer hover:text-white">
                  <input
                    type="checkbox"
                    checked={autoPurgeConfig.purgeDeletedRooms}
                    onChange={(e) => handleUpdateConfig({ purgeDeletedRooms: e.target.checked })}
                    className="rounded text-[#00E676] focus:ring-0 w-4 h-4 bg-slate-900 border-slate-700"
                  />
                  <span>Purgar mensajes residuales de chats y salas eliminadas</span>
                </label>

                <label className="flex items-center gap-2.5 text-slate-300 cursor-pointer hover:text-white">
                  <input
                    type="checkbox"
                    checked={autoPurgeConfig.purgeOrphanedMedia}
                    onChange={(e) => handleUpdateConfig({ purgeOrphanedMedia: e.target.checked })}
                    className="rounded text-[#00E676] focus:ring-0 w-4 h-4 bg-slate-900 border-slate-700"
                  />
                  <span>Purgar archivos multimedia huérfanos sin mensaje activo</span>
                </label>

                <label className="flex items-center gap-2.5 text-slate-300 cursor-pointer hover:text-white">
                  <input
                    type="checkbox"
                    checked={autoPurgeConfig.requireConfirmation}
                    onChange={(e) => handleUpdateConfig({ requireConfirmation: e.target.checked })}
                    className="rounded text-[#00E676] focus:ring-0 w-4 h-4 bg-slate-900 border-slate-700"
                  />
                  <span className="font-semibold text-amber-300">
                    Mostrar diálogo de confirmación antes de purgar datos
                  </span>
                </label>
              </div>
            </div>

            {/* Candidates Scan Result Card */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#00E676]" />
                  <span className="text-xs font-bold text-slate-200">Candidatos a Purga Detectados</span>
                </div>
                <button
                  onClick={loadAutoPurgeData}
                  className="text-xs text-[#00E676] hover:underline flex items-center gap-1 font-semibold"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Re-escanear</span>
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-center">
                  <span className="text-[10px] text-slate-400 font-bold block">Mensajes Vencidos</span>
                  <span className="text-sm font-black text-white font-mono">
                    {purgeCandidates?.messagesCount || 0}
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-center">
                  <span className="text-[10px] text-slate-400 font-bold block">Salas Eliminadas</span>
                  <span className="text-sm font-black text-rose-400 font-mono">
                    {purgeCandidates?.orphanedRoomsCount || 0}
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-center">
                  <span className="text-[10px] text-slate-400 font-bold block">Espacio a Liberar</span>
                  <span className="text-sm font-black text-[#00E676] font-mono">
                    {purgeCandidates?.estimatedFreedFormatted || "0 B"}
                  </span>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={handleTriggerAutoPurge}
                  disabled={isDeleting || (purgeCandidates?.messagesCount || 0) === 0}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-[#00E676] text-black font-black text-xs hover:opacity-95 transition flex items-center justify-center gap-2 shadow-lg shadow-[#00E676]/20 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Ejecutar Purga de Caché Ahora</span>
                </button>
              </div>
            </div>

            {/* Confirmation Dialog before Purge */}
            {showPurgeConfirmDialog && (
              <div className="p-4 bg-amber-950/80 border border-amber-500/50 rounded-2xl space-y-3 animate-in zoom-in duration-150">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-black text-amber-200">
                      Confirmar purga de caché y archivos antiguos
                    </h4>
                    <p className="text-[11px] text-amber-300/80 mt-1 leading-relaxed">
                      Se eliminarán definitivamente {purgeCandidates?.messagesCount || 0} mensajes y{" "}
                      {purgeCandidates?.mediaFilesCount || 0} archivos multimedia que superen{" "}
                      {autoPurgeConfig.maxAgeDays} días de antigüedad o pertenezcan a salas eliminadas. Se liberarán aproximadamente{" "}
                      {purgeCandidates?.estimatedFreedFormatted}.
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    onClick={() => setShowPurgeConfirmDialog(false)}
                    className="px-3.5 py-1.5 rounded-xl bg-slate-900 text-slate-300 text-xs font-bold hover:bg-slate-800 transition"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => {
                      setIsDeleting(true);
                      setShowPurgeConfirmDialog(false);
                      storageService
                        .executeAutoPurge({
                          maxAgeDays: autoPurgeConfig.maxAgeDays,
                          purgeDeletedRooms: autoPurgeConfig.purgeDeletedRooms,
                          purgeOrphanedMedia: autoPurgeConfig.purgeOrphanedMedia,
                        })
                        .then((report) => {
                          setLastPurgeReport(report);
                          setSuccessMessage(
                            `¡Purga completada! Se liberaron ${report.freedFormatted} y ${report.messagesRemoved} mensajes.`
                          );
                          loadAutoPurgeData();
                          loadMedia();
                          if (onStorageCleared) onStorageCleared();
                        })
                        .finally(() => setIsDeleting(false));
                    }}
                    className="px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-black shadow-lg shadow-amber-950 transition"
                  >
                    Confirmar y Purgar
                  </button>
                </div>
              </div>
            )}

            {/* Last Run Report */}
            {lastPurgeReport && (
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/80 text-[11px] text-slate-400 flex items-center justify-between">
                <span>
                  Última purga ejecutada: {new Date(lastPurgeReport.timestamp).toLocaleString()}
                </span>
                <span className="font-mono font-bold text-[#00E676]">
                  +{lastPurgeReport.freedFormatted} liberados
                </span>
              </div>
            )}
          </div>
        )}

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
