import React, { useState, useRef, useEffect } from "react";
import { UserStatusItem, UserProfile } from "../../types";
import {
  Plus,
  Image as ImageIcon,
  Type,
  X,
  ChevronLeft,
  ChevronRight,
  Send,
  Sparkles,
  Clock,
  Camera,
  Video as VideoIcon,
  Music as MusicIcon,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Disc,
  Mic,
  Film,
  Trash2,
  Square as SquareIcon
} from "lucide-react";

interface StatusViewProps {
  currentUser: UserProfile;
  statuses: UserStatusItem[];
  onAddStatus: (status: UserStatusItem) => void;
  onClose?: () => void;
  onSendMessageToUser?: (userId: string, text: string) => void;
}

// 24-Hour Progress Ring Component for User Avatars
const StatusProgressAvatarRing: React.FC<{
  avatarUrl: string;
  userName: string;
  timestamp: number;
  itemCount?: number;
  size?: number;
  mediaType?: "text" | "image" | "video" | "music";
}> = ({ avatarUrl, userName, timestamp, itemCount = 1, size = 56, mediaType }) => {
  const TOTAL_24H_MS = 24 * 60 * 60 * 1000;
  const elapsed = Date.now() - timestamp;
  const remainingRatio = Math.max(0, Math.min(1, (TOTAL_24H_MS - elapsed) / TOTAL_24H_MS));
  const percent = Math.round(remainingRatio * 100);
  const hoursLeft = Math.max(1, Math.ceil((TOTAL_24H_MS - elapsed) / (1000 * 60 * 60)));

  const strokeWidth = 3.5;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - remainingRatio);

  const getMediaBadge = () => {
    switch (mediaType) {
      case "video":
        return { icon: "🎥", bg: "bg-indigo-600 border-indigo-400 text-white" };
      case "music":
        return { icon: "🎵", bg: "bg-pink-600 border-pink-400 text-white" };
      case "image":
        return { icon: "📷", bg: "bg-cyan-600 border-cyan-400 text-white" };
      default:
        return { icon: "📝", bg: "bg-[#00E676] border-[#00E676] text-black" };
    }
  };

  const badge = getMediaBadge();

  return (
    <div
      className="relative flex items-center justify-center shrink-0 group cursor-pointer"
      style={{ width: size, height: size }}
      title={`${userName}: ${hoursLeft}h restantes (${percent}% restante)`}
    >
      <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none overflow-visible">
        {/* Background faint ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(255, 255, 255, 0.15)"
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Colorful remaining 24h progress ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={percent > 20 ? "#00E676" : "#FF3B30"}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-700"
        />
      </svg>

      <img
        src={avatarUrl}
        alt={userName}
        className="rounded-full object-cover group-hover:scale-105 transition"
        style={{ width: size - 8, height: size - 8 }}
      />

      {/* Media Type Badge Overlay */}
      {mediaType && (
        <span
          className={`absolute -bottom-0.5 -right-0.5 px-1 py-0.5 rounded-full ${badge.bg} text-[9px] font-bold border shadow flex items-center justify-center leading-none`}
        >
          {badge.icon}
        </span>
      )}

      {/* Item Count Badge */}
      {itemCount > 1 && (
        <span className="absolute -top-1 -right-1 px-1.5 py-0.2 rounded-full bg-slate-950 text-[9px] font-extrabold border border-[#00E676] text-[#00E676] shadow">
          {itemCount}
        </span>
      )}
    </div>
  );
};

// Preset Music Tracks
const PRESET_MUSIC_TRACKS = [
  {
    id: "m1",
    title: "Cyber Synthwave 2088",
    artist: "Degv Beats",
    url: "https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3?filename=cyberpunk-2099-10701.mp3",
    cover: "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=300&auto=format&fit=crop&q=80",
    bgColor: "from-cyan-900 via-purple-900 to-black"
  },
  {
    id: "m2",
    title: "Chill Lo-Fi Sunset",
    artist: "Aesthetic AI",
    url: "https://cdn.pixabay.com/download/audio/2022/03/15/audio_c8c8a7315b.mp3?filename=lofi-study-112191.mp3",
    cover: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=300&auto=format&fit=crop&q=80",
    bgColor: "from-amber-900 via-rose-900 to-slate-950"
  },
  {
    id: "m3",
    title: "Urban Neon Pulse",
    artist: "Night Drive",
    url: "https://cdn.pixabay.com/download/audio/2021/08/09/audio_8842247167.mp3?filename=electronic-future-beats-117997.mp3",
    cover: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&auto=format&fit=crop&q=80",
    bgColor: "from-emerald-950 via-teal-900 to-slate-950"
  },
  {
    id: "m4",
    title: "Acoustic Breeze",
    artist: "Solar Vibes",
    url: "https://cdn.pixabay.com/download/audio/2022/01/18/audio_d0a13f69d2.mp3?filename=acoustic-guitar-loop-10287.mp3",
    cover: "https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=300&auto=format&fit=crop&q=80",
    bgColor: "from-orange-900 via-amber-800 to-stone-950"
  }
];

export const StatusView: React.FC<StatusViewProps> = ({
  currentUser,
  statuses,
  onAddStatus,
  onClose,
  onSendMessageToUser,
}) => {
  // Modal & Creation state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createType, setCreateType] = useState<"text" | "image" | "video" | "music">("text");
  
  // Content states
  const [textStatusContent, setTextStatusContent] = useState("");
  const [captionText, setCaptionText] = useState("");
  const [selectedColor, setSelectedColor] = useState("from-[#00E676] to-[#00B248]");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  
  // Music creation states
  const [selectedMusicPreset, setSelectedMusicPreset] = useState(PRESET_MUSIC_TRACKS[0]);
  const [customAudioUrl, setCustomAudioUrl] = useState<string | null>(null);
  const [customMusicTitle, setCustomMusicTitle] = useState("");
  const [customMusicArtist, setCustomMusicArtist] = useState("");
  const [musicBgColor, setMusicBgColor] = useState("from-cyan-900 via-purple-900 to-black");

  // Camera & Video Recording state
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isRecordingVideo, setIsRecordingVideo] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);

  // Story Viewer state
  const [activeUserGroupIndex, setActiveUserGroupIndex] = useState<number | null>(null);
  const [currentStoryIndex, setCurrentStoryIndex] = useState<number>(0);
  const [storyProgress, setStoryProgress] = useState<number>(0); // 0 to 100 %
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [replyText, setReplyText] = useState("");
  const [reactionToast, setReactionToast] = useState<string | null>(null);

  // Refs
  const imageFileInputRef = useRef<HTMLInputElement>(null);
  const videoFileInputRef = useRef<HTMLInputElement>(null);
  const audioFileInputRef = useRef<HTMLInputElement>(null);
  const videoStreamRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<any>(null);

  // Viewer Audio/Video playback refs
  const viewerVideoRef = useRef<HTMLVideoElement>(null);
  const viewerAudioRef = useRef<HTMLAudioElement>(null);

  const bgColors = [
    "from-[#00E676] to-[#00B248]",
    "from-purple-600 via-pink-600 to-indigo-700",
    "from-pink-500 via-red-500 to-rose-700",
    "from-amber-500 via-orange-600 to-red-600",
    "from-cyan-500 via-blue-600 to-indigo-800",
    "from-emerald-700 via-[#00E676] to-teal-900",
    "from-slate-900 via-indigo-950 to-black"
  ];

  // Helper to filter 24h statuses
  const now = Date.now();
  const validStatuses = statuses.filter((s) => now - s.timestamp < 24 * 60 * 60 * 1000);

  // Group valid statuses by user
  const groupedByUserMap = new Map<string, { userId: string; userName: string; userAvatar: string; items: UserStatusItem[] }>();
  validStatuses.forEach((s) => {
    if (!groupedByUserMap.has(s.userId)) {
      groupedByUserMap.set(s.userId, {
        userId: s.userId,
        userName: s.userName,
        userAvatar: s.userAvatar,
        items: []
      });
    }
    groupedByUserMap.get(s.userId)?.items.push(s);
  });

  const userGroupsList = Array.from(groupedByUserMap.values());
  // Sort so currentUser's group is first if present
  userGroupsList.sort((a, b) => (a.userId === currentUser.id ? -1 : b.userId === currentUser.id ? 1 : 0));

  const myGroup = groupedByUserMap.get(currentUser.id);
  const myStatuses = myGroup ? myGroup.items : [];

  // Handle image upload
  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) {
          setImagePreview(ev.target.result as string);
          setCreateType("image");
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle video upload
  const handleVideoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) {
          setVideoPreview(ev.target.result as string);
          setCreateType("video");
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle custom audio upload
  const handleAudioFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) {
          setCustomAudioUrl(ev.target.result as string);
          setCustomMusicTitle(file.name.replace(/\.[^/.]+$/, ""));
          setCustomMusicArtist(currentUser.firstName || "Mi Audio");
          setCreateType("music");
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Start live camera for Photo or Video
  const startCamera = async (mode: "photo" | "video" = "photo") => {
    setIsCameraActive(true);
    setCreateType(mode === "photo" ? "image" : "video");
    let stream: MediaStream | null = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: mode === "video"
      });
    } catch {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: mode === "video" });
      } catch (err) {
        console.error("Camera permissions error:", err);
        setIsCameraActive(false);
        return;
      }
    }
    if (stream && videoStreamRef.current) {
      videoStreamRef.current.srcObject = stream;
      videoStreamRef.current.play().catch(() => {});
    }
  };

  const stopCamera = () => {
    if (videoStreamRef.current && videoStreamRef.current.srcObject) {
      const stream = videoStreamRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoStreamRef.current.srcObject = null;
    }
    setIsCameraActive(false);
    setIsRecordingVideo(false);
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
  };

  const takeCameraPhoto = () => {
    if (videoStreamRef.current && canvasRef.current) {
      const video = videoStreamRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        setImagePreview(canvas.toDataURL("image/jpeg"));
        stopCamera();
      }
    }
  };

  const startVideoRecording = () => {
    if (!videoStreamRef.current || !videoStreamRef.current.srcObject) return;
    const stream = videoStreamRef.current.srcObject as MediaStream;
    recordedChunksRef.current = [];
    try {
      const recorder = new MediaRecorder(stream, { mimeType: MediaRecorder.isTypeSupported("video/webm") ? "video/webm" : "video/mp4" });
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) recordedChunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: "video/webm" });
        const reader = new FileReader();
        reader.onloadend = () => {
          setVideoPreview(reader.result as string);
          stopCamera();
        };
        reader.readAsDataURL(blob);
      };
      recorder.start(100);
      mediaRecorderRef.current = recorder;
      setIsRecordingVideo(true);
      setRecordingTime(0);

      recordingTimerRef.current = setInterval(() => {
        setRecordingTime((prev) => {
          if (prev >= 15) {
            stopVideoRecording();
            return 15;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (e) {
      console.error("Recording error:", e);
    }
  };

  const stopVideoRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    setIsRecordingVideo(false);
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // Publish Status
  const handlePublishStatus = () => {
    let content = "";
    let mediaUrl: string | undefined = undefined;
    let musicTitle: string | undefined = undefined;
    let musicArtist: string | undefined = undefined;
    let duration = 5;

    if (createType === "text") {
      if (!textStatusContent.trim()) {
        alert("Escribe un texto o frase para publicar tu estado.");
        return;
      }
      content = textStatusContent.trim();
      duration = 6;
    } else if (createType === "image") {
      if (!imagePreview) {
        alert("Por favor selecciona o toma una foto para tu estado.");
        imageFileInputRef.current?.click();
        return;
      }
      content = imagePreview;
      duration = 6;
    } else if (createType === "video") {
      if (!videoPreview) {
        alert("Por favor selecciona o graba un video para tu estado.");
        videoFileInputRef.current?.click();
        return;
      }
      content = videoPreview;
      duration = 15;
    } else if (createType === "music") {
      const track = selectedMusicPreset || PRESET_MUSIC_TRACKS[0];
      content = customAudioUrl || track.url;
      mediaUrl = track.cover;
      musicTitle = customAudioUrl ? (customMusicTitle || "Audio de Voz") : track.title;
      musicArtist = customAudioUrl ? (customMusicArtist || currentUser.firstName || "Yo") : track.artist;
      duration = 12;
    }

    const newStatus: UserStatusItem = {
      id: `stat_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      userId: currentUser.id || "usr_me",
      userName: currentUser.firstName ? `${currentUser.firstName} ${currentUser.lastName || ""}`.trim() : (currentUser.username || "Mi Estado"),
      userAvatar: currentUser.avatarUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
      type: createType === "music" ? "music" : createType,
      content: content,
      caption: captionText.trim() || undefined,
      bgColor: createType === "text" ? selectedColor : createType === "music" ? musicBgColor : undefined,
      mediaUrl: mediaUrl,
      musicTitle: musicTitle,
      musicArtist: musicArtist,
      duration: duration,
      createdAt: "Ahora",
      timestamp: Date.now()
    };

    try {
      onAddStatus(newStatus);
    } catch (err) {
      console.error("Error publishing status:", err);
    }

    setShowCreateModal(false);

    // Reset fields
    setTextStatusContent("");
    setCaptionText("");
    setImagePreview(null);
    setVideoPreview(null);
    setCustomAudioUrl(null);
    setCustomMusicTitle("");
    setCustomMusicArtist("");
  };

  // Open Story Viewer for a user
  const openUserStory = (userGroupIndex: number, storyIdx = 0) => {
    setActiveUserGroupIndex(userGroupIndex);
    setCurrentStoryIndex(storyIdx);
    setStoryProgress(0);
    setIsPaused(false);
  };

  const closeViewer = () => {
    setActiveUserGroupIndex(null);
    setCurrentStoryIndex(0);
    setStoryProgress(0);
    setIsPaused(false);
  };

  // Active Story Item
  const currentGroup = activeUserGroupIndex !== null ? userGroupsList[activeUserGroupIndex] : null;
  const currentStoryItem = currentGroup && currentGroup.items[currentStoryIndex] ? currentGroup.items[currentStoryIndex] : null;

  // Story Progress Timer (WhatsApp Auto-Advance)
  useEffect(() => {
    if (!currentStoryItem || activeUserGroupIndex === null || isPaused) return;

    const itemDuration = currentStoryItem.duration || 5; // in seconds
    const intervalMs = 50;
    const increment = (intervalMs / (itemDuration * 1000)) * 100;

    const timer = setInterval(() => {
      setStoryProgress((prev) => {
        if (prev + increment >= 100) {
          // Time completed -> go to next story!
          handleNextStory();
          return 0;
        }
        return prev + increment;
      });
    }, intervalMs);

    return () => clearInterval(timer);
  }, [activeUserGroupIndex, currentStoryIndex, currentStoryItem, isPaused]);

  // Navigate to Next Story Segment or Next User Group
  const handleNextStory = () => {
    if (!currentGroup) return;
    if (currentStoryIndex < currentGroup.items.length - 1) {
      setCurrentStoryIndex((prev) => prev + 1);
      setStoryProgress(0);
    } else if (activeUserGroupIndex !== null && activeUserGroupIndex < userGroupsList.length - 1) {
      // Go to next user's story!
      setActiveUserGroupIndex((prev) => (prev !== null ? prev + 1 : null));
      setCurrentStoryIndex(0);
      setStoryProgress(0);
    } else {
      // Reached the end of all stories
      closeViewer();
    }
  };

  // Navigate to Previous Story Segment or Previous User Group
  const handlePrevStory = () => {
    if (!currentGroup) return;
    if (currentStoryIndex > 0) {
      setCurrentStoryIndex((prev) => prev - 1);
      setStoryProgress(0);
    } else if (activeUserGroupIndex !== null && activeUserGroupIndex > 0) {
      const prevGroup = userGroupsList[activeUserGroupIndex - 1];
      setActiveUserGroupIndex(activeUserGroupIndex - 1);
      setCurrentStoryIndex(prevGroup.items.length - 1);
      setStoryProgress(0);
    }
  };

  // Time remaining calculator (e.g., "Expira en 22h")
  const getExpirationLabel = (timestamp: number) => {
    const elapsedMs = Date.now() - timestamp;
    const remainingMs = 24 * 60 * 60 * 1000 - elapsedMs;
    const remainingHours = Math.max(0, Math.floor(remainingMs / (1000 * 60 * 60)));
    const remainingMins = Math.max(0, Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60)));

    if (remainingHours > 0) {
      return `Expira en ${remainingHours}h`;
    }
    return `Expira en ${remainingMins}m`;
  };

  return (
    <div className="flex flex-col h-full bg-[#060a12] text-slate-100 overflow-y-auto custom-scrollbar p-4 space-y-6">
      {/* Hidden File Inputs */}
      <input type="file" ref={imageFileInputRef} onChange={handleImageFileChange} accept="image/*" className="hidden" />
      <input type="file" ref={videoFileInputRef} onChange={handleVideoFileChange} accept="video/*" className="hidden" />
      <input type="file" ref={audioFileInputRef} onChange={handleAudioFileChange} accept="audio/*" className="hidden" />

      {/* Header with Prominent Publish CTA */}
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#00E676] to-emerald-600 flex items-center justify-center text-black font-black shadow-[0_0_15px_rgba(0,230,118,0.5)]">
            <Clock className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div>
            <h2 className="font-black text-lg bg-gradient-to-r from-white via-slate-100 to-[#00E676] bg-clip-text text-transparent">
              Estados estilo WhatsApp (24h)
            </h2>
            <p className="text-xs text-slate-400 font-medium">Videos, Canciones, Fotos y Notas de voz</p>
          </div>
        </div>

        <button
          id="btn-publish-status-main"
          onClick={() => {
            setCreateType("image");
            setShowCreateModal(true);
          }}
          className="px-4 py-2.5 rounded-2xl bg-[#00E676] hover:bg-[#00c853] text-black font-black text-xs shadow-[0_0_20px_rgba(0,230,118,0.5)] flex items-center gap-2 transition hover:scale-105 active:scale-95"
        >
          <Plus className="w-4.5 h-4.5 stroke-[3]" />
          <span className="hidden sm:inline">Publicar Estado</span>
          <span className="sm:hidden">Publicar</span>
        </button>
      </div>

      {/* WHATSAPP STYLE HORIZONTAL STORIES CAROUSEL */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-black text-[#00E676] uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#00E676]" />
            <span>Carrusel de Estados (Toca para Ver)</span>
          </span>
          <span className="text-[10px] text-slate-400 font-bold">
            {userGroupsList.length} activo{userGroupsList.length !== 1 ? "s" : ""}
          </span>
        </div>

        <div className="flex items-center gap-4 overflow-x-auto pb-3 pt-1 custom-scrollbar scroll-smooth no-scrollbar">
          {/* Item 1 in Carousel: Mi Estado */}
          <div
            onClick={() => {
              if (myStatuses.length > 0) {
                const myGroupIdx = userGroupsList.findIndex((g) => g.userId === currentUser.id);
                if (myGroupIdx !== -1) openUserStory(myGroupIdx, 0);
              } else {
                setCreateType("image");
                setShowCreateModal(true);
              }
            }}
            className="flex flex-col items-center gap-1.5 cursor-pointer group flex-shrink-0"
          >
            <div className="relative">
              <div
                className={`w-16 h-16 rounded-full p-0.5 transition transform group-hover:scale-105 ${
                  myStatuses.length > 0
                    ? "ring-2 ring-offset-2 ring-offset-[#060a12] ring-[#00E676] shadow-[0_0_15px_rgba(0,230,118,0.5)]"
                    : "border-2 border-dashed border-slate-700 hover:border-[#00E676]"
                }`}
              >
                <img
                  src={currentUser.avatarUrl}
                  alt="Mi avatar"
                  className="w-full h-full rounded-full object-cover"
                />
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setCreateType("image");
                  setShowCreateModal(true);
                }}
                className="absolute bottom-0 right-0 p-1 bg-[#00E676] text-black rounded-full shadow-lg hover:scale-110 transition border-2 border-[#060a12]"
                title="Publicar nuevo estado"
              >
                <Plus className="w-3.5 h-3.5 stroke-[3]" />
              </button>
            </div>
            <p className="text-xs font-bold text-slate-200 group-hover:text-[#00E676] transition truncate max-w-[70px] text-center">
              Mi estado
            </p>
            <span className="text-[9px] text-slate-400 font-medium">
              {myStatuses.length > 0 ? `${myStatuses.length} activo` : "Publicar"}
            </span>
          </div>

          {/* Contact Items in Carousel */}
          {userGroupsList.map((group, gIdx) => {
            if (group.userId === currentUser.id) return null; // Already shown first as Mi Estado
            const latestItem = group.items[group.items.length - 1];
            return (
              <div
                key={`carousel-group-${group.userId}`}
                onClick={() => openUserStory(gIdx, 0)}
                className="flex flex-col items-center gap-1.5 cursor-pointer group flex-shrink-0"
              >
                <StatusProgressAvatarRing
                  avatarUrl={group.userAvatar}
                  userName={group.userName}
                  timestamp={latestItem.timestamp}
                  itemCount={group.items.length}
                  size={62}
                  mediaType={latestItem.type}
                />

                <p className="text-xs font-extrabold text-slate-200 group-hover:text-[#00E676] transition truncate max-w-[75px] text-center">
                  {group.userName.split(" ")[0]}
                </p>
                <span className="text-[9px] text-emerald-400 font-medium">
                  {latestItem.createdAt}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* QUICK PUBLISH ACTION CARDS GRID */}
      <div className="space-y-2 pt-1">
        <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
          ¿Qué deseas publicar hoy?
        </span>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <button
            onClick={() => {
              setCreateType("text");
              setShowCreateModal(true);
            }}
            className="p-3.5 rounded-2xl bg-gradient-to-br from-emerald-950/70 via-slate-900 to-slate-900 border border-emerald-800/40 hover:border-[#00E676] transition hover:scale-102 group text-left space-y-2 shadow-md"
          >
            <div className="w-9 h-9 rounded-xl bg-[#00E676]/20 text-[#00E676] flex items-center justify-center group-hover:bg-[#00E676] group-hover:text-black transition shadow">
              <Type className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <p className="font-extrabold text-xs text-slate-100 group-hover:text-[#00E676] transition">Texto / Nota</p>
              <p className="text-[10px] text-slate-400">Fondos coloridos</p>
            </div>
          </button>

          <button
            onClick={() => {
              setCreateType("image");
              setShowCreateModal(true);
            }}
            className="p-3.5 rounded-2xl bg-gradient-to-br from-cyan-950/70 via-slate-900 to-slate-900 border border-cyan-800/40 hover:border-[#00F0FF] transition hover:scale-102 group text-left space-y-2 shadow-md"
          >
            <div className="w-9 h-9 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center group-hover:bg-cyan-400 group-hover:text-black transition shadow">
              <ImageIcon className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <p className="font-extrabold text-xs text-slate-100 group-hover:text-cyan-400 transition">Imagen / Foto</p>
              <p className="text-[10px] text-slate-400">Cámara y Galería</p>
            </div>
          </button>

          <button
            onClick={() => {
              setCreateType("video");
              setShowCreateModal(true);
            }}
            className="p-3.5 rounded-2xl bg-gradient-to-br from-indigo-950/70 via-slate-900 to-slate-900 border border-indigo-800/40 hover:border-indigo-400 transition hover:scale-102 group text-left space-y-2 shadow-md"
          >
            <div className="w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center group-hover:bg-indigo-400 group-hover:text-black transition shadow">
              <VideoIcon className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <p className="font-extrabold text-xs text-slate-100 group-hover:text-indigo-400 transition">Video (15s)</p>
              <p className="text-[10px] text-slate-400">Grabador y MP4</p>
            </div>
          </button>

          <button
            onClick={() => {
              setCreateType("music");
              setShowCreateModal(true);
            }}
            className="p-3.5 rounded-2xl bg-gradient-to-br from-pink-950/70 via-slate-900 to-slate-900 border border-pink-800/40 hover:border-pink-400 transition hover:scale-102 group text-left space-y-2 shadow-md"
          >
            <div className="w-9 h-9 rounded-xl bg-pink-500/20 text-pink-400 flex items-center justify-center group-hover:bg-pink-400 group-hover:text-black transition shadow">
              <MusicIcon className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <p className="font-extrabold text-xs text-slate-100 group-hover:text-pink-400 transition">Música / Audio</p>
              <p className="text-[10px] text-slate-400">Hits y Audios MP3</p>
            </div>
          </button>
        </div>
      </div>

      {/* Section: Actualizaciones Recientes */}
      <div className="space-y-3 pt-2">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
          Lista Completa de Estados ({userGroupsList.length})
        </span>

        {userGroupsList.length === 0 ? (
          <div className="text-center py-10 px-4 rounded-3xl bg-slate-900/40 border border-slate-800/80 text-slate-400 space-y-2">
            <Sparkles className="w-8 h-8 mx-auto text-[#00E676] opacity-80 animate-pulse" />
            <p className="font-bold text-sm text-slate-200">No hay estados de 24h activos</p>
            <p className="text-xs text-slate-500 max-w-xs mx-auto">
              Publica un video, canción o foto para tus contactos. El contenido desaparecerá en 24 horas.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {userGroupsList.map((group, gIdx) => {
              const latestItem = group.items[group.items.length - 1];
              return (
                <div
                  key={group.userId}
                  id={`status-card-group-${group.userId}`}
                  onClick={() => openUserStory(gIdx, 0)}
                  className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-[#00E676]/50 cursor-pointer transition group shadow-sm hover:bg-slate-900"
                >
                  <div className="flex items-center gap-3.5">
                    <StatusProgressAvatarRing
                      avatarUrl={group.userAvatar}
                      userName={group.userName}
                      timestamp={latestItem.timestamp}
                      itemCount={group.items.length}
                      size={52}
                      mediaType={latestItem.type}
                    />

                    <div className="space-y-0.5">
                      <p className="font-bold text-xs text-slate-100 group-hover:text-[#00E676] transition flex items-center gap-1.5">
                        <span>{group.userName}</span>
                        {group.userId === currentUser.id && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#00E676]/20 text-[#00E676] font-extrabold">Tú</span>
                        )}
                      </p>
                      <p className="text-[11px] text-slate-400 flex items-center gap-2">
                        <span>{latestItem.createdAt}</span>
                        <span>•</span>
                        <span className="text-[#00E676] font-medium">{getExpirationLabel(latestItem.timestamp)}</span>
                      </p>
                    </div>
                  </div>

                  {/* Badge representing item type */}
                  <div className="flex items-center gap-2">
                    {latestItem.type === "text" && (
                      <span className="px-2.5 py-1 rounded-xl text-[10px] font-black bg-gradient-to-r from-[#00E676] to-emerald-700 text-black shadow">
                        📝 Texto
                      </span>
                    )}
                    {latestItem.type === "image" && (
                      <div className="relative w-10 h-10 rounded-xl overflow-hidden border border-slate-700 shadow">
                        <img src={latestItem.content} alt="thumb" className="w-full h-full object-cover" />
                      </div>
                    )}
                    {latestItem.type === "video" && (
                      <span className="px-2.5 py-1 rounded-xl text-[10px] font-black bg-indigo-600 text-white flex items-center gap-1 shadow">
                        <Film className="w-3 h-3" />
                        <span>Video</span>
                      </span>
                    )}
                    {latestItem.type === "music" && (
                      <span className="px-2.5 py-1 rounded-xl text-[10px] font-black bg-pink-600 text-white flex items-center gap-1 shadow animate-pulse">
                        <MusicIcon className="w-3 h-3" />
                        <span>Música</span>
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* CREATE STATUS MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-4 text-slate-100 shadow-2xl relative max-h-[90vh] overflow-y-auto custom-scrollbar">
            <button
              onClick={() => {
                setShowCreateModal(false);
                stopCamera();
              }}
              className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="font-black text-sm text-slate-100 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#00E676]" />
              <span>Nuevo Estado de 24 Horas</span>
            </h3>

            {/* Type Selector Tabs */}
            <div className="grid grid-cols-4 gap-1 p-1 bg-slate-950 rounded-2xl text-xs font-bold">
              <button
                onClick={() => {
                  setCreateType("text");
                  stopCamera();
                }}
                className={`py-2 rounded-xl transition flex flex-col items-center justify-center gap-1 ${
                  createType === "text" ? "bg-[#00E676] text-slate-950 shadow" : "text-slate-400 hover:text-white"
                }`}
              >
                <Type className="w-4 h-4" />
                <span className="text-[10px]">Texto</span>
              </button>

              <button
                onClick={() => {
                  setCreateType("image");
                  stopCamera();
                }}
                className={`py-2 rounded-xl transition flex flex-col items-center justify-center gap-1 ${
                  createType === "image" ? "bg-[#00E676] text-slate-950 shadow" : "text-slate-400 hover:text-white"
                }`}
              >
                <ImageIcon className="w-4 h-4" />
                <span className="text-[10px]">Imagen</span>
              </button>

              <button
                onClick={() => {
                  setCreateType("video");
                  stopCamera();
                }}
                className={`py-2 rounded-xl transition flex flex-col items-center justify-center gap-1 ${
                  createType === "video" ? "bg-[#00E676] text-slate-950 shadow" : "text-slate-400 hover:text-white"
                }`}
              >
                <VideoIcon className="w-4 h-4" />
                <span className="text-[10px]">Video</span>
              </button>

              <button
                onClick={() => {
                  setCreateType("music");
                  stopCamera();
                }}
                className={`py-2 rounded-xl transition flex flex-col items-center justify-center gap-1 ${
                  createType === "music" ? "bg-[#00E676] text-slate-950 shadow" : "text-slate-400 hover:text-white"
                }`}
              >
                <MusicIcon className="w-4 h-4" />
                <span className="text-[10px]">Música</span>
              </button>
            </div>

            {/* TAB CONTENT: TEXT */}
            {createType === "text" && (
              <div className="space-y-3">
                <div
                  className={`w-full h-48 rounded-2xl p-5 bg-gradient-to-br ${selectedColor} flex items-center justify-center text-center shadow-inner transition-all duration-300`}
                >
                  <textarea
                    value={textStatusContent}
                    onChange={(e) => setTextStatusContent(e.target.value)}
                    placeholder="Escribe lo que piensas..."
                    maxLength={180}
                    className="w-full bg-transparent text-black font-extrabold text-lg placeholder-black/50 text-center focus:outline-none resize-none"
                  />
                </div>

                {/* Color choices */}
                <div className="flex items-center justify-center gap-2 pt-1">
                  {bgColors.map((c) => (
                    <button
                      key={c}
                      onClick={() => setSelectedColor(c)}
                      className={`w-7 h-7 rounded-full bg-gradient-to-r ${c} transition transform hover:scale-110 ${
                        selectedColor === c ? "ring-2 ring-white scale-110 shadow-lg" : "opacity-70"
                      }`}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* TAB CONTENT: IMAGE */}
            {createType === "image" && (
              <div className="space-y-3">
                <canvas ref={canvasRef} className="hidden" />

                {isCameraActive ? (
                  <div className="relative rounded-2xl overflow-hidden max-h-60 bg-black flex flex-col items-center justify-center border border-slate-800">
                    <video ref={videoStreamRef} autoPlay playsInline className="max-h-60 w-full object-cover" />
                    <button
                      onClick={takeCameraPhoto}
                      className="absolute bottom-3 px-5 py-2.5 bg-[#00E676] text-black font-extrabold text-xs rounded-full shadow-xl hover:scale-105 transition flex items-center gap-2"
                    >
                      <Camera className="w-4 h-4" />
                      <span>Tomar Foto</span>
                    </button>
                  </div>
                ) : imagePreview ? (
                  <div className="relative rounded-2xl overflow-hidden max-h-60 bg-slate-950 flex items-center justify-center border border-slate-800 group">
                    <img src={imagePreview} alt="Preview" className="max-h-60 w-full object-cover" />
                    <button
                      onClick={() => setImagePreview(null)}
                      className="absolute top-2 right-2 p-1.5 rounded-full bg-black/80 text-white hover:bg-black"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => imageFileInputRef.current?.click()}
                      className="h-36 rounded-2xl border-2 border-dashed border-slate-700 hover:border-[#00E676] bg-slate-950 flex flex-col items-center justify-center text-slate-400 gap-2 transition p-3 text-center group"
                    >
                      <ImageIcon className="w-7 h-7 text-[#00E676] group-hover:scale-110 transition" />
                      <span className="text-xs font-bold text-slate-200">Galería de Fotos</span>
                    </button>

                    <button
                      onClick={() => startCamera("photo")}
                      className="h-36 rounded-2xl border-2 border-dashed border-slate-700 hover:border-[#00E676] bg-slate-950 flex flex-col items-center justify-center text-slate-400 gap-2 transition p-3 text-center group"
                    >
                      <Camera className="w-7 h-7 text-[#00E676] group-hover:scale-110 transition" />
                      <span className="text-xs font-bold text-slate-200">Usar Cámara</span>
                    </button>
                  </div>
                )}

                {/* Caption input */}
                <input
                  type="text"
                  value={captionText}
                  onChange={(e) => setCaptionText(e.target.value)}
                  placeholder="Añade un comentario a la imagen..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#00E676]"
                />
              </div>
            )}

            {/* TAB CONTENT: VIDEO */}
            {createType === "video" && (
              <div className="space-y-3">
                {isCameraActive ? (
                  <div className="relative rounded-2xl overflow-hidden max-h-60 bg-black flex flex-col items-center justify-center border border-slate-800">
                    <video ref={videoStreamRef} autoPlay playsInline muted className="max-h-60 w-full object-cover" />
                    {isRecordingVideo && (
                      <div className="absolute top-3 left-3 px-3 py-1 bg-red-600 text-white font-extrabold text-[10px] rounded-full flex items-center gap-1.5 animate-pulse shadow">
                        <span className="w-2 h-2 rounded-full bg-white" />
                        <span>Grabando: {recordingTime}s / 15s</span>
                      </div>
                    )}

                    <div className="absolute bottom-3 flex items-center gap-3">
                      {!isRecordingVideo ? (
                        <button
                          onClick={startVideoRecording}
                          className="px-5 py-2.5 bg-red-600 text-white font-extrabold text-xs rounded-full shadow-xl hover:scale-105 transition flex items-center gap-2"
                        >
                          <VideoIcon className="w-4 h-4" />
                          <span>Grabar Video (15s)</span>
                        </button>
                      ) : (
                        <button
                          onClick={stopVideoRecording}
                          className="px-5 py-2.5 bg-slate-100 text-black font-extrabold text-xs rounded-full shadow-xl hover:scale-105 transition flex items-center gap-2"
                        >
                          <SquareIcon className="w-4 h-4 fill-black" />
                          <span>Detener Grabación</span>
                        </button>
                      )}
                    </div>
                  </div>
                ) : videoPreview ? (
                  <div className="relative rounded-2xl overflow-hidden max-h-60 bg-black flex items-center justify-center border border-slate-800 group">
                    <video src={videoPreview} controls autoPlay className="max-h-60 w-full object-cover" />
                    <button
                      onClick={() => setVideoPreview(null)}
                      className="absolute top-2 right-2 p-1.5 rounded-full bg-black/80 text-white hover:bg-black z-10"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => videoFileInputRef.current?.click()}
                      className="h-36 rounded-2xl border-2 border-dashed border-slate-700 hover:border-[#00E676] bg-slate-950 flex flex-col items-center justify-center text-slate-400 gap-2 transition p-3 text-center group"
                    >
                      <Film className="w-7 h-7 text-[#00E676] group-hover:scale-110 transition" />
                      <span className="text-xs font-bold text-slate-200">Subir Archivo Video</span>
                    </button>

                    <button
                      onClick={() => startCamera("video")}
                      className="h-36 rounded-2xl border-2 border-dashed border-slate-700 hover:border-[#00E676] bg-slate-950 flex flex-col items-center justify-center text-slate-400 gap-2 transition p-3 text-center group"
                    >
                      <VideoIcon className="w-7 h-7 text-[#00E676] group-hover:scale-110 transition" />
                      <span className="text-xs font-bold text-slate-200">Grabar Video</span>
                    </button>
                  </div>
                )}

                {/* Caption input */}
                <input
                  type="text"
                  value={captionText}
                  onChange={(e) => setCaptionText(e.target.value)}
                  placeholder="Añade un comentario al video..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#00E676]"
                />
              </div>
            )}

            {/* TAB CONTENT: MUSIC */}
            {createType === "music" && (
              <div className="space-y-4">
                {/* Music Card Preview */}
                <div
                  className={`w-full p-4 rounded-2xl bg-gradient-to-br ${musicBgColor} border border-white/10 shadow-lg flex items-center gap-3.5 relative overflow-hidden`}
                >
                  <div className="relative w-14 h-14 rounded-xl overflow-hidden shadow-2xl flex-shrink-0 bg-slate-800 border border-white/20">
                    <img
                      src={selectedMusicPreset.cover}
                      alt="Cover"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                      <Disc className="w-6 h-6 text-[#00E676] animate-spin" style={{ animationDuration: "4s" }} />
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 text-[#00E676] text-[10px] font-black uppercase tracking-wider">
                      <MusicIcon className="w-3 h-3" />
                      <span>Estado de Música</span>
                    </div>
                    <p className="font-extrabold text-sm text-white truncate">
                      {customAudioUrl ? customMusicTitle || "Pista Personalizada" : selectedMusicPreset.title}
                    </p>
                    <p className="text-xs text-slate-300 truncate">
                      {customAudioUrl ? customMusicArtist || currentUser.firstName : selectedMusicPreset.artist}
                    </p>
                  </div>
                </div>

                {/* Select Preset or Custom Upload */}
                <div className="space-y-2">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    Selecciona una canción o audio:
                  </span>

                  <div className="grid grid-cols-2 gap-2">
                    {PRESET_MUSIC_TRACKS.map((track) => (
                      <button
                        key={track.id}
                        onClick={() => {
                          setSelectedMusicPreset(track);
                          setCustomAudioUrl(null);
                          setMusicBgColor(track.bgColor);
                        }}
                        className={`p-2.5 rounded-xl border text-left transition flex items-center gap-2.5 ${
                          !customAudioUrl && selectedMusicPreset.id === track.id
                            ? "bg-[#00E676]/10 border-[#00E676] text-white"
                            : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"
                        }`}
                      >
                        <img src={track.cover} alt="t" className="w-8 h-8 rounded-lg object-cover" />
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-xs truncate text-slate-200">{track.title}</p>
                          <p className="text-[10px] text-slate-400 truncate">{track.artist}</p>
                        </div>
                      </button>
                    ))}
                  </div>

                  {/* Upload custom audio file */}
                  <button
                    onClick={() => audioFileInputRef.current?.click()}
                    className="w-full py-2.5 rounded-xl border border-dashed border-slate-700 hover:border-[#00E676] bg-slate-950 text-slate-300 text-xs font-bold transition flex items-center justify-center gap-2"
                  >
                    <Mic className="w-4 h-4 text-[#00E676]" />
                    <span>{customAudioUrl ? "Audio Subido ✓ (Cambiar)" : "Subir archivo de audio / Voz (MP3, WAV)"}</span>
                  </button>
                </div>

                {/* Background choices */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    Fondo de la tarjeta:
                  </span>
                  <div className="flex items-center gap-2">
                    {bgColors.map((c) => (
                      <button
                        key={c}
                        onClick={() => setMusicBgColor(c)}
                        className={`w-6 h-6 rounded-full bg-gradient-to-r ${c} transition transform hover:scale-110 ${
                          musicBgColor === c ? "ring-2 ring-white scale-110 shadow" : "opacity-70"
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Publish Button */}
            <button
              onClick={handlePublishStatus}
              className="w-full py-3.5 rounded-2xl bg-[#00E676] text-black font-black text-xs uppercase tracking-wider shadow-[0_0_20px_rgba(0,230,118,0.4)] hover:scale-102 transition mt-2"
            >
              Publicar en mi Estado (24h)
            </button>
          </div>
        </div>
      )}

      {/* WHATSAPP-STYLE FULL SCREEN STORY VIEWER */}
      {activeUserGroupIndex !== null && currentGroup && currentStoryItem && (
        <div
          className="fixed inset-0 z-50 bg-black flex flex-col justify-between animate-in fade-in duration-200 select-none overflow-hidden"
          onMouseDown={() => setIsPaused(true)}
          onMouseUp={() => setIsPaused(false)}
          onTouchStart={() => setIsPaused(true)}
          onTouchEnd={() => setIsPaused(false)}
        >
          {/* Top Control Overlay */}
          <div className={`p-4 space-y-3 max-w-md mx-auto w-full z-20 transition-opacity duration-200 ${isPaused ? "opacity-20" : "opacity-100"}`}>
            {/* Segmented Progress Bar (WhatsApp Style) */}
            <div className="flex items-center gap-1.5 w-full">
              {currentGroup.items.map((item, idx) => {
                let fillPercent = 0;
                if (idx < currentStoryIndex) {
                  fillPercent = 100;
                } else if (idx === currentStoryIndex) {
                  fillPercent = storyProgress;
                } else {
                  fillPercent = 0;
                }

                return (
                  <div key={item.id} className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden">
                    <div
                      className="bg-[#00E676] h-full transition-all ease-linear"
                      style={{ width: `${fillPercent}%` }}
                    />
                  </div>
                );
              })}
            </div>

            {/* Header Info */}
            <div className="flex items-center justify-between text-slate-100 pt-1">
              <div className="flex items-center gap-3">
                <img
                  src={currentGroup.userAvatar}
                  alt={currentGroup.userName}
                  className="w-10 h-10 rounded-full object-cover border-2 border-[#00E676] shadow-lg"
                />
                <div>
                  <p className="font-extrabold text-xs text-white">{currentGroup.userName}</p>
                  <p className="text-[10px] text-slate-300 font-medium">
                    {currentStoryItem.createdAt} • {getExpirationLabel(currentStoryItem.timestamp)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsMuted(!isMuted)}
                  className="p-2 rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-md"
                >
                  {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-[#00E676]" />}
                </button>

                <button
                  onClick={closeViewer}
                  className="p-2 rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-md"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          {/* TAP NAVIGATION ZONES (Left 30% / Right 70%) */}
          <div className="absolute inset-0 z-10 flex">
            <div
              className="w-1/3 h-full cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                handlePrevStory();
              }}
            />
            <div
              className="w-2/3 h-full cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                handleNextStory();
              }}
            />
          </div>

          {/* STORY CONTENT AREA */}
          <div className="relative flex-1 flex items-center justify-center max-w-md mx-auto w-full px-4 my-auto z-0 pointer-events-none">
            {/* TEXT STATUS */}
            {currentStoryItem.type === "text" && (
              <div
                className={`w-full max-w-xs h-96 rounded-3xl bg-gradient-to-br ${
                  currentStoryItem.bgColor || "from-[#00E676] to-[#00B248]"
                } p-6 flex items-center justify-center text-center shadow-2xl border border-white/20`}
              >
                <p className="text-black font-black text-2xl leading-snug drop-shadow-sm">
                  {currentStoryItem.content}
                </p>
              </div>
            )}

            {/* IMAGE STATUS */}
            {currentStoryItem.type === "image" && (
              <div className="relative max-h-[70vh] w-full flex flex-col items-center justify-center">
                <img
                  src={currentStoryItem.content}
                  alt="Status"
                  className="max-h-[70vh] max-w-full rounded-2xl object-contain shadow-2xl border border-slate-800"
                />
                {currentStoryItem.caption && (
                  <div className="mt-3 px-4 py-2 bg-black/70 backdrop-blur-md border border-slate-800 rounded-2xl text-center text-xs font-bold text-slate-100 max-w-xs">
                    {currentStoryItem.caption}
                  </div>
                )}
              </div>
            )}

            {/* VIDEO STATUS */}
            {currentStoryItem.type === "video" && (
              <div className="relative max-h-[75vh] w-full flex flex-col items-center justify-center">
                <video
                  ref={viewerVideoRef}
                  src={currentStoryItem.content}
                  autoPlay
                  playsInline
                  muted={isMuted}
                  className="max-h-[75vh] max-w-full rounded-2xl object-contain shadow-2xl border border-slate-800"
                />
                {currentStoryItem.caption && (
                  <div className="mt-3 px-4 py-2 bg-black/70 backdrop-blur-md border border-slate-800 rounded-2xl text-center text-xs font-bold text-slate-100 max-w-xs">
                    {currentStoryItem.caption}
                  </div>
                )}
              </div>
            )}

            {/* MUSIC STATUS */}
            {currentStoryItem.type === "music" && (
              <div className="w-full max-w-xs space-y-4">
                <audio
                  ref={viewerAudioRef}
                  src={currentStoryItem.content}
                  autoPlay
                  muted={isMuted}
                />

                <div
                  className={`w-full p-6 rounded-3xl bg-gradient-to-br ${
                    currentStoryItem.bgColor || "from-cyan-900 via-purple-900 to-black"
                  } border border-white/20 shadow-2xl flex flex-col items-center justify-center text-center space-y-5`}
                >
                  <div className="relative w-32 h-32 rounded-3xl overflow-hidden shadow-2xl border-2 border-white/30 p-1">
                    <img
                      src={currentStoryItem.mediaUrl || currentGroup.userAvatar}
                      alt="Music Cover"
                      className="w-full h-full object-cover rounded-2xl"
                    />
                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                      <Disc
                        className="w-12 h-12 text-[#00E676] animate-spin"
                        style={{ animationDuration: isPaused ? "0s" : "3s" }}
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <span className="px-3 py-1 rounded-full bg-[#00E676]/20 text-[#00E676] text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1.5 border border-[#00E676]/30">
                      <MusicIcon className="w-3 h-3" />
                      <span>Reproduciendo Canción</span>
                    </span>
                    <h4 className="font-extrabold text-lg text-white pt-1">
                      {currentStoryItem.musicTitle || "Música de Estado"}
                    </h4>
                    <p className="text-xs text-slate-300 font-medium">
                      {currentStoryItem.musicArtist || currentGroup.userName}
                    </p>
                  </div>

                  {/* Equalizer animation */}
                  <div className="flex items-center gap-1.5 h-6">
                    <span className="w-1 bg-[#00E676] rounded-full animate-bounce h-4" />
                    <span className="w-1 bg-[#00E676] rounded-full animate-bounce h-6" style={{ animationDelay: "150ms" }} />
                    <span className="w-1 bg-[#00E676] rounded-full animate-bounce h-3" style={{ animationDelay: "300ms" }} />
                    <span className="w-1 bg-[#00E676] rounded-full animate-bounce h-5" style={{ animationDelay: "450ms" }} />
                    <span className="w-1 bg-[#00E676] rounded-full animate-bounce h-2" style={{ animationDelay: "200ms" }} />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* FLOATING REACTION TOAST */}
          {reactionToast && (
            <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 px-4 py-2 rounded-2xl bg-black/90 border border-[#00E676]/60 text-white text-xs font-black shadow-2xl flex items-center gap-2 animate-bounce">
              <span>{reactionToast}</span>
            </div>
          )}

          {/* BOTTOM CONTROL & REPLY BAR */}
          <div className={`p-4 max-w-md mx-auto w-full flex flex-col gap-2.5 z-20 pointer-events-auto transition-opacity duration-200 ${isPaused ? "opacity-20" : "opacity-100"}`}>
            {/* Quick Emoji Reaction Bar */}
            <div className="flex items-center justify-between px-3 py-2 rounded-2xl bg-slate-950/80 border border-slate-800/80 backdrop-blur-md shadow-lg">
              {["❤️", "😂", "🔥", "😮", "👏", "👍", "🎉", "😍"].map((emoji) => (
                <button
                  key={`reaction-${emoji}`}
                  onClick={() => {
                    if (onSendMessageToUser) {
                      onSendMessageToUser(currentGroup.userId, `[Reacción a tu estado]: ${emoji}`);
                    }
                    setReactionToast(`${emoji} ¡Reacción enviada a ${currentGroup.userName.split(" ")[0]}!`);
                    setTimeout(() => setReactionToast(null), 2500);
                  }}
                  className="text-lg hover:scale-130 active:scale-95 transition-transform p-1 hover:bg-slate-800/60 rounded-xl"
                  title={`Reaccionar con ${emoji}`}
                >
                  {emoji}
                </button>
              ))}
            </div>

            <div className="flex items-center justify-between gap-3">
              <button
                disabled={currentStoryIndex === 0 && activeUserGroupIndex === 0}
                onClick={handlePrevStory}
                className="p-2.5 rounded-full bg-slate-900/80 border border-slate-700 text-white disabled:opacity-30 hover:scale-105 transition shadow-lg"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              {/* Quick Reply Box */}
              <div className="flex-1 flex items-center gap-2 bg-slate-900/90 border border-slate-700/80 rounded-full px-4 py-2.5 shadow-xl">
                <input
                  type="text"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Responder a este estado..."
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && replyText.trim() && onSendMessageToUser) {
                      onSendMessageToUser(currentGroup.userId, `[Respuesta a estado]: ${replyText}`);
                      setReplyText("");
                      setReactionToast(`💬 ¡Respuesta enviada a ${currentGroup.userName.split(" ")[0]}!`);
                      setTimeout(() => setReactionToast(null), 2500);
                    }
                  }}
                  className="w-full bg-transparent text-xs text-white placeholder-slate-400 focus:outline-none"
                />
                <button
                  onClick={() => {
                    if (replyText.trim() && onSendMessageToUser) {
                      onSendMessageToUser(currentGroup.userId, `[Respuesta a estado]: ${replyText}`);
                      setReplyText("");
                      setReactionToast(`💬 ¡Respuesta enviada a ${currentGroup.userName.split(" ")[0]}!`);
                      setTimeout(() => setReactionToast(null), 2500);
                    }
                  }}
                  className="p-1.5 rounded-full bg-[#00E676] text-black hover:scale-110 transition shadow"
                >
                  <Send className="w-3.5 h-3.5 stroke-[2.5]" />
                </button>
              </div>

              <button
                onClick={handleNextStory}
                className="p-2.5 rounded-full bg-slate-900/80 border border-slate-700 text-white hover:scale-105 transition shadow-lg"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FLOATING ACTION BUTTONS (WhatsApp Style Floating Bar) */}
      <div className="sticky bottom-2 right-2 ml-auto flex flex-col items-end gap-2.5 z-30 pt-2 pointer-events-auto">
        <button
          onClick={() => {
            setCreateType("text");
            setShowCreateModal(true);
          }}
          className="w-10 h-10 rounded-full bg-slate-800 hover:bg-[#00E676] text-slate-200 hover:text-black border border-slate-700 hover:border-[#00E676] shadow-xl flex items-center justify-center transition hover:scale-110"
          title="Publicar Nota / Texto"
        >
          <Type className="w-4 h-4 stroke-[2.5]" />
        </button>

        <button
          onClick={() => {
            setCreateType("music");
            setShowCreateModal(true);
          }}
          className="w-10 h-10 rounded-full bg-slate-800 hover:bg-pink-500 text-slate-200 hover:text-white border border-slate-700 hover:border-pink-500 shadow-xl flex items-center justify-center transition hover:scale-110"
          title="Publicar Música / Audio"
        >
          <MusicIcon className="w-4 h-4 stroke-[2.5]" />
        </button>

        <button
          onClick={() => {
            setCreateType("image");
            setShowCreateModal(true);
          }}
          className="w-12 h-12 rounded-2xl bg-[#00E676] text-black shadow-[0_0_20px_rgba(0,230,118,0.5)] flex items-center justify-center transition hover:scale-110"
          title="Publicar Foto / Video"
        >
          <Camera className="w-6 h-6 stroke-[2.5]" />
        </button>
      </div>
    </div>
  );
};
