import React from "react";
import { UserProfile, ThemeMode } from "../../types";
import {
  Plus,
  Lock,
  Archive,
  Settings,
  Sun,
  Moon,
  Sparkles,
  Wifi,
  Smartphone,
} from "lucide-react";

interface SidebarHeaderProps {
  currentUser: UserProfile;
  activeFilter: string;
  onFilterChange: (filter: string) => void;
  onOpenNewChat: () => void;
  onOpenVault: () => void;
  onOpenSettings: () => void;
  onOpenAndroidGuide: () => void;
  theme: ThemeMode;
  onToggleTheme: () => void;
  serverStatus: "online" | "connecting" | "offline";
}

export const SidebarHeader: React.FC<SidebarHeaderProps> = ({
  currentUser,
  activeFilter,
  onFilterChange,
  onOpenNewChat,
  onOpenVault,
  onOpenSettings,
  onOpenAndroidGuide,
  theme,
  onToggleTheme,
  serverStatus,
}) => {
  return (
    <div className="h-20 px-4 bg-[#0a0a0a]/90 backdrop-blur-md border-b border-white/5 flex items-center justify-between select-none">
      {/* User Info & Brand Logo */}
      <div className="flex items-center gap-3">
        {/* Futuristic Brand App Logo */}
        <div className="relative group cursor-pointer" onClick={onOpenSettings} title="Ajustes de Perfil y App">
          <div className="relative p-0.5 rounded-2xl bg-gradient-to-br from-[#00FF66] via-[#00F0FF] to-[#00B248] shadow-[0_0_15px_rgba(0,255,102,0.4)] transition hover:scale-105">
            <img
              src="/icon.svg"
              alt="Degv's Cyber Icon"
              referrerPolicy="no-referrer"
              className="w-10 h-10 rounded-[14px] bg-[#040812] object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).src = "/icon-512.png";
              }}
            />
          </div>
          <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-[#00E676] border-2 border-[#0a0a0a] rounded-full shadow-[0_0_6px_#00E676]" />
        </div>

        <div>
          <div className="flex items-center gap-1.5">
            <h1 className="font-extrabold tracking-tight text-base bg-gradient-to-r from-white via-slate-100 to-[#00FF66] bg-clip-text text-transparent drop-shadow-[0_0_10px_rgba(0,255,102,0.3)]">
              Degv's
            </h1>
            <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-black bg-[#00FF66]/20 text-[#00FF66] border border-[#00FF66]/40 uppercase tracking-widest shadow-[0_0_8px_rgba(0,255,102,0.2)]">
              CYBER
            </span>
          </div>
          {/* Server Status Pill */}
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
            <span
              className={`w-2 h-2 rounded-full ${
                serverStatus === "online"
                  ? "bg-[#00E676] animate-pulse"
                  : "bg-amber-400"
              }`}
            />
            <span className="font-medium text-slate-300">
              {serverStatus === "online" ? "En línea • Server OK" : "Conectando..."}
            </span>
          </div>
        </div>
      </div>

      {/* Header Action Buttons */}
      <div className="flex items-center gap-2 text-slate-400">
        {/* Android APK Guide Shortcut */}
        <button
          onClick={onOpenAndroidGuide}
          title="Convertir en App Nativa Android / Capacitor"
          className="p-1.5 rounded-xl hover:text-[#00E676] transition-colors relative group"
          id="android-apk-btn"
        >
          <Smartphone className="w-5 h-5" />
          <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-[#0a0a0a] text-slate-200 text-[10px] py-0.5 px-2 rounded opacity-0 group-hover:opacity-100 transition pointer-events-none whitespace-nowrap z-50 border border-white/10">
            App Android
          </span>
        </button>

        {/* New Chat Button */}
        <button
          onClick={onOpenNewChat}
          title="Nuevo Chat (Ctrl+N)"
          className="p-1.5 rounded-xl text-slate-400 hover:text-[#00E676] transition-colors"
          id="new-chat-btn"
        >
          <Plus className="w-5 h-5" />
        </button>

        {/* Bóveda Secreta */}
        <button
          onClick={onOpenVault}
          title="Bóveda Secreta (Chat Oculto)"
          className="p-1.5 rounded-xl hover:text-[#00E676] transition-colors text-amber-400 hover:text-amber-300"
          id="vault-btn"
        >
          <Lock className="w-5 h-5" />
        </button>

        {/* Settings */}
        <button
          onClick={onOpenSettings}
          title="Ajustes y Configuración"
          className="p-1.5 rounded-xl hover:text-[#00E676] transition-colors"
          id="settings-btn"
        >
          <Settings className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
