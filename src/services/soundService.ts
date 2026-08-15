import { SoundCategory, SoundPreset, SoundCustomizationSettings, CustomSoundItem } from "../types";
import { storageService } from "./storageService";

// Web Audio API synthesizer & custom audio player for Degv's Messenger
let audioCtx: AudioContext | null = null;
let soundMuted = false;

// Default Sound Configuration
export const DEFAULT_SOUND_SETTINGS: SoundCustomizationSettings = {
  messageSound: "synth_classic",
  notificationSound: "pop_neon",
  voiceCallSound: "ringtone_marimba",
  videoCallSound: "cosmic_chime",
  customSounds: [],
};

// Built-in Presets Catalogue
export const SOUND_PRESETS: SoundPreset[] = [
  // MESSAGES
  { id: "synth_classic", name: "Clásico Degv (Sintetizador)", category: "message", description: "Bip doble suave y profesional" },
  { id: "bubble_pop", name: "Burbuja Pop", category: "message", description: "Sonido corto estilo burbuja de chat" },
  { id: "crystal_chime", name: "Cristal Neón", category: "message", description: "Tono metálico limpio y brillante" },
  { id: "cyber_ping", name: "Ping Ciberpunk", category: "message", description: "Pulso digital futurista" },
  { id: "gentle_bell", name: "Campana Sutil", category: "message", description: "Acorde armónico de campana" },

  // NOTIFICATIONS
  { id: "pop_neon", name: "Alerta Neón", category: "notification", description: "Doble tono ascendente vibrante" },
  { id: "subtle_whisper", name: "Susurro Digital", category: "notification", description: "Sonido de notificación suave" },
  { id: "triple_tone", name: "Tritono Armónico", category: "notification", description: "Acorde de 3 notas do-mi-sol" },
  { id: "breeze_drop", name: "Gota de Agua", category: "notification", description: "Efecto acuático relajante" },
  { id: "marimba_pop", name: "Marimba Corta", category: "notification", description: "Rebote cálido de madera" },

  // VOICE CALLS
  { id: "ringtone_marimba", name: "Marimba Tropical (Llamada)", category: "voice_call", description: "Melodía rítmica de marimba" },
  { id: "classic_phone", name: "Teléfono Retro", category: "voice_call", description: "Anillo telefónico vintage" },
  { id: "cyber_wave", name: "Onda Ciber", category: "voice_call", description: "Pulso sintético envolvente" },
  { id: "lounge_melody", name: "Melodía Relax", category: "voice_call", description: "Acorde suave y moderno" },
  { id: "electronic_pulse", name: "Pulso Eléctrico", category: "voice_call", description: "Tono rápido de alta claridad" },

  // VIDEO CALLS
  { id: "cosmic_chime", name: "Campanario Cósmico (Video)", category: "video_call", description: "Secuencia brillante de videollamada" },
  { id: "digital_harmony", name: "Armonía Digital", category: "video_call", description: "Anillo estéreo futurista" },
  { id: "futuristic_ring", name: "Eco Espacial", category: "video_call", description: "Resonancia profunda espacial" },
  { id: "crystal_cascade", name: "Cascada Cristalina", category: "video_call", description: "Arpegio cristalino fluido" },
];

export function setSoundMuted(muted: boolean) {
  soundMuted = muted;
}

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
    audioCtx = new AudioCtxClass();
  }
  if (audioCtx.state === "suspended") {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

// Play custom audio file (from device gallery / file upload) or base64 data
function playCustomAudio(audioUrlOrBase64: string): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      const audio = new Audio(audioUrlOrBase64);
      audio.volume = 0.85;
      audio.play().then(() => resolve()).catch((err) => reject(err));
    } catch (e) {
      reject(e);
    }
  });
}

// Synthesize built-in sound presets using Web Audio API
export function synthesizePresetSound(presetId: string) {
  if (soundMuted) return;

  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    switch (presetId) {
      // Message Presets
      case "synth_classic": {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(580, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.08);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.08);
        break;
      }

      case "bubble_pop": {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.exponentialRampToValueAtTime(1300, now + 0.06);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.06);
        break;
      }

      case "crystal_chime": {
        [880, 1760, 2640].forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "sine";
          osc.frequency.setValueAtTime(freq, now + idx * 0.03);
          gain.gain.setValueAtTime(0.1 / (idx + 1), now + idx * 0.03);
          gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.03 + 0.25);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + idx * 0.03);
          osc.stop(now + idx * 0.03 + 0.25);
        });
        break;
      }

      case "cyber_ping": {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(1200, now);
        osc.frequency.exponentialRampToValueAtTime(600, now + 0.1);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.1);
        break;
      }

      case "gentle_bell": {
        [440, 554.37, 659.25].forEach((freq) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "sine";
          osc.frequency.setValueAtTime(freq, now);
          gain.gain.setValueAtTime(0.08, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 0.35);
        });
        break;
      }

      // Notification Presets
      case "pop_neon": {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.setValueAtTime(1050, now + 0.05);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.12);
        break;
      }

      case "subtle_whisper": {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(350, now);
        osc.frequency.exponentialRampToValueAtTime(520, now + 0.15);
        gain.gain.setValueAtTime(0.06, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.15);
        break;
      }

      case "triple_tone": {
        const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "sine";
          osc.frequency.setValueAtTime(freq, now + idx * 0.07);
          gain.gain.setValueAtTime(0.12, now + idx * 0.07);
          gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.07 + 0.18);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + idx * 0.07);
          osc.stop(now + idx * 0.07 + 0.18);
        });
        break;
      }

      case "breeze_drop": {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(950, now);
        osc.frequency.exponentialRampToValueAtTime(320, now + 0.12);
        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.12);
        break;
      }

      case "marimba_pop": {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.setValueAtTime(600, now + 0.06);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.16);
        break;
      }

      // Voice Call Presets
      case "ringtone_marimba": {
        const notes = [523.25, 659.25, 783.99, 1046.5, 783.99, 1046.5];
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "triangle";
          osc.frequency.setValueAtTime(freq, now + idx * 0.1);
          gain.gain.setValueAtTime(0.14, now + idx * 0.1);
          gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.1 + 0.2);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + idx * 0.1);
          osc.stop(now + idx * 0.1 + 0.2);
        });
        break;
      }

      case "classic_phone": {
        for (let i = 0; i < 2; i++) {
          const osc1 = ctx.createOscillator();
          const osc2 = ctx.createOscillator();
          const gain = ctx.createGain();
          osc1.type = "sine";
          osc2.type = "sine";
          osc1.frequency.setValueAtTime(440, now + i * 0.25);
          osc2.frequency.setValueAtTime(480, now + i * 0.25);
          gain.gain.setValueAtTime(0.1, now + i * 0.25);
          gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.25 + 0.2);
          osc1.connect(gain);
          osc2.connect(gain);
          gain.connect(ctx.destination);
          osc1.start(now + i * 0.25);
          osc2.start(now + i * 0.25);
          osc1.stop(now + i * 0.25 + 0.2);
          osc2.stop(now + i * 0.25 + 0.2);
        }
        break;
      }

      case "cyber_wave": {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.4);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.4);
        break;
      }

      case "lounge_melody": {
        const notes = [329.63, 392.0, 493.88, 587.33];
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "sine";
          osc.frequency.setValueAtTime(freq, now + idx * 0.12);
          gain.gain.setValueAtTime(0.12, now + idx * 0.12);
          gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.12 + 0.3);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + idx * 0.12);
          osc.stop(now + idx * 0.12 + 0.3);
        });
        break;
      }

      case "electronic_pulse": {
        for (let i = 0; i < 3; i++) {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "square";
          osc.frequency.setValueAtTime(900, now + i * 0.08);
          gain.gain.setValueAtTime(0.06, now + i * 0.08);
          gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.05);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + i * 0.08);
          osc.stop(now + i * 0.08 + 0.05);
        }
        break;
      }

      // Video Call Presets
      case "cosmic_chime": {
        const arpeggio = [523.25, 659.25, 783.99, 1046.5, 1318.5, 1567.98];
        arpeggio.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "sine";
          osc.frequency.setValueAtTime(freq, now + idx * 0.06);
          gain.gain.setValueAtTime(0.1, now + idx * 0.06);
          gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.25);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + idx * 0.06);
          osc.stop(now + idx * 0.06 + 0.25);
        });
        break;
      }

      case "digital_harmony": {
        const chord = [440, 554.37, 659.25, 880];
        chord.forEach((freq) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "triangle";
          osc.frequency.setValueAtTime(freq, now);
          gain.gain.setValueAtTime(0.08, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 0.45);
        });
        break;
      }

      case "futuristic_ring": {
        for (let i = 0; i < 4; i++) {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "sine";
          osc.frequency.setValueAtTime(1400 - i * 150, now + i * 0.07);
          gain.gain.setValueAtTime(0.12, now + i * 0.07);
          gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.07 + 0.06);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + i * 0.07);
          osc.stop(now + i * 0.07 + 0.06);
        }
        break;
      }

      case "crystal_cascade": {
        const cascade = [1046.5, 880, 659.25, 523.25];
        cascade.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "sine";
          osc.frequency.setValueAtTime(freq, now + idx * 0.08);
          gain.gain.setValueAtTime(0.1, now + idx * 0.08);
          gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.3);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + idx * 0.08);
          osc.stop(now + idx * 0.08 + 0.3);
        });
        break;
      }

      default:
        // Fallback default message sound
        synthesizePresetSound("synth_classic");
        break;
    }
  } catch (e) {
    console.error("Audio synthesis error:", e);
  }
}

// Play sound by sound ID, custom audio URL, or preset
export function playSoundIdOrUrl(soundIdOrUrl: string, customSoundsList: CustomSoundItem[] = []) {
  if (soundMuted) return;

  // Check if it's a custom uploaded audio file Data URL or Blob URL
  if (soundIdOrUrl.startsWith("data:audio") || soundIdOrUrl.startsWith("blob:") || soundIdOrUrl.startsWith("http")) {
    playCustomAudio(soundIdOrUrl).catch(() => {
      synthesizePresetSound("synth_classic");
    });
    return;
  }

  // Check if soundIdOrUrl matches a custom sound ID stored in settings
  const customFound = customSoundsList.find((c) => c.id === soundIdOrUrl);
  if (customFound && customFound.audioUrl) {
    playCustomAudio(customFound.audioUrl).catch(() => {
      synthesizePresetSound("synth_classic");
    });
    return;
  }

  // Otherwise synthesize built-in sound preset
  synthesizePresetSound(soundIdOrUrl);
}

export function playSendSound(selectedSoundId?: string, customSoundsList?: CustomSoundItem[]) {
  if (soundMuted) return;
  const cfg = storageService.getSoundSettings();
  const soundId = selectedSoundId || cfg.messageSound || "synth_classic";
  const customs = customSoundsList || cfg.customSounds || [];
  playSoundIdOrUrl(soundId, customs);
}

export function playReceiveSound(selectedSoundId?: string, customSoundsList?: CustomSoundItem[]) {
  if (soundMuted) return;
  const cfg = storageService.getSoundSettings();
  const soundId = selectedSoundId || cfg.notificationSound || cfg.messageSound || "pop_neon";
  const customs = customSoundsList || cfg.customSounds || [];
  playSoundIdOrUrl(soundId, customs);
}

export function playCallRingSound(selectedSoundId?: string, customSoundsList?: CustomSoundItem[]) {
  if (soundMuted) return;
  const cfg = storageService.getSoundSettings();
  const soundId = selectedSoundId || cfg.voiceCallSound || "ringtone_marimba";
  const customs = customSoundsList || cfg.customSounds || [];
  playSoundIdOrUrl(soundId, customs);
}

export function playVideoCallRingSound(selectedSoundId?: string, customSoundsList?: CustomSoundItem[]) {
  if (soundMuted) return;
  const cfg = storageService.getSoundSettings();
  const soundId = selectedSoundId || cfg.videoCallSound || "cosmic_chime";
  const customs = customSoundsList || cfg.customSounds || [];
  playSoundIdOrUrl(soundId, customs);
}

export const soundService = {
  playSendSound,
  playReceiveSound,
  playCallRingSound,
  playVideoCallRingSound,
  playSoundIdOrUrl,
  synthesizePresetSound,
  setSoundMuted,
  SOUND_PRESETS,
  DEFAULT_SOUND_SETTINGS,
};
