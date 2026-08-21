import { useState, useEffect, useRef, useCallback } from "react";
import { webrtcService, CallSession } from "../services/webrtcService";
import { UserProfile } from "../types";
import { soundService } from "../services/soundService";

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

  // Escuchar llamadas entrantes dirigidas al usuario actual mediante Firestore listener
  useEffect(() => {
    if (!currentUser?.id) return;

    console.log(`[useWebRTC] 📡 [Incoming Listener] Iniciando suscripción Firestore para llamadas hacia user ID: ${currentUser.id}`);
    const unsub = webrtcService.listenForIncomingCalls(currentUser.id, (call) => {
      // Ignorar si ya está en una llamada activa
      if (activeCall) {
        console.log(`[useWebRTC] ⚠️ Llamada entrante ${call.id} ignorada porque ya hay una llamada activa (${activeCall.id})`);
        return;
      }

      console.log("[useWebRTC] 🔔 [Incoming Call] Nueva llamada entrante detectada vía Firestore:", {
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
      console.log(`[useWebRTC] 🔌 [Incoming Listener] Cancelando suscripción de llamadas para user ID: ${currentUser.id}`);
      unsub();
    };
  }, [currentUser?.id, activeCall]);

  // Escuchar pistas de stream remoto y cambios de estado P2P
  useEffect(() => {
    const unsub = webrtcService.onRemoteStream((stream) => {
      console.log("[useWebRTC] 🎯 [Remote Stream] Actualizando remoteStream en React state:", {
        audioTracks: stream.getAudioTracks().length,
        videoTracks: stream.getVideoTracks().length,
        active: stream.active,
      });
      setRemoteStream(stream);
      setIsConnected(true);
    });

    const unsubStatus = webrtcService.onCallStatusChange((status) => {
      console.log("[useWebRTC] 🔄 [Call Status Transition] Cambio de estado de llamada en Firestore:", status);
      if (status === "accepted") {
        setIsConnected(true);
      } else if (status === "declined" || status === "ended") {
        console.log("[useWebRTC] 🛑 [Call Terminated] Llamada finalizada o rechazada.");
        endCallCleanly();
      }
    });

    return () => {
      unsub();
      unsubStatus();
    };
  }, []);

  // Contador de duración de llamada activa
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

  // Iniciar llamada saliente
  const startCall = useCallback(
    async (targetUser: UserProfile, isVideo: boolean, roomId: string = "") => {
      if (!currentUser) return;

      console.log(`[useWebRTC] 🚀 [startCall] Iniciando ${isVideo ? "videollamada" : "llamada de voz"} a:`, {
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

        const { callId, localStream: stream } = await webrtcService.startCall({
          caller: currentUser,
          callee: targetUser,
          roomId,
          isVideo,
        });

        console.log(`[useWebRTC] 📞 [startCall] Llamada ${callId} en curso, esperando que el receptor conteste...`);

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
        console.error("[useWebRTC] ❌ [startCall Error] Error crítico al iniciar llamada:", err);
        endCallCleanly();
      }
    },
    [currentUser]
  );

  // Aceptar llamada entrante
  const answerCall = useCallback(async () => {
    if (!incomingCall) return;

    console.log(`[useWebRTC] 📞 [answerCall] Aceptando llamada entrante ${incomingCall.id} de ${incomingCall.callerName}...`);

    try {
      const call = incomingCall;
      setIncomingCall(null);
      setActiveCall(call);
      setIsVideoOn(call.type === "video");
      setIsMuted(false);
      setIsCalling(true);

      const { localStream: stream } = await webrtcService.answerCall(call.id, call.type === "video");
      console.log(`[useWebRTC] ✅ [answerCall] Conexión establecida localmente, stream listo`);
      setLocalStream(stream);
      setIsConnected(true);
    } catch (err: any) {
      console.error("[useWebRTC] ❌ [answerCall Error] Error al aceptar llamada:", err);
      endCallCleanly();
    }
  }, [incomingCall]);

  // Rechazar llamada entrante
  const declineCall = useCallback(async () => {
    if (incomingCall) {
      console.log(`[useWebRTC] ❌ [declineCall] Rechazando llamada entrante ${incomingCall.id}`);
      await webrtcService.declineCall(incomingCall.id);
      setIncomingCall(null);
    }
  }, [incomingCall]);

  // Finalizar llamada activa
  const endCallCleanly = useCallback(() => {
    console.log(`[useWebRTC] 📴 [endCallCleanly] Finalizando sesión de llamada activa ${activeCall?.id || ""}`);
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

  // Controles de audio y video
  const toggleMute = useCallback(() => {
    const nextMute = !isMuted;
    console.log(`[useWebRTC] 🎙️ [toggleMute] Micrófono ${nextMute ? "silenciado" : "activado"}`);
    setIsMuted(nextMute);
    webrtcService.toggleMicrophone(nextMute);
  }, [isMuted]);

  const toggleVideo = useCallback(() => {
    const nextVideo = !isVideoOn;
    console.log(`[useWebRTC] 📷 [toggleVideo] Cámara ${nextVideo ? "activada" : "desactivada"}`);
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
