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
  Share2,
  FolderGit2,
  Terminal,
  RefreshCw,
} from "lucide-react";

interface SidebarHeaderProps {
  currentUser: UserProfile;
  activeFilter: string;
  onFilterChange: (filter: string) => void;
  onOpenNewChat: () => void;
  onOpenVault: () => void;
  onOpenSettings: () => void;
  onOpenAndroidGuide: () => void;
  onOpenPublishDeploy?: () => void;
  onOpenPlatformUpdate?: () => void;
  onOpenGitHubActions?: () => void;
  isUpdateAvailable?: boolean;
  isOptimizing?: boolean;
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
  onOpenPublishDeploy,
  onOpenPlatformUpdate,
  onOpenGitHubActions,
  isUpdateAvailable = false,
  isOptimizing = false,
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
          {/* Server Status Pill & Local Cache Badge */}
          <div className="flex items-center gap-2 text-[11px] text-slate-400">
            <div className="flex items-center gap-1.5">
              <span
                className={`w-2 h-2 rounded-full ${
                  serverStatus === "online"
                    ? "bg-[#00E676] animate-pulse"
                    : "bg-amber-400"
                }`}
              />
              <span className="font-medium text-slate-300">
                {serverStatus === "online" ? "En línea" : "Offline"}
              </span>
            </div>
            <span className="text-slate-600">•</span>
            <span
              className="px-1.5 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-500/30 text-cyan-300 text-[9px] font-extrabold flex items-center gap-1 tracking-tight cursor-default"
              title="Historial de chats almacenado en caché local para carga instantánea 0ms"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
              <span>Caché 0ms</span>
            </span>
          </div>
        </div>
      </div>

      {/* Header Action Buttons */}
      <div className="flex items-center gap-1.5 text-slate-400">
        {/* Cross-Platform Update & Optimizer Button */}
        {onOpenPlatformUpdate && (
          <button
            onClick={onOpenPlatformUpdate}
            title={isUpdateAvailable ? "¡Nueva versión disponible! Actualizar y optimizar" : "Actualizar y Optimizar Plataformas"}
            className={`p-1.5 rounded-xl transition-all relative group ${
              isUpdateAvailable
                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-400/50 shadow-[0_0_10px_rgba(0,229,255,0.4)] animate-pulse"
                : "bg-slate-900/90 border border-white/10 hover:border-[#00E676]/40 text-slate-300 hover:text-[#00E676]"
            }`}
            id="platform-update-btn"
          >
            <RefreshCw className={`w-4 h-4 ${isOptimizing ? "animate-spin text-cyan-400" : ""}`} />
            {isUpdateAvailable && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-cyan-400 border-2 border-[#0a0a0a] animate-ping" />
            )}
            <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-[#0a0a0a] text-cyan-300 font-bold text-[10px] py-0.5 px-2 rounded opacity-0 group-hover:opacity-100 transition pointer-events-none whitespace-nowrap z-50 border border-cyan-500/40 shadow-lg">
              {isUpdateAvailable ? "¡Actualización Lista!" : "Actualizar & Optimizar"}
            </span>
          </button>
        )}

        {/* GitHub, Antigravity, Termux, Capacitor Hub */}
        <button
          onClick={onOpenGitHubActions || onOpenPublishDeploy || onOpenAndroidGuide}
          title="GitHub Actions CI/CD, APK & Sincronización"
          className="p-1.5 rounded-xl hover:text-[#00E676] bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 transition-colors relative group"
          id="publish-deploy-btn"
        >
          <FolderGit2 className="w-4 h-4 text-[#00E676]" />
          <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-[#0a0a0a] text-[#00E676] font-bold text-[10px] py-0.5 px-2 rounded opacity-0 group-hover:opacity-100 transition pointer-events-none whitespace-nowrap z-50 border border-emerald-500/40 shadow-lg">
            GitHub Actions / APK
          </span>
        </button>

        {/* Android APK Guide Shortcut */}
        <button
          onClick={onOpenAndroidGuide}
          title="Convertir en App Nativa Android / Capacitor"
          className="p-1.5 rounded-xl hover:text-[#00E676] transition-colors relative group"
          id="android-apk-btn"
        >
          <Smartphone className="w-4.5 h-4.5" />
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
          <Plus className="w-4.5 h-4.5" />
        </button>

        {/* Bóveda Secreta */}
        <button
          onClick={onOpenVault}
          title="Bóveda Secreta (Chat Oculto)"
          className="p-1.5 rounded-xl hover:text-[#00E676] transition-colors text-amber-400 hover:text-amber-300"
          id="vault-btn"
        >
          <Lock className="w-4.5 h-4.5" />
        </button>

        {/* Settings */}
        <button
          onClick={onOpenSettings}
          title="Ajustes y Configuración"
          className="p-1.5 rounded-xl hover:text-[#00E676] transition-colors"
          id="settings-btn"
        >
          <Settings className="w-4.5 h-4.5" />
        </button>
      </div>
    </div>
  );
};

