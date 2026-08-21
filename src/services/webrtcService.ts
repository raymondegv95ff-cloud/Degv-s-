import { db } from "./firebase";
import {
  collection,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  onSnapshot,
  addDoc,
  query,
  where,
  getDocs,
  Unsubscribe,
} from "firebase/firestore";
import { UserProfile } from "../types";

export interface CallSession {
  id: string;
  callerId: string;
  callerName: string;
  callerAvatar?: string;
  calleeId: string;
  calleeName: string;
  calleeAvatar?: string;
  roomId: string;
  type: "audio" | "video";
  status: "calling" | "accepted" | "declined" | "ended" | "busy";
  offer?: { sdp?: string; type?: RTCSdpType };
  answer?: { sdp?: string; type?: RTCSdpType };
  createdAt: number;
}

export const RTC_CONFIGURATION: RTCConfiguration = {
  iceServers: [
    { urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] },
    { urls: ["stun:stun2.l.google.com:19302", "stun:stun3.l.google.com:19302"] },
  ],
  iceCandidatePoolSize: 10,
};

class WebRTCService {
  private peerConnection: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private activeCallId: string | null = null;
  private unsubCallDoc: Unsubscribe | null = null;
  private unsubCallerCandidates: Unsubscribe | null = null;
  private unsubCalleeCandidates: Unsubscribe | null = null;
  private remoteStreamCallbacks: Set<(stream: MediaStream) => void> = new Set();
  private callStatusCallbacks: Set<(status: CallSession["status"]) => void> = new Set();
  private pendingCandidates: RTCIceCandidateInit[] = [];

  /**
   * Obtiene o inicializa la conexión PeerConnection de WebRTC
   */
  public getOrCreatePeerConnection(): RTCPeerConnection {
    if (this.peerConnection && this.peerConnection.connectionState !== "closed") {
      return this.peerConnection;
    }

    console.log("[Degv's WebRTC] 🛠️ Creando nueva RTCPeerConnection con STUN Google...");
    const pc = new RTCPeerConnection(RTC_CONFIGURATION);
    this.pendingCandidates = [];

    // Inicializar stream remoto
    this.remoteStream = new MediaStream();

    // Evento al recibir pistas de audio/video remotas
    pc.ontrack = (event) => {
      console.log("[Degv's WebRTC] 🎯 [ontrack] Pista remota recibida:", {
        kind: event.track.kind,
        id: event.track.id,
        label: event.track.label,
        enabled: event.track.enabled,
        muted: event.track.muted,
        readyState: event.track.readyState,
        streamsCount: event.streams.length,
      });
      if (this.remoteStream) {
        event.streams[0]?.getTracks().forEach((track) => {
          console.log(`[Degv's WebRTC] ➕ Añadiendo pista remota ${track.kind} (${track.id}) al stream receptor`);
          this.remoteStream?.addTrack(track);
        });
      }
      this.remoteStreamCallbacks.forEach((cb) => {
        if (this.remoteStream) cb(this.remoteStream);
      });
    };

    // Logging de cambios de estado de conexión WebRTC
    pc.onconnectionstatechange = () => {
      console.log("[Degv's WebRTC] 📡 [onconnectionstatechange] Estado de conexión:", pc.connectionState, {
        signalingState: pc.signalingState,
        iceConnectionState: pc.iceConnectionState,
        iceGatheringState: pc.iceGatheringState,
      });
      if (pc.connectionState === "connected") {
        console.log("[Degv's WebRTC] ✅ [P2P Connected] ¡Conexión P2P establecida exitosamente entre ambos dispositivos!");
      } else if (pc.connectionState === "connecting") {
        console.log("[Degv's WebRTC] ⏳ [P2P Connecting] Negociando y estableciendo transporte P2P...");
      } else if (pc.connectionState === "disconnected") {
        console.warn("[Degv's WebRTC] ⚠️ [P2P Disconnected] La conexión P2P se ha desconectado momentáneamente.");
      } else if (pc.connectionState === "failed") {
        console.error("[Degv's WebRTC] ❌ [P2P Failed] Falló la negociación o conectividad WebRTC. Verificando STUN/TURN e ICE candidates.");
      } else if (pc.connectionState === "closed") {
        console.log("[Degv's WebRTC] 🔒 [P2P Closed] Conexión RTCPeerConnection cerrada.");
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log("[Degv's WebRTC] ❄️ [oniceconnectionstatechange] Estado ICE de conexión:", {
        iceConnectionState: pc.iceConnectionState,
        connectionState: pc.connectionState,
      });
      if (pc.iceConnectionState === "failed" || pc.iceConnectionState === "disconnected") {
        console.warn("[Degv's WebRTC] ⚠️ [ICE Failure/Disconnect] Posible bloqueo de cortafuegos o NAT estricto detectado.");
      }
    };

    pc.onicegatheringstatechange = () => {
      console.log("[Degv's WebRTC] 🛰️ [onicegatheringstatechange] Estado de recolección de candidatos ICE:", {
        iceGatheringState: pc.iceGatheringState,
      });
      if (pc.iceGatheringState === "complete") {
        console.log("[Degv's WebRTC] 🏁 [ICE Gathering Complete] Todos los candidatos ICE locales han sido recolectados.");
      }
    };

    pc.onnegotiationneeded = () => {
      console.log("[Degv's WebRTC] 🔁 [onnegotiationneeded] Se requiere renegociación SDP en RTCPeerConnection.");
    };

    (pc as any).onicecandidateerror = (event: any) => {
      console.warn("[Degv's WebRTC] ⚠️ [onicecandidateerror] Error en candidato ICE:", {
        errorCode: event.errorCode,
        errorText: event.errorText,
        url: event.url,
        address: event.address,
        port: event.port,
      });
    };

    pc.onsignalingstatechange = () => {
      console.log("[Degv's WebRTC] 🔄 [onsignalingstatechange] Estado de señalización SDP:", pc.signalingState);
    };

    this.peerConnection = pc;
    return pc;
  }

  /**
   * Procesa candidatos ICE en cola una vez que setRemoteDescription ha concluido
   */
  private async processPendingIceCandidates(pc: RTCPeerConnection): Promise<void> {
    if (this.pendingCandidates.length > 0) {
      console.log(`[Degv's WebRTC] 📦 Procesando ${this.pendingCandidates.length} candidatos ICE en búfer...`);
      while (this.pendingCandidates.length > 0) {
        const cand = this.pendingCandidates.shift();
        if (cand) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(cand));
            console.log("[Degv's WebRTC] ✅ Candidato ICE en búfer aplicado con éxito");
          } catch (err) {
            console.warn("[Degv's WebRTC] ⚠️ Error aplicando candidato ICE desde búfer:", err);
          }
        }
      }
    }
  }

  /**
   * Adquiere el stream local de micrófono y cámara del usuario
   */
  public async getLocalMedia(isVideo: boolean): Promise<MediaStream> {
    try {
      if (this.localStream) {
        this.stopLocalMedia();
      }

      console.log(`[Degv's WebRTC] 🎙️ Solicitando acceso a medios locales (Video: ${isVideo})...`);
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: isVideo
          ? {
              width: { ideal: 1280 },
              height: { ideal: 720 },
              facingMode: "user",
            }
          : false,
      });

      console.log(`[Degv's WebRTC] ✅ Acceso a medios concedido: ${stream.getTracks().length} pistas activas`);
      stream.getTracks().forEach((track) => {
        console.log(`[Degv's WebRTC] 🎤 Pista local lista: kind=${track.kind}, label="${track.label}", readyState=${track.readyState}, enabled=${track.enabled}`);
      });
      this.localStream = stream;
      return stream;
    } catch (error: any) {
      console.error("[Degv's WebRTC] ❌ Error al acceder a micrófono/cámara:", error);
      // Fallback a solo audio si el video falla (ej. sin cámara conectada)
      if (isVideo) {
        console.warn("[Degv's WebRTC] ⚠️ Intentando fallback a solo audio...");
        const audioOnlyStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        this.localStream = audioOnlyStream;
        return audioOnlyStream;
      }
      throw error;
    }
  }

  /**
   * Inicia una llamada saliente (Caller):
   * 1. Crea la oferta SDP (Offer)
   * 2. Guarda el documento en la colección 'calls' de Firestore
   * 3. Registra candidatos ICE locales en 'callerCandidates'
   * 4. Escucha la respuesta (Answer) del destinatario con Firestore onSnapshot
   */
  public async startCall(params: {
    caller: UserProfile;
    callee: UserProfile;
    roomId: string;
    isVideo: boolean;
  }): Promise<{ callId: string; localStream: MediaStream }> {
    const { caller, callee, roomId, isVideo } = params;
    const callId = `call_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    this.activeCallId = callId;

    console.log(`[Degv's WebRTC] 📞 [startCall] Iniciando llamada saliente a ${callee.username || callee.firstName} (ID: ${callId})...`);

    // 1. Obtener stream local y registrar pistas en RTCPeerConnection
    const localStream = await this.getLocalMedia(isVideo);
    const pc = this.getOrCreatePeerConnection();

    localStream.getTracks().forEach((track) => {
      pc.addTrack(track, localStream);
    });

    // 2. Intercambio de Candidatos ICE del llamador (Caller)
    const callerCandidatesCollection = collection(db, "calls", callId, "callerCandidates");
    const callIceCandidatesCollection = collection(db, "calls", callId, "iceCandidates");
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        console.log("[Degv's WebRTC: ICE Signaling] 📤 [Caller onicecandidate] Candidato local generado:", {
          candidate: event.candidate.candidate,
          sdpMid: event.candidate.sdpMid,
          sdpMLineIndex: event.candidate.sdpMLineIndex,
          type: event.candidate.type || "host/srflx",
          protocol: event.candidate.protocol,
          address: event.candidate.address,
          port: event.candidate.port,
        });
        const candPayload = {
          ...event.candidate.toJSON(),
          senderId: caller.id,
          role: "caller",
          timestamp: Date.now(),
        };
        addDoc(callerCandidatesCollection, candPayload)
          .then(() => console.log(`[Degv's WebRTC: ICE Signaling] ✅ Candidato ICE caller guardado en 'calls/${callId}/callerCandidates'`))
          .catch((err) => console.error(`[Degv's WebRTC: ICE Signaling] ❌ Error guardando ICE caller candidate:`, err));
        addDoc(callIceCandidatesCollection, candPayload).catch(() => {});
        if (roomId) {
          addDoc(collection(db, "rooms", roomId, "iceCandidates"), candPayload).catch(() => {});
        }
      } else {
        console.log("[Degv's WebRTC: ICE Signaling] 🏁 [Caller onicecandidate] Recolección de candidatos ICE finalizada (null candidate)");
      }
    };

    // 3. Crear SDP Offer
    console.log("[Degv's WebRTC] 📝 [Caller SDP] Creando oferta SDP...");
    const offerDescription = await pc.createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: isVideo,
    });
    await pc.setLocalDescription(offerDescription);
    console.log("[Degv's WebRTC] ✅ [Caller SDP] LocalDescription establecida con oferta SDP");

    const offerPayload = {
      sdp: offerDescription.sdp,
      type: offerDescription.type,
      callerId: caller.id,
      roomId,
      timestamp: Date.now(),
    };

    // 4. Crear documento en Firestore 'calls' y subcolección 'offers'
    const callDocRef = doc(db, "calls", callId);
    const callData: CallSession = {
      id: callId,
      callerId: caller.id,
      callerName: `${caller.firstName || "Usuario"} ${caller.lastName || ""}`.trim() || caller.username,
      callerAvatar: caller.avatarUrl,
      calleeId: callee.id,
      calleeName: `${callee.firstName || "Usuario"} ${callee.lastName || ""}`.trim() || callee.username,
      calleeAvatar: callee.avatarUrl,
      roomId,
      type: isVideo ? "video" : "audio",
      status: "calling",
      offer: offerPayload,
      createdAt: Date.now(),
    };

    await setDoc(callDocRef, callData);
    await addDoc(collection(db, "calls", callId, "offers"), offerPayload).catch(() => {});
    if (roomId) {
      await addDoc(collection(db, "rooms", roomId, "offers"), offerPayload).catch(() => {});
    }
    console.log("[Degv's WebRTC] 📨 [startCall] Documento de llamada y oferta SDP publicados en Firestore 'calls/'", callId);

    // 5. Escuchar respuesta del receptor (Answer) mediante Firestore onSnapshot
    this.unsubCallDoc = onSnapshot(callDocRef, async (snapshot) => {
      const data = snapshot.data() as CallSession | undefined;
      if (!data) return;

      console.log(`[Degv's WebRTC] 📡 [CallDoc Snapshot] Estado de llamada: ${data.status}`);
      this.callStatusCallbacks.forEach((cb) => cb(data.status));

      if (data.status === "accepted" && data.answer && !pc.currentRemoteDescription) {
        console.log("[Degv's WebRTC] 📥 [Caller SDP] Respuesta SDP del receptor recibida. Estableciendo RemoteDescription...");
        try {
          const answerDescription = new RTCSessionDescription(data.answer as RTCSessionDescriptionInit);
          await pc.setRemoteDescription(answerDescription);
          console.log("[Degv's WebRTC] ✅ [Caller SDP] RemoteDescription establecida con respuesta SDP");
          await this.processPendingIceCandidates(pc);
        } catch (sdpErr) {
          console.error("[Degv's WebRTC] ❌ [Caller SDP Error] Error al establecer RemoteDescription:", sdpErr);
        }
      }

      if (data.status === "declined" || data.status === "ended") {
        console.log("[Degv's WebRTC] ⏹️ La llamada fue finalizada o rechazada por el usuario remoto.");
        this.cleanupCall();
      }
    }, (snapErr) => {
      console.error("[Degv's WebRTC] ❌ Error en listener de documento de llamada:", snapErr);
    });

    // 6. Escuchar candidatos ICE del receptor (Callee)
    const calleeCandidatesCollection = collection(db, "calls", callId, "calleeCandidates");
    this.unsubCalleeCandidates = onSnapshot(calleeCandidatesCollection, (snapshot) => {
      snapshot.docChanges().forEach(async (change) => {
        if (change.type === "added") {
          const candidateData = change.doc.data();
          if (!pc.currentRemoteDescription) {
            console.log("[Degv's WebRTC] ⏳ Candidato ICE recibido antes de RemoteDescription. Encolando en búfer...");
            this.pendingCandidates.push(candidateData);
          } else {
            try {
              console.log("[Degv's WebRTC] 📥 [Caller ICE] Añadiendo candidato ICE del receptor");
              await pc.addIceCandidate(new RTCIceCandidate(candidateData));
            } catch (e) {
              console.warn("[Degv's WebRTC] ⚠️ Error añadiendo candidato ICE del receptor:", e);
            }
          }
        }
      });
    }, (iceErr) => {
      console.error("[Degv's WebRTC] ❌ Error en listener de candidatos ICE del receptor:", iceErr);
    });

    return { callId, localStream };
  }

  /**
   * Responde una llamada entrante (Callee):
   * 1. Lee la oferta SDP del documento 'calls'
   * 2. Genera y guarda la respuesta SDP (Answer) con status "accepted"
   * 3. Registra candidatos ICE en 'calleeCandidates'
   */
  public async answerCall(callId: string, isVideo: boolean): Promise<{ localStream: MediaStream }> {
    this.activeCallId = callId;
    console.log(`[Degv's WebRTC] 📱 [answerCall] Aceptando llamada ${callId}...`);

    const callDocRef = doc(db, "calls", callId);
    const callDocSnap = await getDoc(callDocRef);

    if (!callDocSnap.exists()) {
      throw new Error("El registro de llamada no existe o expiró.");
    }

    const callData = callDocSnap.data() as CallSession;
    const pc = this.getOrCreatePeerConnection();

    // 1. Obtener stream local
    const localStream = await this.getLocalMedia(isVideo || callData.type === "video");
    localStream.getTracks().forEach((track) => {
      pc.addTrack(track, localStream);
    });

    // 2. Intercambio de ICE Candidates del receptor (Callee)
    const calleeCandidatesCollection = collection(db, "calls", callId, "calleeCandidates");
    const callIceCandidatesCollection = collection(db, "calls", callId, "iceCandidates");
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        console.log("[Degv's WebRTC: ICE Signaling] 📤 [Callee onicecandidate] Candidato local generado:", {
          candidate: event.candidate.candidate,
          sdpMid: event.candidate.sdpMid,
          sdpMLineIndex: event.candidate.sdpMLineIndex,
          type: event.candidate.type || "host/srflx",
          protocol: event.candidate.protocol,
          address: event.candidate.address,
          port: event.candidate.port,
        });
        const candPayload = {
          ...event.candidate.toJSON(),
          senderId: callData.calleeId,
          role: "callee",
          timestamp: Date.now(),
        };
        addDoc(calleeCandidatesCollection, candPayload)
          .then(() => console.log(`[Degv's WebRTC: ICE Signaling] ✅ Candidato ICE callee guardado en 'calls/${callId}/calleeCandidates'`))
          .catch((err) => console.error(`[Degv's WebRTC: ICE Signaling] ❌ Error guardando ICE callee candidate:`, err));
        addDoc(callIceCandidatesCollection, candPayload).catch(() => {});
        if (callData.roomId) {
          addDoc(collection(db, "rooms", callData.roomId, "iceCandidates"), candPayload).catch(() => {});
        }
      } else {
        console.log("[Degv's WebRTC: ICE Signaling] 🏁 [Callee onicecandidate] Recolección de candidatos ICE del receptor finalizada (null candidate)");
      }
    };

    // 3. Establecer la oferta remota
    if (callData.offer) {
      console.log("[Degv's WebRTC] 📥 [Callee SDP] Estableciendo RemoteDescription con la oferta recibida...");
      try {
        const offerDescription = new RTCSessionDescription(callData.offer as RTCSessionDescriptionInit);
        await pc.setRemoteDescription(offerDescription);
        console.log("[Degv's WebRTC] ✅ [Callee SDP] RemoteDescription establecida con éxito");
        await this.processPendingIceCandidates(pc);
      } catch (sdpErr) {
        console.error("[Degv's WebRTC] ❌ [Callee SDP Error] Error estableciendo oferta remota:", sdpErr);
      }
    }

    // 4. Crear respuesta SDP (Answer)
    console.log("[Degv's WebRTC] 📝 [Callee SDP] Creando respuesta SDP (Answer)...");
    const answerDescription = await pc.createAnswer();
    await pc.setLocalDescription(answerDescription);
    console.log("[Degv's WebRTC] ✅ [Callee SDP] LocalDescription establecida con respuesta SDP");

    const answerPayload = {
      type: answerDescription.type,
      sdp: answerDescription.sdp,
      calleeId: callData.calleeId,
      roomId: callData.roomId,
      timestamp: Date.now(),
    };

    // 5. Actualizar documento de llamada y subcolección 'answers' en Firestore
    await updateDoc(callDocRef, {
      answer: answerPayload,
      status: "accepted",
      answeredAt: Date.now(),
    });
    await addDoc(collection(db, "calls", callId, "answers"), answerPayload).catch(() => {});
    if (callData.roomId) {
      await addDoc(collection(db, "rooms", callData.roomId, "answers"), answerPayload).catch(() => {});
    }
    console.log("[Degv's WebRTC] 📤 [answerCall] Respuesta (Answer) enviada y llamada marcada como 'accepted' en Firestore.");

    // 6. Escuchar candidatos ICE del llamador (Caller)
    const callerCandidatesCollection = collection(db, "calls", callId, "callerCandidates");
    this.unsubCallerCandidates = onSnapshot(callerCandidatesCollection, (snapshot) => {
      snapshot.docChanges().forEach(async (change) => {
        if (change.type === "added") {
          const candidateData = change.doc.data();
          if (!pc.currentRemoteDescription) {
            console.log("[Degv's WebRTC] ⏳ Candidato ICE del llamador recibido antes de RemoteDescription. Encolando...");
            this.pendingCandidates.push(candidateData);
          } else {
            try {
              console.log("[Degv's WebRTC] 📥 [Callee ICE] Añadiendo candidato ICE del llamador");
              await pc.addIceCandidate(new RTCIceCandidate(candidateData));
            } catch (e) {
              console.warn("[Degv's WebRTC] ⚠️ Error añadiendo candidato ICE del llamador:", e);
            }
          }
        }
      });
    }, (iceErr) => {
      console.error("[Degv's WebRTC] ❌ Error en listener de candidatos ICE del llamador:", iceErr);
    });

    // 7. Escuchar estado de llamada (finalización)
    this.unsubCallDoc = onSnapshot(callDocRef, (snap) => {
      const data = snap.data() as CallSession | undefined;
      if (data?.status === "ended" || data?.status === "declined") {
        console.log("[Degv's WebRTC] ⏹️ Llamada finalizada por el llamador.");
        this.cleanupCall();
      }
    });

    return { localStream };
  }

  /**
   * Rechaza una llamada entrante
   */
  public async declineCall(callId: string): Promise<void> {
    console.log(`[Degv's WebRTC] ❌ Rechazando llamada ${callId}...`);
    try {
      const callDocRef = doc(db, "calls", callId);
      await updateDoc(callDocRef, {
        status: "declined",
        declinedAt: Date.now(),
      });
    } catch (e) {
      console.warn("[Degv's WebRTC] Error rechazando llamada:", e);
    }
    this.cleanupCall();
  }

  /**
   * Finaliza la llamada activa
   */
  public async endCall(callId?: string): Promise<void> {
    const targetId = callId || this.activeCallId;
    console.log(`[Degv's WebRTC] 📴 Finalizando llamada activa (${targetId})...`);

    if (targetId) {
      try {
        const callDocRef = doc(db, "calls", targetId);
        await updateDoc(callDocRef, {
          status: "ended",
          endedAt: Date.now(),
        });
      } catch (e) {
        console.warn("[Degv's WebRTC] Error finalizando llamada en Firestore:", e);
      }
    }

    this.cleanupCall();
  }

  /**
   * Escucha llamadas entrantes dirigidas al usuario actual
   */
  public listenForIncomingCalls(
    userId: string,
    onCallReceived: (call: CallSession) => void
  ): Unsubscribe {
    console.log(`[Degv's WebRTC] 👂 Escuchando llamadas entrantes para usuario: ${userId}...`);
    try {
      const callsQuery = query(
        collection(db, "calls"),
        where("calleeId", "==", userId)
      );

      return onSnapshot(
        callsQuery,
        (snapshot) => {
          snapshot.docChanges().forEach((change) => {
            if (change.type === "added" || change.type === "modified") {
              const call = change.doc.data() as CallSession;
              // Verificar si la llamada está activa y no es muy vieja (> 60 seg)
              const isRecent = Date.now() - (call.createdAt || 0) < 60000;
              if (call.status === "calling" && isRecent) {
                console.log("[Degv's WebRTC] 🔔 ¡Llamada entrante detectada!", call);
                onCallReceived(call);
              }
            }
          });
        },
        (err) => {
          console.warn("[Degv's WebRTC] Aviso en listener de llamadas entrantes:", err.message);
        }
      );
    } catch (err) {
      console.warn("[Degv's WebRTC] Error configurando listener de llamadas:", err);
      return () => {};
    }
  }

  /**
   * Limpia y libera streams, conexiones y suscripciones
   */
  public cleanupCall(): void {
    console.log("[Degv's WebRTC] Limpiando sesión WebRTC y cerrando conexión...");

    if (this.unsubCallDoc) {
      this.unsubCallDoc();
      this.unsubCallDoc = null;
    }
    if (this.unsubCallerCandidates) {
      this.unsubCallerCandidates();
      this.unsubCallerCandidates = null;
    }
    if (this.unsubCalleeCandidates) {
      this.unsubCalleeCandidates();
      this.unsubCalleeCandidates = null;
    }

    this.stopLocalMedia();

    if (this.remoteStream) {
      this.remoteStream.getTracks().forEach((track) => track.stop());
      this.remoteStream = null;
    }

    if (this.peerConnection) {
      try {
        this.peerConnection.close();
      } catch (e) {
        console.warn("[Degv's WebRTC] Error cerrando peerConnection:", e);
      }
      this.peerConnection = null;
    }

    this.activeCallId = null;
  }

  public stopLocalMedia(): void {
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        track.stop();
      });
      this.localStream = null;
    }
  }

  public toggleMicrophone(muted: boolean): void {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach((track) => {
        track.enabled = !muted;
      });
    }
  }

  public toggleCamera(videoOn: boolean): void {
    if (this.localStream) {
      this.localStream.getVideoTracks().forEach((track) => {
        track.enabled = videoOn;
      });
    }
  }

  public getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  public getRemoteStream(): MediaStream | null {
    return this.remoteStream;
  }

  public onRemoteStream(callback: (stream: MediaStream) => void): () => void {
    this.remoteStreamCallbacks.add(callback);
    if (this.remoteStream && this.remoteStream.getTracks().length > 0) {
      callback(this.remoteStream);
    }
    return () => {
      this.remoteStreamCallbacks.delete(callback);
    };
  }

  public onCallStatusChange(callback: (status: CallSession["status"]) => void): () => void {
    this.callStatusCallbacks.add(callback);
    return () => {
      this.callStatusCallbacks.delete(callback);
    };
  }
}

export const webrtcService = new WebRTCService();
