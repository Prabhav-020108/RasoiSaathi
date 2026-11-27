import { geminiTranslate, resolveGeminiKey } from "./gemini";

export const JAIN_NOTE_DEFAULT = "Jain version: without onion-garlic, with extra paneer";

/**
 * Translates a tiffin menu into each target customer language using Gemini when configured,
 * or falls back cleanly with an original-text suffix when no API key is available.
 */
export async function buildMenuTranslations(
  menuText: string,
  cookLang: string,
  targetLanguages: string[],
  apiKeyOverride?: string | null
): Promise<Record<string, string>> {
  const uniqueLangs = Array.from(new Set([cookLang, ...targetLanguages].filter(Boolean)));
  const apiKey = resolveGeminiKey(apiKeyOverride);
  const translations: Record<string, string> = {};

  await Promise.all(
    uniqueLangs.map(async (lang) => {
      if (lang === cookLang) {
        translations[lang] = menuText;
        return;
      }

      if (!apiKey) {
        translations[lang] = `${menuText} (Original - translate with Gemini API)`;
        return;
      }

      try {
        const res = await geminiTranslate(menuText, cookLang, lang, apiKey);
        translations[lang] = res.translated || menuText;
      } catch {
        translations[lang] = `${menuText} (Original - translate with Gemini API)`;
      }
    })
  );

  return translations;
}

/**
 * Safely parses a serialized translations JSON string into a language->text map.
 */
export function parseTranslationsJson(raw: string): Record<string, string> {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, string>;
    }
    return {};
  } catch {
    return {};
  }
}
