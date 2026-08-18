import React, { useRef, useState, useEffect } from "react";
import QRCode from "qrcode";
import { ThemeMode, BubbleStyle, NotificationSettings, LanguageCode, UserProfile, FontOption, AccentColorOption, CacheStats } from "../../types";
import { SoundSettingsSection } from "./SoundSettingsSection";
import { AppUsageStats } from "./AppUsageStats";
import { storageService, ACCENT_COLOR_MAP } from "../../services/storageService";
import {
  Settings as SettingsIcon,
  X,
  Sun,
  Moon,
  Volume2,
  VolumeX,
  Globe,
  Smartphone,
  LogOut,
  ShieldCheck,
  Check,
  Layers,
  Camera,
  CheckCheck,
  Image as ImageIcon,
  Type,
  Palette,
  QrCode,
  Download,
  Database,
  LifeBuoy,
  HelpCircle,
  Bug,
  Share2,
  Clock,
  Zap,
  Sparkles,
  HardDrive,
  FolderGit2,
  Trash2,
  RefreshCw,
} from "lucide-react";
import { StorageCleanerModal } from "./StorageCleanerModal";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  theme: ThemeMode;
  onThemeChange: (theme: ThemeMode) => void;
  bubbleStyle: BubbleStyle;
  onBubbleStyleChange: (style: BubbleStyle) => void;
  font?: FontOption;
  onFontChange?: (font: FontOption) => void;
  accentColor?: AccentColorOption;
  onAccentColorChange?: (color: AccentColorOption) => void;
  autoTimePalette?: boolean;
  onAutoTimePaletteChange?: (enabled: boolean) => void;
  accentColorLight?: AccentColorOption;
  onAccentColorLightChange?: (color: AccentColorOption) => void;
  accentColorDark?: AccentColorOption;
  onAccentColorDarkChange?: (color: AccentColorOption) => void;
  soundMuted: boolean;
  onToggleSound: () => void;
  language: LanguageCode;
  onLanguageChange: (lang: LanguageCode) => void;
  onOpenAndroidGuide: () => void;
  onOpenPublishDeploy?: () => void;
  onOpenPlatformUpdate?: () => void;
  onOpenBackupModal?: () => void;
  onOpenSupportBot?: () => void;
  onOpenStorageCleaner?: () => void;
  onLogout: () => void;
  readReceipts?: boolean;
  readReceiptsEnabled?: boolean;
  onToggleReadReceipts?: () => void;
  onUpdateAvatar?: (avatarUrl: string) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  theme,
  onThemeChange,
  bubbleStyle,
  onBubbleStyleChange,
  font = "sans",
  onFontChange,
  accentColor = "emerald",
  onAccentColorChange,
  autoTimePalette = true,
  onAutoTimePaletteChange,
  accentColorLight = "cyan",
  onAccentColorLightChange,
  accentColorDark = "emerald",
  onAccentColorDarkChange,
  soundMuted,
  onToggleSound,
  language,
  onLanguageChange,
  onOpenAndroidGuide,
  onOpenPublishDeploy,
  onOpenPlatformUpdate,
  onOpenBackupModal,
  onOpenSupportBot,
  onOpenStorageCleaner,
  onLogout,
  readReceipts = true,
  onToggleReadReceipts,
  onUpdateAvatar,
}) => {

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [profileQrUrl, setProfileQrUrl] = useState<string>("");
  const [showQrCard, setShowQrCard] = useState<boolean>(false);
  const [cacheStats, setCacheStats] = useState<CacheStats | null>(null);
  const [currentTimeStr, setCurrentTimeStr] = useState<string>("");
  const [isCurrentDay, setIsCurrentDay] = useState<boolean>(true);
  const [showStorageCleaner, setShowStorageCleaner] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      setCacheStats(storageService.getCacheStats());
      const paletteInfo = storageService.calculateTimeOfDayPalette();
      setIsCurrentDay(paletteInfo.isDay);
      setCurrentTimeStr(paletteInfo.timeString);

      const timer = setInterval(() => {
        const info = storageService.calculateTimeOfDayPalette();
        setIsCurrentDay(info.isDay);
        setCurrentTimeStr(info.timeString);
      }, 10000);
      return () => clearInterval(timer);
    }
  }, [isOpen]);

  useEffect(() => {
    if (currentUser) {
      const payload = JSON.stringify({
        type: "degv_chat_user",
        id: currentUser.id,
        username: currentUser.username,
        name: `${currentUser.firstName} ${currentUser.lastName || ""}`.trim(),
        email: currentUser.email || `${currentUser.username}@degvs.app`,
        phone: currentUser.phone || "",
        url: `https://degvs.app/u/${currentUser.username}`,
      });

      QRCode.toDataURL(payload, {
        errorCorrectionLevel: "M",
        width: 320,
        margin: 2,
        color: {
          dark: "#000000",
          light: "#FFFFFF",
        },
      })
        .then((url) => setProfileQrUrl(url))
        .catch((err) => console.error("Error generating profile QR:", err));
    }
  }, [currentUser]);

  if (!isOpen) return null;

  const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onUpdateAvatar) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          onUpdateAvatar(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5 text-slate-100 max-h-[90vh] overflow-y-auto custom-scrollbar relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-full text-slate-400 hover:text-slate-100 hover:bg-slate-800"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Hidden File Input for Avatar Upload */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleAvatarFileChange}
          accept="image/*"
          className="hidden"
        />

        {/* Header & Profile Photo Upload */}
        <div className="flex items-center gap-4 border-b border-slate-800 pb-4">
          <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
            <img
              src={currentUser.avatarUrl}
              alt={currentUser.firstName}
              className="w-16 h-16 rounded-2xl object-cover ring-2 ring-[#00E676] group-hover:opacity-75 transition"
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-2xl opacity-0 group-hover:opacity-100 transition">
              <Camera className="w-5 h-5 text-[#00E676]" />
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <h2 className="font-extrabold text-base text-slate-100 truncate">
              {currentUser.firstName ? `${currentUser.firstName} ${currentUser.lastName || ""}`.trim() : `@${currentUser.username}`}
            </h2>
            <p className="text-xs text-slate-400 truncate">
              @{currentUser.username} {currentUser.email ? `• ${currentUser.email}` : ""}
            </p>
            <div className="flex items-center gap-3 mt-1.5">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="text-[11px] font-bold text-[#00E676] hover:underline flex items-center gap-1"
              >
                <ImageIcon className="w-3 h-3" />
                <span>Foto de perfil</span>
              </button>
              <span className="text-slate-600 text-xs">•</span>
              <button
                onClick={() => setShowQrCard(!showQrCard)}
                className="text-[11px] font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition"
              >
                <QrCode className="w-3 h-3" />
                <span>{showQrCard ? "Ocultar QR" : "Mi QR de Contacto"}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Profile Contact QR Code Display */}
        {showQrCard && profileQrUrl && (
          <div className="p-4 bg-slate-950 rounded-2xl border border-indigo-500/30 flex flex-col items-center text-center space-y-3 animate-in fade-in duration-200">
            <p className="font-extrabold text-xs text-indigo-300 flex items-center gap-1.5">
              <QrCode className="w-4 h-4 text-[#00E676]" />
              <span>Código QR de Contacto Personal</span>
            </p>
            <p className="text-[11px] text-slate-400 max-w-xs">
              Otros usuarios pueden escanear este código QR desde Degv's Messenger para agregarte al instante.
            </p>
            <div className="p-3 bg-white rounded-2xl shadow-xl shadow-[#00E676]/10 ring-2 ring-[#00E676]">
              <img src={profileQrUrl} alt="Mi QR" className="w-44 h-44 object-contain" />
            </div>
            <div className="flex items-center gap-2 pt-1">
              <a
                href={profileQrUrl}
                download={`qr-${currentUser.username}.png`}
                className="px-3 py-1.5 bg-[#00E676] text-slate-950 hover:bg-[#00E676]/90 font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-md transition"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Guardar QR</span>
              </a>
            </div>
          </div>
        )}

        {/* Read Receipts Privacy Toggle */}
        <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-950 border border-slate-800 text-xs">
          <div className="flex items-center gap-2.5">
            <CheckCheck className={`w-4 h-4 ${readReceipts ? "text-[#00E676]" : "text-slate-500"}`} />
            <div>
              <p className="font-bold">Confirmaciones de Lectura</p>
              <p className="text-[11px] text-slate-400">Doble palomita azul cuando lean tus mensajes</p>
            </div>
          </div>
          <button
            onClick={onToggleReadReceipts}
            className={`px-3 py-1.5 rounded-xl font-bold transition ${
              readReceipts ? "bg-[#00E676] text-slate-950" : "bg-slate-800 text-slate-400"
            }`}
          >
            {readReceipts ? "Activado" : "Desactivado"}
          </button>
        </div>

        {/* Automatic Day / Night Dynamic Palette by Time of Day */}
        <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3.5 text-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-500/20 to-cyan-500/20 border border-amber-500/30 flex items-center justify-center">
                {isCurrentDay ? (
                  <Sun className="w-4 h-4 text-amber-400 animate-pulse" />
                ) : (
                  <Moon className="w-4 h-4 text-cyan-400 animate-pulse" />
                )}
              </div>
              <div>
                <p className="font-extrabold text-white flex items-center gap-1.5">
                  <span>Paleta Automática por Hora del Día</span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-black uppercase bg-cyan-950 text-cyan-400 border border-cyan-500/30">
                    Dinámico
                  </span>
                </p>
                <p className="text-[11px] text-slate-400">
                  Alterna tema Claro/Oscuro y acentos según la hora local ({currentTimeStr || "Activo"})
                </p>
              </div>
            </div>
            <button
              onClick={() => onAutoTimePaletteChange && onAutoTimePaletteChange(!autoTimePalette)}
              className={`px-3 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 ${
                autoTimePalette
                  ? "bg-[#00E676] text-slate-950 shadow-md shadow-[#00E676]/20"
                  : "bg-slate-800 text-slate-400"
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>{autoTimePalette ? "Automático ON" : "Manual"}</span>
            </button>
          </div>

          {/* Current Status banner */}
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/90 border border-slate-800/80 text-[11px]">
            <div className="flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-slate-300">
                Estado Actual: <strong className={isCurrentDay ? "text-amber-300" : "text-cyan-300"}>{isCurrentDay ? "☀️ Diurno (06:00 - 19:00)" : "🌙 Nocturno (19:00 - 06:00)"}</strong>
              </span>
            </div>
            <span className="text-slate-400 font-mono text-[10px]">{currentTimeStr}</span>
          </div>

          {/* Light Mode Accent Color (Daytime) */}
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-300 font-bold flex items-center gap-1.5">
                <Sun className="w-3.5 h-3.5 text-amber-400" />
                <span>Color de Acento Diurno (Modo Claro)</span>
              </span>
              <span className="text-slate-400 font-mono text-[10px] uppercase">
                {ACCENT_COLOR_MAP[accentColorLight]?.name || accentColorLight}
              </span>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {(["cyan", "blue", "emerald", "amber", "purple", "pink", "red"] as AccentColorOption[]).map((col) => {
                const info = ACCENT_COLOR_MAP[col];
                const isSelected = accentColorLight === col;
                return (
                  <button
                    key={`light_${col}`}
                    onClick={() => onAccentColorLightChange && onAccentColorLightChange(col)}
                    className={`py-1.5 px-2 rounded-xl border flex items-center gap-1.5 font-bold transition text-[10px] ${
                      isSelected
                        ? "bg-slate-800 text-white border-amber-400 ring-2 ring-amber-400/40"
                        : "bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-900"
                    }`}
                  >
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: info.hex }} />
                    <span className="truncate">{info.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Dark Mode Accent Color (Nighttime) */}
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-300 font-bold flex items-center gap-1.5">
                <Moon className="w-3.5 h-3.5 text-indigo-400" />
                <span>Color de Acento Nocturno (Modo Oscuro)</span>
              </span>
              <span className="text-slate-400 font-mono text-[10px] uppercase">
                {ACCENT_COLOR_MAP[accentColorDark]?.name || accentColorDark}
              </span>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {(["emerald", "purple", "cyan", "pink", "blue", "amber", "red"] as AccentColorOption[]).map((col) => {
                const info = ACCENT_COLOR_MAP[col];
                const isSelected = accentColorDark === col;
                return (
                  <button
                    key={`dark_${col}`}
                    onClick={() => onAccentColorDarkChange && onAccentColorDarkChange(col)}
                    className={`py-1.5 px-2 rounded-xl border flex items-center gap-1.5 font-bold transition text-[10px] ${
                      isSelected
                        ? "bg-slate-800 text-white border-[#00E676] ring-2 ring-[#00E676]/40"
                        : "bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-900"
                    }`}
                  >
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: info.hex }} />
                    <span className="truncate">{info.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Manual Theme Preference when auto is off */}
        {!autoTimePalette && (
          <div className="space-y-2 p-3 rounded-2xl bg-slate-950 border border-slate-800">
            <label className="text-xs font-bold text-slate-300 flex items-center gap-2">
              <Sun className="w-4 h-4 text-amber-400" />
              <span>Tema Visual Manual</span>
            </label>
            <div className="grid grid-cols-3 gap-2 text-xs">
              {(["dark", "light", "system"] as ThemeMode[]).map((t) => (
                <button
                  key={t}
                  onClick={() => onThemeChange(t)}
                  className={`py-2 px-3 rounded-xl border text-center font-bold capitalize transition ${
                    theme === t
                      ? "bg-[#00E676] text-slate-950 border-[#00E676]"
                      : "bg-slate-950 text-slate-300 border-slate-800 hover:bg-slate-800"
                  }`}
                >
                  {t === "dark" ? "Oscuro Neón" : t === "light" ? "Claro" : "Sistema"}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Manual Accent Color when auto is off */}
        {!autoTimePalette && (
          <div className="space-y-2 p-3 rounded-2xl bg-slate-950 border border-slate-800">
            <label className="text-xs font-bold text-slate-300 flex items-center gap-2">
              <Palette className="w-4 h-4 text-[#00E676]" />
              <span>Color de Acento Manual (Menú y Resaltados)</span>
            </label>
            <div className="grid grid-cols-4 gap-2 text-xs">
              {(["emerald", "cyan", "purple", "pink", "amber", "blue", "red"] as AccentColorOption[]).map((colId) => {
                const col = { id: colId, name: ACCENT_COLOR_MAP[colId].name, color: ACCENT_COLOR_MAP[colId].hex };
                return (
                  <button
                    key={col.id}
                    onClick={() => onAccentColorChange && onAccentColorChange(col.id as AccentColorOption)}
                    className={`py-2 px-1.5 rounded-xl border flex items-center justify-center gap-1.5 font-bold transition ${
                      accentColor === col.id
                        ? "bg-slate-800 text-white border-white/60 ring-2 ring-[#00E676]"
                        : "bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-800"
                    }`}
                  >
                    <span className="w-3 h-3 rounded-full shrink-0 shadow" style={{ backgroundColor: col.color }} />
                    <span className="text-[10px] truncate">{col.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Offline Cache Status Monitor */}
        <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2.5 text-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-[#00E676]" />
              <div>
                <p className="font-extrabold text-white flex items-center gap-1.5">
                  <span>Almacenamiento y Caché Local</span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-black uppercase bg-emerald-950 text-[#00E676] border border-emerald-500/30">
                    Carga Instantánea
                  </span>
                </p>
                <p className="text-[11px] text-slate-400">
                  Todo el historial de chats disponible 100% offline sin conexión
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-1 text-center font-mono">
            <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
              <p className="text-[10px] text-slate-400 uppercase font-sans">Chats Guardados</p>
              <p className="text-sm font-bold text-white">{cacheStats?.totalRooms || 0}</p>
            </div>
            <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
              <p className="text-[10px] text-slate-400 uppercase font-sans">Mensajes en Caché</p>
              <p className="text-sm font-bold text-[#00E676]">{cacheStats?.totalMessages || 0}</p>
            </div>
            <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
              <p className="text-[10px] text-slate-400 uppercase font-sans">Latencia Offline</p>
              <p className="text-sm font-bold text-cyan-400">0 ms (Instant)</p>
            </div>
          </div>

          <button
            onClick={() => {
              if (onOpenStorageCleaner) {
                onClose();
                onOpenStorageCleaner();
              } else {
                setShowStorageCleaner(true);
              }
            }}
            className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-rose-950/60 to-slate-900 border border-rose-500/30 hover:border-rose-500/60 text-rose-300 font-bold text-xs flex items-center justify-between transition mt-1"
          >
            <div className="flex items-center gap-1.5">
              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
              <span>Limpiador de Espacio (Borrar multimedia local)</span>
            </div>
            <span className="text-[10px] text-[#00E676] font-mono font-bold">Optimizar &gt;</span>
          </button>
        </div>

        {/* Font Customization */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-300 flex items-center gap-2">
            <Type className="w-4 h-4 text-emerald-400" />
            <span>Fuente Tipográfica (Menú y Chat)</span>
          </label>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {[
              { id: "sans", name: "Sans Moderno" },
              { id: "serif", name: "Serif Elegante" },
              { id: "mono", name: "Monospaced Ciber" },
              { id: "rounded", name: "Redondeado" },
              { id: "display", name: "Space Neón" },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => onFontChange && onFontChange(f.id as FontOption)}
                className={`py-2 px-3 rounded-xl border text-center font-bold transition ${
                  font === f.id
                    ? "bg-[#00E676] text-slate-950 border-[#00E676]"
                    : "bg-slate-950 text-slate-300 border-slate-800 hover:bg-slate-800"
                }`}
              >
                {f.name}
              </button>
            ))}
          </div>
        </div>

        {/* Bubble Style */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-300 flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-400" />
            <span>Estilo de Burbujas de Mensaje</span>
          </label>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {(["rounded", "square", "gradient", "neon"] as BubbleStyle[]).map((st) => (
              <button
                key={st}
                onClick={() => onBubbleStyleChange(st)}
                className={`py-2 px-3 rounded-xl border text-center font-semibold capitalize transition ${
                  bubbleStyle === st
                    ? "bg-indigo-600 text-white border-indigo-500"
                    : "bg-slate-950 text-slate-300 border-slate-800 hover:bg-slate-800"
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {/* Sound Effects & Tone Customization */}
        <SoundSettingsSection soundMuted={soundMuted} onToggleSound={onToggleSound} />

        {/* Data Visualization with Recharts: App Usage & Message Statistics */}
        <AppUsageStats />

        {/* Language Selector */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-300 flex items-center gap-2">
            <Globe className="w-4 h-4 text-cyan-400" />
            <span>Idioma de la Interfaz</span>
          </label>
          <select
            value={language}
            onChange={(e) => onLanguageChange(e.target.value as LanguageCode)}
            className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-2xl text-xs text-slate-200 focus:outline-none focus:border-[#00E676]"
          >
            <option value="es">Español (Latinoamérica / España)</option>
            <option value="en">English (US)</option>
            <option value="pt">Português (Brasil)</option>
            <option value="fr">Français</option>
          </select>
        </div>

        {/* Technical Support Specialized Bot Button */}
        {onOpenSupportBot && (
          <button
            onClick={() => {
              onClose();
              onOpenSupportBot();
            }}
            className="w-full p-3.5 rounded-2xl bg-cyan-950/50 border border-cyan-500/40 hover:bg-cyan-900/60 text-cyan-300 font-extrabold text-xs flex items-center justify-center gap-2.5 transition shadow-lg shadow-cyan-950/40 group active:scale-98"
          >
            <LifeBuoy className="w-4 h-4 text-cyan-400 group-hover:rotate-45 transition-transform" />
            <span>Soporte Técnico Especializado (Reportar Errores o Dudas)</span>
          </button>
        )}

        {/* Cross-Platform Update & Optimization Center Button */}
        {onOpenPlatformUpdate && (
          <button
            onClick={() => {
              onClose();
              onOpenPlatformUpdate();
            }}
            className="w-full p-3.5 rounded-2xl bg-gradient-to-r from-cyan-950/70 via-slate-900 to-emerald-950/70 border border-cyan-500/50 hover:border-[#00E676] text-white font-extrabold text-xs flex items-center justify-between gap-2.5 transition shadow-xl shadow-cyan-950/40 group active:scale-98"
          >
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-xl bg-cyan-500/20 text-cyan-300 group-hover:rotate-180 transition-transform duration-500">
                <RefreshCw className="w-4 h-4" />
              </div>
              <div className="text-left">
                <p className="font-extrabold text-slate-100 flex items-center gap-1.5">
                  <span>Centro de Actualización Multi-Plataforma</span>
                  <span className="w-2 h-2 rounded-full bg-[#00E676] animate-ping" />
                </p>
                <p className="text-[10px] text-slate-400 font-normal">Sincronizar Web, PWA, Android APK, TWA, Termux y GitHub</p>
              </div>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#00E676]/20 text-[#00E676] border border-[#00E676]/40 uppercase font-black">
              Actualizar &gt;
            </span>
          </button>
        )}

        {/* Space Cleaner (Limpiador de Espacio IndexedDB) Button */}
        <button
          onClick={() => {
            if (onOpenStorageCleaner) {
              onClose();
              onOpenStorageCleaner();
            } else {
              setShowStorageCleaner(true);
            }
          }}
          className="w-full p-3.5 rounded-2xl bg-gradient-to-r from-rose-950/60 via-slate-900 to-amber-950/50 border border-rose-500/40 hover:border-rose-400 text-white font-extrabold text-xs flex items-center justify-between gap-2.5 transition shadow-lg shadow-rose-950/40 group active:scale-98"
        >
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-xl bg-rose-500/20 text-rose-400 group-hover:rotate-12 transition-transform">
              <Trash2 className="w-4 h-4" />
            </div>
            <div className="text-left">
              <p className="font-extrabold text-slate-100">Limpiador de Espacio</p>
              <p className="text-[10px] text-slate-400 font-normal">Borrar fotos, audios y videos antiguos de IndexedDB</p>
            </div>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 uppercase font-black">
            Ahorrar Espacio
          </span>
        </button>

        {/* Encrypted Backup & Restore Button */}
        {onOpenBackupModal && (
          <button
            onClick={() => {
              onClose();
              onOpenBackupModal();
            }}
            className="w-full p-3 rounded-2xl bg-indigo-950/40 border border-indigo-500/30 hover:bg-indigo-900/60 text-indigo-300 font-bold text-xs flex items-center justify-center gap-2 transition"
          >
            <Database className="w-4 h-4 text-indigo-400" />
            <span>Copia de Seguridad y Restauración (Cifrado local)</span>
          </button>
        )}

        {/* GitHub, Antigravity, Termux, Capacitor & Bubblewrap Hub */}
        <button
          onClick={() => {
            onClose();
            if (onOpenPublishDeploy) onOpenPublishDeploy();
            else onOpenAndroidGuide();
          }}
          className="w-full p-3.5 rounded-2xl bg-gradient-to-r from-emerald-950/70 via-cyan-950/70 to-indigo-950/70 border border-emerald-500/50 hover:border-[#00E676] text-white font-extrabold text-xs flex items-center justify-center gap-2.5 transition shadow-xl shadow-emerald-950/40 group active:scale-98"
        >
          <FolderGit2 className="w-4 h-4 text-[#00E676] group-hover:scale-110 transition-transform" />
          <span>GitHub, Antigravity, Termux, Capacitor & Bubblewrap Hub</span>
        </button>

        {/* Android PWA / Capacitor Guide */}
        <button
          onClick={() => {
            onClose();
            onOpenAndroidGuide();
          }}
          className="w-full p-3 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 hover:bg-emerald-900/60 text-emerald-300 font-bold text-xs flex items-center justify-center gap-2 transition"
        >
          <Smartphone className="w-4 h-4" />
          <span>Guía de Compilación APK Nativo Android</span>
        </button>

        {/* Logout */}
        <div className="pt-2 border-t border-slate-800">
          <button
            onClick={onLogout}
            className="w-full p-3 rounded-2xl bg-red-950/40 border border-red-500/30 hover:bg-red-900/60 text-red-400 font-bold text-xs flex items-center justify-center gap-2 transition"
          >
            <LogOut className="w-4 h-4" />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </div>

      {/* Storage Cleaner Modal */}
      <StorageCleanerModal
        isOpen={showStorageCleaner}
        onClose={() => setShowStorageCleaner(false)}
        onStorageCleared={() => {
          setCacheStats(storageService.getCacheStats());
        }}
      />
    </div>
  );
};
