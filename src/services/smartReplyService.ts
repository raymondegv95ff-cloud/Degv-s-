// Smart Reply Engine with Entity Detection (Dates, Times, Locations, Contacts, URLs)
import { Message } from "../types";

export interface DetectedEntity {
  type: "date_time" | "location" | "phone" | "email" | "url";
  rawText: string;
  displayValue: string;
  actionType: "calendar" | "maps" | "call" | "email" | "link";
  actionLabel: string;
  iconName: "Calendar" | "MapPin" | "Phone" | "Mail" | "ExternalLink";
  metadata?: {
    eventTitle?: string;
    eventDate?: Date;
    eventDateISO?: string;
    locationQuery?: string;
    mapsUrl?: string;
    calendarUrl?: string;
    phoneNumber?: string;
    emailAddress?: string;
    targetUrl?: string;
  };
}

export interface SmartReplyAnalysis {
  suggestions: string[];
  entities: DetectedEntity[];
  summary: string;
  hasActionableEntities: boolean;
}

// Common city / place names and keywords in Spanish & English
const LOCATION_KEYWORDS = [
  "café", "cafe", "oficina", "restaurante", "plaza", "parque", "aeropuerto",
  "hotel", "estación", "estacion", "centro comercial", "hospital", "clínica",
  "clinica", "universidad", "colegio", "calle", "avenida", "av.", "av ", "carrera",
  "playa", "gimnasio", "cine", "teatro", "bar", "pizzería", "pizzeria", "estadio",
  "madrid", "barcelona", "valencia", "sevilla", "caracas", "bogotá", "bogota",
  "medellín", "medellin", "buenos aires", "santiago", "lima", "ciudad de méxico",
  "cdmx", "miami", "nueva york", "new york", "orlando", "paris", "londres",
  "sala de juntas", "sala 1", "sala 2", "casa", "mi casa", "tu casa", "lobby"
];

// Months in Spanish
const MONTHS_MAP: Record<string, number> = {
  enero: 0, febrero: 1, marzo: 2, abril: 3, mayo: 4, junio: 5,
  julio: 6, agosto: 7, septiembre: 8, octubre: 9, noviembre: 10, diciembre: 11,
  january: 0, february: 1, march: 2, april: 3, may: 4, june: 5,
  july: 6, august: 7, september: 8, october: 9, november: 10, december: 11
};

export class SmartReplyService {
  /**
   * Analyzes the last message in a conversation to extract smart replies and actionable entities
   */
  public static analyzeMessage(lastMessage: Message | null | undefined, chatName: string = "Chat"): SmartReplyAnalysis {
    if (!lastMessage || !lastMessage.content) {
      return {
        suggestions: ["¡Hola! 👋", "¿Cómo estás?", "¡Genial! 🚀"],
        entities: [],
        summary: "Sin mensajes previos",
        hasActionableEntities: false,
      };
    }

    const content = lastMessage.content.trim();
    const lower = content.toLowerCase();

    const entities: DetectedEntity[] = [];

    // 1. Detect Dates & Times
    const dateEntity = this.extractDateTimeEntity(content, lower, chatName);
    if (dateEntity) {
      entities.push(dateEntity);
    }

    // 2. Detect Locations & Places
    const locationEntity = this.extractLocationEntity(content, lower);
    if (locationEntity) {
      entities.push(locationEntity);
    }

    // 3. Detect Phone numbers
    const phoneEntity = this.extractPhoneEntity(content);
    if (phoneEntity) {
      entities.push(phoneEntity);
    }

    // 4. Detect Emails
    const emailEntity = this.extractEmailEntity(content);
    if (emailEntity) {
      entities.push(emailEntity);
    }

    // 5. Detect URLs
    const urlEntity = this.extractUrlEntity(content);
    if (urlEntity) {
      entities.push(urlEntity);
    }

    // Generate smart replies based on detected entities & text tone
    const suggestions = this.generateSmartSuggestions(content, lower, entities);

    return {
      suggestions,
      entities,
      summary: entities.length > 0
        ? `${entities.length} entidad(es) detectada(s)`
        : "Sin entidades detectadas",
      hasActionableEntities: entities.length > 0,
    };
  }

  /**
   * Extract date/time information and prepare Google Calendar and .ICS action metadata
   */
  private static extractDateTimeEntity(text: string, lower: string, chatName: string): DetectedEntity | null {
    // Patterns for time: e.g. "a las 4pm", "a las 15:30", "a las 3:00 pm", "a las 10:00", "10 am", "4:00"
    const timeMatch = lower.match(/(?:a\s+las\s+|a\s+la\s+|@\s*)?(\b\d{1,2}(?::\d{2})?\s*(?:am|pm|hrs|h)?\b)/i);
    
    // Patterns for relative or specific days
    const isToday = lower.includes("hoy");
    const isTomorrow = lower.includes("mañana") || lower.includes("manana");
    const isDayAfter = lower.includes("pasado mañana") || lower.includes("pasado manana");
    const isWeekend = lower.includes("fin de semana") || lower.includes("finde");
    
    const dayOfWeekMatch = lower.match(/\b(el\s+)?(lunes|martes|miércoles|miercoles|jueves|viernes|sábado|sabado|domingo)\b/i);
    const dateNumMatch = lower.match(/\b(\d{1,2})\s+de\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\b/i);
    const meetingKeywords = ["reunión", "reunion", "cita", "junta", "videollamada", "llamada", "almuerzo", "cena", "evento", "cumpleaños", "cumpleanos", "partido", "vuelo", "entrevista"];
    const hasMeetingIntent = meetingKeywords.some(k => lower.includes(k));

    if (!isToday && !isTomorrow && !isDayAfter && !isWeekend && !dayOfWeekMatch && !dateNumMatch && !hasMeetingIntent && !timeMatch) {
      return null;
    }

    // Construct event date
    const now = new Date();
    const eventDate = new Date();

    if (isTomorrow) {
      eventDate.setDate(now.getDate() + 1);
    } else if (isDayAfter) {
      eventDate.setDate(now.getDate() + 2);
    } else if (dateNumMatch) {
      const day = parseInt(dateNumMatch[1], 10);
      const monthStr = dateNumMatch[2].toLowerCase();
      const month = MONTHS_MAP[monthStr] ?? now.getMonth();
      eventDate.setMonth(month);
      eventDate.setDate(day);
      if (eventDate < now) {
        eventDate.setFullYear(now.getFullYear() + 1);
      }
    } else if (dayOfWeekMatch) {
      const daysMap: Record<string, number> = {
        domingo: 0, lunes: 1, martes: 2, miercoles: 3, miércoles: 3,
        jueves: 4, viernes: 5, sabado: 6, sábado: 6
      };
      const targetDay = daysMap[dayOfWeekMatch[2].toLowerCase()];
      if (targetDay !== undefined) {
        const currentDay = now.getDay();
        let diff = targetDay - currentDay;
        if (diff <= 0) diff += 7;
        eventDate.setDate(now.getDate() + diff);
      }
    }

    // Parse hour if present
    let displayTime = "Hora por coordinar";
    if (timeMatch) {
      const timeStr = timeMatch[1].toLowerCase().replace(/\s+/g, "");
      let hours = 10;
      let minutes = 0;

      if (timeStr.includes("pm") || timeStr.includes("am")) {
        const isPm = timeStr.includes("pm");
        const clean = timeStr.replace(/(am|pm)/g, "");
        const parts = clean.split(":");
        hours = parseInt(parts[0], 10);
        if (parts[1]) minutes = parseInt(parts[1], 10);
        if (isPm && hours < 12) hours += 12;
        if (!isPm && hours === 12) hours = 0;
      } else if (timeStr.includes(":")) {
        const parts = timeStr.split(":");
        hours = parseInt(parts[0], 10);
        minutes = parseInt(parts[1], 10);
      } else {
        const parsed = parseInt(timeStr, 10);
        if (!isNaN(parsed) && parsed >= 1 && parsed <= 24) {
          hours = parsed;
        }
      }

      eventDate.setHours(hours, minutes, 0, 0);
      displayTime = eventDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } else {
      eventDate.setHours(10, 0, 0, 0);
    }

    // Determine event title
    let eventTitle = `Reunión con ${chatName}`;
    for (const kw of meetingKeywords) {
      if (lower.includes(kw)) {
        eventTitle = `${kw.charAt(0).toUpperCase() + kw.slice(1)} - ${chatName}`;
        break;
      }
    }

    const endDate = new Date(eventDate.getTime() + 60 * 60 * 1000); // 1 hour duration

    // Format dates for Google Calendar URL (YYYYMMDDTHHMMSSZ)
    const formatGCalDate = (d: Date) => d.toISOString().replace(/-|:|\.\d+/g, "");
    const gCalDates = `${formatGCalDate(eventDate)}/${formatGCalDate(endDate)}`;
    const calendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(eventTitle)}&dates=${gCalDates}&details=${encodeURIComponent(`Mensaje de chat:\n"${text}"`)}`;

    const dateFormatted = eventDate.toLocaleDateString("es-ES", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });

    return {
      type: "date_time",
      rawText: text,
      displayValue: `${dateFormatted} ${displayTime !== "Hora por coordinar" ? `• ${displayTime}` : ""}`,
      actionType: "calendar",
      actionLabel: "Añadir al calendario",
      iconName: "Calendar",
      metadata: {
        eventTitle,
        eventDate,
        eventDateISO: eventDate.toISOString(),
        calendarUrl,
      },
    };
  }

  /**
   * Extract location and generate Google Maps search URL
   */
  private static extractLocationEntity(text: string, lower: string): DetectedEntity | null {
    let detectedPlace = "";

    // Pattern 1: "en [Lugar]" or "en el/la [Lugar]"
    const enMatch = text.match(/\b(?:nos vemos en|quedamos en|estoy en|voy a|llegando a|en el|en la|en)\s+([A-ZÁÉÍÓÚÑa-záéíóúñ0-9\s.,#-]{3,40})/i);
    if (enMatch && enMatch[1]) {
      const candidate = enMatch[1].trim().split(/[?.!\n]/)[0].trim();
      if (candidate.length >= 3 && !candidate.toLowerCase().startsWith("un momento") && !candidate.toLowerCase().startsWith("breve")) {
        detectedPlace = candidate;
      }
    }

    // Pattern 2: Keyword matches
    if (!detectedPlace) {
      for (const kw of LOCATION_KEYWORDS) {
        if (lower.includes(kw)) {
          // Extract sentence part around the keyword
          const idx = lower.indexOf(kw);
          const snippet = text.substring(Math.max(0, idx - 10), Math.min(text.length, idx + kw.length + 25)).trim();
          detectedPlace = snippet.replace(/[?.!]/g, "").trim();
          break;
        }
      }
    }

    // Pattern 3: Explicit address or street
    if (!detectedPlace) {
      const addressMatch = text.match(/\b(calle|avenida|av\.|carrera|plaza|parque)\s+[\w\d\s#-]{3,35}/i);
      if (addressMatch) {
        detectedPlace = addressMatch[0].trim();
      }
    }

    if (!detectedPlace) return null;

    // Clean detected place string
    const cleanPlace = detectedPlace.replace(/^(en\s+|en el\s+|en la\s+|a\s+|al\s+)/i, "").trim();
    if (cleanPlace.length < 3) return null;

    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(cleanPlace)}`;

    return {
      type: "location",
      rawText: text,
      displayValue: cleanPlace,
      actionType: "maps",
      actionLabel: "Abrir en mapas",
      iconName: "MapPin",
      metadata: {
        locationQuery: cleanPlace,
        mapsUrl,
      },
    };
  }

  /**
   * Extract phone number
   */
  private static extractPhoneEntity(text: string): DetectedEntity | null {
    const phoneMatch = text.match(/(?:\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}/);
    if (!phoneMatch) return null;

    const rawPhone = phoneMatch[0].trim();
    if (rawPhone.length < 7) return null;

    return {
      type: "phone",
      rawText: text,
      displayValue: rawPhone,
      actionType: "call",
      actionLabel: "Llamar / Contacto",
      iconName: "Phone",
      metadata: {
        phoneNumber: rawPhone,
      },
    };
  }

  /**
   * Extract email address
   */
  private static extractEmailEntity(text: string): DetectedEntity | null {
    const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    if (!emailMatch) return null;

    const email = emailMatch[0].trim();
    return {
      type: "email",
      rawText: text,
      displayValue: email,
      actionType: "email",
      actionLabel: "Enviar correo",
      iconName: "Mail",
      metadata: {
        emailAddress: email,
      },
    };
  }

  /**
   * Extract web URL
   */
  private static extractUrlEntity(text: string): DetectedEntity | null {
    const urlMatch = text.match(/https?:\/\/[^\s]+/i);
    if (!urlMatch) return null;

    const url = urlMatch[0].trim();
    return {
      type: "url",
      rawText: text,
      displayValue: url.replace(/^https?:\/\/(www\.)?/, "").substring(0, 25) + "...",
      actionType: "link",
      actionLabel: "Abrir enlace",
      iconName: "ExternalLink",
      metadata: {
        targetUrl: url,
      },
    };
  }

  /**
   * Smart contextual reply generation based on content and detected entities
   */
  private static generateSmartSuggestions(text: string, lower: string, entities: DetectedEntity[]): string[] {
    const suggestions: string[] = [];

    const hasDate = entities.some(e => e.type === "date_time");
    const hasLocation = entities.some(e => e.type === "location");

    // 1. If date/meeting detected
    if (hasDate) {
      suggestions.push("¡Anotado en mi calendario! 📅");
      suggestions.push("Confirmado, allí estaré 👍");
      suggestions.push("¿A qué hora exactamente?");
      return suggestions;
    }

    // 2. If location detected
    if (hasLocation) {
      suggestions.push("¡Voy en camino! 📍");
      suggestions.push("Perfecto, nos vemos allí 🚗");
      suggestions.push("Envíame la ubicación en tiempo real");
      return suggestions;
    }

    // 3. Question detected (starts with ¿ or contains question marks)
    if (text.includes("?") || text.includes("¿") || lower.startsWith("puedes") || lower.startsWith("tienes") || lower.startsWith("sabes")) {
      if (lower.includes("dónde") || lower.includes("donde")) {
        return ["Estoy cerca 📍", "En camino", "En la oficina"];
      }
      if (lower.includes("cuándo") || lower.includes("cuando") || lower.includes("hora")) {
        return ["En unos minutos ⏱️", "A las 4:00 PM", "Mañana temprano"];
      }
      if (lower.includes("cómo") || lower.includes("como")) {
        return ["Todo bien por acá 👍", "Excelente", "Te explico en un momento"];
      }
      return ["Sí, claro que sí 👍", "No, por ahora no", "Déjame revisarlo y te aviso"];
    }

    // 4. Greetings
    if (lower.includes("hola") || lower.includes("buenos días") || lower.includes("buenas tardes") || lower.includes("buenas noches") || lower.includes("saludos")) {
      return ["¡Hola! ¿Cómo estás? 👋", "¡Hola! Todo excelente por acá", "¡Buenas! Un gusto saludarte"];
    }

    // 5. Gratitude
    if (lower.includes("gracias") || lower.includes("agradecido") || lower.includes("thanks") || lower.includes("muchas gracias")) {
      return ["¡Con mucho gusto! 😊", "¡Un placer siempre!", "A la orden cuando necesites 👍"];
    }

    // 6. Confirmations / Okays
    if (lower.includes("listo") || lower.includes("ok") || lower.includes("vale") || lower.includes("perfecto") || lower.includes("entendido")) {
      return ["¡Genial! 🚀", "Quedamos así 👍", "Hablamos luego"];
    }

    // 7. Farewell
    if (lower.includes("adiós") || lower.includes("chao") || lower.includes("nos vemos") || lower.includes("hasta luego")) {
      return ["¡Hasta luego! 👋", "¡Que tengas buen día!", "¡Nos vemos pronto!"];
    }

    // Default high-quality replies
    return ["¡Excelente! 👍", "Entendido perfectamente", "Déjame revisarlo y te respondo"];
  }

  /**
   * Helper to trigger downloading an .ICS calendar file for cross-platform calendar integration
   */
  public static downloadIcsFile(eventTitle: string, startDate: Date, durationMinutes: number = 60, description: string = "", location: string = "") {
    const endDate = new Date(startDate.getTime() + durationMinutes * 60 * 1000);

    const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
    const formatIcsDate = (d: Date) => {
      return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
    };

    const icsContent = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Degvs Messenger//Smart Calendar Engine//ES",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      "BEGIN:VEVENT",
      `UID:${Date.now()}_degvs@messenger.app`,
      `DTSTAMP:${formatIcsDate(new Date())}`,
      `DTSTART:${formatIcsDate(startDate)}`,
      `DTEND:${formatIcsDate(endDate)}`,
      `SUMMARY:${eventTitle}`,
      `DESCRIPTION:${description.replace(/\n/g, "\\n")}`,
      `LOCATION:${location}`,
      "STATUS:CONFIRMED",
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");

    const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${eventTitle.replace(/[^a-zA-Z0-9_-]/g, "_")}.ics`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}
