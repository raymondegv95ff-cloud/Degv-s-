import React from "react";
import {
  RadioChannel,
  RADIO_CHANNELS,
  walkieTalkieService,
  walkieAudioEngine,
  WalkieTransmission,
  AudioModulationEffect,
  MODULATION_EFFECTS,
} from "../../services/walkieTalkieService";
import {
  Radio,
  Radar,
  Activity,
  Mic,
  Volume2,
  Sliders,
  Sparkles,
  Play,
  RotateCcw,
  Zap,
} from "lucide-react";

interface WalkieTalkieSidebarListProps {
  selectedChannel: RadioChannel;
  onSelectChannel: (channel: RadioChannel) => void;
  isTransmitting: boolean;
  isScanning: boolean;
  onToggleScanner: () => void;
  onTriggerPttModal?: () => void;
  selectedEffect: AudioModulationEffect;
  onSelectEffect: (effect: AudioModulationEffect) => void;
  recentTransmissions: WalkieTransmission[];
  onPlayTransmission: (tx: WalkieTransmission) => void;
}

export const WalkieTalkieSidebarList: React.FC<WalkieTalkieSidebarListProps> = ({
  selectedChannel,
  onSelectChannel,
  isTransmitting,
  isScanning,
  onToggleScanner,
  onTriggerPttModal,
  selectedEffect,
  onSelectEffect,
  recentTransmissions,
  onPlayTransmission,
}) => {
  return (
    <div className="flex-1 overflow-y-auto p-3.5 space-y-3.5 custom-scrollbar bg-[#050911] select-none text-slate-100">
      {/* Top Tactical Channel Status Card */}
      <div className="p-4 rounded-3xl bg-gradient-to-br from-slate-900 via-[#07131b] to-black border-2 border-cyan-500/40 shadow-[0_0_20px_rgba(6,182,212,0.15)] relative overflow-hidden">
        <div className="flex items-center justify-between pb-2 border-b border-cyan-500/20">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00E676] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#00E676]"></span>
            </span>
            <span className="font-mono text-xs font-black text-cyan-300">
              ESTACIÓN RF PRINCIPAL
            </span>
          </div>
          <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
            {selectedChannel.modulation}
          </span>
        </div>

        <div className="my-3">
          <div className="flex items-baseline justify-between">
            <h3 className="font-mono text-2xl font-black tracking-tight text-white drop-shadow-[0_0_10px_rgba(0,230,118,0.4)]">
              {selectedChannel.frequency.toFixed(4)}{" "}
              <span className="text-xs text-slate-400 font-sans font-normal">MHz</span>
            </h3>
            <span className="font-mono text-xs font-bold text-[#00E676] px-2 py-0.5 rounded-lg bg-[#00E676]/10 border border-[#00E676]/30">
              CH-{selectedChannel.channelNumber.toString().padStart(2, "0")}
            </span>
          </div>
          <p className="text-xs text-slate-300 font-medium mt-0.5">
            {selectedChannel.name}
          </p>
          <p className="text-[11px] text-slate-400 mt-1 line-clamp-1">
            {selectedChannel.description}
          </p>
        </div>

        {/* Quick Actions in Sidebar */}
        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/80">
          <button
            onClick={onToggleScanner}
            className={`py-2 px-3 rounded-xl text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition ${
              isScanning
                ? "bg-cyan-500 text-black shadow-[0_0_12px_rgba(6,182,212,0.5)] animate-pulse"
                : "bg-slate-800/80 text-cyan-300 border border-cyan-500/30 hover:bg-slate-800"
            }`}
          >
            <Radar className={`w-3.5 h-3.5 ${isScanning ? "animate-spin" : ""}`} />
            <span>{isScanning ? "Escaneando..." : "Escanear RF"}</span>
          </button>

          {onTriggerPttModal && (
            <button
              onClick={onTriggerPttModal}
              className="py-2 px-3 rounded-xl text-xs font-mono font-bold bg-[#00E676]/20 border border-[#00E676]/50 text-[#00E676] hover:bg-[#00E676] hover:text-black transition flex items-center justify-center gap-1.5 shadow-sm"
            >
              <Mic className="w-3.5 h-3.5" />
              <span>Modal PTT</span>
            </button>
          )}
        </div>
      </div>

      {/* DSP Audio Filter Quick Switch */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between px-1">
          <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span>Filtro DSP Activo</span>
          </span>
          <span className="text-[10px] text-purple-300 font-mono">
            {MODULATION_EFFECTS.find((e) => e.id === selectedEffect)?.name}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-1">
          {MODULATION_EFFECTS.slice(0, 6).map((fx) => {
            const isSel = selectedEffect === fx.id;
            return (
              <button
                key={fx.id}
                onClick={() => {
                  onSelectEffect(fx.id);
                  walkieAudioEngine.triggerHaptic("channel_switch");
                }}
                className={`py-1.5 px-2 rounded-xl text-[10px] font-bold border transition text-center truncate ${
                  isSel
                    ? "bg-purple-950/90 border-purple-400 text-purple-200 shadow-[0_0_8px_rgba(168,85,247,0.3)]"
                    : "bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                }`}
                title={fx.shortDesc}
              >
                {fx.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Channel Presets List */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between px-1">
          <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1">
            <Radio className="w-3.5 h-3.5 text-[#00E676]" />
            <span>Canales Disponibles ({RADIO_CHANNELS.length})</span>
          </span>
          <span className="text-[10px] text-slate-400 font-mono">144-446 MHz</span>
        </div>

        <div className="space-y-1.5">
          {RADIO_CHANNELS.map((ch) => {
            const isSelected = selectedChannel.id === ch.id;
            return (
              <div
                key={ch.id}
                onClick={() => {
                  onSelectChannel(ch);
                  walkieAudioEngine.triggerHaptic("channel_switch");
                }}
                className={`p-2.5 rounded-2xl border transition cursor-pointer flex items-center justify-between group ${
                  isSelected
                    ? "bg-slate-900 border-[#00E676] shadow-[0_0_12px_rgba(0,230,118,0.2)]"
                    : "bg-slate-900/50 border-slate-800/80 hover:bg-slate-800/70 hover:border-slate-700"
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={`w-7 h-7 rounded-xl font-mono text-xs font-bold flex items-center justify-center shrink-0 transition ${
                      isSelected
                        ? "bg-[#00E676] text-black shadow-[0_0_8px_rgba(0,230,118,0.4)]"
                        : "bg-slate-800 text-slate-300 group-hover:text-white"
                    }`}
                  >
                    {ch.channelNumber}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-xs font-extrabold text-white truncate">
                        {ch.frequency.toFixed(4)} MHz
                      </span>
                      <span className="text-[9px] px-1 py-0.2 rounded font-mono font-bold bg-slate-800 text-slate-400">
                        {ch.modulation}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 truncate max-w-[170px]">
                      {ch.name}
                    </p>
                  </div>
                </div>

                {isSelected ? (
                  <span className="w-2 h-2 rounded-full bg-[#00E676] animate-pulse shrink-0" />
                ) : (
                  <span className="text-[10px] text-slate-500 font-mono group-hover:text-cyan-400 transition">
                    Sintonizar
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Transmissions Signals Log in Sidebar */}
      {recentTransmissions.length > 0 && (
        <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1">
              <Activity className="w-3.5 h-3.5 text-cyan-400" />
              <span>Transmisiones Recientes ({recentTransmissions.length})</span>
            </span>
          </div>

          <div className="space-y-1 max-h-44 overflow-y-auto custom-scrollbar pr-1">
            {recentTransmissions.slice(0, 5).map((tx, idx) => (
              <div
                key={tx.id || `tx_${idx}`}
                className="p-2 rounded-xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 flex items-center justify-between gap-2 text-xs"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <img
                    src={tx.senderAvatar}
                    alt={tx.senderName}
                    className="w-6 h-6 rounded-full object-cover border border-slate-700 shrink-0"
                  />
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold text-slate-200 truncate">
                      {tx.senderName}
                    </p>
                    <p className="text-[9px] text-slate-400 font-mono">
                      {tx.channelFrequency.toFixed(4)} MHz • {tx.durationSeconds}s
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => onPlayTransmission(tx)}
                  className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500 hover:text-black transition"
                  title="Reproducir transmisión"
                >
                  <Play className="w-3 h-3 fill-current" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
