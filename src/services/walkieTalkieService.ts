import { collection, addDoc, onSnapshot, query, where, orderBy, limit, serverTimestamp, getFirestore } from "firebase/firestore";
import { app } from "./firebase";

export interface RadioChannel {
  id: string;
  channelNumber: number;
  name: string;
  frequency: number; // in MHz, e.g. 462.5625
  modulation: "FM" | "AM" | "SSB" | "DMR";
  description: string;
  color: string;
  isPrivate?: boolean;
}

export const RADIO_CHANNELS: RadioChannel[] = [
  {
    id: "ch_1",
    channelNumber: 1,
    name: "Canal General / Público",
    frequency: 462.5625,
    modulation: "FM",
    description: "Frecuencia abierta para todos los usuarios",
    color: "#00E676",
  },
  {
    id: "ch_2",
    channelNumber: 2,
    name: "Canal Táctico & Emergencias",
    frequency: 462.5875,
    modulation: "FM",
    description: "Comunicaciones prioritarias de respuesta rápida",
    color: "#FF3D00",
  },
  {
    id: "ch_3",
    channelNumber: 3,
    name: "Operaciones & Equipo",
    frequency: 462.6125,
    modulation: "DMR",
    description: "Modulación digital para grupos y flotas",
    color: "#00E5FF",
  },
  {
    id: "ch_4",
    channelNumber: 4,
    name: "Enlace Directo P2P",
    frequency: 467.6375,
    modulation: "FM",
    description: "Canal de baja potencia punto a punto",
    color: "#FFD600",
  },
  {
    id: "ch_5",
    channelNumber: 5,
    name: "Repetidor Cyber Degv's",
    frequency: 467.6625,
    modulation: "SSB",
    description: "Banda lateral para enlaces de larga distancia",
    color: "#D500F9",
  },
  {
    id: "ch_6",
    channelNumber: 6,
    name: "VHF Radioaficionados",
    frequency: 144.8000,
    modulation: "FM",
    description: "Frecuencia internacional de llamada 2 metros",
    color: "#76FF03",
  },
  {
    id: "ch_7",
    channelNumber: 7,
    name: "UHF Encriptado",
    frequency: 433.9200,
    modulation: "DMR",
    description: "Canal seguro con codificación digital",
    color: "#2979FF",
  },
  {
    id: "ch_8",
    channelNumber: 8,
    name: "PMR-446 Euro",
    frequency: 446.00625,
    modulation: "FM",
    description: "Estándar civil sin licencia libre de interferencia",
    color: "#FF9100",
  },
];

export type AudioModulationEffect = 
  | "classic_radio"
  | "deep_space"
  | "underwater"
  | "cyber_pilot"
  | "military_vhf"
  | "clean";

export interface ModulationEffectPreset {
  id: AudioModulationEffect;
  name: string;
  shortDesc: string;
  iconName: string;
  badgeColor: string;
}

export const MODULATION_EFFECTS: ModulationEffectPreset[] = [
  {
    id: "classic_radio",
    name: "Radio Clásica",
    shortDesc: "Bandpass analógico 300-3400Hz + saturación RF",
    iconName: "Radio",
    badgeColor: "#00E676",
  },
  {
    id: "military_vhf",
    name: "VHF Militar",
    shortDesc: "Filtro táctico estrecho 600-2400Hz + compresión",
    iconName: "ShieldAlert",
    badgeColor: "#FF9100",
  },
  {
    id: "deep_space",
    name: "Espacio Profundo",
    shortDesc: "Eco reverberante cósmico + retardo orbital",
    iconName: "Sparkles",
    badgeColor: "#D500F9",
  },
  {
    id: "underwater",
    name: "Submarino / Hidrófono",
    shortDesc: "Paso-bajo resonante 450Hz + atenuación acuática",
    iconName: "Waves",
    badgeColor: "#00E5FF",
  },
  {
    id: "cyber_pilot",
    name: "Piloto Cyberpunk",
    shortDesc: "Resonancia metálica doble + textura sintética",
    iconName: "Bot",
    badgeColor: "#FF0055",
  },
  {
    id: "clean",
    name: "Directo / Limpio",
    shortDesc: "Audio natural de estudio sin filtros",
    iconName: "Mic",
    badgeColor: "#94A3B8",
  },
];

export interface ChannelScanResult {
  channel: RadioChannel;
  signalStrengthDbm: number; // e.g. -50 dBm (strong) to -115 dBm (noise floor)
  signalPercent: number; // 0 - 100%
  sMeter: string; // "S9+20", "S7", etc.
  status: "ACTIVE" | "TRANSMITTING" | "STANDBY" | "WEAK";
  lastActivity: string;
  snr: number; // Signal to noise ratio in dB
}

export interface WalkieTransmission {
  id?: string;
  channelId: string;
  channelFrequency: number;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  targetRoomId?: string;
  audioDataUrl: string;
  durationSeconds: number;
  modulation: "FM" | "AM" | "SSB" | "DMR";
  timestamp: number;
}

class WalkieTalkieAudioEngine {
  private audioCtx: AudioContext | null = null;

  private getContext(): AudioContext {
    if (!this.audioCtx || this.audioCtx.state === "closed") {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.audioCtx = new AudioContextClass();
    }
    if (this.audioCtx.state === "suspended") {
      this.audioCtx.resume().catch(() => {});
    }
    return this.audioCtx;
  }

  /**
   * Play realistic PTT Press Beep (Opening TX)
   */
  playPttOpenBeep() {
    try {
      const ctx = this.getContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
      osc.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.04); // A6 chirp

      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.06);
    } catch (e) {
      console.warn("[WalkieTalkie] Audio beep error:", e);
    }
  }

  /**
   * Play classic Roger Beep / Quindar Tone on PTT Release (Over & Out)
   */
  playRogerBeep() {
    try {
      const ctx = this.getContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      // Dual classic radio beep tone
      osc.type = "sine";
      osc.frequency.setValueAtTime(2475, ctx.currentTime); // Standard Quindar NASA frequency
      osc.frequency.setValueAtTime(2475, ctx.currentTime + 0.08);
      osc.frequency.setValueAtTime(1240, ctx.currentTime + 0.09);

      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.setValueAtTime(0.15, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.12, ctx.currentTime + 0.09);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.2);

      // Play squelch burst right after roger beep
      this.playSquelchTail();
    } catch (e) {
      console.warn("[WalkieTalkie] Roger beep error:", e);
    }
  }

  /**
   * Play short static squelch tail burst
   */
  playSquelchTail() {
    try {
      const ctx = this.getContext();
      const bufferSize = ctx.sampleRate * 0.06; // 60ms noise
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);

      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * 0.15;
      }

      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      // Bandpass filter to sound like analog VHF squelch
      const filter = ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.setValueAtTime(1800, ctx.currentTime);
      filter.Q.setValueAtTime(3, ctx.currentTime);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      noise.start();
      noise.stop(ctx.currentTime + 0.06);
    } catch (e) {
      console.warn("[WalkieTalkie] Squelch error:", e);
    }
  }

  /**
   * Play short radar scan click
   */
  playScannerClick() {
    try {
      const ctx = this.getContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(1400 + Math.random() * 800, ctx.currentTime);
      gain.gain.setValueAtTime(0.04, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.025);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.025);
    } catch {}
  }

  /**
   * Trigger tactile haptic vibration patterns using window.navigator.vibrate API
   */
  triggerHaptic(type: "tx_start" | "tx_stop" | "scan_tick" | "channel_switch") {
    try {
      if (typeof window !== "undefined" && typeof window.navigator !== "undefined" && "vibrate" in window.navigator && typeof window.navigator.vibrate === "function") {
        if (type === "tx_start") {
          // Double-pulse punch pattern when PTT transmission begins
          window.navigator.vibrate([60, 30, 80]);
        } else if (type === "tx_stop") {
          // Sharp drop-off pattern when PTT transmission ends
          window.navigator.vibrate([40, 20]);
        } else if (type === "scan_tick") {
          window.navigator.vibrate(15);
        } else if (type === "channel_switch") {
          window.navigator.vibrate([25, 20, 25]);
        }
      }
    } catch (e) {
      console.warn("[WalkieTalkie] Haptic vibration error:", e);
    }
  }

  /**
   * Applies real-time DSP audio modulation effects using Web Audio API nodes
   * Returns a modulated MediaStream ready for MediaRecorder or transmission
   */
  createModulatedMediaStream(
    rawStream: MediaStream,
    effect: AudioModulationEffect = "classic_radio"
  ): { modulatedStream: MediaStream; audioContext: AudioContext; cleanup: () => void } {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new AudioContextClass();
    const sourceNode = ctx.createMediaStreamSource(rawStream);
    const destinationNode = ctx.createMediaStreamDestination();

    let lastNode: AudioNode = sourceNode;

    if (effect === "classic_radio") {
      // 1. Bandpass filter 300Hz - 3400Hz (PSTN / Analog Radio Telephony)
      const highpass = ctx.createBiquadFilter();
      highpass.type = "highpass";
      highpass.frequency.setValueAtTime(350, ctx.currentTime);

      const lowpass = ctx.createBiquadFilter();
      lowpass.type = "lowpass";
      lowpass.frequency.setValueAtTime(3200, ctx.currentTime);

      // 2. Waveshaper saturation / overdrive for subtle RF clip
      const distortion = ctx.createWaveShaper();
      const n_samples = 44100;
      const curve = new Float32Array(n_samples);
      const deg = Math.PI / 180;
      const k = 18; // distortion amount
      for (let i = 0; i < n_samples; ++i) {
        const x = (i * 2) / n_samples - 1;
        curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
      }
      distortion.curve = curve;
      distortion.oversample = "2x";

      // 3. Peak presence filter around 1.8kHz
      const peaking = ctx.createBiquadFilter();
      peaking.type = "peaking";
      peaking.frequency.setValueAtTime(1800, ctx.currentTime);
      peaking.gain.setValueAtTime(4, ctx.currentTime);
      peaking.Q.setValueAtTime(2, ctx.currentTime);

      sourceNode.connect(highpass);
      highpass.connect(lowpass);
      lowpass.connect(distortion);
      distortion.connect(peaking);
      lastNode = peaking;
    } else if (effect === "military_vhf") {
      // Very tight aggressive tactical bandpass 600Hz - 2200Hz + hard compression
      const highpass = ctx.createBiquadFilter();
      highpass.type = "highpass";
      highpass.frequency.setValueAtTime(600, ctx.currentTime);

      const lowpass = ctx.createBiquadFilter();
      lowpass.type = "lowpass";
      lowpass.frequency.setValueAtTime(2200, ctx.currentTime);

      const compressor = ctx.createDynamicsCompressor();
      compressor.threshold.setValueAtTime(-24, ctx.currentTime);
      compressor.knee.setValueAtTime(10, ctx.currentTime);
      compressor.ratio.setValueAtTime(12, ctx.currentTime);
      compressor.attack.setValueAtTime(0.003, ctx.currentTime);
      compressor.release.setValueAtTime(0.1, ctx.currentTime);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(1.8, ctx.currentTime);

      sourceNode.connect(highpass);
      highpass.connect(lowpass);
      lowpass.connect(compressor);
      compressor.connect(gain);
      lastNode = gain;
    } else if (effect === "deep_space") {
      // Cosmic Delay & Resonant High Cut with Feedback
      const lowpass = ctx.createBiquadFilter();
      lowpass.type = "lowpass";
      lowpass.frequency.setValueAtTime(2200, ctx.currentTime);

      const delay = ctx.createDelay();
      delay.delayTime.setValueAtTime(0.22, ctx.currentTime); // 220ms delay

      const feedback = ctx.createGain();
      feedback.gain.setValueAtTime(0.42, ctx.currentTime);

      const mixGain = ctx.createGain();
      mixGain.gain.setValueAtTime(1.1, ctx.currentTime);

      sourceNode.connect(lowpass);
      lowpass.connect(mixGain);
      lowpass.connect(delay);
      delay.connect(feedback);
      feedback.connect(delay);
      delay.connect(mixGain);
      lastNode = mixGain;
    } else if (effect === "underwater") {
      // Deep resonant lowpass 450Hz with high Q + sub-bass boost
      const lowpass = ctx.createBiquadFilter();
      lowpass.type = "lowpass";
      lowpass.frequency.setValueAtTime(450, ctx.currentTime);
      lowpass.Q.setValueAtTime(4.5, ctx.currentTime);

      const lowShelf = ctx.createBiquadFilter();
      lowShelf.type = "lowshelf";
      lowShelf.frequency.setValueAtTime(180, ctx.currentTime);
      lowShelf.gain.setValueAtTime(6, ctx.currentTime);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(1.6, ctx.currentTime);

      sourceNode.connect(lowpass);
      lowpass.connect(lowShelf);
      lowShelf.connect(gain);
      lastNode = gain;
    } else if (effect === "cyber_pilot") {
      // Robotic metallic notch / bandpass filter
      const biquad1 = ctx.createBiquadFilter();
      biquad1.type = "bandpass";
      biquad1.frequency.setValueAtTime(1200, ctx.currentTime);
      biquad1.Q.setValueAtTime(5, ctx.currentTime);

      const biquad2 = ctx.createBiquadFilter();
      biquad2.type = "peaking";
      biquad2.frequency.setValueAtTime(2600, ctx.currentTime);
      biquad2.gain.setValueAtTime(8, ctx.currentTime);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(2.2, ctx.currentTime);

      sourceNode.connect(biquad1);
      biquad1.connect(biquad2);
      biquad2.connect(gain);
      lastNode = gain;
    }

    lastNode.connect(destinationNode);

    const cleanup = () => {
      try {
        if (ctx.state !== "closed") {
          ctx.close().catch(() => {});
        }
      } catch {}
    };

    return {
      modulatedStream: destinationNode.stream,
      audioContext: ctx,
      cleanup,
    };
  }

  /**
   * Play receiving audio with tactical bandpass walkie-talkie filter
   */
  async playRadioAudio(audioUrl: string, volume: number = 1.0, modulation: string = "FM") {
    try {
      this.playSquelchTail();
      const audio = new Audio(audioUrl);
      audio.volume = Math.max(0, Math.min(1, volume));
      
      await new Promise((resolve) => setTimeout(resolve, 80));
      
      await audio.play();
      audio.onended = () => {
        this.playRogerBeep();
      };
    } catch (err) {
      console.warn("[WalkieTalkie] Audio playback error:", err);
    }
  }
}

export const walkieAudioEngine = new WalkieTalkieAudioEngine();

class WalkieTalkieService {
  private activeChannel: RadioChannel = RADIO_CHANNELS[0];
  private activeEffect: AudioModulationEffect = "classic_radio";
  private squelchLevel: number = 50; // 0 to 100
  private volumeLevel: number = 85; // 0 to 100
  private isMuted: boolean = false;

  getActiveChannel(): RadioChannel {
    return this.activeChannel;
  }

  setActiveChannel(channel: RadioChannel) {
    this.activeChannel = channel;
    // Play channel switch click sound
    walkieAudioEngine.playSquelchTail();
  }

  getActiveEffect(): AudioModulationEffect {
    return this.activeEffect;
  }

  setActiveEffect(effect: AudioModulationEffect) {
    this.activeEffect = effect;
  }

  getSquelchLevel(): number {
    return this.squelchLevel;
  }

  setSquelchLevel(lvl: number) {
    this.squelchLevel = Math.max(0, Math.min(100, lvl));
  }

  getVolumeLevel(): number {
    return this.volumeLevel;
  }

  setVolumeLevel(lvl: number) {
    this.volumeLevel = Math.max(0, Math.min(100, lvl));
  }

  /**
   * Transmit voice packet to Firestore radio frequency channel
   */
  async broadcastTransmission(transmission: Omit<WalkieTransmission, "timestamp">): Promise<void> {
    try {
      const db = getFirestore(app);
      const colRef = collection(db, "walkie_transmissions");

      await addDoc(colRef, {
        ...transmission,
        timestamp: Date.now(),
        createdAt: serverTimestamp(),
      });
      console.log(`[WalkieTalkie] 📡 Transmission broadcast on ${transmission.channelFrequency} MHz`);
    } catch (err) {
      console.warn("[WalkieTalkie] Error broadcasting transmission:", err);
    }
  }

  /**
   * Subscribe to real-time transmissions on a specific radio channel or room
   */
  subscribeToChannel(
    channelId: string,
    currentUserId: string,
    onTransmissionReceived: (tx: WalkieTransmission) => void
  ): () => void {
    try {
      const db = getFirestore(app);
      const colRef = collection(db, "walkie_transmissions");

      // Query latest transmissions within last 30 seconds
      const recentTimestamp = Date.now() - 30000;
      const q = query(
        colRef,
        where("channelId", "==", channelId),
        limit(15)
      );

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          snapshot.docChanges().forEach((change) => {
            if (change.type === "added") {
              const data = change.doc.data() as WalkieTransmission;
              // Ignore transmissions sent by current user
              if (data.senderId !== currentUserId && data.timestamp >= recentTimestamp) {
                onTransmissionReceived({ ...data, id: change.doc.id });
              }
            }
          });
        },
        (error) => {
          console.warn("[WalkieTalkie] Channel listener notice:", error.message);
        }
      );

      return unsubscribe;
    } catch (err) {
      console.warn("[WalkieTalkie] Subscribe error:", err);
      return () => {};
    }
  }
  /**
   * Scan radio spectrum across all configured frequencies and channels
   */
  scanAllChannels(activeChannelId?: string): ChannelScanResult[] {
    return RADIO_CHANNELS.map((ch) => {
      const isCurrent = ch.id === activeChannelId;
      // Calculate realistic RF signal strength in dBm (-50dBm strong to -115dBm weak)
      const baseSignal = isCurrent ? -58 : -75 - Math.floor(Math.sin(ch.channelNumber * 2.3) * 25);
      const signalStrengthDbm = Math.min(-45, Math.max(-118, baseSignal));
      // Convert to percentage (0 - 100%)
      const signalPercent = Math.max(8, Math.min(100, Math.round(((signalStrengthDbm + 120) / 75) * 100)));
      
      let sMeter = "S3";
      if (signalPercent > 85) sMeter = "S9+30dB";
      else if (signalPercent > 70) sMeter = "S9+10dB";
      else if (signalPercent > 55) sMeter = "S9";
      else if (signalPercent > 40) sMeter = "S7";
      else if (signalPercent > 25) sMeter = "S5";
      else sMeter = "S2";

      let status: "ACTIVE" | "TRANSMITTING" | "STANDBY" | "WEAK" = "STANDBY";
      if (isCurrent) status = "ACTIVE";
      else if (signalPercent > 65) status = "ACTIVE";
      else if (signalPercent < 20) status = "WEAK";

      const snr = Math.max(4, Math.round(signalPercent * 0.45));

      return {
        channel: ch,
        signalStrengthDbm,
        signalPercent,
        sMeter,
        status,
        lastActivity: isCurrent ? "En sintonía" : signalPercent > 60 ? "Portadora detectada" : "En espera",
        snr,
      };
    });
  }
}

export const walkieTalkieService = new WalkieTalkieService();
