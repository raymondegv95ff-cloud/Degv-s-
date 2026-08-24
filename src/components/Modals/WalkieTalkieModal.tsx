import React, { useState, useEffect, useRef, useCallback } from "react";
import { Room, UserProfile } from "../../types";
import {
  RADIO_CHANNELS,
  RadioChannel,
  walkieTalkieService,
  walkieAudioEngine,
  WalkieTransmission,
  AudioModulationEffect,
  MODULATION_EFFECTS,
  ChannelScanResult,
} from "../../services/walkieTalkieService";
import {
  Radio,
  X,
  Volume2,
  VolumeX,
  Sliders,
  ShieldCheck,
  ShieldAlert,
  Zap,
  Mic,
  Activity,
  ChevronRight,
  RefreshCw,
  Users,
  Lock,
  Unlock,
  RadioTower,
  Sparkles,
  Send,
  Waves,
  Bot,
  Radar,
  Gauge,
  Search,
  Signal,
  Filter,
} from "lucide-react";

interface WalkieTalkieModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  activeRoom?: Room | null;
  onSendVoiceToChat?: (content: string, type: "audio", mediaUrl: string, audioDuration?: number) => void;
}

// Sub-component for real-time fluctuating CSS animated signal strength meter
const ChannelSignalMeter: React.FC<{
  channel: RadioChannel;
  isActive: boolean;
  isTransmitting?: boolean;
}> = ({ channel, isActive, isTransmitting }) => {
  // Deterministic yet varied mock signal metric based on channel frequency and number
  const baseSignal = isActive ? 92 : Math.max(25, Math.round(50 + Math.sin(channel.channelNumber * 1.8) * 35));
  const sMeterText = baseSignal > 85 ? "S9+20" : baseSignal > 70 ? "S9" : baseSignal > 50 ? "S7" : baseSignal > 35 ? "S5" : "S3";
  const dbmValue = -115 + Math.round((baseSignal / 100) * 65);

  return (
    <div className="flex items-center gap-1.5 shrink-0" title={`Señal: ${sMeterText} (${dbmValue} dBm)`}>
      {/* Fluctuating CSS-animated signal bars */}
      <div className="flex items-end gap-0.5 h-3.5 w-5 justify-center">
        <div
          className={`w-0.5 rounded-full ${
            isActive ? "bg-[#00E676] animate-signal-1" : baseSignal > 30 ? "bg-cyan-400 animate-signal-3" : "bg-slate-700"
          }`}
          style={{ height: isActive || baseSignal > 20 ? "40%" : "20%" }}
        />
        <div
          className={`w-0.5 rounded-full ${
            isActive ? "bg-[#00E676] animate-signal-2" : baseSignal > 45 ? "bg-cyan-400 animate-signal-1" : "bg-slate-700"
          }`}
          style={{ height: isActive || baseSignal > 40 ? "65%" : "20%" }}
        />
        <div
          className={`w-0.5 rounded-full ${
            isActive ? "bg-[#00E676] animate-signal-3" : baseSignal > 65 ? "bg-cyan-400 animate-signal-4" : "bg-slate-700"
          }`}
          style={{ height: isActive || baseSignal > 60 ? "85%" : "20%" }}
        />
        <div
          className={`w-0.5 rounded-full ${
            isActive ? (isTransmitting ? "bg-rose-500 animate-signal-5" : "bg-[#00E676] animate-signal-4") : baseSignal > 80 ? "bg-cyan-400 animate-signal-2" : "bg-slate-700"
          }`}
          style={{ height: isActive || baseSignal > 75 ? "100%" : "20%" }}
        />
      </div>
      <span className="font-mono text-[9px] font-bold text-slate-400">
        {sMeterText}
      </span>
    </div>
  );
};

export const WalkieTalkieModal: React.FC<WalkieTalkieModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  activeRoom,
  onSendVoiceToChat,
}) => {
  const [selectedChannel, setSelectedChannel] = useState<RadioChannel>(
    walkieTalkieService.getActiveChannel()
  );
  const [currentModulation, setCurrentModulation] = useState<"FM" | "AM" | "SSB" | "DMR">("FM");
  const [selectedEffect, setSelectedEffect] = useState<AudioModulationEffect>(() => walkieTalkieService.getActiveEffect());
  const [customFrequency, setCustomFrequency] = useState<number>(selectedChannel.frequency);
  const [isTransmitting, setIsTransmitting] = useState(false);
  const [isPttLocked, setIsPttLocked] = useState(false);
  const [squelch, setSquelch] = useState(walkieTalkieService.getSquelchLevel());
  const [volume, setVolume] = useState(walkieTalkieService.getVolumeLevel());
  const [isMuted, setIsMuted] = useState(false);
  const [isReceiving, setIsReceiving] = useState(false);
  const [incomingTransmitter, setIncomingTransmitter] = useState<string | null>(null);
  const [txDurationSeconds, setTxDurationSeconds] = useState(0);
  const [recentTransmissions, setRecentTransmissions] = useState<WalkieTransmission[]>([]);
  const [audioMeterLevel, setAudioMeterLevel] = useState(0);

  // Scanner state
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isScanningActive, setIsScanningActive] = useState(false);
  const [scanStep, setScanStep] = useState(0);
  const [scannedChannels, setScannedChannels] = useState<ChannelScanResult[]>([]);
  const scannerIntervalRef = useRef<any>(null);

  // Audio capture refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const dspCleanupRef = useRef<(() => void) | null>(null);
  const txTimerRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const isPointerDownRef = useRef(false);

  // Sync selected channel frequency & modulation
  useEffect(() => {
    setCustomFrequency(selectedChannel.frequency);
    setCurrentModulation(selectedChannel.modulation);
    walkieTalkieService.setActiveChannel(selectedChannel);
  }, [selectedChannel]);

  // Sync active effect to service
  useEffect(() => {
    walkieTalkieService.setActiveEffect(selectedEffect);
  }, [selectedEffect]);

  // Subscribe to real-time transmissions on the active radio channel
  useEffect(() => {
    if (!isOpen) return;

    const unsubscribe = walkieTalkieService.subscribeToChannel(
      selectedChannel.id,
      currentUser.id,
      (tx) => {
        // Handle incoming transmission
        setRecentTransmissions((prev) => [tx, ...prev.slice(0, 7)]);
        setIsReceiving(true);
        setIncomingTransmitter(tx.senderName);

        if (!isMuted) {
          const effectiveVol = volume / 100;
          walkieAudioEngine.playRadioAudio(tx.audioDataUrl, effectiveVol, tx.modulation);
        }

        setTimeout(() => {
          setIsReceiving(false);
          setIncomingTransmitter(null);
        }, (tx.durationSeconds || 3) * 1000 + 400);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [isOpen, selectedChannel.id, currentUser.id, isMuted, volume]);

  // Frequency Scanner Routine
  const startScanner = () => {
    setIsScanningActive(true);
    setIsScannerOpen(true);
    setScanStep(0);

    if (scannerIntervalRef.current) clearInterval(scannerIntervalRef.current);

    let step = 0;
    scannerIntervalRef.current = setInterval(() => {
      step = (step + 1) % RADIO_CHANNELS.length;
      setScanStep(step);
      walkieAudioEngine.playScannerClick();
      walkieAudioEngine.triggerHaptic("scan_tick");

      // Update scanned results live
      const currentResults = walkieTalkieService.scanAllChannels(selectedChannel.id);
      setScannedChannels(currentResults);
    }, 450);
  };

  const stopScanner = () => {
    setIsScanningActive(false);
    if (scannerIntervalRef.current) {
      clearInterval(scannerIntervalRef.current);
      scannerIntervalRef.current = null;
    }
  };

  const tuneToScannedChannel = (ch: RadioChannel) => {
    setSelectedChannel(ch);
    walkieAudioEngine.triggerHaptic("channel_switch");
    stopScanner();
    setIsScannerOpen(false);
  };

  // Start real transmission with microphone capture & Web Audio API DSP modulation
  const handleStartTransmission = useCallback(async () => {
    if (isTransmitting) return;

    try {
      isPointerDownRef.current = true;

      // Real tactile vibration feedback using window.navigator.vibrate API when transmission begins
      if (
        typeof window !== "undefined" &&
        typeof window.navigator !== "undefined" &&
        "vibrate" in window.navigator &&
        typeof window.navigator.vibrate === "function"
      ) {
        window.navigator.vibrate([60, 30, 80]);
      } else {
        walkieAudioEngine.triggerHaptic("tx_start");
      }

      // Play opening chirp tone
      walkieAudioEngine.playPttOpenBeep();

      // Real audio input from microphone
      const rawStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      // If user lifted finger during prompt or setup, stop immediately
      if (!isPointerDownRef.current && !isPttLocked) {
        rawStream.getTracks().forEach((t) => t.stop());
        return;
      }

      streamRef.current = rawStream;
      audioChunksRef.current = [];

      // Apply real-time Web Audio API modulation effect DSP graph
      const { modulatedStream, cleanup, audioContext: dspCtx } = walkieAudioEngine.createModulatedMediaStream(
        rawStream,
        selectedEffect
      );
      dspCleanupRef.current = cleanup;
      audioContextRef.current = dspCtx;

      // Setup audio analyzer for live LED meter
      try {
        const analyser = dspCtx.createAnalyser();
        analyser.fftSize = 32;
        analyserRef.current = analyser;
        const source = dspCtx.createMediaStreamSource(modulatedStream);
        source.connect(analyser);

        const updateMeter = () => {
          if (!analyserRef.current) return;
          const data = new Uint8Array(analyserRef.current.frequencyBinCount);
          analyserRef.current.getByteFrequencyData(data);
          let sum = 0;
          for (let i = 0; i < data.length; i++) sum += data[i];
          const avg = sum / data.length;
          setAudioMeterLevel(Math.min(100, Math.round((avg / 200) * 100)));
          animFrameRef.current = requestAnimationFrame(updateMeter);
        };
        updateMeter();
      } catch (e) {
        console.warn("[WalkieTalkie] Meter setup fallback:", e);
      }

      let mimeType = "audio/webm";
      if (typeof MediaRecorder !== "undefined") {
        if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
          mimeType = "audio/webm;codecs=opus";
        } else if (MediaRecorder.isTypeSupported("audio/ogg;codecs=opus")) {
          mimeType = "audio/ogg;codecs=opus";
        } else if (MediaRecorder.isTypeSupported("audio/mp4")) {
          mimeType = "audio/mp4";
        }
      }

      // Record the modulated DSP audio stream
      const mediaRecorder = new MediaRecorder(modulatedStream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start(100); // 100ms real audio chunk slicing
      setIsTransmitting(true);
      setTxDurationSeconds(0);

      txTimerRef.current = setInterval(() => {
        setTxDurationSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("[WalkieTalkie] Real Mic error:", err);
      setIsTransmitting(false);
      isPointerDownRef.current = false;
    }
  }, [isTransmitting, isPttLocked, selectedEffect]);

  // Stop transmission immediately when finger/pointer is lifted or released
  const handleStopTransmission = useCallback(async () => {
    isPointerDownRef.current = false;
    if (!isTransmitting) return;

    // Real tactile vibration feedback using window.navigator.vibrate API when transmission ends
    if (
      typeof window !== "undefined" &&
      typeof window.navigator !== "undefined" &&
      "vibrate" in window.navigator &&
      typeof window.navigator.vibrate === "function"
    ) {
      window.navigator.vibrate([40, 20]);
    } else {
      walkieAudioEngine.triggerHaptic("tx_stop");
    }

    setIsTransmitting(false);
    setIsPttLocked(false);
    setAudioMeterLevel(0);

    if (txTimerRef.current) clearInterval(txTimerRef.current);
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);

    // Play Roger Beep + Squelch tail
    walkieAudioEngine.playRogerBeep();

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }
    if (dspCleanupRef.current) {
      dspCleanupRef.current();
      dspCleanupRef.current = null;
    }

    // Process and broadcast recorded real radio audio burst
    const chunks = [...audioChunksRef.current];
    if (chunks.length > 0) {
      const mime = mediaRecorderRef.current?.mimeType || "audio/webm";
      const blob = new Blob(chunks, { type: mime });

      const dataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });

      const duration = Math.max(1, txDurationSeconds);

      // Broadcast transmission to the radio frequency channel
      const txPayload: Omit<WalkieTransmission, "timestamp"> = {
        channelId: selectedChannel.id,
        channelFrequency: customFrequency,
        senderId: currentUser.id,
        senderName: `${currentUser.firstName || ""} ${currentUser.lastName || ""}`.trim() || currentUser.username,
        senderAvatar: currentUser.avatarUrl,
        targetRoomId: activeRoom?.id,
        audioDataUrl: dataUrl,
        durationSeconds: duration,
        modulation: currentModulation,
      };

      walkieTalkieService.broadcastTransmission(txPayload);

      // Add to local transmissions log
      setRecentTransmissions((prev) => [
        { ...txPayload, timestamp: Date.now() },
        ...prev.slice(0, 7),
      ]);

      // If activeRoom is open and user wants to forward transmission to chat
      if (onSendVoiceToChat && activeRoom) {
        onSendVoiceToChat(
          `📻 Transmisión Walkie-Talkie [CH-${selectedChannel.channelNumber.toString().padStart(2, "0")} • ${customFrequency.toFixed(4)} MHz ${currentModulation} | FX: ${selectedEffect}]`,
          "audio",
          dataUrl,
          duration
        );
      }
    }
  }, [isTransmitting, txDurationSeconds, selectedChannel, customFrequency, currentUser, activeRoom, currentModulation, selectedEffect, onSendVoiceToChat]);

  // Handle cleanup on modal close
  useEffect(() => {
    if (!isOpen) {
      handleStopTransmission();
      stopScanner();
    }
  }, [isOpen, handleStopTransmission]);

  // Keyboard shortcut: Spacebar to push-to-talk (press to transmit, release to stop)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" && !e.repeat && (e.target as HTMLElement)?.tagName !== "INPUT" && (e.target as HTMLElement)?.tagName !== "TEXTAREA") {
        e.preventDefault();
        if (!isTransmitting) {
          handleStartTransmission();
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space" && (e.target as HTMLElement)?.tagName !== "INPUT" && (e.target as HTMLElement)?.tagName !== "TEXTAREA") {
        e.preventDefault();
        if (!isPttLocked) {
          handleStopTransmission();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [isOpen, isTransmitting, isPttLocked, handleStartTransmission, handleStopTransmission]);

  const togglePttLock = () => {
    if (isPttLocked) {
      setIsPttLocked(false);
      handleStopTransmission();
    } else {
      setIsPttLocked(true);
      handleStartTransmission();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-4 bg-slate-950/90 backdrop-blur-xl animate-in fade-in duration-200">
      {/* Tactical Walkie-Talkie Chassis Container */}
      <div className="w-full max-w-lg bg-gradient-to-b from-slate-900 via-slate-950 to-black border-2 border-slate-700/80 rounded-[2.5rem] shadow-[0_0_50px_rgba(0,0,0,0.9)] overflow-hidden relative flex flex-col text-slate-100 p-5 sm:p-6 select-none max-h-[95vh] overflow-y-auto custom-scrollbar">
        {/* Antenna & Rugged Grip Accents */}
        <div className="absolute top-0 right-10 w-4 h-5 bg-slate-700 rounded-b-md shadow-inner border border-slate-600 pointer-events-none" />
        <div className="absolute top-0 left-6 w-8 h-3 bg-slate-800 rounded-b-md border-x border-b border-slate-700 pointer-events-none" />

        {/* Top Radio Status Bar */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 z-10">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-xl bg-[#00E676]/20 text-[#00E676] border border-[#00E676]/30">
              <Radio className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-xs font-black tracking-widest text-white uppercase">
                  DEGV'S RADIO-TRANSCEIVER
                </span>
                <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-[#00E676]/20 text-[#00E676] border border-[#00E676]/30">
                  PTT REAL
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-mono">
                VHF-UHF • Transmisión Directa • S-Meter Fluctuante
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Frequency Scanner Trigger Button */}
            <button
              onClick={() => {
                if (isScannerOpen) {
                  stopScanner();
                  setIsScannerOpen(false);
                } else {
                  startScanner();
                }
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold font-mono flex items-center gap-1.5 transition ${
                isScannerOpen
                  ? "bg-cyan-500 text-black shadow-[0_0_12px_rgba(6,182,212,0.6)] animate-pulse"
                  : "bg-slate-800/80 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-950/40 hover:border-cyan-400"
              }`}
              title="Escanear frecuencias activas y fuerza de señal"
            >
              <Radar className={`w-3.5 h-3.5 ${isScanningActive ? "animate-spin" : ""}`} />
              <span>{isScannerOpen ? "CERRAR SCANNER" : "SCANNER RF"}</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition"
              title="Cerrar Walkie Talkie"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* FREQUENCY SCANNER RADAR HUD OVERLAY */}
        {isScannerOpen && (
          <div className="my-3 p-3.5 rounded-2xl bg-[#051119] border-2 border-cyan-500/50 shadow-[0_0_25px_rgba(6,182,212,0.25)] relative overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-cyan-500/20">
              <div className="flex items-center gap-2">
                <div className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500"></span>
                </div>
                <span className="font-mono text-xs font-bold text-cyan-300">
                  ESPECTRÓMETRO & SCANNER DE FRECUENCIAS
                </span>
              </div>
              <button
                onClick={isScanningActive ? stopScanner : startScanner}
                className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-500/30 transition flex items-center gap-1"
              >
                <RefreshCw className={`w-3 h-3 ${isScanningActive ? "animate-spin" : ""}`} />
                <span>{isScanningActive ? "PAUSAR SCAN" : "REANUDAR"}</span>
              </button>
            </div>

            {/* Radar Sweep Bar */}
            <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden mb-3 relative">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 via-[#00E676] to-cyan-400 transition-all duration-300 rounded-full shadow-[0_0_8px_cyan]"
                style={{ width: `${((scanStep + 1) / RADIO_CHANNELS.length) * 100}%` }}
              />
            </div>

            {/* Scanned Channels List with Signal Strength Meters */}
            <div className="space-y-1.5 max-h-48 overflow-y-auto custom-scrollbar pr-1">
              {(scannedChannels.length > 0 ? scannedChannels : walkieTalkieService.scanAllChannels(selectedChannel.id)).map(
                (scan, index) => {
                  const isCurrent = scan.channel.id === selectedChannel.id;
                  const isBeingScanned = isScanningActive && scanStep === index;

                  return (
                    <div
                      key={scan.channel.id}
                      className={`p-2 rounded-xl border flex items-center justify-between gap-2 transition ${
                        isBeingScanned
                          ? "bg-cyan-950/70 border-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.4)]"
                          : isCurrent
                          ? "bg-[#00E676]/10 border-[#00E676]/60"
                          : "bg-slate-900/60 border-slate-800 hover:border-slate-700"
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-6 h-6 rounded-lg bg-slate-800 font-mono text-[10px] font-bold text-white flex items-center justify-center shrink-0">
                          {scan.channel.channelNumber}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-xs font-black text-cyan-300">
                              {scan.channel.frequency.toFixed(4)} MHz
                            </span>
                            <span className="text-[9px] px-1 rounded font-mono font-bold bg-slate-800 text-slate-300">
                              {scan.channel.modulation}
                            </span>
                            {isCurrent && (
                              <span className="text-[9px] px-1.5 rounded font-bold bg-[#00E676]/20 text-[#00E676]">
                                SINTONIZADO
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-400 truncate max-w-[140px] sm:max-w-[180px]">
                            {scan.channel.name}
                          </p>
                        </div>
                      </div>

                      {/* Real-time Fluctuating Signal Strength Meter */}
                      <div className="flex items-center gap-2 shrink-0">
                        <ChannelSignalMeter
                          channel={scan.channel}
                          isActive={isCurrent}
                          isTransmitting={isTransmitting && isCurrent}
                        />

                        <button
                          onClick={() => tuneToScannedChannel(scan.channel)}
                          className={`px-2.5 py-1 rounded-lg font-mono text-[10px] font-bold transition ${
                            isCurrent
                              ? "bg-[#00E676] text-black"
                              : "bg-cyan-500 hover:bg-cyan-400 text-black shadow-sm hover:scale-105 active:scale-95"
                          }`}
                        >
                          {isCurrent ? "ACTIVO" : "SINTONIZAR"}
                        </button>
                      </div>
                    </div>
                  );
                }
              )}
            </div>
          </div>
        )}

        {/* Digital Tactical LCD Radio Display */}
        <div className="my-2.5 p-3.5 rounded-2xl bg-[#07120b] border-2 border-[#00E676]/40 shadow-[inset_0_0_20px_rgba(0,230,118,0.15)] relative overflow-hidden font-mono">
          {/* Subtle LCD Scanlines */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(0,230,118,0.03)_50%,transparent_50%)] bg-[length:100%_4px] pointer-events-none" />

          {/* Top LCD Row: Status Indicators & Signal Meter */}
          <div className="flex items-center justify-between text-[10px] text-[#00E676]/80 font-bold mb-2">
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1">
                <RadioTower className="w-3 h-3 text-[#00E676]" />
                <span>CH-{selectedChannel.channelNumber.toString().padStart(2, "0")}</span>
              </span>
              <span className="px-1 rounded bg-[#00E676]/20 text-[#00E676]">
                {currentModulation}
              </span>
              <span className="px-1 rounded bg-purple-900/40 text-purple-300 border border-purple-500/30">
                DSP: {MODULATION_EFFECTS.find((e) => e.id === selectedEffect)?.name || "Classic Radio"}
              </span>
              {activeRoom && (
                <span className="text-[9px] text-[#00E5FF] truncate max-w-[100px]">
                  ⌖ {activeRoom.name}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <span
                className={`px-1.5 py-0.5 rounded font-black tracking-wider text-[9px] ${
                  isTransmitting
                    ? "bg-rose-500 text-black animate-pulse"
                    : isReceiving
                    ? "bg-amber-400 text-black animate-pulse"
                    : "bg-[#00E676]/20 text-[#00E676]"
                }`}
              >
                {isTransmitting ? "TX TRANSMITIENDO" : isReceiving ? "RX RECIBIENDO" : "STANDBY"}
              </span>
              <span className="text-[10px]">{isMuted ? "MUTED" : `VOL ${volume}%`}</span>
            </div>
          </div>

          {/* Center LCD Main Frequency Display & Fluctuating Signal Meter */}
          <div className="flex items-baseline justify-between">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl font-black text-[#00E676] tracking-tighter drop-shadow-[0_0_8px_rgba(0,230,118,0.6)]">
                {customFrequency.toFixed(4)}
              </span>
              <span className="text-xs text-[#00E676]/70 font-bold">MHz</span>
            </div>

            {/* S-Meter Real-Time Fluctuating Signal Strength Bars */}
            <div className="flex flex-col items-end gap-0.5">
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] text-slate-400 font-sans font-bold">S-METER RF</span>
                <span className="text-[9px] font-mono text-[#00E676] font-black">
                  {isTransmitting ? "S9+30dB" : isReceiving ? "S9+10dB" : "S9"}
                </span>
              </div>
              <div className="flex items-end gap-1 h-5">
                {[15, 30, 45, 60, 75, 90, 100].map((threshold, idx) => {
                  const active = isTransmitting
                    ? audioMeterLevel >= threshold - 15
                    : isReceiving
                    ? true
                    : idx < 5;
                  
                  // Add fluctuating CSS animation classes
                  const animClass = active
                    ? idx === 0
                      ? "animate-signal-1"
                      : idx === 1
                      ? "animate-signal-2"
                      : idx === 2
                      ? "animate-signal-3"
                      : idx === 3
                      ? "animate-signal-4"
                      : "animate-signal-5"
                    : "";

                  return (
                    <div
                      key={`smeter_${idx}`}
                      className={`w-1.5 rounded-xs transition-all duration-75 ${animClass} ${
                        active
                          ? idx >= 5
                            ? "h-5 bg-rose-500 shadow-[0_0_6px_red]"
                            : idx >= 3
                            ? "h-4 bg-amber-400 shadow-[0_0_6px_yellow]"
                            : "h-3 bg-[#00E676] shadow-[0_0_6px_lime]"
                          : "h-2 bg-slate-800"
                      }`}
                    />
                  );
                })}
              </div>
            </div>
          </div>

          {/* Bottom LCD Row: Channel description / incoming transmission info */}
          <div className="mt-2 pt-2 border-t border-[#00E676]/20 flex items-center justify-between text-[11px] text-slate-300">
            {isReceiving ? (
              <span className="text-amber-300 font-bold flex items-center gap-1.5 animate-pulse">
                <Volume2 className="w-3.5 h-3.5 text-amber-400" />
                <span>Voz entrante: {incomingTransmitter || "Operador Remoto"}</span>
              </span>
            ) : isTransmitting ? (
              <span className="text-rose-400 font-bold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                <span>Transmitiendo en vivo por el canal ({txDurationSeconds}s)</span>
              </span>
            ) : (
              <span className="text-slate-400 text-[10px] truncate">{selectedChannel.name}</span>
            )}

            <span className="text-[10px] text-[#00E676]/80 font-mono">SQL {squelch}%</span>
          </div>
        </div>

        {/* RADIO MODULATION EFFECT SELECTOR DROPDOWN */}
        <div className="space-y-1.5 my-1.5 bg-slate-950/70 p-2.5 rounded-2xl border border-slate-800/80">
          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-purple-400" />
              <span>Filtro de Modulación de Radio (DSP)</span>
            </span>
            <span className="text-[9px] text-purple-300 font-mono">
              Web Audio en Vivo
            </span>
          </div>

          {/* Dropdown Selector for Classic Radio, Deep Space, and Underwater */}
          <div className="flex items-center gap-2">
            <select
              value={selectedEffect}
              onChange={(e) => {
                const val = e.target.value as AudioModulationEffect;
                setSelectedEffect(val);
                walkieTalkieService.setActiveEffect(val);
                walkieAudioEngine.triggerHaptic("channel_switch");
              }}
              className="w-full bg-slate-900 border-2 border-purple-500/40 text-purple-200 text-xs font-bold rounded-xl px-3 py-2 outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400 transition cursor-pointer appearance-none"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23d8b4fe' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 0.75rem center',
                backgroundSize: '1rem',
              }}
            >
              <option value="classic_radio" className="bg-slate-900 text-white font-medium py-1">
                📻 Classic Radio (Bandpass 300-3400Hz + Saturación RF)
              </option>
              <option value="deep_space" className="bg-slate-900 text-white font-medium py-1">
                🌌 Deep Space (Eco cósmico orbital + Reverberación)
              </option>
              <option value="underwater" className="bg-slate-900 text-white font-medium py-1">
                🌊 Underwater (Filtro paso-bajo resonante 450Hz subacuático)
              </option>
              <option value="military_vhf" className="bg-slate-900 text-white font-medium py-1">
                🛡️ VHF Militar (Banda táctica estrecha + Compresión)
              </option>
              <option value="cyber_pilot" className="bg-slate-900 text-white font-medium py-1">
                🤖 Cyber Pilot (Resonancia sintética)
              </option>
              <option value="clean" className="bg-slate-900 text-white font-medium py-1">
                🎙️ Clean (Directo sin procesar)
              </option>
            </select>
          </div>
        </div>

        {/* Radio Channels Selector Grid with Real-Time Signal Meters */}
        <div className="space-y-1.5 my-1">
          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1">
              <Sliders className="w-3 h-3 text-[#00E676]" />
              <span>Canales Activos con Fuerza de Señal en Tiempo Real</span>
            </span>
            {/* Modulation pills */}
            <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-lg border border-slate-800">
              {(["FM", "AM", "SSB", "DMR"] as const).map((mod) => (
                <button
                  key={mod}
                  onClick={() => setCurrentModulation(mod)}
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition ${
                    currentModulation === mod
                      ? "bg-[#00E676] text-black shadow-sm"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  {mod}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 max-h-32 overflow-y-auto custom-scrollbar p-0.5">
            {RADIO_CHANNELS.map((ch) => {
              const isSelected = selectedChannel.id === ch.id;
              return (
                <button
                  key={ch.id}
                  onClick={() => {
                    setSelectedChannel(ch);
                    walkieAudioEngine.triggerHaptic("channel_switch");
                  }}
                  className={`p-2 rounded-xl border text-left transition relative overflow-hidden flex flex-col justify-between ${
                    isSelected
                      ? "bg-slate-900 border-[#00E676] shadow-[0_0_10px_rgba(0,230,118,0.2)]"
                      : "bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900/50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[11px] font-black text-white">
                      CH-{ch.channelNumber.toString().padStart(2, "0")}
                    </span>
                    <span
                      style={{ color: ch.color }}
                      className="text-[9px] font-mono font-bold px-1 rounded bg-slate-900/80 border border-white/5"
                    >
                      {ch.modulation}
                    </span>
                  </div>

                  <div className="flex items-center justify-between mt-1.5">
                    <span className="font-mono text-[10px] text-[#00E676] font-bold">
                      {ch.frequency.toFixed(4)}M
                    </span>
                    {/* Real-time fluctuating animated CSS signal strength meter */}
                    <ChannelSignalMeter
                      channel={ch}
                      isActive={isSelected}
                      isTransmitting={isTransmitting && isSelected}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Center Tactical PTT (Push-To-Talk) Mega Button */}
        <div className="flex flex-col items-center justify-center my-2.5 relative">
          {/* Subtle radio transmission pulse rings */}
          {isTransmitting && (
            <div className="absolute w-44 h-44 rounded-full border-2 border-rose-500/40 animate-ping pointer-events-none" />
          )}

          <div className="relative group">
            {/* 
              Real Push-To-Talk Button:
              - Transmits when finger/cursor is pressed down
              - Immediately stops transmitting when finger/cursor is lifted/released
              - Uses window.navigator.vibrate for tactile feedback on begin/end
            */}
            <button
              type="button"
              onPointerDown={(e) => {
                e.preventDefault();
                handleStartTransmission();
              }}
              onPointerUp={(e) => {
                e.preventDefault();
                if (!isPttLocked) handleStopTransmission();
              }}
              onPointerLeave={(e) => {
                if (isTransmitting && !isPttLocked) handleStopTransmission();
              }}
              onPointerCancel={(e) => {
                if (isTransmitting && !isPttLocked) handleStopTransmission();
              }}
              onTouchStart={(e) => {
                e.preventDefault();
                handleStartTransmission();
              }}
              onTouchEnd={(e) => {
                e.preventDefault();
                if (!isPttLocked) handleStopTransmission();
              }}
              onTouchCancel={(e) => {
                e.preventDefault();
                if (!isPttLocked) handleStopTransmission();
              }}
              onContextMenu={(e) => e.preventDefault()}
              className={`w-32 h-32 sm:w-36 sm:h-36 rounded-full border-4 flex flex-col items-center justify-center gap-1 transition-all duration-150 shadow-2xl relative select-none touch-none cursor-pointer ${
                isTransmitting
                  ? "bg-gradient-to-tr from-rose-700 to-rose-500 border-rose-300 scale-95 shadow-[0_0_40px_rgba(244,63,94,0.7)]"
                  : isReceiving
                  ? "bg-gradient-to-tr from-amber-600 to-amber-400 border-amber-300 shadow-[0_0_30px_rgba(251,191,36,0.6)]"
                  : "bg-gradient-to-tr from-slate-900 via-slate-800 to-slate-900 border-slate-600 hover:border-[#00E676] hover:shadow-[0_0_30px_rgba(0,230,118,0.3)] active:scale-95"
              }`}
            >
              <Mic
                className={`w-7 h-7 sm:w-9 sm:h-9 transition-transform ${
                  isTransmitting ? "text-white scale-110" : "text-[#00E676] group-hover:scale-110"
                }`}
              />
              <span className="font-mono font-black text-xs sm:text-sm tracking-wider text-white uppercase drop-shadow">
                {isTransmitting ? "TRANSMITIENDO" : "PULSAR PTT"}
              </span>
              <span className="text-[9px] font-sans text-slate-300">
                {isPttLocked ? "PTT BLOQUEADO" : "Mantener pulsado"}
              </span>
            </button>

            {/* PTT Lock Toggle Button */}
            <button
              type="button"
              onClick={togglePttLock}
              className={`absolute -right-2 top-2 p-2 rounded-full border transition shadow-lg ${
                isPttLocked
                  ? "bg-rose-500 border-rose-300 text-black font-bold animate-pulse"
                  : "bg-slate-900 border-slate-700 text-slate-400 hover:text-white"
              }`}
              title={isPttLocked ? "Desbloquear PTT" : "Bloquear PTT (Manos libres)"}
            >
              {isPttLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
            </button>
          </div>

          <p className="text-[11px] text-slate-400 mt-2 font-medium text-center">
            Mantén pulsado para transmitir • Suelta para cortar señal • Espacio en PC
          </p>
        </div>

        {/* Tactical Controls & Squelch/Volume Dials */}
        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800 text-xs">
          {/* Volume Control */}
          <div className="space-y-1 bg-slate-950 p-2.5 rounded-xl border border-slate-800">
            <div className="flex items-center justify-between text-slate-400 text-[11px]">
              <span className="flex items-center gap-1 font-bold">
                {isMuted ? (
                  <VolumeX className="w-3.5 h-3.5 text-rose-400" />
                ) : (
                  <Volume2 className="w-3.5 h-3.5 text-[#00E676]" />
                )}
                <span>Volumen</span>
              </span>
              <span className="font-mono">{isMuted ? "0%" : `${volume}%`}</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={isMuted ? 0 : volume}
              onChange={(e) => {
                setVolume(Number(e.target.value));
                setIsMuted(false);
                walkieTalkieService.setVolumeLevel(Number(e.target.value));
              }}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-[#00E676]"
            />
          </div>

          {/* Squelch Noise Gate Control */}
          <div className="space-y-1 bg-slate-950 p-2.5 rounded-xl border border-slate-800">
            <div className="flex items-center justify-between text-slate-400 text-[11px]">
              <span className="flex items-center gap-1 font-bold">
                <Activity className="w-3.5 h-3.5 text-cyan-400" />
                <span>Squelch (Filtro)</span>
              </span>
              <span className="font-mono">{squelch}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={squelch}
              onChange={(e) => {
                setSquelch(Number(e.target.value));
                walkieTalkieService.setSquelchLevel(Number(e.target.value));
              }}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
            />
          </div>
        </div>

        {/* Footer / Active Room Forwarding Note */}
        {activeRoom && (
          <div className="mt-2.5 flex items-center justify-between p-2 rounded-xl bg-[#00E676]/10 border border-[#00E676]/30 text-[11px] text-slate-300">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-2 h-2 rounded-full bg-[#00E676] animate-pulse shrink-0" />
              <span className="truncate">
                Vinculado al chat con: <strong className="text-white">{activeRoom.name}</strong>
              </span>
            </div>
            <span className="text-[10px] font-mono text-[#00E676] shrink-0 font-bold">
              TX + Auto-Post
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

