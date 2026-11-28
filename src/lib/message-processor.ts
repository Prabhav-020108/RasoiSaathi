import { prisma } from "./prisma";
import { getDailyTally } from "./tally";
import { getTodayUTC, SUPPORTED_LANGUAGES } from "./utils";
import { geminiProcess, geminiTranslate, resolveGeminiKey, type GeminiVoiceContext } from "./gemini";
import { executeVoiceIntent } from "./voice-actions";
import { keywordProcess, type FallbackIntent, type ParsedCommand } from "./voice-fallback";
import { enquiryDetails, isTiffinEnquiry } from "./customer-enquiry";
import { parseTranslationsJson } from "./menu-broadcast";
import { sendStoredReply } from "./chat-delivery";

const AUTO_REPLIES_HI: Record<string, string> = {
  skip: "Theek hai! Aaj ka tiffin band kar diya. 🙏",
  cancel: "Samajh gaye. Subscription band kar diya.",
  pause: "Thodi der ke liye ruk jaate hain. Zaroor!",
  extra: "Extra tiffin note kar liya! 🍱",
  payment: "Hisaab dekh liya. Jaldi bhejte hain.",
  payment_check: "Hisaab dekh liya. Jaldi bhejte hain.",
  payment_remind: "Hisaab dekh liya. Jaldi bhejte hain.",
  greeting: "Namaste! Kaise madad karein? 😊",
  unknown: "Message mila. Jaldi jawab denge! 🙏",
};

const AUTO_REPLIES_EN: Record<string, string> = {
  skip: "Got it! Skipped today's tiffin for you. 🙏",
  cancel: "Understood. We have updated your cancellation.",
  pause: "No problem! We have paused your tiffin.",
  extra: "Noted your extra tiffin request! 🍱",
  payment: "Checked your account. Will share the details soon.",
  payment_check: "Checked your account. Will share the details soon.",
  payment_remind: "Checked your account. Will share the details soon.",
  greeting: "Namaste! How can we help you today? 😊",
  unknown: "Message received. We will reply shortly! 🙏",
};

const AUTO_REPLIES_KN: Record<string, string> = {
  skip: "ಸರಿ! ಇಂದಿನ ಟಿಫಿನ್ ಸ್ಕಿಪ್ ಮಾಡಲಾಗಿದೆ. 🙏",
  cancel: "ಅರ್ಥವಾಯಿತು. ಚಂದಾದಾರಿಕೆಯನ್ನು ರದ್ದುಗೊಳಿಸಲಾಗಿದೆ.",
  pause: "ಖಂಡಿತ! ಟಿಫಿನ್ ತಾತ್ಕಾಲಿಕವಾಗಿ ನಿಲ್ಲಿಸಲಾಗಿದೆ.",
  extra: "ಹೆಚ್ಚುವರಿ ಟಿಫಿನ್ ನೋಟ್ ಮಾಡಲಾಗಿದೆ! 🍱",
  payment: "ಲೆಕ್ಕ ಪರಿಶೀಲಿಸಲಾಗಿದೆ. ಶೀಘ್ರದಲ್ಲೇ ಕಳುಹಿಸುತ್ತೇವೆ.",
  payment_check: "ಲೆಕ್ಕ ಪರಿಶೀಲಿಸಲಾಗಿದೆ. ಶೀಘ್ರದಲ್ಲೇ ಕಳುಹಿಸುತ್ತೇವೆ.",
  payment_remind: "ಲೆಕ್ಕ ಪರಿಶೀಲಿಸಲಾಗಿದೆ. ಶೀಘ್ರದಲ್ಲೇ ಕಳುಹಿಸುತ್ತೇವೆ.",
  greeting: "ನಮಸ್ಕಾರ! ಹೇಗೆ ಸಹಾಯ ಮಾಡಲಿ? 😊",
  unknown: "ಸಂದೇಶ ಸಿಕ್ಕಿದೆ. ಶೀಘ್ರದಲ್ಲೇ ಉತ್ತರಿಸುತ್ತೇವೆ! 🙏",
};

/**
 * Returns a warm, intent-specific auto-reply string without requiring an external AI key.
 */
export function getAutoReplyForIntent(intent: string, lang: string = "hi"): string {
  const normalizedIntent = intent === "payment_check" || intent === "payment_remind" ? "payment" : intent;
  if (lang === "en") {
    return AUTO_REPLIES_EN[normalizedIntent] ?? AUTO_REPLIES_EN.unknown;
  }
  if (lang === "kn") {
    return AUTO_REPLIES_KN[normalizedIntent] ?? AUTO_REPLIES_KN.unknown;
  }
  return AUTO_REPLIES_HI[normalizedIntent] ?? AUTO_REPLIES_HI.unknown;
}

const ACTIONABLE_INTENTS = new Set<FallbackIntent>([
  "skip",
  "cancel",
  "pause",
  "resume",
  "extra",
  "diet_change",
]);

export interface ProcessMessageResult {
  message: Awaited<ReturnType<typeof prisma.message.update>>;
  alreadyProcessed: boolean;
  actionPerformed: boolean;
  actionSummary?: string;
  tierUsed: "gemini" | "local" | "basic";
  spokenSummary?: string;
  replyMeaning?: string;
}

interface MessageProposal {
  parsed: ParsedCommand;
  customerId: string;
  orderDay: string;
  tierUsed: ProcessMessageResult["tierUsed"];
}

function datedSkipReply(lang: string, day: string) {
  lang = SUPPORTED_LANGUAGES.some(({ code }) => code === lang) ? lang : "en";
  const date = new Intl.DateTimeFormat(`${lang}-IN`, { dateStyle: "medium", timeZone: "UTC" }).format(new Date(day));
  return ({
    en: `Your tiffin for ${date} has been skipped.`,
    hi: `${date} का आपका टिफ़िन नहीं भेजा जाएगा।`,
    kn: `${date} ರಂದು ನಿಮ್ಮ ಟಿಫಿನ್ ಕಳುಹಿಸುವುದಿಲ್ಲ.`,
    ta: `${date} அன்று உங்கள் டிபன் அனுப்பப்படாது.`,
    te: `${date} న మీ టిఫిన్ పంపబడదు.`,
    mr: `${date} रोजी तुमचा डबा पाठवला जाणार नाही.`,
  })[lang] ?? `Your tiffin for ${date} has been skipped.`;
}

function skipProposalSummary(lang: string, day: string) {
  lang = SUPPORTED_LANGUAGES.some(({ code }) => code === lang) ? lang : "en";
  const date = new Intl.DateTimeFormat(`${lang}-IN`, { dateStyle: "medium", timeZone: "UTC" }).format(new Date(day));
  return ({
    en: `Request to skip the tiffin on ${date}.`,
    hi: `${date} का टिफ़िन रोकने का अनुरोध।`,
    kn: `${date} ರ ಟಿಫಿನ್ ಬೇಡ ಎಂಬ ವಿನಂತಿ.`,
    ta: `${date} அன்று டிபன் வேண்டாம் என்ற கோரிக்கை.`,
    te: `${date} న టిఫిన్ వద్దన్న అభ్యర్థన.`,
    mr: `${date} रोजी डबा नको अशी विनंती.`,
  })[lang] ?? `Request to skip the tiffin on ${date}.`;
}

function acknowledgedReply(lang: string) {
  return ({
    ta: "உங்கள் செய்தி கிடைத்தது.",
    te: "మీ సందేశం అందింది.",
    mr: "तुमचा संदेश मिळाला.",
  })[lang] ?? getAutoReplyForIntent("unknown", lang);
}

export async function approveMessageRecord(id: string, reviewedProposal?: string, sendReply = false): Promise<ProcessMessageResult | null> {
  return prisma.$transaction(async (db) => {
    const message = await db.message.findUnique({ where: { id } });
    if (!message) return null;
    const outcome: ProcessMessageResult = {
      message, alreadyProcessed: message.status === "processed", actionPerformed: false, tierUsed: "basic",
    };
    if (outcome.alreadyProcessed) {
      if (sendReply && message.autoReply) outcome.message = (await sendStoredReply(db, id)) ?? message;
      return outcome;
    }
    if (!message.proposal ||
        (reviewedProposal !== undefined && reviewedProposal !== message.proposal)) return outcome;
    const proposal: MessageProposal = JSON.parse(message.proposal);
    const orderDay = new Date(proposal.orderDay);
    if (orderDay < getTodayUTC()) return outcome;
    const customer = await db.customer.findUnique({ where: { id: proposal.customerId } });
    if (!customer) return outcome;
    const cook = await db.cook.findUnique({ where: { id: customer.cookId } });
    const result = await executeVoiceIntent({
      ...proposal.parsed,
      entities: { ...proposal.parsed.entities, customerName: customer.name },
    }, {
      db, customerId: customer.id, orderDay, cookLang: cook?.language ?? "hi",
      tierUsed: proposal.tierUsed, originalText: message.originalText,
    });
    if (!result.actionPerformed) return outcome;
    const dated = proposal.parsed.intent === "skip" ||
      (proposal.parsed.intent === "cancel" && !proposal.parsed.entities.permanent);
    const autoReply = dated
      ? datedSkipReply(message.originalLang, proposal.orderDay)
      : acknowledgedReply(message.originalLang);
    outcome.message = await db.message.update({
      where: { id }, data: { status: "processed", autoReply, replyApprovedAt: null },
    });
    if (sendReply) outcome.message = (await sendStoredReply(db, id)) ?? outcome.message;
    return {
      ...outcome, actionPerformed: true, actionSummary: result.actionSummary, tierUsed: proposal.tierUsed,
      replyMeaning: dated ? datedSkipReply(cook?.language ?? "hi", proposal.orderDay) : undefined,
    };
  });
}

/**
 * Reads and prepares a reviewable proposal. Business updates require approval.
 */
export async function processMessageRecord(
  messageId: string,
  options: {
    apiKeyOverride?: string | null;
    tierHint?: string;
    localParsed?: ParsedCommand | null;
    localTranslation?: string;
  } = {}
): Promise<ProcessMessageResult | null> {
  const existing = await prisma.message.findUnique({
    where: { id: messageId },
    include: {
      customer: {
        select: { id: true, name: true, language: true, dietaryPref: true },
      },
    },
  });

  if (!existing) return null;

  if (existing.status === "processed") {
    return {
      message: existing,
      alreadyProcessed: true,
      actionPerformed: false,
      tierUsed: "basic",
    };
  }

  const [cook, customers] = await Promise.all([
    prisma.cook.findFirst(),
    prisma.customer.findMany({ orderBy: { createdAt: "asc" } }),
  ]);

  const cookLang = cook?.language || "hi";
  const senderMatches = customers.filter((customer) => customer.name.toLowerCase() === existing.senderName.toLowerCase());
  const customerId = existing.customerId ?? (senderMatches.length === 1 ? senderMatches[0].id : undefined);
  if (!customerId && isTiffinEnquiry(existing.originalText)) {
    const menu = await prisma.menuBroadcast.findFirst({
      where: { sentAt: { not: null }, date: { gte: getTodayUTC() } }, orderBy: { date: "asc" },
    });
    const availableMenu = menu ? parseTranslationsJson(menu.translations) : {};
    const menuIn = (language: string) => availableMenu[language]?.split(" (Original - translate with Gemini API)")[0];
    const offer = enquiryDetails(existing.originalLang, cook?.defaultPrice ?? 3000, menuIn(existing.originalLang));
    const review = enquiryDetails(cookLang, cook?.defaultPrice ?? 3000, menuIn(cookLang));
    const message = await prisma.message.update({
      where: { id: existing.id },
      data: { intent: "enquiry", status: "review", readAt: existing.readAt ?? new Date(),
        ...(existing.replyApprovedAt ? {} : { autoReply: existing.autoReply ?? offer.reply }) },
    });
    return { message, alreadyProcessed: false, actionPerformed: false, tierUsed: "basic",
      spokenSummary: review.lead, replyMeaning: review.reply };
  }

  const geminiKey = resolveGeminiKey(options.apiKeyOverride);
  const tomorrow = /\btomorrow\b|\bkal\b|कल|ನಾಳೆ|நாளை|రేపు|उद्या/i.test(existing.originalText);
  const today = /\btoday\b|\baaj\b|आज|ಇಂದು|இன்று|ఈరోజు/i.test(existing.originalText);
  const date = today === tomorrow ? undefined : tomorrow ? "tomorrow" : "today";
  const clearSkip = /^(?:आज|कल)(?: का)? (?:मेरा )?टिफ़?िन (?:मत भेज(?:ना|िए|ो)|नहीं चाहिए|(?:कैंसल|कॅन्सल|कैंसिल|cancel|रद्द)(?: है| कर (?:दो|दीजिए))?)[।.!]?$/i.test(existing.originalText.trim()) ||
    /^(?:kal|aaj)(?: ka)? (?:mera )?tiffin (?:cancel(?: hai| kar do)?|mat bhejna|nahi chahiye)[.!]?$/i.test(existing.originalText.trim()) ||
    /^(please )?skip (my tiffin )?(today|tomorrow)[.!]?$/i.test(existing.originalText.trim());
  let parsed: ParsedCommand | null = clearSkip && date
    ? { intent: "skip", confidence: 0.95, entities: { date } }
    : geminiKey ? null : options.localParsed ?? null;
  let tierUsed: "gemini" | "local" | "basic" = parsed && !clearSkip ? "local" : "basic";

  if (!parsed && geminiKey) {
    try {
      const tally = await getDailyTally();
      const context: GeminiVoiceContext = {
        cookName: cook?.name || "Sunita Devi",
        cookLang,
        defaultPrice: cook?.defaultPrice ?? 3000,
        todayISO: getTodayUTC(existing.createdAt).toISOString().slice(0, 10),
        customers: customers.map((c) => ({
          id: c.id,
          name: c.name,
          phone: c.phone,
          dietaryPref: c.dietaryPref,
          status: c.status,
          monthlyPrice: c.monthlyPrice,
        })),
        tally: {
          activeTiffins: tally.activeTiffins,
          dietary: tally.dietary,
          skippedCount: tally.skippedCount,
          cancelledCount: tally.cancelledCount,
          pausedCount: tally.pausedCount,
          extraCount: tally.extraCount,
          pendingPaymentsTotal: tally.pendingPaymentsTotal,
          pendingPaymentsCount: tally.pendingPaymentsCount,
        },
        pendingCustomers: [],
      };
      parsed = await geminiProcess(
        `${existing.senderName}: ${existing.originalText}`,
        cookLang,
        context,
        geminiKey
      );
      tierUsed = "gemini";
    } catch (err) {
      console.warn("Gemini message parse failed, falling back:", err);
    }
  }

  if (!parsed) {
    parsed = keywordProcess(
      existing.originalText,
      customers.map((c) => ({ id: c.id, name: c.name, phone: c.phone }))
    );
    tierUsed = "basic";
  }

  let translatedText: string | null = null;
  if (existing.originalLang !== cookLang && geminiKey && !clearSkip) {
    try {
      const tr = await geminiTranslate(existing.originalText, existing.originalLang, cookLang, geminiKey);
      if (tr.translated.trim() !== existing.originalText.trim()) translatedText = tr.translated;
    } catch {
      // A missing translation remains visibly unavailable.
    }
  } else if (existing.originalLang !== cookLang && options.localTranslation &&
      options.localTranslation.trim() !== existing.originalText.trim()) {
    translatedText = options.localTranslation.trim().slice(0, 4000);
  }

  const needsDay = ["skip", "cancel", "extra"].includes(parsed.intent);
  const orderDay = getTodayUTC(existing.createdAt);
  if (date === "tomorrow") orderDay.setUTCDate(orderDay.getUTCDate() + 1);
  const proposal = customerId && ACTIONABLE_INTENTS.has(parsed.intent) && parsed.confidence >= 0.6 &&
    (!needsDay || date) && !parsed.entities.permanent &&
    (parsed.intent !== "extra" || parsed.entities.extraItems) &&
    (parsed.intent !== "diet_change" || parsed.entities.dietaryPref)
    ? JSON.stringify({
        parsed: { ...parsed, entities: { ...parsed.entities, date } }, customerId,
        orderDay: orderDay.toISOString(), tierUsed,
      } satisfies MessageProposal)
    : null;
  await prisma.message.updateMany({
    where: { id: existing.id, status: { in: ["new", "review"] } },
    data: {
      intent: parsed.intent,
      translatedText,
      translatedLang: translatedText ? cookLang : null,
      status: "review",
      readAt: existing.readAt ?? new Date(),
      proposal,
    },
  });

  return {
    message: await prisma.message.findUniqueOrThrow({ where: { id: existing.id } }),
    alreadyProcessed: false,
    actionPerformed: false,
    tierUsed,
    spokenSummary: proposal && parsed.intent === "skip" && clearSkip
      ? skipProposalSummary(cookLang, orderDay.toISOString()) : undefined,
  };
}
