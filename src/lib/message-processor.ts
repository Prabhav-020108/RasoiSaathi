import { prisma } from "./prisma";
import { getDailyTally } from "./tally";
import { getCurrentMonthKey } from "./utils";
import { geminiProcess, geminiTranslate, resolveGeminiKey, type GeminiVoiceContext } from "./gemini";
import { executeVoiceIntent } from "./voice-actions";
import { keywordProcess, type FallbackIntent, type ParsedCommand } from "./voice-fallback";

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
}

/**
 * Processes an incoming WhatsApp message through the 3-tier AI pipeline,
 * applies any actionable DB update for the matched customer, and saves an auto-reply.
 */
export async function processMessageRecord(
  messageId: string,
  options: {
    apiKeyOverride?: string | null;
    tierHint?: string;
    localParsed?: ParsedCommand | null;
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

  const currentMonth = getCurrentMonthKey();
  const [cook, customers, tally, payments] = await Promise.all([
    prisma.cook.findFirst(),
    prisma.customer.findMany({ orderBy: { createdAt: "asc" } }),
    getDailyTally(),
    prisma.payment.findMany({
      where: { month: currentMonth },
      include: { customer: true },
    }),
  ]);

  const cookLang = cook?.language || "hi";
  const pendingCustomers = payments
    .filter((p) => p.status !== "paid" && p.amount - p.paidAmount > 0)
    .map((p) => ({
      name: p.customer.name,
      remaining: Math.max(0, p.amount - p.paidAmount),
    }));

  const geminiKey = resolveGeminiKey(options.apiKeyOverride);
  let parsed: ParsedCommand | null = geminiKey ? null : options.localParsed ?? null;
  let tierUsed: "gemini" | "local" | "basic" = parsed ? "local" : "basic";

  if (!parsed && geminiKey) {
    try {
      const context: GeminiVoiceContext = {
        cookName: cook?.name || "Sunita Devi",
        cookLang,
        defaultPrice: cook?.defaultPrice ?? 3000,
        todayISO: new Date().toISOString().slice(0, 10),
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
        pendingCustomers,
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

  // Ensure sender name is used when the message text omits the customer's own name
  if (!parsed.entities.customerName) {
    parsed = {
      ...parsed,
      entities: {
        ...parsed.entities,
        customerName: existing.customer?.name || existing.senderName,
      },
    };
  }

  let translatedText = existing.translatedText;
  let translatedLang = existing.translatedLang;
  if (existing.originalLang !== "en" && existing.originalLang !== "hi" && geminiKey) {
    try {
      const tr = await geminiTranslate(existing.originalText, existing.originalLang, "hi", geminiKey);
      translatedText = tr.translated;
      translatedLang = "hi";
    } catch {
      // Keep existing or null if translation fails
    }
  }

  let actionPerformed = false;
  let actionSummary: string | undefined;

  if (ACTIONABLE_INTENTS.has(parsed.intent)) {
    const actionResult = await executeVoiceIntent(parsed, {
      cookLang,
      tierUsed,
      originalText: existing.originalText,
    });
    actionPerformed = actionResult.actionPerformed;
    actionSummary = actionResult.actionSummary;
  }

  const autoReply = getAutoReplyForIntent(parsed.intent, existing.originalLang);

  const updated = await prisma.message.update({
    where: { id: existing.id },
    data: {
      intent: parsed.intent,
      translatedText,
      translatedLang: translatedText ? translatedLang || "hi" : null,
      status: "processed",
      autoReply,
    },
    include: {
      customer: {
        select: { id: true, name: true, language: true, dietaryPref: true },
      },
    },
  });

  return {
    message: updated,
    alreadyProcessed: false,
    actionPerformed,
    actionSummary,
    tierUsed,
  };
}
