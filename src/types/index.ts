export type UserStatus = "online" | "offline" | "typing";

export type BubbleStyle = "rounded" | "square" | "gradient" | "neon";

export type ThemeMode = "dark" | "light" | "system";

export type LanguageCode = "es" | "en" | "pt" | "fr";

export type FontOption = "sans" | "serif" | "mono" | "rounded" | "display";

export type AccentColorOption = "emerald" | "cyan" | "purple" | "pink" | "amber" | "blue" | "red";

export interface CacheStats {
  totalRooms: number;
  totalMessages: number;
  lastUpdated: number;
  isReady: boolean;
  cacheSizeKb?: number;
}

export interface DayNightPaletteSettings {
  autoTimePalette: boolean;
  accentColorLight: AccentColorOption;
  accentColorDark: AccentColorOption;
}

export interface UserProfile {
  id: string;
  username: string;
  email?: string;
  password?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  countryCode?: string;
  avatarUrl: string;
  bio?: string;
  status: UserStatus;
  lastSeen?: string;
  isAi?: boolean;
  readReceiptsEnabled?: boolean;
}

export interface UserStatusItem {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  type: "text" | "image" | "video" | "music" | "audio";
  content: string;
  caption?: string;
  bgColor?: string;
  mediaUrl?: string;
  musicTitle?: string;
  musicArtist?: string;
  duration?: number; // duration in seconds (e.g. 5s default, or video/audio length)
  createdAt: string;
  timestamp: number;
}

export interface Reaction {
  emoji: string;
  userId?: string;
  userName?: string;
  count?: number;
  users?: string[];
}

export interface PollOption {
  id: string;
  text: string;
  votes: string[]; // user IDs who voted
}

export interface PollData {
  id?: string;
  question: string;
  options: PollOption[];
  totalVotes: number;
  allowsMultiple?: boolean;
}

export interface Message {
  id: string;
  roomId: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  content: string;
  type: "text" | "image" | "audio" | "video" | "file" | "poll" | "ai_image" | "sticker";
  mediaUrl?: string;
  mediaName?: string;
  mediaSize?: string;
  audioDuration?: number; // in seconds
  audioTranscript?: string;
  poll?: PollData;
  createdAt: string;
  timestamp?: number;
  isRead: boolean;
  readBy?: string[]; // user IDs who read it
  replyToMessageId?: string;
  replyToSnippet?: {
    id?: string;
    senderName: string;
    text: string;
  };
  isStarred?: boolean;
  isPinned?: boolean;
  isEphemerous?: boolean;
  reactions?: Reaction[];
  translatedText?: string;
  status?: "sending" | "sent" | "delivered" | "read" | "queued";
}

export interface Room {
  id: string;
  name: string;
  isGroup?: boolean;
  isChannel?: boolean;
  isAiChat?: boolean;
  isVaultSecret?: boolean;
  isSecretVault?: boolean;
  isLocked?: boolean;
  pinCode?: string;
  disappearingTimer?: string | number;
  isArchived?: boolean;
  avatarUrl?: string;
  participants: UserProfile[];
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount: number;
  draftText?: string;
  pinnedMessageId?: string;
  wallpaper?: string;
  ephemeralHours?: number; // 0 = off, 1 = 1 hour, 24 = 24 hours
  description?: string;
  createdAt?: string;
  folder?: string;
  isTyping?: boolean;
}

export interface CountryCode {
  code: string;
  name: string;
  flag: string;
  prefix: string;
}

export interface SentimentAnalysis {
  positive: number;
  neutral: number;
  tense: number;
  overall: string;
  summary: string;
}

export interface NotificationSettings {
  messages: boolean;
  calls: boolean;
  aiActivity: boolean;
  sound: boolean;
}

export type SoundCategory = "message" | "notification" | "voice_call" | "video_call";

export interface SoundPreset {
  id: string;
  name: string;
  category: SoundCategory;
  description?: string;
}

export interface CustomSoundItem {
  id: string;
  name: string;
  category: SoundCategory;
  audioUrl: string; // base64 Data URL or audio file link from phone gallery
  createdAt: number;
}

export interface SoundCustomizationSettings {
  messageSound: string;      // preset ID or custom sound ID
  notificationSound: string; // preset ID or custom sound ID
  voiceCallSound: string;    // preset ID or custom sound ID
  videoCallSound: string;    // preset ID or custom sound ID
  customSounds: CustomSoundItem[];
}

export interface CallLog {
  id: string;
  peerId: string;
  peerName: string;
  peerAvatar?: string;
  type: "voice" | "video";
  direction: "incoming" | "outgoing" | "missed";
  timestamp: number;
  timeString: string;
  durationString?: string;
}

export interface StickerItem {
  id: string;
  packId: string;
  url: string;
  name?: string;
  emoji?: string;
}

export interface StickerPack {
  id: string;
  name: string;
  icon: string;
  stickers: StickerItem[];
  isCustom?: boolean;
}

export type PlatformType =
  | "web_pwa"
  | "android_capacitor"
  | "ionic_appflow"
  | "google_play_twa"
  | "termux_linux"
  | "github_antigravity"
  | "firebase_firestore"
  | "websocket_realtime";

export interface FirebaseSyncInfo {
  isConnected: boolean;
  databaseId?: string;
  lastSyncedDocId?: string;
  remoteVersion?: string;
  lastRemoteSyncTime?: number;
  authUserId?: string;
  totalSyncedUpdates?: number;
}

export interface WebSocketSyncInfo {
  isConnected: boolean;
  url: string;
  latencyMs: number;
  lastHeartbeat: number;
  messagesSent: number;
  messagesReceived: number;
  lastBroadcastPayload?: any;
}

export interface AppflowConfig {
  appId: string;
  appName: string;
  channel: string;
  autoUpdateMethod: "background" | "auto" | "none";
  maxVersions: number;
  environment: "Production" | "Staging" | "Development";
  buildStackAndroid: string;
  nodeVersion: string;
  nativeBuildType: "apk_debug" | "apk_release" | "aab_google_play";
  destinations: {
    googlePlay: boolean;
    directApkDownload: boolean;
  };
}

export interface PlatformHealthItem {
  id: PlatformType;
  name: string;
  platformCategory: string;
  iconName: string;
  status: "synced" | "updating" | "pending_sync" | "optimized" | "error";
  lastSyncTime: number;
  version: string;
  details: string;
  capabilities: string[];
  isAvailable: boolean;
  verifiedFilesCount?: number;
  checksum?: string;
}

export interface SystemDiagnostics {
  serverStatus: "online" | "degraded" | "offline";
  serverVersion: string;
  nodeVersion: string;
  uptimeSeconds: number;
  memory: {
    heapUsedMB: number;
    heapTotalMB: number;
    rssMB: number;
  };
  fileIntegrity: {
    totalChecked: number;
    validCount: number;
    files: Array<{
      path: string;
      exists: boolean;
      sizeBytes: number;
      sha256?: string;
    }>;
  };
  storageMetrics?: {
    quotaMB: number;
    usedMB: number;
    percentUsed: number;
  };
}

export interface AppflowDeployReceipt {
  success: boolean;
  deployId: string;
  channel: string;
  version: string;
  timestamp: number;
  filesVerified: number;
  buildHash: string;
  message: string;
}

export interface AppflowBuildReceipt {
  success: boolean;
  buildId: string;
  buildType: "apk_debug" | "apk_release" | "aab_google_play";
  timestamp: number;
  manifestVerified: boolean;
  gradleVerified: boolean;
  outputArtifactName: string;
  buildHash: string;
  message: string;
}

export interface OptimizationResult {
  cachesPurged: number;
  indexedDbCompacted: boolean;
  localStorageCompacted: boolean;
  freedBytes: number;
  latencyMs: number;
  timestamp: number;
  platformsSynced: PlatformType[];
  systemDiagnostics?: SystemDiagnostics;
}

export interface CrossPlatformUpdateState {
  isUpdateAvailable: boolean;
  isUpdating: boolean;
  currentVersion: string;
  newVersion?: string;
  lastOptimizedAt: number;
  platformStatuses: Record<PlatformType, PlatformHealthItem>;
  autoUpdateEnabled: boolean;
  diagnostics?: SystemDiagnostics;
  firebaseSync?: FirebaseSyncInfo;
  webSocketSync?: WebSocketSyncInfo;
}

