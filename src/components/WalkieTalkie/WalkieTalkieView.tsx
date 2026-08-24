import React, { useState, useEffect, useRef } from "react";
import {
  RadioChannel,
  RADIO_CHANNELS,
  walkieTalkieService,
  walkieAudioEngine,
  WalkieTransmission,
  AudioModulationEffect,
  MODULATION_EFFECTS,
  ChannelScanResult,
} from "../../services/walkieTalkieService";
import { UserProfile, Room } from "../../types";
import {
  Radio,
  Radar,
  Activity,
  Mic,
  Volume2,
  VolumeX,
  Sliders,
  Sparkles,
  Play,
  RotateCcw,
  Zap,
  ShieldCheck,
  ShieldAlert,
  Send,
  RefreshCw,
  Gauge,
  RadioTower,
  Headphones,
  SlidersHorizontal,
  Check,
  Lock,
  Unlock,
  Layers,
  Waves,
  Bot,
  Info,
} from "lucide-react";

interface WalkieTalkieViewProps {
  currentUser: UserProfile;
  activeRoom?: Room | null;
  rooms?: Room[];
  onSelectRoom?: (roomId: string) => void;
  onSendVoiceToChat?: (
    content: string,
    type: "text" | "image" | "audio" | "file" | "sticker",
    mediaUrl?: string,
    audioDuration?: number
  ) => void;
  onBackMobile?: () => void;
}

export const WalkieTalkieView: React.FC<WalkieTalkieViewProps> = ({
  currentUser,
  activeRoom,
  rooms = [],
  onSelectRoom,
  onSendVoiceToChat,
  onBackMobile,
}) => {
  const [selectedChannel, setSelectedChannel] = useState<RadioChannel>(
    walkieTalkieService.getActiveChannel()
  );
  const [currentModulation, setCurrentModulation] = useState<"FM" | "AM" | "SSB" | "DMR">("FM");
  const [selectedEffect, setSelectedEffect] = useState<AudioModulationEffect>("classic_radio");
  const [customFrequency, setCustomFrequency] = useState<number>(selectedChannel.frequency);
  const [isTransmitting, setIsTransmitting] = useState(false);
  const [isPttLocked, setIsPttLocked] = useState(false);
  const [txDuration, setTxDuration] = useState(0);
  const [volume, setVolume] = useState(walkieTalkieService.getVolumeLevel());
  const [squelch, setSquelch] = useState(walkieTalkieService.getSquelchLevel());
  const [isMuted, setIsMuted] = useState(false);
  const [isReceiving, setIsReceiving] = useState(false);
  const [incomingTransmitter, setIncomingTransmitter] = useState<string | null>(null);
  const [recentTransmissions, setRecentTransmissions] = useState<WalkieTransmission[]>([]);
  const [audioMeterLevel, setAudioMeterLevel] = useState(0);
  const [targetRoomId, setTargetRoomId] = useState<string>(activeRoom?.id || rooms[0]?.id || "");

  // Scanner state
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
  const animationFrameRef = useRef<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Sync state with selected channel
  useEffect(() => {
    setCustomFrequency(selectedChannel.frequency);
    setCurrentModulation(selectedChannel.modulation);
    walkieTalkieService.setActiveChannel(selectedChannel);
  }, [selectedChannel]);

  // Handle active room change
  useEffect(() => {
    if (activeRoom?.id) {
      setTargetRoomId(activeRoom.id);
    }
  }, [activeRoom]);

  // Subscribe to real-time incoming transmissions for the active channel
  useEffect(() => {
    const unsubscribe = walkieTalkieService.subscribeToChannel(
      selectedChannel.id,
      currentUser.id,
      async (transmission) => {
        // Incoming radio message
        setRecentTransmissions((prev) => [transmission, ...prev.slice(0, 29)]);
        setIsReceiving(true);
        setIncomingTransmitter(transmission.senderName);

        // Play through tactical walkie-talkie bandpass speaker if not muted
        if (!isMuted) {
          await walkieAudioEngine.playRadioAudio(
            transmission.audioDataUrl,
            volume / 100,
            transmission.modulation
          );
        }

        setTimeout(() => {
          setIsReceiving(false);
          setIncomingTransmitter(null);
        }, (transmission.durationSeconds + 1) * 1000);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [selectedChannel.id, currentUser.id, isMuted, volume]);

  // Frequency Scanner routine
  const startScanner = () => {
    setIsScanningActive(true);
    setScanStep(0);

    if (scannerIntervalRef.current) clearInterval(scannerIntervalRef.current);

    let step = 0;
    scannerIntervalRef.current = setInterval(() => {
      step = (step + 1) % RADIO_CHANNELS.length;
      setScanStep(step);
      walkieAudioEngine.playScannerClick();
      walkieAudioEngine.triggerHaptic("scan_tick");

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

  const tuneToChannel = (ch: RadioChannel) => {
    setSelectedChannel(ch);
    walkieAudioEngine.triggerHaptic("channel_switch");
  };

  // Oscilloscope waveform rendering in console
  useEffect(() => {
    let isMounted = true;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const draw = () => {
      if (!isMounted) return;
      animationFrameRef.current = requestAnimationFrame(draw);

      const width = canvas.width;
      const height = canvas.height;

      ctx.clearRect(0, 0, width, height);

      // Draw tactical radar grid lines
      ctx.lineWidth = 1;
      ctx.strokeStyle = "rgba(0, 230, 118, 0.12)";
      ctx.beginPath();
      for (let x = 0; x < width; x += 30) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
      }
      for (let y = 0; y < height; y += 20) {
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
      }
      ctx.stroke();

      if (analyserRef.current && isTransmitting) {
        const bufferLength = analyserRef.current.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        analyserRef.current.getByteTimeDomainData(dataArray);

        // Draw active waveform
        const gradient = ctx.createLinearGradient(0, 0, width, 0);
        gradient.addColorStop(0, "#00E676");
        gradient.addColorStop(0.5, "#00E5FF");
        gradient.addColorStop(1, "#76FF03");

        ctx.lineWidth = 3;
        ctx.strokeStyle = gradient;
        ctx.shadowColor = "rgba(0, 230, 118, 0.8)";
        ctx.shadowBlur = 10;
        ctx.beginPath();

        const sliceWidth = (width * 1.0) / bufferLength;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          const v = dataArray[i] / 128.0;
          const y = (v * height) / 2;

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }

          x += sliceWidth;
        }

        ctx.lineTo(width, height / 2);
        ctx.stroke();
      } else {
        // Standby resting carrier wave
        const time = Date.now() * 0.003;
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = isReceiving ? "#00E5FF" : "rgba(0, 230, 118, 0.4)";
        ctx.beginPath();
        for (let x = 0; x < width; x += 2) {
          const amp = isReceiving ? 14 : 3;
          const y = height / 2 + Math.sin(x * 0.05 + time) * amp;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
    };

    draw();

    return () => {
      isMounted = false;
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [isTransmitting, isReceiving]);

  // PTT Transmission Start
  const handleStartTransmission = async () => {
    if (isTransmitting) return;

    try {
      walkieAudioEngine.triggerHaptic("tx_start");
      walkieAudioEngine.playPttOpenBeep();

      const rawStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      streamRef.current = rawStream;
      audioChunksRef.current = [];

      // Apply real-time Web Audio API DSP modulation filter
      const { modulatedStream, cleanup, audioContext: dspCtx } = walkieAudioEngine.createModulatedMediaStream(
        rawStream,
        selectedEffect
      );
      dspCleanupRef.current = cleanup;
      audioContextRef.current = dspCtx;

      // Setup audio analyzer
      const analyser = dspCtx.createAnalyser();
      analyser.fftSize = 64;
      analyserRef.current = analyser;
      const source = dspCtx.createMediaStreamSource(modulatedStream);
      source.connect(analyser);

      const updateMeter = () => {
        if (!analyserRef.current || !isTransmitting) return;
        const data = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(data);
        const avg = data.reduce((a, b) => a + b, 0) / data.length;
        setAudioMeterLevel(Math.min(100, Math.round((avg / 128) * 100)));
      };
      const meterInterval = setInterval(updateMeter, 80);

      // Support common audio recording MIME types
      let mimeType = "audio/webm;codecs=opus";
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = "audio/ogg;codecs=opus";
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = "";
        }
      }

      const mediaRecorder = new MediaRecorder(modulatedStream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start(100);
      setIsTransmitting(true);
      setTxDuration(0);

      txTimerRef.current = setInterval(() => {
        setTxDuration((prev) => prev + 1);
      }, 1000);

      (mediaRecorder as any)._meterInterval = meterInterval;
    } catch (error) {
      console.error("[WalkieTalkieView] Microphone access failed:", error);
    }
  };

  // PTT Transmission Stop
  const handleStopTransmission = async () => {
    if (!isTransmitting) return;

    walkieAudioEngine.triggerHaptic("tx_stop");

    setIsTransmitting(false);
    setIsPttLocked(false);
    setAudioMeterLevel(0);

    if (txTimerRef.current) {
      clearInterval(txTimerRef.current);
      txTimerRef.current = null;
    }

    if (mediaRecorderRef.current && (mediaRecorderRef.current as any)._meterInterval) {
      clearInterval((mediaRecorderRef.current as any)._meterInterval);
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }
    if (dspCleanupRef.current) {
      dspCleanupRef.current();
      dspCleanupRef.current = null;
    }

    // Play closing tactical squelch burst
    walkieAudioEngine.playRogerBeep();

    // Process recorded audio burst
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
      await new Promise((resolve) => setTimeout(resolve, 250));

      if (audioChunksRef.current.length > 0) {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const dataUrl = reader.result as string;
          const duration = Math.max(1, txDuration);

          const transmissionData: Omit<WalkieTransmission, "timestamp"> = {
            channelId: selectedChannel.id,
            channelFrequency: customFrequency,
            modulation: currentModulation,
            senderId: currentUser.id,
            senderName: `${currentUser.firstName} ${currentUser.lastName || ""}`.trim() || currentUser.username,
            senderAvatar: currentUser.avatarUrl,
            audioDataUrl: dataUrl,
            durationSeconds: duration,
          };

          // Broadcast transmission to cloud / local state
          await walkieTalkieService.broadcastTransmission(transmissionData);

          // Add to local recent transmissions history
          setRecentTransmissions((prev) => [
            { ...transmissionData, timestamp: Date.now() },
            ...prev.slice(0, 29),
          ]);

          // Optional: Forward audio into active or selected target chat
          if (onSendVoiceToChat && targetRoomId) {
            onSendVoiceToChat(
              `📻 Transmisión Walkie-Talkie [CH-${selectedChannel.channelNumber.toString().padStart(2, "0")} • ${customFrequency.toFixed(4)} MHz ${currentModulation} | FX: ${selectedEffect}]`,
              "audio",
              dataUrl,
              duration
            );
          }
        };
      }
    }
  };

  // Keyboard Spacebar listener for PTT
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" && !e.repeat && !isTransmitting && (e.target as HTMLElement).tagName !== "INPUT" && (e.target as HTMLElement).tagName !== "TEXTAREA") {
        e.preventDefault();
        handleStartTransmission();
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space" && isTransmitting && !isPttLocked) {
        e.preventDefault();
        handleStopTransmission();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [isTransmitting, isPttLocked, selectedChannel, customFrequency, currentModulation, selectedEffect]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopScanner();
      handleStopTransmission();
    };
  }, []);

  const activeTargetRoom = rooms.find((r) => r.id === targetRoomId) || activeRoom;

  return (
    <div className="flex-1 flex flex-col h-full bg-[#030711] text-slate-100 overflow-y-auto custom-scrollbar select-none">
      {/* TOP TACTICAL CONTROL BAR */}
      <div className="h-20 px-4 sm:px-6 bg-[#060e1a]/95 border-b border-cyan-500/20 backdrop-blur-md flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          {onBackMobile && (
            <button
              onClick={onBackMobile}
              className="p-2 rounded-xl text-slate-400 hover:text-white bg-slate-900 border border-slate-800 md:hidden"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}

          <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-cyan-600 via-emerald-500 to-[#00E676] text-black shadow-[0_0_20px_rgba(6,182,212,0.4)]">
            <Radio className="w-6 h-6 stroke-[2.5]" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-2">
                <span>ESTACIÓN TÁCTICA WALKIE-TALKIE PTT</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-extrabold bg-[#00E676]/20 text-[#00E676] border border-[#00E676]/40 uppercase tracking-wider">
                  SDR DIGITAL
                </span>
              </h2>
            </div>
            <p className="text-xs text-slate-400 font-mono">
              Canal {selectedChannel.channelNumber}: {selectedChannel.name} • {customFrequency.toFixed(4)} MHz ({currentModulation})
            </p>
          </div>
        </div>

        {/* Top Right Controls & Scanner Switch */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Target Room Forwarding Selector */}
          {rooms.length > 0 && (
            <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs">
              <span className="text-slate-400 text-[11px]">Vincular a Chat:</span>
              <select
                value={targetRoomId}
                onChange={(e) => {
                  setTargetRoomId(e.target.value);
                  if (onSelectRoom) onSelectRoom(e.target.value);
                }}
                className="bg-slate-950 text-cyan-300 font-bold rounded-lg px-2 py-1 border border-slate-700 outline-none text-xs"
              >
                <option value="">(Solo Walkie-Talkie)</option>
                {rooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Scanner Toggle Button */}
          <button
            onClick={isScanningActive ? stopScanner : startScanner}
            className={`px-3.5 py-2 rounded-xl text-xs font-mono font-bold flex items-center gap-2 transition ${
              isScanningActive
                ? "bg-cyan-500 text-black shadow-[0_0_15px_rgba(6,182,212,0.6)] animate-pulse"
                : "bg-slate-900 text-cyan-400 border border-cyan-500/40 hover:bg-cyan-950/40"
            }`}
          >
            <Radar className={`w-4 h-4 ${isScanningActive ? "animate-spin" : ""}`} />
            <span>{isScanningActive ? "ESCANEANDO..." : "ESCANEAR RF"}</span>
          </button>
        </div>
      </div>

      {/* MAIN CONSOLE BODY */}
      <div className="p-4 sm:p-6 max-w-7xl mx-auto w-full space-y-6">
        {/* RADAR SPECTRUM & FREQUENCY SCANNER BANNER (IF ACTIVE OR EXPANDED) */}
        <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-br from-[#06121e] via-[#040a14] to-black border-2 border-cyan-500/40 shadow-[0_0_30px_rgba(6,182,212,0.15)] relative overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 mb-3 border-b border-cyan-500/20">
            <div className="flex items-center gap-2.5">
              <div className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500"></span>
              </div>
              <span className="font-mono text-xs sm:text-sm font-black text-cyan-300">
                ESPECTRÓMETRO SDR & MONITOREO DE FRECUENCIAS (144.000 - 446.200 MHz)
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs font-mono">
              <span className="text-slate-400">Canales Detectados:</span>
              <span className="text-cyan-400 font-bold">{RADIO_CHANNELS.length}</span>
              <span className="text-slate-600">•</span>
              <span className="text-[#00E676] font-bold">PMR & VHF/UHF</span>
            </div>
          </div>

          {/* Radar Sweep Frequency Spectrum Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
            {(scannedChannels.length > 0 ? scannedChannels : walkieTalkieService.scanAllChannels(selectedChannel.id)).map(
              (scan, idx) => {
                const isSelected = scan.channel.id === selectedChannel.id;
                const isSweeping = isScanningActive && scanStep === idx;

                return (
                  <div
                    key={scan.channel.id}
                    onClick={() => tuneToChannel(scan.channel)}
                    className={`p-2.5 rounded-2xl border transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between ${
                      isSelected
                        ? "bg-gradient-to-b from-[#00E676]/20 to-slate-900 border-[#00E676] shadow-[0_0_15px_rgba(0,230,118,0.3)] scale-[1.02]"
                        : isSweeping
                        ? "bg-cyan-950/80 border-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.4)]"
                        : "bg-slate-950/80 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900/60"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between text-[10px] font-mono">
                        <span className="font-bold text-slate-400">CH-0{scan.channel.channelNumber}</span>
                        <span className="font-extrabold text-cyan-300">{scan.sMeter}</span>
                      </div>
                      <p className="font-mono text-xs font-black text-white mt-1">
                        {scan.channel.frequency.toFixed(4)}
                      </p>
                      <p className="text-[10px] text-slate-400 truncate mt-0.5">
                        {scan.channel.name}
                      </p>
                    </div>

                    {/* Mini Signal S-Meter Bar */}
                    <div className="mt-2.5 space-y-1">
                      <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            scan.signalPercent > 70
                              ? "bg-gradient-to-r from-[#00E676] to-cyan-400"
                              : scan.signalPercent > 40
                              ? "bg-amber-400"
                              : "bg-rose-500"
                          }`}
                          style={{ width: `${scan.signalPercent}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[8px] font-mono text-slate-500">
                        <span>{scan.signalStrengthDbm}dBm</span>
                        <span>{scan.channel.modulation}</span>
                      </div>
                    </div>
                  </div>
                );
              }
            )}
          </div>
        </div>

        {/* DUAL WORKBENCH: CENTRAL TRANSCEIVER + AUDIO DSP STUDIO */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT: TACTICAL TRANSCEIVER TERMINAL (7 COLS) */}
          <div className="lg:col-span-7 bg-gradient-to-b from-[#08131f] via-[#050c14] to-black border-2 border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl flex flex-col justify-between space-y-5">
            {/* Tactical LCD Display */}
            <div className="p-4 sm:p-5 rounded-2xl bg-[#030d07] border-2 border-[#00E676]/40 shadow-[inset_0_0_25px_rgba(0,230,118,0.15)] relative overflow-hidden font-mono">
              <div className="flex items-center justify-between text-[11px] pb-2 border-b border-[#00E676]/20">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#00E676] animate-pulse" />
                  <span className="text-[#00E676] font-bold">RADIO TRX EN LÍNEA</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-1.5 py-0.5 rounded bg-[#00E676]/20 text-[#00E676] font-bold">
                    {currentModulation}
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-purple-900/40 text-purple-300 border border-purple-500/30 text-[10px]">
                    DSP: {MODULATION_EFFECTS.find((e) => e.id === selectedEffect)?.name}
                  </span>
                </div>
              </div>

              {/* Big Frequency Readout */}
              <div className="my-3 flex items-baseline justify-between">
                <div>
                  <span className="text-[10px] text-emerald-400 block tracking-widest">
                    FRECUENCIA SINTONIZADA
                  </span>
                  <h3 className="text-3xl sm:text-4xl font-black text-[#00E676] drop-shadow-[0_0_15px_rgba(0,230,118,0.6)]">
                    {customFrequency.toFixed(4)}{" "}
                    <span className="text-sm font-sans text-emerald-300 font-normal">MHz</span>
                  </h3>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block">CANAL ACTIVO</span>
                  <span className="text-xl font-bold text-white">
                    CH-{selectedChannel.channelNumber.toString().padStart(2, "0")}
                  </span>
                </div>
              </div>

              {/* Real-Time Waveform Canvas Oscilloscope */}
              <div className="h-16 w-full rounded-xl bg-slate-950/80 border border-[#00E676]/20 overflow-hidden relative mb-2">
                <canvas
                  ref={canvasRef}
                  width={500}
                  height={64}
                  className="w-full h-full object-cover"
                />
                {isTransmitting && (
                  <div className="absolute top-1.5 right-2 px-2 py-0.5 rounded bg-rose-600/80 text-white text-[10px] font-bold flex items-center gap-1 animate-pulse">
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                    <span>TX ACTIVA {txDuration}s</span>
                  </div>
                )}
                {isReceiving && (
                  <div className="absolute top-1.5 right-2 px-2 py-0.5 rounded bg-cyan-500 text-black text-[10px] font-black flex items-center gap-1 animate-pulse">
                    <span>RX: {incomingTransmitter || "Entrante"}</span>
                  </div>
                )}
              </div>

              {/* LED Audio Level dB Indicator Bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-[9px] text-slate-400 font-bold">
                  <span>MODULACIÓN RF / S-METER</span>
                  <span>{isTransmitting ? `${audioMeterLevel}% PWR` : "S9 EN ESPERA"}</span>
                </div>
                <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden p-0.5 flex gap-0.5">
                  {Array.from({ length: 24 }).map((_, i) => {
                    const threshold = (i / 24) * 100;
                    const isActive = isTransmitting
                      ? audioMeterLevel >= threshold
                      : isReceiving
                      ? Math.random() > 0.4
                      : i < 8;

                    let color = "bg-[#00E676]";
                    if (i > 15) color = "bg-amber-400";
                    if (i > 20) color = "bg-rose-500";

                    return (
                      <div
                        key={i}
                        className={`flex-1 h-full rounded-sm transition-all duration-75 ${
                          isActive ? `${color} shadow-[0_0_4px_currentColor]` : "bg-slate-900"
                        }`}
                      />
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Central PTT Mega Button & Tactical Ring */}
            <div className="flex flex-col items-center justify-center py-2 relative">
              {isTransmitting && (
                <div className="absolute w-52 h-52 rounded-full border-2 border-rose-500/40 animate-ping pointer-events-none" />
              )}

              <div className="relative">
                <button
                  onMouseDown={handleStartTransmission}
                  onMouseUp={handleStopTransmission}
                  onTouchStart={handleStartTransmission}
                  onTouchEnd={handleStopTransmission}
                  className={`w-36 h-36 sm:w-44 sm:h-44 rounded-full border-4 flex flex-col items-center justify-center gap-1 transition-all duration-150 shadow-2xl relative select-none touch-none cursor-pointer group ${
                    isTransmitting
                      ? "bg-gradient-to-tr from-rose-700 to-rose-500 border-rose-300 scale-95 shadow-[0_0_50px_rgba(244,63,94,0.8)]"
                      : isReceiving
                      ? "bg-gradient-to-tr from-cyan-900 to-cyan-700 border-cyan-400 animate-pulse shadow-[0_0_30px_rgba(6,182,212,0.6)]"
                      : "bg-gradient-to-tr from-slate-900 via-slate-950 to-slate-900 border-slate-700 hover:border-[#00E676] hover:shadow-[0_0_35px_rgba(0,230,118,0.4)]"
                  }`}
                >
                  <Mic
                    className={`w-8 h-8 sm:w-10 sm:h-10 transition-transform ${
                      isTransmitting ? "text-white scale-110" : "text-[#00E676] group-hover:scale-110"
                    }`}
                  />
                  <span className="font-mono font-black text-sm sm:text-base tracking-wider text-white uppercase drop-shadow">
                    {isTransmitting ? "TRANSMITIENDO" : "PULSAR PTT"}
                  </span>
                  <span className="text-[10px] font-sans text-slate-300">
                    {isTransmitting ? `${txDuration} seg` : "Mantener presionado"}
                  </span>
                </button>

                {/* PTT Lock Toggle */}
                <button
                  onClick={() => {
                    if (isPttLocked) {
                      handleStopTransmission();
                    } else {
                      setIsPttLocked(true);
                      handleStartTransmission();
                    }
                  }}
                  className={`absolute bottom-0 right-0 p-2.5 rounded-full border shadow-lg transition ${
                    isPttLocked
                      ? "bg-rose-500 text-white border-rose-300 animate-pulse"
                      : "bg-slate-900 text-slate-400 border-slate-700 hover:text-white"
                  }`}
                  title="Bloquear transmisión continua (Manos Libres)"
                >
                  {isPttLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                </button>
              </div>

              <p className="text-xs text-slate-400 mt-3 font-medium text-center">
                Pulsa y mantén presionado el botón PTT o presiona la{" "}
                <kbd className="px-2 py-0.5 rounded bg-slate-800 text-cyan-300 font-mono text-[11px] border border-slate-700">
                  Barra Espaciadora
                </kbd>
              </p>
            </div>

            {/* Squelch & Volume Dials Bar */}
            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-800 text-xs">
              <div className="space-y-1 bg-slate-950/80 p-3 rounded-2xl border border-slate-800">
                <div className="flex items-center justify-between text-slate-400 text-[11px]">
                  <span className="flex items-center gap-1">
                    <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Volumen Audio RX</span>
                  </span>
                  <span className="font-mono text-cyan-400 font-bold">{volume}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={volume}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    setVolume(v);
                    walkieTalkieService.setVolumeLevel(v);
                  }}
                  className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                />
              </div>

              <div className="space-y-1 bg-slate-950/80 p-3 rounded-2xl border border-slate-800">
                <div className="flex items-center justify-between text-slate-400 text-[11px]">
                  <span className="flex items-center gap-1">
                    <Sliders className="w-3.5 h-3.5 text-[#00E676]" />
                    <span>Umbral Squelch SQL</span>
                  </span>
                  <span className="font-mono text-[#00E676] font-bold">{squelch}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={squelch}
                  onChange={(e) => {
                    const s = Number(e.target.value);
                    setSquelch(s);
                    walkieTalkieService.setSquelchLevel(s);
                  }}
                  className="w-full accent-[#00E676] cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                />
              </div>
            </div>
          </div>

          {/* RIGHT: DSP AUDIO MODULATION STUDIO + RECENT TRANSMISSIONS LOG (5 COLS) */}
          <div className="lg:col-span-5 space-y-6">
            {/* DSP Audio Filter Selector */}
            <div className="p-5 rounded-3xl bg-gradient-to-b from-[#0e071a] via-[#080512] to-black border-2 border-purple-500/30 shadow-xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-400" />
                  <h4 className="font-bold text-sm text-purple-200">
                    Estudio DSP de Modulación de Audio
                  </h4>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-950 text-purple-300 border border-purple-500/40">
                  Web Audio API
                </span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Aplica filtros analógicos y resonancias espaciales a tu voz antes de transmitir por radiofrecuencia.
              </p>

              <div className="grid grid-cols-2 gap-2 pt-1">
                {MODULATION_EFFECTS.map((fx) => {
                  const isSel = selectedEffect === fx.id;
                  return (
                    <button
                      key={fx.id}
                      onClick={() => {
                        setSelectedEffect(fx.id);
                        walkieAudioEngine.triggerHaptic("channel_switch");
                      }}
                      className={`p-3 rounded-2xl border text-left transition flex flex-col justify-between ${
                        isSel
                          ? "bg-purple-950/90 border-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.35)] scale-[1.02]"
                          : "bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-900"
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="font-bold text-xs text-purple-100">{fx.name}</span>
                        {isSel && <Check className="w-3.5 h-3.5 text-purple-300 shrink-0" />}
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1 line-clamp-2">
                        {fx.shortDesc}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Recent Signals & Transmissions Log */}
            <div className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-cyan-400" />
                  <h4 className="font-bold text-sm text-slate-100">
                    Registro de Señales y Transmisiones ({recentTransmissions.length})
                  </h4>
                </div>
                <button
                  onClick={() => setRecentTransmissions([])}
                  className="text-[10px] text-slate-500 hover:text-slate-300"
                >
                  Limpiar
                </button>
              </div>

              {recentTransmissions.length === 0 ? (
                <div className="p-6 rounded-2xl bg-slate-950/60 border border-slate-800 text-center text-xs text-slate-500 space-y-1">
                  <Radio className="w-6 h-6 mx-auto text-slate-600 mb-2 opacity-60" />
                  <p>Sin transmisiones registradas en esta frecuencia.</p>
                  <p className="text-[10px] text-slate-600">
                    Las señales recibidas o transmitidas aparecerán aquí.
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto custom-scrollbar pr-1">
                  {recentTransmissions.map((tx, index) => (
                    <div
                      key={tx.id || `tx_view_${index}`}
                      className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800/90 hover:border-slate-700 transition flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <img
                          src={tx.senderAvatar}
                          alt={tx.senderName}
                          className="w-8 h-8 rounded-full object-cover border border-slate-700 shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-xs font-bold text-slate-200 truncate">
                              {tx.senderName}
                            </p>
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-300 font-mono">
                              {tx.modulation}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-400 font-mono">
                            {tx.channelFrequency.toFixed(4)} MHz • {tx.durationSeconds}s de transmisión
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={async () => {
                            await walkieAudioEngine.playRadioAudio(
                              tx.audioDataUrl,
                              volume / 100,
                              tx.modulation
                            );
                          }}
                          className="p-2 rounded-xl bg-[#00E676]/10 hover:bg-[#00E676] text-[#00E676] hover:text-black transition"
                          title="Reproducir audio de radio"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                        </button>

                        {onSendVoiceToChat && targetRoomId && (
                          <button
                            onClick={() => {
                              onSendVoiceToChat(
                                `📻 Transmisión Walkie-Talkie [CH • ${tx.channelFrequency.toFixed(4)} MHz ${tx.modulation}]`,
                                "audio",
                                tx.audioDataUrl,
                                tx.durationSeconds
                              );
                            }}
                            className="p-2 rounded-xl bg-slate-800 hover:bg-cyan-500 hover:text-black text-slate-300 transition"
                            title="Reenviar a conversación activa"
                          >
                            <Send className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
