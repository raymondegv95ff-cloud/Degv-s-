import { useState, useEffect, useRef, useCallback } from "react";
import { webrtcService, CallSession } from "../services/webrtcService";
import { UserProfile } from "../types";
import { soundService } from "../services/soundService";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "../services/firebase";

export interface WebRTCState {
  activeCall: CallSession | null;
  incomingCall: CallSession | null;
  isCalling: boolean;
  isConnected: boolean;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isMuted: boolean;
  isVideoOn: boolean;
  callDuration: number;
}

export function useWebRTC(currentUser: UserProfile | null) {
  const [activeCall, setActiveCall] = useState<CallSession | null>(null);
  const [incomingCall, setIncomingCall] = useState<CallSession | null>(null);
  const [isCalling, setIsCalling] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(false);
  const [callDuration, setCallDuration] = useState(0);

  const durationTimerRef = useRef<any>(null);

  // 1. Escuchar llamadas entrantes dirigidas al usuario actual mediante Firestore onSnapshot
  useEffect(() => {
    if (!currentUser?.id) return;

    console.log(`[useWebRTC: Firestore Signaling] 📡 [Incoming Listener] Iniciando suscripción Firestore para llamadas entrantes hacia user ID: ${currentUser.id}`);
    const unsub = webrtcService.listenForIncomingCalls(currentUser.id, (call) => {
      // Ignorar si ya está en una llamada activa
      if (activeCall) {
        console.log(`[useWebRTC: Firestore Signaling] ⚠️ Llamada entrante ${call.id} ignorada: ya hay una llamada activa en curso (${activeCall.id})`);
        return;
      }

      console.log("[useWebRTC: Firestore Signaling] 🔔 [Incoming Call] Nueva llamada entrante recibida vía Firestore onSnapshot:", {
        callId: call.id,
        callerId: call.callerId,
        callerName: call.callerName,
        type: call.type,
        status: call.status,
        roomId: call.roomId,
        hasOffer: !!call.offer,
      });
      setIncomingCall(call);

      // Reproducir sonido de llamada entrante
      if (call.type === "video") {
        soundService.playVideoCallRingSound();
      } else {
        soundService.playCallRingSound();
      }
    });

    return () => {
      console.log(`[useWebRTC: Firestore Signaling] 🔌 [Incoming Listener] Cancelando suscripción de llamadas para user ID: ${currentUser.id}`);
      unsub();
    };
  }, [currentUser?.id, activeCall]);

  // 2. Escuchar pistas de stream remoto y cambios de estado P2P
  useEffect(() => {
    const unsub = webrtcService.onRemoteStream((stream) => {
      console.log("[useWebRTC: Firestore Signaling] 🎯 [Remote Stream Received] Actualizando remoteStream en React state:", {
        audioTracks: stream.getAudioTracks().length,
        videoTracks: stream.getVideoTracks().length,
        active: stream.active,
      });
      setRemoteStream(stream);
      setIsConnected(true);
    });

    const unsubStatus = webrtcService.onCallStatusChange((status) => {
      console.log("[useWebRTC: Firestore Signaling] 🔄 [Call Status Transition] Cambio de estado de llamada en Firestore:", status);
      if (status === "accepted") {
        setIsConnected(true);
      } else if (status === "declined" || status === "ended") {
        console.log("[useWebRTC: Firestore Signaling] 🛑 [Call Terminated] Llamada finalizada o rechazada por el par remoto.");
        endCallCleanly();
      }
    });

    return () => {
      unsub();
      unsubStatus();
    };
  }, []);

  // 3. Listener auxiliar de subcolección 'offers' en sala activa (Firestore onSnapshot)
  useEffect(() => {
    if (!activeCall?.roomId) return;
    const roomId = activeCall.roomId;
    console.log(`[useWebRTC: Firestore Signaling] 👂 [Room Subcollection Listener] Monitoreando subcolección 'rooms/${roomId}/offers'...`);

    const offersQuery = query(
      collection(db, "rooms", roomId, "offers"),
      where("timestamp", ">=", activeCall.createdAt - 5000)
    );

    const unsubRoomOffers = onSnapshot(offersQuery, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === "added") {
          const offerData = change.doc.data();
          console.log(`[useWebRTC: Firestore Signaling] 📥 [Room Subcollection: Offer Detected] en room '${roomId}':`, {
            docId: change.doc.id,
            callerId: offerData.callerId,
            type: offerData.type,
          });
        }
      });
    }, (err) => {
      console.warn(`[useWebRTC: Firestore Signaling] Aviso en listener de subcolección de sala:`, err.message);
    });

    return () => {
      unsubRoomOffers();
    };
  }, [activeCall?.roomId, activeCall?.createdAt]);

  // 4. Contador de duración de llamada activa
  useEffect(() => {
    if (isConnected) {
      setCallDuration(0);
      durationTimerRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } else {
      if (durationTimerRef.current) clearInterval(durationTimerRef.current);
    }
    return () => {
      if (durationTimerRef.current) clearInterval(durationTimerRef.current);
    };
  }, [isConnected]);

  // 5. Iniciar llamada saliente (Negotiation Step 1: Offer)
  const startCall = useCallback(
    async (targetUser: UserProfile, isVideo: boolean, roomId: string = "") => {
      if (!currentUser) return;

      console.log(`[useWebRTC: Firestore Signaling] 🚀 [startCall: Step 1] Iniciando ${isVideo ? "videollamada" : "llamada de voz"} hacia ${targetUser.username || targetUser.firstName}:`, {
        targetUserId: targetUser.id,
        targetUsername: targetUser.username,
        roomId,
      });

      try {
        setIsCalling(true);
        setIsVideoOn(isVideo);
        setIsMuted(false);
        setCallDuration(0);

        // Reproducir sonido de marcado
        if (isVideo) {
          soundService.playVideoCallRingSound();
        } else {
          soundService.playCallRingSound();
        }

        console.log(`[useWebRTC: Firestore Signaling] 🔄 [Negotiation: Creating SDP Offer & Publishing to Firestore 'calls' and 'rooms']`);
        const { callId, localStream: stream } = await webrtcService.startCall({
          caller: currentUser,
          callee: targetUser,
          roomId,
          isVideo,
        });

        console.log(`[useWebRTC: Firestore Signaling] 📞 [Negotiation: Offer Published] Llamada ${callId} activa en Firestore, esperando SDP Answer vía onSnapshot...`);

        setLocalStream(stream);
        setActiveCall({
          id: callId,
          callerId: currentUser.id,
          callerName: `${currentUser.firstName || ""} ${currentUser.lastName || ""}`.trim() || currentUser.username,
          callerAvatar: currentUser.avatarUrl,
          calleeId: targetUser.id,
          calleeName: `${targetUser.firstName || ""} ${targetUser.lastName || ""}`.trim() || targetUser.username,
          calleeAvatar: targetUser.avatarUrl,
          roomId,
          type: isVideo ? "video" : "audio",
          status: "calling",
          createdAt: Date.now(),
        });
      } catch (err: any) {
        console.error("[useWebRTC: Firestore Signaling] ❌ [startCall Error] Error crítico durante la negociación de llamada:", err);
        endCallCleanly();
      }
    },
    [currentUser]
  );

  // 6. Aceptar llamada entrante (Negotiation Step 2: Remote Offer & Local Answer)
  const answerCall = useCallback(async () => {
    if (!incomingCall) return;

    console.log(`[useWebRTC: Firestore Signaling] 📞 [answerCall: Step 2] Aceptando llamada entrante ${incomingCall.id} de ${incomingCall.callerName}...`);

    try {
      const call = incomingCall;
      setIncomingCall(null);
      setActiveCall(call);
      setIsVideoOn(call.type === "video");
      setIsMuted(false);
      setIsCalling(true);

      console.log(`[useWebRTC: Firestore Signaling] 🔄 [Negotiation: Setting Remote Offer, Creating SDP Answer, and Publishing to Firestore]`);
      const { localStream: stream } = await webrtcService.answerCall(call.id, call.type === "video");
      console.log(`[useWebRTC: Firestore Signaling] ✅ [Negotiation: Answer Published] Conexión P2P en curso, stream local listo`);
      setLocalStream(stream);
      setIsConnected(true);
    } catch (err: any) {
      console.error("[useWebRTC: Firestore Signaling] ❌ [answerCall Error] Error al responder y negociar SDP Answer:", err);
      endCallCleanly();
    }
  }, [incomingCall]);

  // 7. Rechazar llamada entrante
  const declineCall = useCallback(async () => {
    if (incomingCall) {
      console.log(`[useWebRTC: Firestore Signaling] ❌ [declineCall] Rechazando llamada entrante ${incomingCall.id} en Firestore`);
      await webrtcService.declineCall(incomingCall.id);
      setIncomingCall(null);
    }
  }, [incomingCall]);

  // 8. Finalizar llamada activa
  const endCallCleanly = useCallback(() => {
    console.log(`[useWebRTC: Firestore Signaling] 📴 [endCallCleanly] Finalizando sesión de llamada activa ${activeCall?.id || ""}`);
    webrtcService.endCall(activeCall?.id);
    setActiveCall(null);
    setIncomingCall(null);
    setIsCalling(false);
    setIsConnected(false);
    setLocalStream(null);
    setRemoteStream(null);
    setCallDuration(0);
    if (durationTimerRef.current) clearInterval(durationTimerRef.current);
  }, [activeCall?.id]);

  // 9. Controles de audio y video
  const toggleMute = useCallback(() => {
    const nextMute = !isMuted;
    console.log(`[useWebRTC: Media Control] 🎙️ [toggleMute] Micrófono ${nextMute ? "silenciado" : "activado"}`);
    setIsMuted(nextMute);
    webrtcService.toggleMicrophone(nextMute);
  }, [isMuted]);

  const toggleVideo = useCallback(() => {
    const nextVideo = !isVideoOn;
    console.log(`[useWebRTC: Media Control] 📷 [toggleVideo] Cámara ${nextVideo ? "activada" : "desactivada"}`);
    setIsVideoOn(nextVideo);
    webrtcService.toggleCamera(nextVideo);
  }, [isVideoOn]);

  return {
    activeCall,
    incomingCall,
    isCalling,
    isConnected,
    localStream,
    remoteStream,
    isMuted,
    isVideoOn,
    callDuration,
    startCall,
    answerCall,
    declineCall,
    endCall: endCallCleanly,
    toggleMute,
    toggleVideo,
  };
}

