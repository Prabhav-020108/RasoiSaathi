import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
export { getTodayUTC, getCurrentMonthKey } from "./kitchen-date";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatINR(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatReadableDate(date: Date = new Date(), lang: string = "en"): string {
  const localeMap: Record<string, string> = {
    hi: "hi-IN",
    en: "en-IN",
    kn: "kn-IN",
    ta: "ta-IN",
    te: "te-IN",
    mr: "mr-IN",
  };
  try {
    return new Intl.DateTimeFormat(localeMap[lang] ?? "en-IN", {
      timeZone: "Asia/Kolkata",
      weekday: "long",
      day: "numeric",
      month: "short",
    }).format(date);
  } catch {
    return date.toDateString();
  }
}

export const SUPPORTED_LANGUAGES = [
  { code: "hi", name: "Hindi", nativeName: "हिन्दी" },
  { code: "en", name: "English", nativeName: "English" },
  { code: "kn", name: "Kannada", nativeName: "ಕನ್ನಡ" },
  { code: "ta", name: "Tamil", nativeName: "தமிழ்" },
  { code: "te", name: "Telugu", nativeName: "తెలుగు" },
  { code: "mr", name: "Marathi", nativeName: "मराठी" },
] as const;

export const DIETARY_OPTIONS = [
  { value: "regular", label: "Regular" },
  { value: "jain", label: "Jain" },
  { value: "less-oil", label: "Less-oil" },
  { value: "no-onion-garlic", label: "No-onion-garlic" },
] as const;

export function getLanguageLabel(code: string): string {
  const found = SUPPORTED_LANGUAGES.find((l) => l.code === code);
  return found ? `${found.nativeName} (${found.name})` : code.toUpperCase();
}

export function getDietaryLabel(pref: string): string {
  const found = DIETARY_OPTIONS.find((d) => d.value === pref);
  return found ? found.label : pref;
}

export function isConfiguredGeminiKey(raw?: string | null): boolean {
  const value = raw?.trim();
  if (!value) return false;
  const normalized = value.replace(/^['"]|['"]$/g, "").trim().toLowerCase();
  if (!normalized) return false;
  if (
    normalized === "your_key_here" ||
    normalized === "your_gemini_api_key_here" ||
    normalized === "your-api-key" ||
    normalized === "placeholder" ||
    normalized === "changeme" ||
    normalized.startsWith("your_")
  ) {
    return false;
  }
  return true;
}
