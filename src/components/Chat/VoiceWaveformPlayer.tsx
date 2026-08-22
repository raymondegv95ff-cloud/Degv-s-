import React, { useState, useEffect, useRef } from "react";
import { Play, Pause, Volume2, Sparkles } from "lucide-react";

interface VoiceWaveformPlayerProps {
  mediaUrl?: string;
  duration?: number;
  isMe: boolean;
  accentColor?: string;
}

export const VoiceWaveformPlayer: React.FC<VoiceWaveformPlayerProps> = ({
  mediaUrl,
  duration = 12,
  isMe,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(duration);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [audioBars, setAudioBars] = useState<number[]>([]);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Generate a consistent yet natural waveform pattern
  useEffect(() => {
    const barsCount = 28;
    const initialBars: number[] = [];
    for (let i = 0; i < barsCount; i++) {
      // Natural speech distribution (lower near edges, dynamic in middle)
      const base = 25 + Math.sin((i / barsCount) * Math.PI) * 45;
      const variation = (Math.sin(i * 1.7) + 1) * 15;
      initialBars.push(Math.min(95, Math.max(20, Math.round(base + variation))));
    }
    setAudioBars(initialBars);
  }, [mediaUrl]);

  useEffect(() => {
    if (!mediaUrl) return;

    const audio = new Audio(mediaUrl);
    audioRef.current = audio;

    const handleLoadedMetadata = () => {
      if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
        setTotalDuration(Math.round(audio.duration));
      }
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.pause();
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("ended", handleEnded);
    };
  }, [mediaUrl]);

  // Synthetic playback simulation when mediaUrl is a dummy or not fully loaded
  useEffect(() => {
    let interval: any = null;
    if (isPlaying) {
      if (audioRef.current && audioRef.current.src) {
        audioRef.current.playbackRate = playbackSpeed;
        audioRef.current.play().catch(() => {
          // Fallback timer if audio playback is blocked by browser policy
          interval = setInterval(() => {
            setCurrentTime((prev) => {
              const next = prev + 0.1 * playbackSpeed;
              if (next >= totalDuration) {
                setIsPlaying(false);
                return 0;
              }
              return next;
            });
          }, 100);
        });
      } else {
        interval = setInterval(() => {
          setCurrentTime((prev) => {
            const next = prev + 0.1 * playbackSpeed;
            if (next >= totalDuration) {
              setIsPlaying(false);
              return 0;
            }
            return next;
          });
        }, 100);
      }
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      if (interval) clearInterval(interval);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlaying, playbackSpeed, totalDuration]);

  const togglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (index: number) => {
    const progressRatio = index / audioBars.length;
    const newTime = progressRatio * totalDuration;
    setCurrentTime(newTime);
    if (audioRef.current && !isNaN(audioRef.current.duration)) {
      audioRef.current.currentTime = newTime;
    }
  };

  const handleSpeedChange = () => {
    const nextSpeed = playbackSpeed === 1 ? 1.5 : playbackSpeed === 1.5 ? 2 : 1;
    setPlaybackSpeed(nextSpeed);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextSpeed;
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  const currentProgressRatio = totalDuration > 0 ? currentTime / totalDuration : 0;
  const currentPlayedBarIndex = Math.floor(currentProgressRatio * audioBars.length);

  return (
    <div className="flex flex-col gap-1.5 min-w-[240px] max-w-[310px] select-none py-1">
      <div className="flex items-center gap-2.5">
        {/* Play/Pause Button */}
        <button
          type="button"
          onClick={togglePlay}
          className={`w-10 h-10 rounded-full flex items-center justify-center transition-all shadow-md active:scale-95 shrink-0 ${
            isMe
              ? isPlaying
                ? "bg-slate-950 text-[#00E676] ring-2 ring-[#00E676]/60"
                : "bg-slate-950 text-[#00E676] hover:bg-slate-900"
              : isPlaying
              ? "bg-[#00E676] text-slate-950 ring-2 ring-emerald-400"
              : "bg-[#00E676] text-slate-950 hover:bg-[#00E676]/90"
          }`}
          title={isPlaying ? "Pausar nota de voz" : "Reproducir nota de voz"}
        >
          {isPlaying ? (
            <Pause className="w-4 h-4 fill-current" />
          ) : (
            <Play className="w-4 h-4 fill-current ml-0.5" />
          )}
        </button>

        {/* Dynamic Waveform Visualizer */}
        <div className="flex-1 flex items-center gap-[2.5px] h-9 px-1 cursor-pointer group/waveform" title="Haz clic en cualquier punto de la onda para avanzar">
          {audioBars.map((height, idx) => {
            const isPlayed = idx <= currentPlayedBarIndex;
            // Add subtle dynamic live dance if actively playing
            const dynamicScale = isPlaying && isPlayed ? 0.85 + Math.sin((currentTime * 8) + idx) * 0.25 : 1;
            const barHeight = Math.min(100, Math.max(15, Math.round(height * dynamicScale)));

            return (
              <div
                key={idx}
                onClick={() => handleSeek(idx)}
                className="h-full flex items-center justify-center flex-1"
              >
                <div
                  style={{ height: `${barHeight}%` }}
                  className={`w-full rounded-full transition-all duration-75 ${
                    isPlayed
                      ? isMe
                        ? "bg-slate-950 shadow-[0_0_6px_rgba(0,0,0,0.5)]"
                        : "bg-[#00E676] shadow-[0_0_6px_rgba(0,230,118,0.6)]"
                      : isMe
                      ? "bg-slate-900/35 hover:bg-slate-900/60"
                      : "bg-slate-700/50 hover:bg-slate-600"
                  }`}
                />
              </div>
            );
          })}
        </div>

        {/* Playback Speed Multiplier Toggle */}
        <button
          type="button"
          onClick={handleSpeedChange}
          className="text-[10px] font-black px-1.5 py-0.5 rounded-lg bg-black/25 hover:bg-black/40 text-slate-200 border border-white/10 transition active:scale-95 shrink-0 font-mono"
          title="Cambiar velocidad de reproducción"
        >
          {playbackSpeed}x
        </button>
      </div>

      {/* Time Tracker Row */}
      <div className="flex items-center justify-between px-1 text-[10px] font-mono text-slate-400">
        <span className="font-bold text-slate-300">
          {formatTime(currentTime)}
        </span>
        <span className="flex items-center gap-1 opacity-80">
          <Volume2 className="w-3 h-3 text-[#00E676]" />
          <span>{formatTime(totalDuration)}</span>
        </span>
      </div>
    </div>
  );
};
