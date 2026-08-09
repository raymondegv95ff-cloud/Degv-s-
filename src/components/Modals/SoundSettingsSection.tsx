import React, { useRef, useState } from "react";
import { SoundCustomizationSettings, CustomSoundItem, SoundCategory } from "../../types";
import { soundService, SOUND_PRESETS } from "../../services/soundService";
import { storageService } from "../../services/storageService";
import {
  Volume2,
  VolumeX,
  Play,
  Upload,
  Trash2,
  MessageSquare,
  Bell,
  Phone,
  Video,
  Music,
  Check,
  Sparkles,
  RefreshCw,
  FolderPlus
} from "lucide-react";

interface SoundSettingsSectionProps {
  soundMuted: boolean;
  onToggleSound: () => void;
}

export const SoundSettingsSection: React.FC<SoundSettingsSectionProps> = ({
  soundMuted,
  onToggleSound,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedCategory, setSelectedCategory] = useState<SoundCategory>("message");
  const [soundSettings, setSoundSettings] = useState<SoundCustomizationSettings>(() => storageService.getSoundSettings());
  const [playingSoundId, setPlayingSoundId] = useState<string | null>(null);
  const [uploadCategory, setUploadCategory] = useState<SoundCategory>("message");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const activeCategoryPresets = SOUND_PRESETS.filter((p) => p.category === selectedCategory);
  const customSoundsForCategory = soundSettings.customSounds.filter(
    (c) => c.category === selectedCategory || c.category === "all"
  );

  const getActiveSoundIdForCategory = (cat: SoundCategory): string => {
    switch (cat) {
      case "message":
        return soundSettings.messageSound;
      case "notification":
        return soundSettings.notificationSound;
      case "voice_call":
        return soundSettings.voiceCallSound;
      case "video_call":
        return soundSettings.videoCallSound;
    }
  };

  const handleSelectSound = (soundId: string) => {
    let updated: Partial<SoundCustomizationSettings> = {};
    if (selectedCategory === "message") updated.messageSound = soundId;
    if (selectedCategory === "notification") updated.notificationSound = soundId;
    if (selectedCategory === "voice_call") updated.voiceCallSound = soundId;
    if (selectedCategory === "video_call") updated.videoCallSound = soundId;

    const newSettings = storageService.saveSoundSettings(updated);
    setSoundSettings(newSettings);

    // Play preview
    handlePlayPreview(soundId);
  };

  const handlePlayPreview = (soundIdOrUrl: string) => {
    setPlayingSoundId(soundIdOrUrl);
    soundService.playSoundIdOrUrl(soundIdOrUrl, soundSettings.customSounds);
    setTimeout(() => {
      setPlayingSoundId(null);
    }, 1200);
  };

  const handleCustomAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      alert("El archivo de audio no debe superar los 15MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        const audioUrl = event.target.result as string;
        const newCustomItem: CustomSoundItem = {
          id: `custom_${Date.now()}`,
          name: file.name.replace(/\.[^/.]+$/, ""),
          category: uploadCategory,
          audioUrl,
          createdAt: Date.now(),
        };

        const newSettings = storageService.addCustomSound(newCustomItem);
        setSoundSettings(newSettings);

        // Auto-select uploaded sound for category
        handleSelectSound(newCustomItem.id);

        setToastMessage(`🎵 Sonido "${newCustomItem.name}" agregado desde el teléfono.`);
        setTimeout(() => setToastMessage(null), 3000);
      }
    };
    reader.readAsDataURL(file);
    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDeleteCustomSound = (soundId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = storageService.removeCustomSound(soundId);
    setSoundSettings(updated);
  };

  return (
    <div className="space-y-4 pt-2 border-t border-slate-800">
      {/* Hidden Audio File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleCustomAudioUpload}
        accept="audio/*,video/mp4,video/m4v"
        className="hidden"
      />

      {/* Main Sound Master Mute Switch */}
      <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs shadow-inner">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-xl ${!soundMuted ? "bg-[#00E676]/20 text-[#00E676]" : "bg-red-500/20 text-red-400"}`}>
            {soundMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </div>
          <div>
            <p className="font-extrabold text-slate-100">Efectos y Tonos de Sonido</p>
            <p className="text-[11px] text-slate-400">Activa o silencia las alertas y llamadas</p>
          </div>
        </div>
        <button
          onClick={onToggleSound}
          className={`px-3.5 py-1.5 rounded-xl font-black text-xs transition ${
            !soundMuted ? "bg-[#00E676] text-slate-950 shadow-md shadow-[#00E676]/20" : "bg-slate-800 text-slate-400"
          }`}
        >
          {!soundMuted ? "Activado" : "Silenciado"}
        </button>
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="p-2.5 rounded-2xl bg-[#00E676]/10 border border-[#00E676]/40 text-[#00E676] text-xs font-bold flex items-center justify-between animate-in fade-in">
          <span>{toastMessage}</span>
          <Check className="w-4 h-4" />
        </div>
      )}

      {/* Sound Category Tabs */}
      <div className="space-y-2">
        <label className="text-xs font-extrabold text-slate-200 flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Music className="w-4 h-4 text-[#00E676]" />
            <span>Personalizar Tono por Evento</span>
          </span>
          <button
            onClick={() => {
              setUploadCategory(selectedCategory);
              fileInputRef.current?.click();
            }}
            className="text-[11px] font-extrabold text-[#00E676] hover:underline flex items-center gap-1.5 bg-[#00E676]/10 px-2.5 py-1 rounded-xl border border-[#00E676]/30 transition"
          >
            <FolderPlus className="w-3.5 h-3.5" />
            <span>Subir de Galería / Teléfono</span>
          </button>
        </label>

        <div className="grid grid-cols-4 gap-1.5 bg-slate-950 p-1.5 rounded-2xl border border-slate-800 text-xs">
          {[
            { id: "message", label: "Mensajes", icon: MessageSquare },
            { id: "notification", label: "Alertas", icon: Bell },
            { id: "voice_call", label: "Llamadas", icon: Phone },
            { id: "video_call", label: "Videollamada", icon: Video },
          ].map((cat) => {
            const Icon = cat.icon;
            const isActive = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id as SoundCategory)}
                className={`py-2 px-1 rounded-xl flex flex-col items-center gap-1 font-bold text-[10px] transition ${
                  isActive
                    ? "bg-[#00E676] text-slate-950 shadow-md font-extrabold"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span className="truncate max-w-full">{cat.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* List of Available Sounds for Active Category */}
      <div className="space-y-1.5 max-h-56 overflow-y-auto custom-scrollbar p-1">
        {/* Custom Uploaded Sounds First */}
        {customSoundsForCategory.length > 0 && (
          <div className="space-y-1 mb-2">
            <p className="text-[10px] font-black uppercase text-[#00E676] tracking-wider px-1">
              🎵 Tus Tonos Personalizados (Galería)
            </p>
            {customSoundsForCategory.map((customItem) => {
              const isSelected = getActiveSoundIdForCategory(selectedCategory) === customItem.id;
              const isPlaying = playingSoundId === customItem.id;

              return (
                <div
                  key={customItem.id}
                  onClick={() => handleSelectSound(customItem.id)}
                  className={`p-2.5 rounded-xl border flex items-center justify-between text-xs cursor-pointer transition ${
                    isSelected
                      ? "bg-emerald-950/60 border-[#00E676] text-slate-100 ring-1 ring-[#00E676]"
                      : "bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePlayPreview(customItem.id);
                      }}
                      className="p-1.5 rounded-lg bg-[#00E676] text-slate-950 hover:scale-110 transition shadow"
                    >
                      <Play className="w-3 h-3 fill-current" />
                    </button>
                    <div className="truncate min-w-0">
                      <p className="font-bold text-xs truncate">{customItem.name}</p>
                      <p className="text-[10px] text-slate-400">Audio personalizado cargado</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {isSelected && (
                      <span className="px-2 py-0.5 rounded-md bg-[#00E676] text-slate-950 font-black text-[9px]">
                        ACTIVO
                      </span>
                    )}
                    <button
                      onClick={(e) => handleDeleteCustomSound(customItem.id, e)}
                      className="p-1 rounded-lg hover:bg-red-500/20 text-slate-500 hover:text-red-400 transition"
                      title="Eliminar sonido"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Built-in Presets */}
        <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider px-1">
          🎼 Tonos Integrados de la Aplicación
        </p>

        {activeCategoryPresets.map((preset) => {
          const isSelected = getActiveSoundIdForCategory(selectedCategory) === preset.id;
          const isPlaying = playingSoundId === preset.id;

          return (
            <div
              key={preset.id}
              onClick={() => handleSelectSound(preset.id)}
              className={`p-2.5 rounded-xl border flex items-center justify-between text-xs cursor-pointer transition ${
                isSelected
                  ? "bg-slate-800 border-[#00E676] text-slate-100 ring-1 ring-[#00E676]"
                  : "bg-slate-950 border-slate-800/80 text-slate-300 hover:border-slate-700 hover:bg-slate-900"
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePlayPreview(preset.id);
                  }}
                  className={`p-1.5 rounded-lg transition shadow ${
                    isPlaying
                      ? "bg-[#00E676] text-slate-950 scale-110"
                      : "bg-slate-800 text-[#00E676] hover:bg-[#00E676] hover:text-slate-950"
                  }`}
                  title="Escuchar prueba"
                >
                  <Play className="w-3 h-3 fill-current" />
                </button>
                <div className="truncate min-w-0">
                  <p className="font-bold text-xs truncate">{preset.name}</p>
                  {preset.description && <p className="text-[10px] text-slate-400 truncate">{preset.description}</p>}
                </div>
              </div>

              {isSelected && (
                <span className="px-2 py-0.5 rounded-md bg-[#00E676] text-slate-950 font-black text-[9px] shrink-0">
                  SELECCIONADO
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Button to Upload Custom Sound from Gallery */}
      <button
        onClick={() => {
          setUploadCategory(selectedCategory);
          fileInputRef.current?.click();
        }}
        className="w-full p-2.5 rounded-2xl bg-slate-950 border border-slate-800 hover:border-[#00E676]/60 text-slate-200 text-xs font-bold flex items-center justify-center gap-2 transition group"
      >
        <Upload className="w-4 h-4 text-[#00E676] group-hover:scale-110 transition" />
        <span>Elegir un archivo MP3/WAV/OGG de mi teléfono</span>
      </button>

      {/* Auto-Update Badge for PWA Builder Apps */}
      <div className="p-3 rounded-2xl bg-gradient-to-r from-cyan-950/60 via-slate-950 to-emerald-950/60 border border-cyan-500/30 text-xs space-y-1.5 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-400"></span>
            </span>
            <span className="font-black text-cyan-300">Actualización Automática PWA Builder</span>
          </div>
          <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-extrabold text-[9px] border border-cyan-500/30">
            Sincronizado
          </span>
        </div>
        <p className="text-[11px] text-slate-300 leading-relaxed">
          Cada vez que actualices y publiques en <strong>Google AI Studio</strong>, las aplicaciones instaladas desde PWA Builder actualizarán su código en segundo plano de forma instantánea.
        </p>
        <button
          onClick={() => {
            if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
              navigator.serviceWorker.controller.postMessage({ type: 'CHECK_UPDATE' });
              setToastMessage("🔄 Buscando nueva versión en Google AI Studio...");
              setTimeout(() => setToastMessage(null), 2500);
            } else {
              window.location.reload();
            }
          }}
          className="w-full py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200 border border-cyan-500/40 text-[11px] font-extrabold flex items-center justify-center gap-1.5 transition"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Buscar Actualización de App Ahora</span>
        </button>
      </div>
    </div>
  );
};
