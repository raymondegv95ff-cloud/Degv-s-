import { Room, UserProfile, Message } from "../types";

export const aiAssistantUser: UserProfile = {
  id: "usr_ai_assistant",
  username: "degvs_ai",
  firstName: "Degv's",
  lastName: "AI",
  phone: "+0000000000",
  countryCode: "+0",
  avatarUrl: "/icon-512.png",
  bio: "Asistente Oficial con Inteligencia Artificial Gemini 3.6 Flash ✨",
  status: "online",
  isAi: true,
};

export const mockUsersList: UserProfile[] = [
  aiAssistantUser,
];

export const createDefaultRoomsForUser = (user?: UserProfile | null): Room[] => {
  const userName = user?.firstName || user?.username || "Usuario";
  return [
    {
      id: "room_ai_assistant",
      name: "Degv's AI (Asistente)",
      isAiChat: true,
      avatarUrl: aiAssistantUser.avatarUrl,
      participants: [aiAssistantUser, ...(user ? [user] : [])],
      lastMessage: `¡Hola ${userName}! Soy Degv's AI. ¿En qué te puedo ayudar hoy? Escribe o prueba /imagine para imágenes ✨`,
      lastMessageTime: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      unreadCount: 0,
      createdAt: new Date().toISOString(),
    },
  ];
};

export const createDefaultMessagesForUser = (user?: UserProfile | null): Record<string, Message[]> => {
  const userName = user?.firstName || user?.username || "Usuario";
  return {
    room_ai_assistant: [
      {
        id: "msg_ai_welcome",
        roomId: "room_ai_assistant",
        senderId: "usr_ai_assistant",
        senderName: "Degv's AI",
        senderAvatar: aiAssistantUser.avatarUrl,
        content: `¡Bienvenido a Degv's Messenger, ${userName}! Soy tu Asistente IA privado potenciado con Gemini. Puedes consultarme dudas, pedirme traducciones, generar imágenes con el comando /imagine o transcribir notas de voz. Tu panel es 100% privado e individual.`,
        type: "text",
        createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        isRead: true,
      },
    ],
  };
};

export const initialMockRooms: Room[] = createDefaultRoomsForUser();
export const initialMockMessages: Record<string, Message[]> = createDefaultMessagesForUser();

