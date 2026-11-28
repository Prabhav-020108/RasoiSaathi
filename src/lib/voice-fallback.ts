export type FallbackIntent =
  | "tally"
  | "add_customer"
  | "edit_customer"
  | "remove_customer"
  | "skip"
  | "cancel"
  | "pause"
  | "resume"
  | "extra"
  | "diet_change"
  | "payment_check"
  | "payment_record"
  | "payment_remind"
  | "menu_broadcast"
  | "greeting"
  | "unknown";

export interface ParsedEntities {
  customerName?: string;
  dietaryPref?: string;
  price?: number;
  paymentAmount?: number;
  deliveryNote?: string;
  extraItems?: string;
  date?: "today" | "tomorrow";
  days?: number;
  language?: string;
  menuText?: string;
  appendMenu?: boolean;
  permanent?: boolean;
}

export interface ParsedCommand {
  intent: FallbackIntent;
  entities: ParsedEntities;
  confidence: number;
  responseText?: string;
  detectedLanguage?: string;
}

export interface KnownCustomerRef {
  id: string;
  name: string;
  phone?: string | null;
}

const DIETARY_KEYWORDS: Array<{ pattern: RegExp; value: string }> = [
  { pattern: /\b(jain|जैन)\b/i, value: "jain" },
  { pattern: /\b(less[-\s]?oil|low[-\s]?oil|kam\s+tel|कम\s+तेल)\b/i, value: "less-oil" },
  {
    pattern: /\b(no[-\s]?onion[-\s]?garlic|no[-\s]?onion|without\s+onion|bina\s+pya[az]|बिना\s+प्याज)\b/i,
    value: "no-onion-garlic",
  },
  { pattern: /\b(regular|normal|सादा)\b/i, value: "regular" },
];

const LANGUAGE_KEYWORDS: Array<{ pattern: RegExp; code: string }> = [
  { pattern: /\b(hindi|हिन्दी|हिंदी)\b/i, code: "hi" },
  { pattern: /\b(english|अंग्रेजी)\b/i, code: "en" },
  { pattern: /\b(kannada|ಕನ್ನಡ)\b/i, code: "kn" },
  { pattern: /\b(tamil|தமிழ்)\b/i, code: "ta" },
  { pattern: /\b(telugu|తెలుగు)\b/i, code: "te" },
  { pattern: /\b(marathi|मराठी)\b/i, code: "mr" },
];

export function extractDietaryPref(text: string): string | undefined {
  for (const item of DIETARY_KEYWORDS) {
    if (item.pattern.test(text)) {
      return item.value;
    }
  }
  return undefined;
}

export function extractLanguageCode(text: string): string | undefined {
  for (const item of LANGUAGE_KEYWORDS) {
    if (item.pattern.test(text)) {
      return item.code;
    }
  }
  return undefined;
}

export function extractPrice(text: string): number | undefined {
  // Prefer explicit currency/monthly patterns first
  const currencyMatch = text.match(
    /(?:₹|rs\.?|inr|monthly|price|rate|charge|mahine|mahina)\s*[:=-]?\s*(\d{3,5})/i
  );
  if (currencyMatch) {
    const n = Number(currencyMatch[1]);
    if (Number.isFinite(n) && n >= 100 && n <= 50000) return n;
  }

  // Fallback: standalone 3-5 digit number likely representing monthly price (>= 500)
  const numMatches = text.match(/\b(\d{3,5})\b/g);
  if (numMatches) {
    for (const raw of numMatches) {
      const n = Number(raw);
      if (n >= 500 && n <= 50000) return n;
    }
  }
  return undefined;
}

export function extractDays(text: string): number | undefined {
  const m = text.match(/\b(\d{1,2})\s*(?:din|days?|day|दिन)\b/i);
  if (m) {
    const d = Number(m[1]);
    if (d >= 1 && d <= 60) return d;
  }
  return undefined;
}

export function extractDateRef(text: string): "today" | "tomorrow" {
  if (/\b(kal|tomorrow|next\s+day)\b|कल|ನಾಳೆ|நாளை|రేపు|उद्या/i.test(text)) {
    return "tomorrow";
  }
  return "today";
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function matchCustomerNameFromText(
  text: string,
  knownCustomers: KnownCustomerRef[] = []
): string | undefined {
  const lower = text.toLowerCase();

  // 1. Exact full name match (longest first)
  const sorted = [...knownCustomers].sort((a, b) => b.name.length - a.name.length);
  for (const c of sorted) {
    const fullPattern = new RegExp(`\\b${escapeRegex(c.name.toLowerCase())}\\b`, "i");
    if (fullPattern.test(lower)) {
      return c.name;
    }
  }

  // 2. First name match (only unambiguous or return first token so caller can disambiguate)
  const firstNameMatches: string[] = [];
  for (const c of sorted) {
    const first = c.name.trim().split(/\s+/)[0];
    if (first && first.length >= 2) {
      const firstPattern = new RegExp(`\\b${escapeRegex(first.toLowerCase())}\\b`, "i");
      if (firstPattern.test(lower)) {
        firstNameMatches.push(first);
      }
    }
  }
  if (firstNameMatches.length > 0) {
    return firstNameMatches[0];
  }

  // 3. Explicit "naam <Name>" or "name <Name>"
  const naamMatch = text.match(
    /(?:naam|name|customer|नाम)\s+(?:hai\s+|is\s+)?([A-Za-z][A-Za-z\s]{1,28}?)(?=\s*(?:,|jain|regular|less|no[-\s]?onion|monthly|price|₹|rs\b|\d|ko\b|ka\b|ki\b|ke\b|jodo|add|remove|delete|pause|skip|cancel|$))/i
  );
  if (naamMatch?.[1]) {
    const candidate = naamMatch[1].trim();
    const stopWords = new Set([
      "jodo",
      "add",
      "naya",
      "new",
      "customer",
      "remove",
      "delete",
      "hatao",
      "hai",
      "ko",
      "ka",
    ]);
    if (candidate && !stopWords.has(candidate.toLowerCase())) {
      return candidate;
    }
  }

  // 4. "<Name> ko/ka/ki/ke ..." pattern for commands like "Vikram ko delete karo"
  const postPosMatch = text.match(
    /\b([A-Za-z][a-zA-Z]+(?:\s+[A-Za-z][a-zA-Z]+)?)\s+(?:ko|ka|ki|ke|ne)\b/i
  );
  if (postPosMatch?.[1]) {
    const candidate = postPosMatch[1].trim();
    if (!/^(aaj|kal|tiffin|naya|new|customer|payment|koi|kisne|sab|sabhi|kitne|kitna|din|days?)$/i.test(candidate)) {
      return candidate;
    }
  }

  return undefined;
}

function extractNewCustomerName(text: string): string | undefined {
  // Pattern: "naam Vikram Singh" / "name is Vikram"
  const explicitNaam = text.match(
    /(?:naam|name|नाम)\s*(?:hai|is|:)?\s+([A-Za-z]+(?:\s+[A-Za-z]+){0,2}?)(?=\s*(?:,|jain|regular|less|no[-\s]?onion|monthly|price|₹|rs\b|hindi|english|kannada|tamil|telugu|marathi|\d|jodo|add|$))/i
  );
  if (explicitNaam?.[1]) {
    return explicitNaam[1].trim();
  }

  // Pattern: "add customer Vikram Singh" / "naya customer Vikram jodo"
  const afterKeyword = text.match(
    /(?:add\s+customer|new\s+customer|naya\s+customer|customer\s+add|customer\s+jodo)\s+([A-Za-z]+(?:\s+[A-Za-z]+){0,2}?)(?=\s*(?:,|jain|regular|less|no[-\s]?onion|monthly|price|₹|rs\b|hindi|english|kannada|\d|jodo|karo|$))/i
  );
  if (afterKeyword?.[1]) {
    const cleaned = afterKeyword[1].trim();
    if (!/^(naam|name|ko|ka)$/i.test(cleaned)) {
      return cleaned;
    }
  }

  // Pattern: "Vikram ko customer jodo" / "Vikram ko add karo"
  const beforeAdd = text.match(
    /^([A-Za-z]+(?:\s+[A-Za-z]+)?)\s+(?:ko\s+)?(?:add|jodo|naya\s+customer)/i
  );
  if (beforeAdd?.[1]) {
    const cleaned = beforeAdd[1].trim();
    if (!/^(naya|new|add|customer)$/i.test(cleaned)) {
      return cleaned;
    }
  }

  return undefined;
}

function extractExtraItems(text: string): string {
  const m = text.match(
    /(\d+\s*(?:extra|zyada|jyada)?\s*(?:roti|rotis|phulka|phulkas|chawal|rice|dal|sabji|tiffin|paratha|chapati))/i
  );
  if (m?.[1]) return m[1].trim();
  const extraOnly = text.match(/extra\s+([A-Za-z0-9\s]{2,25})/i);
  if (extraOnly?.[1]) return `extra ${extraOnly[1].trim()}`;
  return text.trim();
}

export function keywordProcess(
  text: string,
  knownCustomers: KnownCustomerRef[] = []
): ParsedCommand {
  const trimmed = text.trim();
  if (!trimmed) {
    return { intent: "unknown", entities: {}, confidence: 0 };
  }

  const lower = trimmed.toLowerCase();
  const matchedName = matchCustomerNameFromText(trimmed, knownCustomers);
  const dietaryPref = extractDietaryPref(trimmed);
  const price = extractPrice(trimmed);
  const days = extractDays(trimmed);
  const date = extractDateRef(trimmed);
  const language = extractLanguageCode(trimmed);
  if (matchedName && /\b(delivery note|update price|change price)\b/i.test(lower)) {
    const note = trimmed.match(/delivery note\s*(?::|to)\s*(.+)/i)?.[1];
    return { intent: "edit_customer", entities: {
      customerName: matchedName, price, deliveryNote: note,
    }, confidence: 0.9 };
  }

  // A dictated menu may mention "extra", "Jain", or a customer's name.
  // An explicit menu command takes precedence over individual order changes.
  if (/\bmenu\b|मेनू|मेनु|ಮೆನು|மெனு|మెనూ/i.test(lower) &&
    !/^(read|what|show|when|who)\b|[?？]$/i.test(lower)) {
    return {
      intent: "menu_broadcast",
      entities: { menuText: trimmed.replace(/^.*?[:：]\s*/, "") || trimmed },
      confidence: 0.82,
    };
  }

  // 1. Morning tally check
  if (
    lower.includes("kitne tiffin") ||
    lower.includes("kitna tiffin") ||
    /\bkitne\s+.*\b(tiffin|khane)\b/i.test(lower) ||
    lower.includes("how many") ||
    /कितने.*(?:टिफिन|डबे)|ಎಷ್ಟು.*(?:ಟಿಫಿನ್|ಊಟ)|எத்தனை.*(?:டிபன்|உணவு)|ఎన్ని.*(?:టిఫిన్|భోజన)|किती.*(?:डबे|टिफिन)|who.*extra/i.test(lower) ||
    lower.includes("tally") ||
    lower.includes("aaj ka order") ||
    lower.includes("total tiffin") ||
    lower.includes("kitne khane") ||
    lower.includes("कितने टिफिन") ||
    lower.includes("ಎಷ್ಟು ಟಿಫಿನ್")
  ) {
    return { intent: "tally", entities: { date }, confidence: 0.8 };
  }

  // 2. Remove / delete customer
  if (
    lower.includes("remove customer") ||
    lower.includes("delete customer") ||
    lower.includes("customer hatao") ||
    lower.includes("customer delete") ||
    lower.includes("customer remove") ||
    ((lower.includes("remove") || lower.includes("delete") || lower.includes("hatao") || lower.includes("hata do")) &&
      (matchedName !== undefined || lower.includes("customer")))
  ) {
    return {
      intent: "remove_customer",
      entities: { customerName: matchedName },
      confidence: 0.78,
    };
  }

  // 3. Add customer
  if (
    lower.includes("naya customer") ||
    lower.includes("new customer") ||
    lower.includes("jodo") ||
    lower.includes("add customer") ||
    lower.includes("customer add") ||
    (lower.includes("add") && lower.includes("naam"))
  ) {
    const newName = extractNewCustomerName(trimmed) ?? matchedName;
    return {
      intent: "add_customer",
      entities: {
        customerName: newName,
        dietaryPref: dietaryPref ?? "regular",
        price,
        language,
      },
      confidence: 0.8,
    };
  }

  // 4. Payment check / remind
  if (
    lower.includes("payment") ||
    lower.includes("paisa") ||
    lower.includes("paise") ||
    lower.includes("nahi diya") ||
    lower.includes("pending") ||
    lower.includes("baaki") ||
    lower.includes("unpaid") ||
    lower.includes("hasn't paid") ||
    lower.includes("not paid") ||
    lower.includes("ಬಾಕಿ") ||
    lower.includes("ಪಾವತಿ") ||
    /भुगतान|பாக்கி|బాకీ|थकबाकी/.test(lower) ||
    /\bmark\b.*\bpaid\b/i.test(lower)
  ) {
    if (/\b(mark\b.*\bpaid|received|payment\s+(?:aa\s+gaya|mil\s+gaya|aaya)|paid\s+(?:mark|karo|kar\s*do))\b/i.test(lower) &&
        !/[?]|\b(not|nahi|nahin|hasn't|haven't|unpaid|who|has|have|did|kya|kisne)\b/i.test(lower)) {
      const withoutPhoneSuffix = lower.replace(/\b\d{4}\b/g, (digits) =>
        knownCustomers.some((c) => c.phone?.replace(/\D/g, "").endsWith(digits)) ? "" : digits
      );
      if (/\b(partial|part|advance)\b|(?:₹|rs\.?|inr)\s*\d|\b\d{3,5}\b/i.test(withoutPhoneSuffix)) {
        return { intent: "unknown", entities: {}, confidence: 0.4 };
      }
      return { intent: "payment_record", entities: { customerName: matchedName }, confidence: 0.82 };
    }
    if (lower.includes("remind") || lower.includes("bhejo") || lower.includes("yaad")) {
      return {
        intent: "payment_remind",
        entities: { customerName: matchedName },
        confidence: 0.78,
      };
    }
    return {
      intent: "payment_check",
      entities: { customerName: matchedName },
      confidence: 0.82,
    };
  }

  // 5. Extra items (e.g., "Pooja ko 2 extra roti")
  if (
    lower.includes("extra") ||
    lower.includes("zyada") ||
    lower.includes("jyada") ||
    /\d+\s*(?:roti|phulka|chapati|paratha)/i.test(lower)
  ) {
    return {
      intent: "extra",
      entities: {
        customerName: matchedName,
        extraItems: extractExtraItems(trimmed),
        date,
      },
      confidence: 0.75,
    };
  }

  // 6. Pause subscription
  if (
    lower.includes("pause") ||
    lower.includes("band") ||
    lower.includes("rok") ||
    /\b\d+\s*(?:din|days?)\b/i.test(lower)
  ) {
    return {
      intent: "pause",
      entities: {
        customerName: matchedName,
        days: days ?? 3,
      },
      confidence: 0.75,
    };
  }

  // 7. Resume subscription
  if (
    lower.includes("resume") ||
    lower.includes("shuru") ||
    lower.includes("chalu") ||
    lower.includes("unpause") ||
    lower.includes("wapas")
  ) {
    return {
      intent: "resume",
      entities: { customerName: matchedName },
      confidence: 0.75,
    };
  }

  // 8. Cancel
  if (
    lower.includes("cancel") ||
    lower.includes("kyencel") ||
    lower.includes("cansel") ||
    lower.includes("radd") ||
    lower.includes("hatao")
  ) {
    return {
      intent: "cancel",
      entities: {
        customerName: matchedName,
        date,
        permanent: lower.includes("subscription") || lower.includes("hamesha") || lower.includes("permanent"),
      },
      confidence: 0.76,
    };
  }

  // 9. Skip
  if (
    lower.includes("skip") ||
    lower.includes("aaj nahi") ||
    lower.includes("kal nahi") ||
    lower.includes("mat bhejna") ||
    lower.includes("nahi chahiye")
  ) {
    return {
      intent: "skip",
      entities: { customerName: matchedName, date },
      confidence: 0.76,
    };
  }

  // 10. Diet change
  if (
    dietaryPref &&
    (matchedName ||
      lower.includes("khana") ||
      lower.includes("diet") ||
      lower.includes("karo") ||
      lower.includes("kardo") ||
      lower.includes("change"))
  ) {
    return {
      intent: "diet_change",
      entities: {
        customerName: matchedName,
        dietaryPref,
      },
      confidence: 0.72,
    };
  }

  // 11. Menu broadcast
  if (/\b(sabji|khana)\b/i.test(lower) && !/^(read|what|show|when|who)\b|[?？]$/i.test(lower)) {
    return {
      intent: "menu_broadcast",
      entities: { menuText: trimmed },
      confidence: 0.68,
    };
  }

  // 12. Greeting
  if (
    /\b(namaste|namaskara|hello|hi|hey|good morning)\b/i.test(lower) ||
    lower.includes("नमस्ते") ||
    lower.includes("ನಮಸ್ಕಾರ")
  ) {
    return { intent: "greeting", entities: {}, confidence: 0.85 };
  }

  return { intent: "unknown", entities: { customerName: matchedName }, confidence: 0.25 };
}
