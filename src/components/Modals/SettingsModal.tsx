import React, { useRef, useState, useEffect } from "react";
import QRCode from "qrcode";
import { ThemeMode, BubbleStyle, NotificationSettings, LanguageCode, UserProfile, FontOption, AccentColorOption } from "../../types";
import { SoundSettingsSection } from "./SoundSettingsSection";
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
} from "lucide-react";

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
  soundMuted: boolean;
  onToggleSound: () => void;
  language: LanguageCode;
  onLanguageChange: (lang: LanguageCode) => void;
  onOpenAndroidGuide: () => void;
  onOpenBackupModal?: () => void;
  onLogout: () => void;
  readReceipts?: boolean;
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
  soundMuted,
  onToggleSound,
  language,
  onLanguageChange,
  onOpenAndroidGuide,
  onOpenBackupModal,
  onLogout,
  readReceipts = true,
  onToggleReadReceipts,
  onUpdateAvatar,
}) => {

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [profileQrUrl, setProfileQrUrl] = useState<string>("");
  const [showQrCard, setShowQrCard] = useState<boolean>(false);

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

        {/* Theme Preference */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-300 flex items-center gap-2">
            <Sun className="w-4 h-4 text-amber-400" />
            <span>Tema Visual</span>
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

        {/* Menu & Chat Accent Color */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-300 flex items-center gap-2">
            <Palette className="w-4 h-4 text-[#00E676]" />
            <span>Color de Acento (Menú y Resaltados)</span>
          </label>
          <div className="grid grid-cols-4 gap-2 text-xs">
            {[
              { id: "emerald", name: "Verde Neón", color: "#00E676" },
              { id: "cyan", name: "Cian Ciber", color: "#00E5FF" },
              { id: "purple", name: "Púrpura", color: "#A855F7" },
              { id: "pink", name: "Rosa Ciber", color: "#EC4899" },
              { id: "amber", name: "Dorado", color: "#F59E0B" },
              { id: "blue", name: "Azul Eléctrico", color: "#3B82F6" },
              { id: "red", name: "Rojo Neón", color: "#FF2A6D" },
            ].map((col) => (
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

        {/* Android PWA / Capacitor Guide */}
        <button
          onClick={() => {
            onClose();
            onOpenAndroidGuide();
          }}
          className="w-full p-3 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 hover:bg-emerald-900/60 text-emerald-300 font-bold text-xs flex items-center justify-center gap-2 transition"
        >
          <Smartphone className="w-4 h-4" />
          <span>Convertir en App Nativa Android / Capacitor</span>
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
    </div>
  );
};
