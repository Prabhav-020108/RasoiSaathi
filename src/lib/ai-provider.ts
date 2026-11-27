import type { KnownCustomerRef, ParsedCommand } from "./voice-fallback";

export type AITier = "gemini" | "local" | "basic";

export const AI_MODE_STORAGE_KEY = "rasoisaathi_ai_mode";
export const LOCAL_AI_READY_KEY = "rasoisaathi_local_ai_ready";

export function clearLegacyGeminiKey(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem("rasoisaathi_gemini_key");
  } catch {
    // Ignore storage quota / privacy mode errors
  }
}

export function getStoredAIMode(): AITier | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(AI_MODE_STORAGE_KEY);
    if (raw === "gemini" || raw === "local" || raw === "basic") {
      return raw;
    }
    return null;
  } catch {
    return null;
  }
}

export function setStoredAIMode(mode: AITier): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(AI_MODE_STORAGE_KEY, mode);
  } catch {
    // Ignore storage errors
  }
}

export function resolveEffectiveAITier(serverGeminiConfigured: boolean): {
  tier: AITier;
  needsSetupPrompt: boolean;
} {
  if (serverGeminiConfigured) {
    return { tier: "gemini", needsSetupPrompt: false };
  }
  const storedMode = getStoredAIMode();
  if (storedMode === "local") {
    return { tier: "local", needsSetupPrompt: false };
  }
  if (storedMode === "basic") {
    return { tier: "basic", needsSetupPrompt: false };
  }
  return { tier: "basic", needsSetupPrompt: true };
}

export interface VoiceProcessAPIResponse {
  intent: string;
  entities: Record<string, unknown>;
  responseText: string;
  confidence: number;
  tierUsed: AITier;
  detectedLanguage?: string;
  actionPerformed: boolean;
  actionSummary?: string;
  needsDisambiguation?: boolean;
  candidates?: Array<{ id: string; name: string; phoneLast4: string }>;
  tally?: unknown;
  data?: Record<string, unknown>;
  fallbackReason?: string;
}

export async function processVoiceCommand(
  text: string,
  cookLang: string,
  options: {
    tier: AITier;
    customers?: KnownCustomerRef[];
  }
): Promise<VoiceProcessAPIResponse> {
  let localParsed: ParsedCommand | null = null;

  if (options.tier === "local") {
    const { localIntentParse } = await import("./runanywhere");
    localParsed = await localIntentParse(text, cookLang, {
      cookLang,
      customers: options.customers,
    });
  }

  const res = await fetch("/api/voice/process", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text,
      cookLang,
      tierHint: options.tier === "local" && !localParsed ? "basic" : options.tier,
      ...(localParsed ? { localParsed } : {}),
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to process voice command");
  }

  return res.json() as Promise<VoiceProcessAPIResponse>;
}

export async function translateText(
  text: string,
  fromLang: string,
  toLang: string,
  tier: AITier
): Promise<{ translated: string; tierUsed: AITier; notice?: string }> {
  if (tier === "local") {
    const { localTranslate } = await import("./runanywhere");
    const res = await localTranslate(text, fromLang, toLang);
    return {
      translated: res.translated,
      tierUsed: res.error ? "basic" : "local",
      notice: res.error,
    };
  }

  const res = await fetch("/api/translate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text, fromLang, toLang }),
  });

  if (!res.ok) {
    return { translated: text, tierUsed: "basic", notice: "Translation failed" };
  }

  return res.json() as Promise<{ translated: string; tierUsed: AITier; notice?: string }>;
}
