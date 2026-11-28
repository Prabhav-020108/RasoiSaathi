import { GoogleGenerativeAI } from "@google/generative-ai";
import { isConfiguredGeminiKey } from "./utils";
import type { FallbackIntent, ParsedCommand, ParsedEntities } from "./voice-fallback";

const VALID_INTENTS = new Set<FallbackIntent>([
  "tally",
  "add_customer",
  "edit_customer",
  "remove_customer",
  "skip",
  "cancel",
  "pause",
  "resume",
  "extra",
  "diet_change",
  "payment_check",
  "payment_record",
  "payment_remind",
  "menu_broadcast",
  "greeting",
  "unknown",
]);

const LANGUAGE_NAMES: Record<string, string> = {
  hi: "Hindi / Hinglish (friendly conversational Hindi/Hinglish)",
  en: "English (warm Indian English)",
  kn: "Kannada (ಕನ್ನಡ)",
  ta: "Tamil (தமிழ்)",
  te: "Telugu (తెలుగు)",
  mr: "Marathi (मराठी)",
};

export interface GeminiVoiceContext {
  cookName: string;
  cookLang: string;
  defaultPrice: number;
  todayISO: string;
  customers: Array<{
    id: string;
    name: string;
    phone: string | null;
    dietaryPref: string;
    status: string;
    monthlyPrice: number;
  }>;
  tally: {
    activeTiffins: number;
    dietary: {
      regular: number;
      jain: number;
      lessOil: number;
      noOnionGarlic: number;
    };
    skippedCount: number;
    cancelledCount: number;
    pausedCount: number;
    extraCount: number;
    pendingPaymentsTotal: number;
    pendingPaymentsCount: number;
  };
  pendingCustomers: Array<{
    name: string;
    remaining: number;
  }>;
}

export function resolveGeminiKey(overrideKey?: string | null): string | null {
  if (isConfiguredGeminiKey(overrideKey)) {
    return overrideKey!.trim();
  }
  if (isConfiguredGeminiKey(process.env.GEMINI_API_KEY)) {
    return process.env.GEMINI_API_KEY!.trim();
  }
  return null;
}

function stripJsonFences(raw: string): string {
  return raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

function normalizeDietary(raw: unknown): string | undefined {
  if (typeof raw !== "string") return undefined;
  const v = raw.trim().toLowerCase();
  if (!v) return undefined;
  if (v.includes("jain")) return "jain";
  if (v.includes("less") || v.includes("low")) return "less-oil";
  if (v.includes("onion") || v.includes("garlic")) return "no-onion-garlic";
  if (v.includes("regular") || v.includes("normal")) return "regular";
  return undefined;
}

function normalizeDateRef(raw: unknown): "today" | "tomorrow" | undefined {
  if (typeof raw !== "string") return undefined;
  const v = raw.trim().toLowerCase();
  if (v === "tomorrow" || v === "kal") return "tomorrow";
  if (v === "today" || v === "aaj") return "today";
  return undefined;
}

export function parseGeminiStructuredPayload(rawText: string): ParsedCommand {
  const cleaned = stripJsonFences(rawText);
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : cleaned) as Record<string, unknown>;

  const rawIntent = typeof parsed.intent === "string" ? parsed.intent.trim() : "unknown";
  const intent: FallbackIntent = VALID_INTENTS.has(rawIntent as FallbackIntent)
    ? (rawIntent as FallbackIntent)
    : "unknown";

  const rawEntities =
    parsed.entities && typeof parsed.entities === "object"
      ? (parsed.entities as Record<string, unknown>)
      : {};

  const customerNameRaw =
    typeof rawEntities.customer_name === "string"
      ? rawEntities.customer_name
      : typeof rawEntities.customerName === "string"
        ? rawEntities.customerName
        : undefined;

  const extraItemsRaw =
    typeof rawEntities.extra_items === "string"
      ? rawEntities.extra_items
      : typeof rawEntities.extraItems === "string"
        ? rawEntities.extraItems
        : undefined;

  const menuTextRaw =
    typeof rawEntities.menu_text === "string"
      ? rawEntities.menu_text
      : typeof rawEntities.menuText === "string"
        ? rawEntities.menuText
        : undefined;

  const priceNum = Number(rawEntities.price);
  const paymentAmount = Number(rawEntities.payment_amount ?? rawEntities.paymentAmount);
  const daysNum = Number(rawEntities.days);
  const confNum = Number(parsed.confidence);

  const entities: ParsedEntities = {
    ...(customerNameRaw?.trim() ? { customerName: customerNameRaw.trim() } : {}),
    ...(normalizeDietary(rawEntities.dietary_pref ?? rawEntities.dietaryPref)
      ? { dietaryPref: normalizeDietary(rawEntities.dietary_pref ?? rawEntities.dietaryPref) }
      : {}),
    ...(Number.isFinite(priceNum) && priceNum > 0 ? { price: Math.round(priceNum) } : {}),
    ...(Number.isSafeInteger(paymentAmount) && paymentAmount > 0 ? { paymentAmount } : {}),
    ...(typeof rawEntities.delivery_note === "string" ? { deliveryNote: rawEntities.delivery_note.slice(0, 500) } : {}),
    ...(extraItemsRaw?.trim() ? { extraItems: extraItemsRaw.trim() } : {}),
    ...(normalizeDateRef(rawEntities.date) ? { date: normalizeDateRef(rawEntities.date) } : {}),
    ...(Number.isFinite(daysNum) && daysNum > 0 ? { days: Math.round(daysNum) } : {}),
    ...(typeof rawEntities.language === "string" && rawEntities.language.trim()
      ? { language: rawEntities.language.trim().toLowerCase() }
      : {}),
    ...(menuTextRaw?.trim() ? { menuText: menuTextRaw.trim() } : {}),
    ...(rawEntities.permanent === true ? { permanent: true } : {}),
  };

  const responseText =
    typeof parsed.response_text === "string" && parsed.response_text.trim()
      ? parsed.response_text.trim()
      : typeof parsed.responseText === "string" && parsed.responseText.trim()
        ? parsed.responseText.trim()
        : undefined;

  const detectedLanguage =
    typeof parsed.detected_language === "string"
      ? parsed.detected_language.trim().toLowerCase()
      : undefined;

  return {
    intent,
    entities,
    confidence: Number.isFinite(confNum) ? Math.min(1, Math.max(0, confNum)) : 0.9,
    responseText,
    detectedLanguage,
  };
}

async function generateWithFallbackModel(
  apiKey: string,
  prompt: string,
  options: { jsonMode: boolean; temperature: number; maxOutputTokens: number }
): Promise<string> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const primaryModel = process.env.GEMINI_MODEL?.trim() || "gemini-3.1-flash-lite";
  const modelsToTry = Array.from(
    new Set([primaryModel, "gemini-flash-latest", "gemini-2.5-flash-lite"])
  ).slice(0, 2);

  let lastError: unknown;
  const deadline = Date.now() + 5200;
  for (const modelName of modelsToTry) {
    try {
      const model = genAI.getGenerativeModel(
        {
          model: modelName,
          generationConfig: {
            temperature: options.temperature,
            maxOutputTokens: options.maxOutputTokens,
            ...(options.jsonMode ? { responseMimeType: "application/json" } : {}),
          },
        },
        { timeout: Math.min(3200, Math.max(1, deadline - Date.now())) }
      );
      const result = await model.generateContent(prompt);
      return result.response.text();
    } catch (err) {
      lastError = err;
      const msg = (err instanceof Error ? err.message : String(err)).toLowerCase();
      const isAuthError =
        msg.includes("api_key_invalid") ||
        msg.includes("api key not valid") ||
        msg.includes("401") ||
        msg.includes("403");
      if (isAuthError || Date.now() >= deadline) {
        throw err;
      }
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Gemini API request failed");
}

export async function geminiProcess(
  text: string,
  cookLang: string,
  context: GeminiVoiceContext,
  apiKeyOverride?: string | null
): Promise<ParsedCommand> {
  const apiKey = resolveGeminiKey(apiKeyOverride);
  if (!apiKey) {
    throw new Error("GEMINI_NOT_CONFIGURED");
  }

  const targetLanguageDesc = LANGUAGE_NAMES[cookLang] || LANGUAGE_NAMES.hi;

  const prompt = `You are RasoiSaathi, a warm, practical voice business assistant for an Indian home-cook tiffin entrepreneur named ${context.cookName}.
You understand Hindi, Hinglish (Romanized Hindi + English code-switching), English, Kannada, Tamil, Telugu, and Marathi, as well as regional accents and kitchen speech imperfections.

Respond ONLY with a valid JSON object matching this exact schema:
{
  "intent": "tally | add_customer | edit_customer | remove_customer | skip | cancel | pause | resume | extra | diet_change | payment_check | payment_record | payment_remind | menu_broadcast | greeting | unknown",
  "entities": {
    "customer_name": "exact customer name if mentioned, else null",
    "date": "today or tomorrow if applicable, else null",
    "dietary_pref": "regular | jain | less-oil | no-onion-garlic | null",
    "extra_items": "e.g. '2 extra roti' or null",
    "price": null,
    "payment_amount": null,
    "delivery_note": null,
    "days": null,
    "language": "hi | en | kn | ta | te | mr | null",
    "menu_text": "menu text if dictating menu, else null",
    "permanent": false
  },
  "response_text": "Warm, concise spoken response in ${targetLanguageDesc} using the live context numbers when answering queries",
  "confidence": 0.95,
  "detected_language": "hi | en | kn | ta | te | mr"
}

Intent rules:
- "tally": asking how many tiffins/orders today ("Aaj kitne tiffin banane hain?", "How many tiffins today?")
- "add_customer": adding a new subscriber ("Naya customer jodo, naam Vikram, Jain khana, monthly 3000")
- "remove_customer": permanently deleting/removing a customer ("Remove customer Vikram", "Vikram ko delete karo")
- "skip": skipping a meal for today/tomorrow ("Amit aaj skip kardo", "Skip Priya tomorrow")
- "cancel": cancelling today's tiffin or subscription ("Rajesh ka tiffin cancel karo")
- "pause": pausing subscription for N days ("Meena ko 3 din pause kardo")
- "resume": resuming a paused customer ("Meena ko resume kardo")
- "extra": adding extra items for a customer ("Pooja ko 2 extra roti")
- "diet_change": changing customer's dietary preference ("Rajesh ka khana Jain kardo")
- "payment_check": asking who hasn't paid or pending payments ("Kisne payment nahi kiya?")
- "payment_remind": sending payment reminders ("Sabko payment reminder bhejo")
- "payment_record": explicitly recording a receipt. Extract payment_amount for a specific amount, or null for an explicit full monthly payment. Never use for questions or negated payments. Requires a customer name.
- "edit_customer": change a known customer's monthly price or delivery note. Preserve the customer's recorded name in customer_name.
- "menu_broadcast": dictating menu ("Kal ka menu: dal tadka, jeera rice, roti")
- "greeting": hello / namaste

Live kitchen context:
- Today's date: ${context.todayISO}
- Cook's preferred language: ${cookLang}
- Default monthly price: ₹${context.defaultPrice}
- Current tally: ${JSON.stringify(context.tally)}
- Pending payments: ${JSON.stringify(context.pendingCustomers)}
- If the user includes a 4-digit phone suffix for disambiguation (e.g. "Rajesh 7721"), preserve it in "customer_name" (e.g. "Rajesh 7721").
- Customers: ${JSON.stringify(
    context.customers.map((c) => ({
      name: c.name,
      phoneLast4: c.phone ? c.phone.replace(/\D/g, "").slice(-4) : "",
      diet: c.dietaryPref,
      status: c.status,
      price: c.monthlyPrice,
    }))
  )}

Voice input: "${text}"`;

  const raw = await generateWithFallbackModel(apiKey, prompt, {
    jsonMode: true,
    temperature: 0.2,
    maxOutputTokens: 350,
  });

  return parseGeminiStructuredPayload(raw);
}

export async function geminiTranslate(
  text: string,
  fromLang: string,
  toLang: string,
  apiKeyOverride?: string | null
): Promise<{ translated: string; detectedLang?: string }> {
  const apiKey = resolveGeminiKey(apiKeyOverride);
  if (!apiKey) {
    throw new Error("GEMINI_NOT_CONFIGURED");
  }

  const fromLabel = LANGUAGE_NAMES[fromLang] || fromLang;
  const toLabel = LANGUAGE_NAMES[toLang] || toLang;

  const prompt = `Translate this tiffin/kitchen message from ${fromLabel} to ${toLabel}.
Keep food terms natural and clear. Return ONLY JSON: {"translated": "...", "detectedLang": "hi|en|kn|ta|te|mr"}

Text: "${text}"`;

  const raw = await generateWithFallbackModel(apiKey, prompt, {
    jsonMode: true,
    temperature: 0.1,
    maxOutputTokens: 250,
  });

  const cleaned = stripJsonFences(raw);
  const parsed = JSON.parse(cleaned) as { translated?: string; detectedLang?: string };
  return {
    translated: parsed.translated?.trim() || text,
    detectedLang: parsed.detectedLang?.trim(),
  };
}
