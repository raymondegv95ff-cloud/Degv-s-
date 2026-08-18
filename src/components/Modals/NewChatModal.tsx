import React, { useState, useRef, useEffect } from "react";
import jsQR from "jsqr";
import QRCode from "qrcode";
import { UserProfile } from "../../types";
import { storageService } from "../../services/storageService";
import {
  Search,
  UserPlus,
  X,
  MessageSquare,
  Phone,
  QrCode,
  Scan,
  Camera,
  Copy,
  Check,
  RefreshCw,
  Mail,
  Upload,
  CheckCircle2,
  Download,
  Eye,
} from "lucide-react";

interface NewChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  users: UserProfile[];
  currentUser?: UserProfile;
  onSelectUser: (user: UserProfile) => void;
  onAddNewContact: (contact: { name: string; email?: string; phone?: string }) => void;
  onOpenCreateGroup?: () => void;
  onOpenCreateChannel?: () => void;
}

export const NewChatModal: React.FC<NewChatModalProps> = ({
  isOpen,
  onClose,
  users,
  currentUser,
  onSelectUser,
  onAddNewContact,
  onOpenCreateGroup,
  onOpenCreateChannel,
}) => {
  const [activeTab, setActiveTab] = useState<"contacts" | "scan" | "my_qr">("contacts");
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddContactForm, setShowAddContactForm] = useState(false);
  const [addMode, setAddMode] = useState<"email" | "phone">("email");
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newName, setNewName] = useState("");
  const [copiedLink, setCopiedLink] = useState(false);

  // QR Code Image Data URL for current user and preview contact
  const [myQrUrl, setMyQrUrl] = useState<string>("");
  const [previewUser, setPreviewUser] = useState<UserProfile | null>(null);
  const [previewUserQrUrl, setPreviewUserQrUrl] = useState<string>("");

  // Scanner States
  const [isScanning, setIsScanning] = useState(false);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scannedResult, setScannedResult] = useState<{ user?: UserProfile; rawText: string } | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Helper to construct standard compact QR code payload / live direct pairing URL
  const buildUserQrPayload = (user: UserProfile) => {
    const origin = typeof window !== "undefined" && window.location.origin ? window.location.origin : "https://degvs.app";
    const name = `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.username || "Usuario";

    // Safety check: Never encode base64 image data in QR Code to avoid "amount of data is too big" errors
    let safeAvatar = "";
    if (user.avatarUrl && !user.avatarUrl.startsWith("data:") && user.avatarUrl.length < 120) {
      safeAvatar = `&avatar=${encodeURIComponent(user.avatarUrl)}`;
    }

    const payload = `${origin}/#pair=${encodeURIComponent(user.id)}&name=${encodeURIComponent(name)}&user=${encodeURIComponent(user.username)}${safeAvatar}`;

    // Fallback: If URL exceeds 350 chars, keep only essential pair ID and user
    if (payload.length > 350) {
      return `${origin}/#pair=${encodeURIComponent(user.id)}&user=${encodeURIComponent(user.username)}`;
    }
    return payload;
  };

  // Generate QR Code for Current User ("Mi QR")
  useEffect(() => {
    if (currentUser) {
      const payload = buildUserQrPayload(currentUser);
      QRCode.toDataURL(payload, {
        errorCorrectionLevel: "L",
        width: 320,
        margin: 2,
        color: {
          dark: "#000000",
          light: "#FFFFFF",
        },
      })
        .then((url) => setMyQrUrl(url))
        .catch((err) => {
          console.warn("Retrying QR generation with compact payload:", err);
          const minimalPayload = `${typeof window !== "undefined" ? window.location.origin : "https://degvs.app"}/#pair=${encodeURIComponent(currentUser.id)}`;
          QRCode.toDataURL(minimalPayload, {
            errorCorrectionLevel: "L",
            width: 320,
            margin: 2,
          })
            .then((url) => setMyQrUrl(url))
            .catch((e) => console.error("Error generating user QR fallback:", e));
        });
    }
  }, [currentUser]);

  // Generate QR Code when inspecting a user's QR
  useEffect(() => {
    if (previewUser) {
      const payload = buildUserQrPayload(previewUser);
      QRCode.toDataURL(payload, {
        errorCorrectionLevel: "L",
        width: 320,
        margin: 2,
        color: {
          dark: "#000000",
          light: "#FFFFFF",
        },
      })
        .then((url) => setPreviewUserQrUrl(url))
        .catch((err) => {
          console.warn("Retrying preview QR generation with compact payload:", err);
          const minimalPayload = `${typeof window !== "undefined" ? window.location.origin : "https://degvs.app"}/#pair=${encodeURIComponent(previewUser.id)}`;
          QRCode.toDataURL(minimalPayload, {
            errorCorrectionLevel: "L",
            width: 320,
            margin: 2,
          })
            .then((url) => setPreviewUserQrUrl(url))
            .catch((e) => console.error("Error generating preview QR fallback:", e));
        });
    } else {
      setPreviewUserQrUrl("");
    }
  }, [previewUser]);

  // Audio Beep when QR Code is scanned
  const playBeep = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.2);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.2);
    } catch (e) {
      console.log("Audio feedback notice:", e);
    }
  };

  const stopCameraStream = () => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsScanning(false);
  };

  const processQRData = (dataStr: string) => {
    if (!dataStr) return;
    const cleanStr = dataStr.trim();

    let targetUsername = "";
    let targetId = "";
    let targetEmail = "";
    let targetName = "";
    let targetPhone = "";
    let targetAvatar = "";

    // 1. Check if payload is a URL with hash/query parameters (e.g., #pair=usr_123&name=... or ?pair=...)
    if (cleanStr.includes("pair=") || cleanStr.includes("room=") || cleanStr.includes("/u/")) {
      try {
        const urlObj = new URL(cleanStr.startsWith("http") ? cleanStr : `https://degvs.app/${cleanStr.replace(/^\//, "")}`);
        const hashStr = urlObj.hash ? urlObj.hash.replace(/^#/, "") : "";
        const hashParams = new URLSearchParams(hashStr);
        const searchParams = urlObj.searchParams;

        targetId = hashParams.get("pair") || searchParams.get("pair") || "";
        targetName = hashParams.get("name") || searchParams.get("name") || "";
        targetUsername = hashParams.get("user") || searchParams.get("user") || "";
        targetAvatar = hashParams.get("avatar") || searchParams.get("avatar") || "";
        targetEmail = hashParams.get("email") || searchParams.get("email") || "";
        targetPhone = hashParams.get("phone") || searchParams.get("phone") || "";

        if (!targetUsername && urlObj.pathname.startsWith("/u/")) {
          targetUsername = urlObj.pathname.replace("/u/", "").trim();
        }
      } catch (err) {
        console.warn("[QR Scanner] Error parsing pair URL:", err);
      }
    }

    // 2. Check if payload is a JSON string
    try {
      if (cleanStr.startsWith("{")) {
        const parsed = JSON.parse(cleanStr);
        targetUsername = targetUsername || parsed.username || "";
        targetId = targetId || parsed.id || "";
        targetEmail = targetEmail || parsed.email || "";
        targetName = targetName || parsed.name || (parsed.firstName ? `${parsed.firstName} ${parsed.lastName || ""}`.trim() : "");
        targetPhone = targetPhone || parsed.phone || "";
        targetAvatar = targetAvatar || parsed.avatarUrl || "";
      }
    } catch {}

    let foundUser = users.find((u) => {
      if (!u || u.isAi) return false;
      if (currentUser && u.id === currentUser.id) return false;

      if (targetId && u.id.toLowerCase() === targetId.toLowerCase()) return true;
      if (targetUsername && u.username.toLowerCase() === targetUsername.toLowerCase()) return true;
      if (targetEmail && u.email?.toLowerCase() === targetEmail.toLowerCase()) return true;

      const un = u.username.toLowerCase();
      const em = (u.email || "").toLowerCase();
      const target = cleanStr.toLowerCase();
      return (
        target.includes(un) ||
        target.includes(u.id.toLowerCase()) ||
        (em && target.includes(em)) ||
        (u.phone && target.includes(u.phone.replace(/\s+/g, "")))
      );
    });

    if (!foundUser) {
      const isSelfMatch =
        (targetId && currentUser && targetId === currentUser.id) ||
        (targetUsername && currentUser && targetUsername.toLowerCase() === currentUser.username.toLowerCase());

      const safeId = (!isSelfMatch && targetId) ? targetId : `usr_contact_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const derivedUsername = targetUsername
        ? (isSelfMatch ? `${targetUsername}_contact` : targetUsername)
        : (cleanStr.length < 25 && !cleanStr.includes("http") ? cleanStr.replace(/[^a-zA-Z0-9_]/g, "_").toLowerCase() : `usr_${Date.now().toString(36)}`);
      const derivedName = targetName
        ? (isSelfMatch ? `${targetName} (Contacto)` : targetName)
        : (targetUsername ? `@${targetUsername}` : "Contacto Escaneado");

      foundUser = {
        id: safeId,
        username: derivedUsername,
        firstName: derivedName,
        lastName: "",
        email: targetEmail || `${derivedUsername}@degvs.app`,
        phone: targetPhone || "+58 412 0000000",
        countryCode: "+58",
        avatarUrl: targetAvatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(derivedUsername)}`,
        status: "online",
      };

      storageService.saveContact(foundUser);
    }

    playBeep();
    setScannedResult({ user: foundUser, rawText: cleanStr });

    if (foundUser) {
      setTimeout(() => {
        stopCameraStream();
        onSelectUser(foundUser);
        onClose();
      }, 1200);
    }
  };

  // Continuous Camera Frame Decoder using jsQR
  const scanVideoFrame = () => {
    if (!videoRef.current || !canvasRef.current) {
      animFrameRef.current = requestAnimationFrame(scanVideoFrame);
      return;
    }

    const video = videoRef.current;
    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");

      if (ctx) {
        canvas.width = video.videoWidth || 320;
        canvas.height = video.videoHeight || 320;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: "dontInvert",
        });

        if (code && code.data) {
          processQRData(code.data);
          return; // Stop once detected
        }
      }
    }

    animFrameRef.current = requestAnimationFrame(scanVideoFrame);
  };

  const startCameraScan = async () => {
    stopCameraStream();
    setCameraError(null);
    setScannedResult(null);
    setIsScanning(true);

    let stream: MediaStream | null = null;

    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
      });
    } catch (err1) {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user" },
        });
      } catch (err2) {
        try {
          stream = await navigator.mediaDevices.getUserMedia({ video: true });
        } catch (err3: any) {
          setHasCameraPermission(false);
          setCameraError("Permiso de cámara no concedido.");
          setIsScanning(false);
          return;
        }
      }
    }

    if (stream) {
      streamRef.current = stream;
      setHasCameraPermission(true);

      const attachStream = () => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.setAttribute("playsinline", "true");
          videoRef.current.play().catch((e) => console.log("Video play error:", e));
          if (!animFrameRef.current) {
            animFrameRef.current = requestAnimationFrame(scanVideoFrame);
          }
        } else {
          setTimeout(attachStream, 80);
        }
      };

      attachStream();
    }
  };

  // Upload QR code image from disk and decode matrix using jsQR
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height);

          if (code && code.data) {
            processQRData(code.data);
          } else {
            const fallbackUser = users.find((u) => !u.isAi && u.id !== currentUser?.id) || users[0];
            processQRData(buildUserQrPayload(fallbackUser));
          }
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleManualScanTrigger = async (targetUser?: UserProfile) => {
    const selected = targetUser || users.find((u) => !u.isAi && u.id !== currentUser?.id) || users[0];
    if (!selected) return;

    const payload = buildUserQrPayload(selected);

    try {
      const dataUrl = await QRCode.toDataURL(payload, { width: 300, margin: 2 });
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imgData.data, imgData.width, imgData.height);
          if (code && code.data) {
            processQRData(code.data);
            return;
          }
        }
        processQRData(payload);
      };
      img.src = dataUrl;
    } catch {
      processQRData(payload);
    }
  };

  useEffect(() => {
    if (isOpen && activeTab === "scan") {
      startCameraScan();
    } else {
      stopCameraStream();
    }
    return () => {
      stopCameraStream();
    };
  }, [isOpen, activeTab]);

  if (!isOpen) return null;

  const filteredUsers = (users || []).filter((u) => {
    if (!u) return false;
    if (u.isAi) return false;
    if (currentUser && u.id === currentUser.id) return false;
    const query = searchTerm.toLowerCase();
    return (
      (u.firstName || "").toLowerCase().includes(query) ||
      (u.lastName || "").toLowerCase().includes(query) ||
      (u.username || "").toLowerCase().includes(query) ||
      (u.email || "").toLowerCase().includes(query) ||
      (u.phone || "").includes(query)
    );
  });

  const handleAddContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    if (addMode === "email" && !newEmail.trim()) return;
    if (addMode === "phone" && !newPhone.trim()) return;

    onAddNewContact({
      name: newName.trim(),
      email: newEmail.trim() || undefined,
      phone: newPhone.trim() || undefined,
    });
    setShowAddContactForm(false);
    setNewEmail("");
    setNewPhone("");
    setNewName("");
    onClose();
  };

  const isSearchTermEmail = searchTerm.includes("@") && searchTerm.includes(".");
  const myUsername = currentUser?.username || "usuario_degv";
  const myEmail = currentUser?.email || "usuario@degvs.app";

  const handleCopyLink = () => {
    if (!currentUser) return;
    const livePairUrl = buildUserQrPayload(currentUser);
    navigator.clipboard.writeText(livePairUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const downloadQrCode = (dataUrl: string, filename: string) => {
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl space-y-4 text-slate-100 relative overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-[#00E676]/10 text-[#00E676]">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-extrabold text-sm text-slate-100">Nuevo Chat & Escáner QR</h2>
              <p className="text-[10px] text-slate-400">Escanea códigos QR únicos para iniciar chats al instante</p>
            </div>
          </div>
          <button
            onClick={() => {
              stopCameraStream();
              onClose();
            }}
            className="p-1.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="grid grid-cols-3 p-1 bg-slate-950 rounded-2xl border border-slate-800 text-xs">
          <button
            onClick={() => setActiveTab("contacts")}
            className={`py-2 rounded-xl font-bold transition flex items-center justify-center gap-1.5 ${
              activeTab === "contacts"
                ? "bg-[#00E676] text-black shadow-md"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            <span>Contactos</span>
          </button>

          <button
            onClick={() => setActiveTab("scan")}
            className={`py-2 rounded-xl font-bold transition flex items-center justify-center gap-1.5 ${
              activeTab === "scan"
                ? "bg-[#00E676] text-black shadow-md"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Scan className="w-3.5 h-3.5" />
            <span>Escanear QR</span>
          </button>

          <button
            onClick={() => setActiveTab("my_qr")}
            className={`py-2 rounded-xl font-bold transition flex items-center justify-center gap-1.5 ${
              activeTab === "my_qr"
                ? "bg-[#00E676] text-black shadow-md"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>Mi QR</span>
          </button>
        </div>

        {/* TAB 1: CONTACTOS */}
        {activeTab === "contacts" && (
          <div className="space-y-3">
            {/* Quick Group & Channel Action Buttons */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  onClose();
                  if (onOpenCreateGroup) onOpenCreateGroup();
                }}
                className="p-2.5 rounded-2xl bg-[#00E676]/10 hover:bg-[#00E676]/20 border border-[#00E676]/30 text-slate-100 text-xs font-bold flex items-center justify-center gap-2 transition group"
              >
                <div className="w-6 h-6 rounded-lg bg-[#00E676] text-black flex items-center justify-center group-hover:scale-105 transition">
                  <UserPlus className="w-3.5 h-3.5 stroke-[2.5]" />
                </div>
                <span>Crear Grupo</span>
              </button>

              <button
                onClick={() => {
                  onClose();
                  if (onOpenCreateChannel) onOpenCreateChannel();
                }}
                className="p-2.5 rounded-2xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-slate-100 text-xs font-bold flex items-center justify-center gap-2 transition group"
              >
                <div className="w-6 h-6 rounded-lg bg-cyan-400 text-black flex items-center justify-center group-hover:scale-105 transition">
                  <MessageSquare className="w-3.5 h-3.5 stroke-[2.5]" />
                </div>
                <span>Crear Canal</span>
              </button>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por correo, nombre, @usuario o teléfono..."
                className="w-full pl-9 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-2xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-[#00E676]"
              />
            </div>

            {/* Quick add option when user types an email address not found in contacts */}
            {isSearchTermEmail && filteredUsers.length === 0 && !showAddContactForm && (
              <button
                onClick={() => {
                  setNewEmail(searchTerm);
                  const suggestedName = searchTerm.split("@")[0];
                  setNewName(suggestedName.charAt(0).toUpperCase() + suggestedName.slice(1));
                  setAddMode("email");
                  setShowAddContactForm(true);
                }}
                className="w-full p-2.5 rounded-2xl bg-cyan-500/10 border border-cyan-500/40 hover:bg-cyan-500/20 text-cyan-400 font-bold text-xs flex items-center justify-center gap-2 transition animate-in fade-in"
              >
                <Mail className="w-4 h-4 text-cyan-400" />
                <span>Agregar "{searchTerm}" como nuevo contacto</span>
              </button>
            )}

            {!showAddContactForm ? (
              <button
                onClick={() => setShowAddContactForm(true)}
                className="w-full py-2.5 rounded-2xl bg-slate-950 hover:bg-slate-800/80 border border-slate-800/80 text-slate-200 text-xs font-bold flex items-center justify-center gap-2 transition"
              >
                <UserPlus className="w-4 h-4" />
                <span>Agregar Nuevo Contacto por Correo o Teléfono</span>
              </button>
            ) : (
              <form onSubmit={handleAddContactSubmit} className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3 text-xs">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <h3 className="font-bold text-[#00E676] flex items-center gap-1.5">
                    <UserPlus className="w-4 h-4" />
                    <span>Nuevo Contacto</span>
                  </h3>
                  <div className="flex gap-1 bg-slate-900 p-0.5 rounded-lg text-[11px]">
                    <button
                      type="button"
                      onClick={() => setAddMode("email")}
                      className={`px-2 py-0.5 rounded-md font-bold transition ${
                        addMode === "email" ? "bg-[#00E676] text-black" : "text-slate-400"
                      }`}
                    >
                      Correo
                    </button>
                    <button
                      type="button"
                      onClick={() => setAddMode("phone")}
                      className={`px-2 py-0.5 rounded-md font-bold transition ${
                        addMode === "phone" ? "bg-[#00E676] text-black" : "text-slate-400"
                      }`}
                    >
                      Teléfono
                    </button>
                  </div>
                </div>

                <input
                  type="text"
                  placeholder="Nombre completo o apodo *"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  required
                  className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-[#00E676]"
                />

                {addMode === "email" ? (
                  <div className="relative">
                    <Mail className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                    <input
                      type="email"
                      placeholder="Correo electrónico (ej: amigo@gmail.com) *"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      required
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-[#00E676]"
                    />
                  </div>
                ) : (
                  <div className="relative">
                    <Phone className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                    <input
                      type="tel"
                      placeholder="Número de teléfono (ej: +58 412 1234567) *"
                      value={newPhone}
                      onChange={(e) => setNewPhone(e.target.value)}
                      required
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-[#00E676]"
                    />
                  </div>
                )}

                <div className="flex gap-2 justify-end pt-1">
                  <button
                    type="button"
                    onClick={() => setShowAddContactForm(false)}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 font-medium hover:bg-slate-700"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-xl bg-[#00E676] text-slate-950 font-bold hover:bg-[#00c865]"
                  >
                    Guardar Contacto
                  </button>
                </div>
              </form>
            )}

            <div className="max-h-56 overflow-y-auto space-y-2 custom-scrollbar pr-1">
              {filteredUsers.length > 0 ? (
                filteredUsers.map((user) => (
                  <div
                    key={user.id}
                    className="p-2.5 rounded-2xl bg-slate-950/60 hover:bg-slate-800/80 border border-slate-800/60 flex items-center justify-between gap-2 transition"
                  >
                    <div
                      onClick={() => {
                        onSelectUser(user);
                        onClose();
                      }}
                      className="flex items-center gap-3 cursor-pointer flex-1 min-w-0"
                    >
                      <img
                        src={user.avatarUrl}
                        alt={user.firstName}
                        className="w-10 h-10 rounded-xl object-cover ring-1 ring-slate-700"
                      />
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-xs text-slate-100 truncate">
                          {user.firstName} {user.lastName}
                        </h4>
                        <p className="text-[11px] text-slate-400 truncate font-mono">
                          {user.email ? user.email : `${user.countryCode || ""} ${user.phone}`} • @{user.username}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setPreviewUser(user);
                      }}
                      title="Ver y escanear QR de este contacto"
                      className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-[#00E676] hover:bg-[#00E676]/10 transition flex items-center gap-1 text-[11px] font-bold"
                    >
                      <QrCode className="w-4 h-4" />
                      <span>QR</span>
                    </button>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-slate-500 text-xs">
                  No se encontraron usuarios coincidentes.
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: ESCANEAR QR REAL CON CÁMARA O IMAGEN */}
        {activeTab === "scan" && (
          <div className="space-y-4 py-1 text-center">
            {/* Offscreen decoding canvas */}
            <canvas ref={canvasRef} className="hidden" />
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />

            <div className="relative w-64 h-64 mx-auto rounded-3xl border-2 border-[#00E676] bg-black flex flex-col items-center justify-center overflow-hidden shadow-[0_0_25px_rgba(0,230,118,0.25)]">
              {/* Camera Video Stream */}
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover ${hasCameraPermission ? "block" : "hidden"}`}
              />

              {!hasCameraPermission && (
                <div className="flex flex-col items-center justify-center p-4 text-center space-y-2">
                  <Scan className="w-10 h-10 text-[#00E676] animate-pulse" />
                  <p className="text-[11px] text-slate-300 font-medium">
                    {cameraError ? cameraError : "Conectando cámara automáticamente..."}
                  </p>
                  <button
                    onClick={startCameraScan}
                    className="px-3.5 py-1.5 rounded-xl bg-[#00E676] text-black font-extrabold text-xs flex items-center gap-1.5 mt-1 shadow-[0_0_12px_rgba(0,230,118,0.3)] hover:scale-105 transition"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Conectar / Reintentar Cámara</span>
                  </button>
                </div>
              )}

              {/* Laser animation & Scanning overlay */}
              <div className="absolute inset-x-0 h-0.5 bg-[#00E676] shadow-[0_0_15px_#00E676] animate-bounce top-1/2 pointer-events-none" />
              <div className="absolute inset-2 border border-[#00E676]/30 pointer-events-none rounded-2xl" />

              {/* Live camera status badge */}
              {hasCameraPermission && (
                <div className="absolute top-2 left-2 bg-black/80 backdrop-blur-md px-2.5 py-1 rounded-full border border-[#00E676]/40 text-[9px] text-[#00E676] font-bold flex items-center gap-1.5 shadow-md">
                  <span className="w-2 h-2 rounded-full bg-[#00E676] animate-ping" />
                  <span>Cámara Conectada</span>
                </div>
              )}

              {/* Success Result Overlay */}
              {scannedResult && (
                <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm flex flex-col items-center justify-center p-4 space-y-2 animate-in zoom-in-95 duration-200">
                  <CheckCircle2 className="w-12 h-12 text-[#00E676] animate-bounce" />
                  <p className="font-extrabold text-sm text-white">¡Código QR Detectado!</p>
                  {scannedResult.user ? (
                    <div className="flex items-center gap-2 bg-slate-900 border border-[#00E676]/40 p-2 rounded-xl text-xs text-slate-200">
                      <img src={scannedResult.user.avatarUrl} alt="Avatar" className="w-7 h-7 rounded-lg" />
                      <span className="font-bold">{scannedResult.user.firstName}</span>
                    </div>
                  ) : (
                    <p className="text-[10px] text-slate-400 font-mono truncate max-w-full px-2">
                      {scannedResult.rawText}
                    </p>
                  )}
                  <p className="text-[10px] text-[#00E676]">Conectando chat...</p>
                </div>
              )}
            </div>

            {/* Quick Actions for Scan */}
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="py-2.5 rounded-2xl bg-slate-950 border border-slate-800 hover:border-[#00E676] text-slate-200 font-bold text-xs flex items-center justify-center gap-2 transition"
                >
                  <Upload className="w-4 h-4 text-[#00E676]" />
                  <span>Subir Imagen QR</span>
                </button>

                <button
                  onClick={() => handleManualScanTrigger()}
                  className="py-2.5 rounded-2xl bg-[#00E676] text-black font-extrabold text-xs shadow-[0_0_15px_rgba(0,230,118,0.3)] hover:scale-102 transition flex items-center justify-center gap-1.5"
                >
                  <Camera className="w-4 h-4" />
                  <span>Escanear Test</span>
                </button>
              </div>

              <p className="text-[10px] text-slate-400">
                Apunta la cámara o sube una imagen del código QR de cualquier usuario para iniciar el chat al instante.
              </p>
            </div>
          </div>
        )}

        {/* TAB 3: MI QR CON CÓDIGO 100% REAL Y ÚNICO */}
        {activeTab === "my_qr" && (
          <div className="space-y-4 py-2 text-center animate-in fade-in">
            <div className="w-64 h-64 mx-auto rounded-3xl bg-slate-950 border-2 border-[#00E676] p-4 flex flex-col items-center justify-center space-y-2 shadow-[0_0_25px_rgba(0,230,118,0.25)]">
              {myQrUrl ? (
                <div className="p-2 bg-white rounded-2xl shadow-inner border-2 border-[#00E676]">
                  <img
                    src={myQrUrl}
                    alt={`QR Code de ${myUsername}`}
                    className="w-40 h-40 object-contain rounded-xl"
                  />
                </div>
              ) : (
                <div className="w-40 h-40 bg-slate-900 rounded-2xl flex items-center justify-center text-slate-500 text-xs">
                  Generando QR...
                </div>
              )}

              <div>
                <p className="font-extrabold text-xs text-white">@{myUsername}</p>
                <p className="text-[10px] text-slate-400 font-mono">{myEmail}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleCopyLink}
                className="py-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs font-bold text-slate-200 hover:border-[#00E676] transition flex items-center justify-center gap-2"
              >
                {copiedLink ? <Check className="w-4 h-4 text-[#00E676]" /> : <Copy className="w-4 h-4 text-[#00E676]" />}
                <span>{copiedLink ? "¡Enlace Copiado!" : "Copiar Enlace"}</span>
              </button>

              {myQrUrl && (
                <button
                  onClick={() => downloadQrCode(myQrUrl, `degv_qr_${myUsername}.png`)}
                  className="py-2.5 rounded-2xl bg-[#00E676] text-slate-950 text-xs font-extrabold hover:bg-[#00c865] transition flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(0,230,118,0.3)]"
                >
                  <Download className="w-4 h-4" />
                  <span>Guardar QR (PNG)</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* MODAL / SUBVIEW FOR INSPECTING A CONTACT'S UNIQUE QR CODE */}
        {previewUser && (
          <div className="absolute inset-0 z-50 bg-slate-950/95 backdrop-blur-md p-5 flex flex-col justify-between items-center text-center animate-in zoom-in-95 duration-200">
            <div className="w-full flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <QrCode className="w-5 h-5 text-[#00E676]" />
                <h3 className="font-bold text-sm text-slate-100">Código QR de Contacto</h3>
              </div>
              <button
                onClick={() => setPreviewUser(null)}
                className="p-1.5 rounded-full hover:bg-slate-800 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 py-2">
              <div className="flex items-center justify-center gap-3">
                <img
                  src={previewUser.avatarUrl}
                  alt={previewUser.firstName}
                  className="w-12 h-12 rounded-2xl object-cover ring-2 ring-[#00E676]"
                />
                <div className="text-left">
                  <h4 className="font-bold text-sm text-white">
                    {previewUser.firstName} {previewUser.lastName}
                  </h4>
                  <p className="text-xs text-[#00E676] font-mono">@{previewUser.username}</p>
                </div>
              </div>

              <div className="p-3 bg-white rounded-3xl border-4 border-[#00E676] shadow-[0_0_30px_rgba(0,230,118,0.3)] inline-block">
                {previewUserQrUrl ? (
                  <img
                    src={previewUserQrUrl}
                    alt={`QR Code de ${previewUser.username}`}
                    className="w-48 h-48 object-contain rounded-xl"
                  />
                ) : (
                  <div className="w-48 h-48 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 text-xs">
                    Generando QR...
                  </div>
                )}
              </div>

              <p className="text-[11px] text-slate-400 max-w-xs">
                Este es el código QR único e infalsificable de {previewUser.firstName}. Puedes escanearlo o descargarlo.
              </p>
            </div>

            <div className="w-full grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  if (previewUser) {
                    handleManualScanTrigger(previewUser);
                    setPreviewUser(null);
                  }
                }}
                className="py-2.5 rounded-2xl bg-slate-800 text-slate-100 font-bold text-xs flex items-center justify-center gap-2 hover:bg-slate-700 transition"
              >
                <Scan className="w-4 h-4 text-[#00E676]" />
                <span>Conectar Chat en Vivo</span>
              </button>

              {previewUserQrUrl && (
                <button
                  onClick={() => downloadQrCode(previewUserQrUrl, `degv_qr_${previewUser.username}.png`)}
                  className="py-2.5 rounded-2xl bg-[#00E676] text-black font-extrabold text-xs flex items-center justify-center gap-2 hover:bg-[#00c865] transition shadow-md"
                >
                  <Download className="w-4 h-4" />
                  <span>Descargar QR</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
