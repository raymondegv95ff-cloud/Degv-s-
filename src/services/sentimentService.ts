import { MessageSentimentData } from "../types";

const sentimentCache = new Map<string, MessageSentimentData>();

export const sentimentService = {
  getSentimentForText: async (text: string): Promise<MessageSentimentData> => {
    if (!text || text.trim().length === 0) {
      return {
        sentiment: "neutral",
        emoji: "💬",
        label: "Neutral",
      };
    }

    const cacheKey = text.trim().slice(0, 200);
    if (sentimentCache.has(cacheKey)) {
      return sentimentCache.get(cacheKey)!;
    }

    try {
      const response = await fetch("/api/ai/analyze-sentiment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data: MessageSentimentData = await response.json();
      sentimentCache.set(cacheKey, data);
      return data;
    } catch (e) {
      // Fallback local heuristic
      const fallback = localHeuristicClassifier(text);
      sentimentCache.set(cacheKey, fallback);
      return fallback;
    }
  },
};

function localHeuristicClassifier(text: string): MessageSentimentData {
  const lower = text.toLowerCase();

  if (
    lower.includes("urgente") ||
    lower.includes("emergencia") ||
    lower.includes("inmediato") ||
    lower.includes("asap") ||
    lower.includes("rápido") ||
    lower.includes("rapido") ||
    lower.includes("importante")
  ) {
    return { sentiment: "urgency", emoji: "🚨", label: "Urgencia", confidence: 0.9 };
  }

  if (
    lower.includes("?") ||
    lower.includes("¿") ||
    lower.startsWith("como ") ||
    lower.startsWith("cómo ") ||
    lower.startsWith("cuando ") ||
    lower.startsWith("cuándo ") ||
    lower.includes("tal vez") ||
    lower.includes("duda")
  ) {
    return { sentiment: "doubt", emoji: "🤔", label: "Duda", confidence: 0.9 };
  }

  if (
    lower.includes("gracias") ||
    lower.includes("agradezco") ||
    lower.includes("abrazo") ||
    lower.includes("❤️") ||
    lower.includes("amor")
  ) {
    return { sentiment: "love", emoji: "❤️", label: "Cariño / Gratitud", confidence: 0.9 };
  }

  if (
    lower.includes("propongo") ||
    lower.includes("que te parece") ||
    lower.includes("idea") ||
    lower.includes("💡")
  ) {
    return { sentiment: "idea", emoji: "💡", label: "Idea / Propuesta", confidence: 0.9 };
  }

  if (
    lower.includes("jaja") ||
    lower.includes("genial") ||
    lower.includes("excelente") ||
    lower.includes("super") ||
    lower.includes("perfecto") ||
    lower.includes("🎉") ||
    lower.includes("😊")
  ) {
    return { sentiment: "joy", emoji: "😊", label: "Alegría", confidence: 0.9 };
  }

  if (
    lower.includes("enojado") ||
    lower.includes("molesto") ||
    lower.includes("pésimo") ||
    lower.includes("terrible") ||
    lower.includes("😡")
  ) {
    return { sentiment: "anger", emoji: "😠", label: "Molestia", confidence: 0.9 };
  }

  if (
    lower.includes("triste") ||
    lower.includes("lamento") ||
    lower.includes("pena") ||
    lower.includes("desánimo") ||
    lower.includes("😢")
  ) {
    return { sentiment: "sadness", emoji: "😢", label: "Tristeza", confidence: 0.9 };
  }

  return { sentiment: "neutral", emoji: "💬", label: "Neutral", confidence: 0.8 };
}
