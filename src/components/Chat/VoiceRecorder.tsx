import React, { useState, useRef, useEffect } from "react";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { app } from "../../services/firebase";
import {
  Mic,
  Square,
  Play,
  Pause,
  Trash2,
  Send,
  Loader2,
  Volume2,
  RotateCcw,
  Sparkles,
} from "lucide-react";

interface VoiceRecorderProps {
  roomId: string;
  onSendVoice: (content: string, type: "audio", mediaUrl: string, audioDuration?: number) => void;
  onCancel: () => void;
  isCompact?: boolean;
}

export const VoiceRecorder: React.FC<VoiceRecorderProps> = ({
  roomId,
  onSendVoice,
  onCancel,
  isCompact = false,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const [previewCurrentTime, setPreviewCurrentTime] = useState(0);
  const [previewDuration, setPreviewDuration] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgressText, setUploadProgressText] = useState("");
  const [visualizerLevels, setVisualizerLevels] = useState<number[]>([15, 25, 40, 60, 30, 20, 50, 70, 45, 25, 60, 35]);
  const [micError, setMicError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  const [waveformSamples, setWaveformSamples] = useState<number[]>([
    25, 45, 30, 70, 85, 60, 40, 90, 75, 50, 35, 65, 80, 95, 70, 55, 40, 60, 75, 45, 30, 50, 85, 65, 40
  ]);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Setup Web Audio API Analyser for real-time waveform visualization
  useEffect(() => {
    if (!isRecording || !analyserRef.current) return;

    let isMounted = true;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const analyser = analyserRef.current;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      if (!isMounted) return;
      animationFrameRef.current = requestAnimationFrame(draw);

      analyser.getByteTimeDomainData(dataArray);

      const width = canvas.width;
      const height = canvas.height;

      ctx.clearRect(0, 0, width, height);

      // Draw subtle background grid line
      ctx.lineWidth = 1;
      ctx.strokeStyle = "rgba(0, 230, 118, 0.15)";
      ctx.beginPath();
      ctx.moveTo(0, height / 2);
      ctx.lineTo(width, height / 2);
      ctx.stroke();

      // Waveform gradient line
      const gradient = ctx.createLinearGradient(0, 0, width, 0);
      gradient.addColorStop(0, "#00E676");
      gradient.addColorStop(0.5, "#00E5FF");
      gradient.addColorStop(1, "#76FF03");

      ctx.lineWidth = 2.5;
      ctx.strokeStyle = gradient;
      ctx.shadowColor = "rgba(0, 230, 118, 0.6)";
      ctx.shadowBlur = 8;
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

      // Also compute frequency levels for the reactive level bar
      const freqData = new Uint8Array(bufferLength);
      analyser.getByteFrequencyData(freqData);
      const sampled: number[] = [];
      const step = Math.max(1, Math.floor(freqData.length / 16));
      for (let i = 0; i < 16; i++) {
        const val = freqData[i * step] || 0;
        sampled.push(Math.max(15, Math.min(100, (val / 255) * 100)));
      }
      setVisualizerLevels(sampled);
    };

    draw();

    return () => {
      isMounted = false;
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [isRecording]);


  // Start recording on component mount
  useEffect(() => {
    startRecording();
    return () => {
      cleanupResources();
    };
  }, []);

  const cleanupResources = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      try {
        mediaRecorderRef.current.stop();
      } catch {}
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }
    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      try {
        audioContextRef.current.close();
      } catch {}
    }
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current = null;
    }
  };

  const startRecording = async () => {
    setMicError(null);
    audioChunksRef.current = [];
    setAudioBlob(null);
    setAudioUrl(null);
    setRecordingSeconds(0);
    setIsPlayingPreview(false);
    setPreviewCurrentTime(0);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      streamRef.current = stream;

      // Setup Web Audio API Analyser for real-time waveform visualization
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        const audioCtx = new AudioCtx();
        audioContextRef.current = audioCtx;
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 64;
        analyserRef.current = analyser;

        const source = audioCtx.createMediaStreamSource(stream);
        source.connect(analyser);

        const updateVisualizer = () => {
          if (!analyserRef.current) return;
          const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
          analyserRef.current.getByteFrequencyData(dataArray);

          // Sample 16 frequency bins for the live visualizer bars
          const sampled: number[] = [];
          const step = Math.max(1, Math.floor(dataArray.length / 16));
          for (let i = 0; i < 16; i++) {
            const val = dataArray[i * step] || 0;
            // Map 0-255 to min 15% - max 100% height
            sampled.push(Math.max(15, Math.min(100, (val / 255) * 100)));
          }
          setVisualizerLevels(sampled);
          animationFrameRef.current = requestAnimationFrame(updateVisualizer);
        };

        updateVisualizer();
      } catch (audioCtxErr) {
        console.warn("[VoiceRecorder] AudioContext visualizer fallback:", audioCtxErr);
      }

      // Determine supported mime type
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

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const mime = mediaRecorder.mimeType || "audio/webm";
        const blob = new Blob(audioChunksRef.current, { type: mime });
        setAudioBlob(blob);
        const objectUrl = URL.createObjectURL(blob);
        setAudioUrl(objectUrl);
        setIsRecording(false);

        // Generate synthetic waveform bars based on actual recorded chunks & energy
        generateWaveformBars(blob);
      };

      mediaRecorder.start(250); // Slice chunks every 250ms
      setIsRecording(true);
      setIsPaused(false);

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.error("[VoiceRecorder] Mic access error:", err);
      setMicError(
        err.name === "NotAllowedError" || err.name === "PermissionDeniedError"
          ? "Permiso de micrófono denegado en el navegador."
          : "No se detectó ningún micrófono disponible."
      );
      setIsRecording(false);
    }
  };

  const generateWaveformBars = async (blob: Blob) => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      const arrayBuffer = await blob.arrayBuffer();
      const decoded = await ctx.decodeAudioData(arrayBuffer);
      const rawData = decoded.getChannelData(0);
      const samplesCount = 28;
      const blockSize = Math.floor(rawData.length / samplesCount);
      const filteredData: number[] = [];

      for (let i = 0; i < samplesCount; i++) {
        let blockStart = blockSize * i;
        let sum = 0;
        for (let j = 0; j < blockSize; j++) {
          sum = sum + Math.abs(rawData[blockStart + j]);
        }
        const avg = sum / blockSize;
        // Normalize between 20% and 100%
        filteredData.push(Math.max(20, Math.min(100, Math.round(avg * 400))));
      }

      setWaveformSamples(filteredData);
      setPreviewDuration(decoded.duration || recordingSeconds || 1);
      ctx.close().catch(() => {});
    } catch (e) {
      // Fallback waveform if decodeAudioData fails on raw webm stream
      const fallback = Array.from({ length: 28 }, () => Math.floor(Math.random() * 65 + 25));
      setWaveformSamples(fallback);
      setPreviewDuration(recordingSeconds || 1);
    }
  };

  const stopRecording = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
    }
    setIsRecording(false);
  };

  const togglePlayPreview = () => {
    if (!audioUrl) return;

    if (!previewAudioRef.current) {
      const audio = new Audio(audioUrl);
      previewAudioRef.current = audio;

      audio.ontimeupdate = () => {
        setPreviewCurrentTime(audio.currentTime);
      };

      audio.onloadedmetadata = () => {
        setPreviewDuration(audio.duration || recordingSeconds || 1);
      };

      audio.onended = () => {
        setIsPlayingPreview(false);
        setPreviewCurrentTime(0);
      };
    }

    if (isPlayingPreview) {
      previewAudioRef.current.pause();
      setIsPlayingPreview(false);
    } else {
      previewAudioRef.current.play().catch((err) => {
        console.warn("[VoiceRecorder] Audio play interrupted:", err);
      });
      setIsPlayingPreview(true);
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressBarRef.current || !previewAudioRef.current || !audioUrl) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = rect.width;
    const percentage = Math.max(0, Math.min(1, clickX / width));
    const effectiveDuration = previewDuration || recordingSeconds || 1;
    const targetTime = percentage * effectiveDuration;

    previewAudioRef.current.currentTime = targetTime;
    setPreviewCurrentTime(targetTime);
  };

  const handleSendVoice = async () => {
    if (isRecording) {
      stopRecording();
    }

    setIsUploading(true);
    setUploadProgressText("Guardando y enviando audio...");

    try {
      let finalAudioUrl = "";
      const blob = audioBlob || new Blob(audioChunksRef.current, { type: "audio/webm" });

      // 1. Try uploading to Firebase Storage bucket
      try {
        setUploadProgressText("Subiendo a Firebase Storage...");
        const storage = getStorage(app);
        const fileName = `voices/${roomId || "general"}/${Date.now()}_voice_${Math.random().toString(36).substring(2, 7)}.webm`;
        const storageRef = ref(storage, fileName);

        const snapshot = await uploadBytes(storageRef, blob, {
          contentType: blob.type || "audio/webm",
          customMetadata: {
            durationSeconds: String(recordingSeconds),
            recordedAt: new Date().toISOString(),
          },
        });

        finalAudioUrl = await getDownloadURL(snapshot.ref);
        console.log("[VoiceRecorder] ✅ Subido exitosamente a Firebase Storage:", finalAudioUrl);
      } catch (storageErr) {
        console.warn("[VoiceRecorder] Firebase Storage directo no disponible, usando Data URL local:", storageErr);
        // Fallback to base64 Data URL to guarantee immediate zero-fail message delivery
        finalAudioUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      }

      const duration = recordingSeconds || Math.ceil(previewDuration) || 1;
      onSendVoice("🎤 Nota de voz", "audio", finalAudioUrl, duration);
      cleanupResources();
    } catch (err: any) {
      console.error("[VoiceRecorder] Error al procesar audio:", err);
      setMicError("Error al enviar la nota de voz.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDiscard = () => {
    cleanupResources();
    onCancel();
  };

  const formatSeconds = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const remainingSecs = sec % 60;
    return `${mins.toString().padStart(2, "0")}:${remainingSecs.toString().padStart(2, "0")}`;
  };

  if (micError) {
    return (
      <div className="flex items-center justify-between p-3 bg-rose-950/80 border border-rose-500/40 rounded-2xl text-xs text-rose-200 animate-in fade-in duration-200">
        <div className="flex items-center gap-2">
          <Mic className="w-4 h-4 text-rose-400" />
          <span>{micError}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={startRecording}
            className="px-2.5 py-1 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-[11px] transition"
          >
            Reintentar
          </button>
          <button
            onClick={handleDiscard}
            className="p-1 rounded-lg text-rose-300 hover:text-white transition"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between gap-3 p-2.5 sm:p-3 bg-slate-950/95 border border-[#00E676]/40 rounded-2xl shadow-[0_0_20px_rgba(0,230,118,0.15)] animate-in slide-in-from-bottom duration-200 text-slate-100">
      {/* Left: Discard / Cancel Button */}
      <button
        type="button"
        onClick={handleDiscard}
        disabled={isUploading}
        className="p-2 rounded-xl bg-slate-900 hover:bg-rose-950/60 hover:text-rose-400 text-slate-400 transition flex items-center justify-center shrink-0 disabled:opacity-50"
        title="Cancelar y descartar nota de voz"
      >
        <Trash2 className="w-4 h-4" />
      </button>

      {/* Middle: Live Recording Timer & Waveform Visualizer OR Preview Player */}
      <div className="flex-1 flex items-center gap-3 min-w-0 px-2">
        {isRecording ? (
          <>
            {/* Pulsing Recording Indicator & Timer */}
            <div className="flex items-center gap-2 shrink-0">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
              </span>
              <span className="font-mono text-xs font-black text-rose-400 tracking-wider">
                {formatSeconds(recordingSeconds)}
              </span>
            </div>

            {/* Dynamic Real-Time Web Audio API Waveform Canvas & Level Bars */}
            <div className="flex-1 flex items-center justify-center gap-2 h-9 max-w-sm mx-auto overflow-hidden bg-slate-900/60 rounded-xl px-2 border border-slate-800/80">
              <canvas
                ref={canvasRef}
                width={180}
                height={28}
                className="w-full max-w-[170px] h-7 rounded-lg"
              />
              <div className="flex items-center gap-0.5 h-6 shrink-0">
                {visualizerLevels.slice(0, 8).map((level, idx) => (
                  <div
                    key={`bar_${idx}`}
                    style={{ height: `${Math.max(15, level)}%` }}
                    className="w-1 rounded-full bg-gradient-to-t from-[#00E676] to-[#00E5FF] transition-all duration-75"
                  />
                ))}
              </div>
            </div>

            {/* Stop & Review Button */}
            <button
              type="button"
              onClick={stopRecording}
              className="p-2 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 transition shrink-0"
              title="Pausar y escuchar antes de enviar"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
            </button>
          </>
        ) : (
          /* Preview Mode: Interactive Visual Waveform & Scrubbable Progress Bar */
          <div className="flex-1 flex items-center gap-3">
            <button
              type="button"
              onClick={togglePlayPreview}
              className="p-2.5 rounded-xl bg-[#00E676] text-black font-black hover:scale-105 active:scale-95 transition shrink-0 shadow-md shadow-[#00E676]/30 flex items-center justify-center"
              title={isPlayingPreview ? "Pausar preescucha" : "Reproducir preescucha"}
            >
              {isPlayingPreview ? (
                <Pause className="w-4 h-4 fill-current" />
              ) : (
                <Play className="w-4 h-4 fill-current ml-0.5" />
              )}
            </button>

            <div className="flex-1 flex flex-col justify-center gap-1 min-w-0">
              {/* Header with times */}
              <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00E676]" />
                  <span className="text-[#00E676] font-bold">
                    {formatSeconds(Math.floor(previewCurrentTime))}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-slate-500 font-sans">Preescucha:</span>
                  <span className="font-bold text-slate-300">
                    {formatSeconds(recordingSeconds || Math.ceil(previewDuration))}
                  </span>
                </div>
              </div>

              {/* Interactive Visual Waveform Scrubber */}
              <div
                ref={progressBarRef}
                onClick={handleSeek}
                className="relative group h-7 bg-slate-900/80 border border-slate-800 rounded-xl px-2 py-1 flex items-center gap-0.5 cursor-pointer hover:border-[#00E676]/40 transition overflow-hidden"
                title="Haz clic o arrastra para desplazarte por el audio"
              >
                {/* Waveform Bars */}
                {waveformSamples.map((heightPercent, idx) => {
                  const effectiveDuration = previewDuration || recordingSeconds || 1;
                  const barProgress = (idx / waveformSamples.length) * effectiveDuration;
                  const isPlayed = previewCurrentTime >= barProgress;

                  return (
                    <div
                      key={`preview_bar_${idx}`}
                      className="flex-1 flex items-center justify-center h-full min-w-[2px]"
                    >
                      <div
                        style={{ height: `${heightPercent}%` }}
                        className={`w-full max-w-[4px] rounded-full transition-colors duration-75 ${
                          isPlayed
                            ? "bg-gradient-to-t from-[#00E676] to-[#00E5FF] shadow-[0_0_6px_rgba(0,230,118,0.4)]"
                            : "bg-slate-700/80 group-hover:bg-slate-600"
                        }`}
                      />
                    </div>
                  );
                })}

                {/* Scrubbing Playhead Line */}
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-white shadow-[0_0_8px_white] pointer-events-none transition-all duration-75"
                  style={{
                    left: `${
                      (previewDuration || recordingSeconds) > 0
                        ? (previewCurrentTime / (previewDuration || recordingSeconds || 1)) * 100
                        : 0
                    }%`,
                  }}
                />
              </div>

              {/* Bottom linear progress bar track */}
              <div
                onClick={handleSeek}
                className="w-full h-1 bg-slate-800/80 rounded-full overflow-hidden cursor-pointer"
              >
                <div
                  className="h-full bg-gradient-to-r from-[#00E676] to-[#00F0FF] rounded-full transition-all duration-75"
                  style={{
                    width: `${
                      (previewDuration || recordingSeconds) > 0
                        ? (previewCurrentTime / (previewDuration || recordingSeconds || 1)) * 100
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>

            <button
              type="button"
              onClick={startRecording}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition text-xs flex items-center gap-1.5 shrink-0"
              title="Descartar y volver a grabar"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline font-bold">Regrabar</span>
            </button>
          </div>
        )}
      </div>

      {/* Right: Send Button */}
      <button
        type="button"
        onClick={handleSendVoice}
        disabled={isUploading}
        className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#00E676] to-[#00F0FF] text-black font-black text-xs flex items-center gap-1.5 shadow-[0_0_15px_rgba(0,230,118,0.4)] hover:scale-105 active:scale-95 transition shrink-0 disabled:opacity-60"
        title="Enviar nota de voz"
      >
        {isUploading ? (
          <>
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span className="hidden sm:inline">Enviando...</span>
          </>
        ) : (
          <>
            <Send className="w-3.5 h-3.5 fill-current" />
            <span>Enviar</span>
          </>
        )}
      </button>
    </div>
  );
};
