import { prisma } from "./prisma";
import { getDailyTally, type TallyBreakdown } from "./tally";
import { getCurrentMonthKey, getDietaryLabel, getTodayUTC } from "./utils";
import type { FallbackIntent, ParsedCommand } from "./voice-fallback";

export interface CustomerMatchCandidate {
  id: string;
  name: string;
  phone: string | null;
  phoneLast4: string;
  dietaryPref: string;
  status: string;
  monthlyPrice: number;
}

export interface VoiceActionResult {
  intent: FallbackIntent;
  entities: ParsedCommand["entities"];
  responseText: string;
  confidence: number;
  actionPerformed: boolean;
  actionSummary?: string;
  needsDisambiguation?: boolean;
  candidates?: Array<{ id: string; name: string; phoneLast4: string }>;
  tally: Awaited<ReturnType<typeof getDailyTally>>;
  data?: Record<string, unknown>;
}

export function findMatchingCustomers(
  queryName: string | undefined,
  customers: CustomerMatchCandidate[]
): CustomerMatchCandidate[] {
  const raw = queryName?.trim().toLowerCase();
  if (!raw) return [];

  // Check if query contains 4 digits (for disambiguation like "Rajesh 0001")
  const digitsMatch = raw.match(/\b(\d{4})\b/);
  const namePart = raw.replace(/\b\d{4}\b/g, "").trim();

  if (digitsMatch?.[1]) {
    const byDigits = customers.filter(
      (c) =>
        c.phoneLast4 === digitsMatch[1] &&
        (!namePart || c.name.toLowerCase().includes(namePart))
    );
    if (byDigits.length > 0) return byDigits;
  }

  const exactFull = customers.filter((c) => c.name.toLowerCase() === raw);
  if (exactFull.length > 0) return exactFull;

  const exactFirst = customers.filter(
    (c) => c.name.toLowerCase().split(/\s+/)[0] === (namePart || raw)
  );
  if (exactFirst.length > 0) return exactFirst;

  const partial = customers.filter((c) =>
    c.name.toLowerCase().includes(namePart || raw)
  );
  return partial;
}

export function resolveCustomerMatches(
  queryName: string | undefined,
  originalText: string,
  pool: CustomerMatchCandidate[]
): CustomerMatchCandidate[] {
  const matches = findMatchingCustomers(queryName, pool);
  if (matches.length <= 1) return matches;

  const digitsInOriginal = originalText.match(/\b(\d{4})\b/);
  if (digitsInOriginal?.[1]) {
    const narrowed = matches.filter((m) => m.phoneLast4 === digitsInOriginal[1]);
    if (narrowed.length > 0) return narrowed;
  }
  return matches;
}

function formatTallySpeech(
  tally: TallyBreakdown,
  lang: string,
  dateRef?: "today" | "tomorrow"
): string {
  const { activeTiffins, dietary, skippedCount, cancelledCount, pausedCount, extraCount, extraRequests } =
    tally;
  const isTomorrow = dateRef === "tomorrow";

  if (activeTiffins === 0 && tally.totalCustomers > 0) {
    if (lang === "en") {
      return isTomorrow
        ? "Holiday tomorrow! No tiffins need to be prepared."
        : "Holiday today! No tiffins need to be prepared today.";
    }
    if (lang === "kn") {
      return isTomorrow
        ? "ನಾಳೆ ರಜೆ! ಯಾವುದೇ ಟಿಫಿನ್ ತಯಾರಿಸಬೇಕಾಗಿಲ್ಲ."
        : "ಇಂದು ರಜೆ! ಇಂದು ಯಾವುದೇ ಟಿಫಿನ್ ತಯಾರಿಸಬೇಕಾಗಿಲ್ಲ.";
    }
    return isTomorrow
      ? "Kal chutti hai didi! Koi tiffin nahi banana hai."
      : "Aaj chutti hai didi! Koi tiffin nahi banana hai.";
  }

  const parts: string[] = [];
  if (dietary.regular > 0) parts.push(`${dietary.regular} regular`);
  if (dietary.jain > 0) parts.push(`${dietary.jain} Jain`);
  if (dietary.lessOil > 0) parts.push(`${dietary.lessOil} less-oil`);
  if (dietary.noOnionGarlic > 0) parts.push(`${dietary.noOnionGarlic} no-onion-garlic`);
  const breakdownText = parts.join(", ");

  const extraText =
    extraRequests.length > 0
      ? extraRequests.map((r) => `${r.customerName.split(" ")[0]} (${r.items})`).join(", ")
      : "";

  if (lang === "en") {
    let msg = `${isTomorrow ? "Tomorrow" : "Today"} you have ${activeTiffins} tiffins`;
    if (breakdownText) msg += `: ${breakdownText}`;
    msg += ".";
    const offCount = skippedCount + cancelledCount + pausedCount;
    if (offCount > 0) {
      msg += ` ${skippedCount + cancelledCount} skipped or cancelled, ${pausedCount} paused.`;
    }
    if (extraCount > 0 && extraText) {
      msg += ` Extra requests: ${extraText}.`;
    }
    return msg;
  }

  if (lang === "kn") {
    let msg = `${isTomorrow ? "ನಾಳೆ" : "ಇಂದು"} ಒಟ್ಟು ${activeTiffins} ಟಿಫಿನ್‌ಗಳಿವೆ`;
    if (breakdownText) msg += `: ${breakdownText}`;
    msg += ".";
    if (skippedCount + cancelledCount > 0 || pausedCount > 0) {
      msg += ` ${skippedCount + cancelledCount} ಸ್ಕಿಪ್/ರದ್ದು, ${pausedCount} ವಿರಾಮ.`;
    }
    if (extraCount > 0 && extraText) {
      msg += ` ಹೆಚ್ಚುವರಿ: ${extraText}.`;
    }
    return msg;
  }

  // Default Hindi/Hinglish (and ta/te/mr friendly fallback when Gemini unavailable)
  let msg = `${isTomorrow ? "Kal" : "Aaj"} total ${activeTiffins} tiffin banane hain`;
  if (breakdownText) msg += `: ${breakdownText}`;
  msg += ".";
  if (skippedCount + cancelledCount > 0 || pausedCount > 0) {
    msg += ` ${skippedCount + cancelledCount} skip ya cancel aur ${pausedCount} paused hain.`;
  }
  if (extraCount > 0 && extraText) {
    msg += ` Extra order: ${extraText}.`;
  }
  return msg;
}

function formatPendingPaymentsSpeech(
  pendingList: Array<{ name: string; remaining: number }>,
  totalPending: number,
  lang: string
): string {
  if (pendingList.length === 0) {
    if (lang === "en") return "Great news! All customers have paid for this month.";
    if (lang === "kn") return "ಶುಭ ಸುದ್ದಿ! ಈ ತಿಂಗಳು ಎಲ್ಲಾ ಗ್ರಾಹಕರ ಪಾವತಿ ಪೂರ್ಣವಾಗಿದೆ.";
    return "Badhai didi! Is mahine sabhi customers ka payment aa gaya hai.";
  }

  const namesSummary = pendingList
    .slice(0, 6)
    .map((p) => `${p.name.split(" ")[0]} ₹${p.remaining}`)
    .join(", ");
  const more = pendingList.length > 6 ? ` aur ${pendingList.length - 6} aur` : "";

  if (lang === "en") {
    return `${pendingList.length} customers have pending payments totaling ₹${totalPending}: ${namesSummary}.`;
  }
  if (lang === "kn") {
    return `${pendingList.length} ಗ್ರಾಹಕರಿಂದ ಒಟ್ಟು ₹${totalPending} ಬಾಕಿ ಇದೆ: ${namesSummary}.`;
  }
  return `${pendingList.length} customers ka total ₹${totalPending} baaki hai: ${namesSummary}${more}.`;
}

function disambiguationPrompt(
  queryName: string,
  candidates: CustomerMatchCandidate[],
  lang: string
): string {
  const options = candidates
    .slice(0, 3)
    .map((c) => `${c.name} (${c.phoneLast4 || "no phone"})`)
    .join(" ya ");

  if (lang === "en") {
    return `Which ${queryName}? ${candidates
      .slice(0, 3)
      .map((c) => `${c.name} (${c.phoneLast4 || "no phone"})`)
      .join(" or ")}?`;
  }
  if (lang === "kn") {
    return `ಯಾವ ${queryName}? ${options}?`;
  }
  return `${queryName} kaunsa? ${options}?`;
}

function customerNotFoundMsg(queryName: string | undefined, lang: string): string {
  if (!queryName) {
    if (lang === "en") return "Please tell me the customer's name as well.";
    if (lang === "kn") return "ದಯವಿಟ್ಟು ಗ್ರಾಹಕರ ಹೆಸರನ್ನು ಹೇಳಿ.";
    return "Didi, customer ka naam bhi bataiye.";
  }
  if (lang === "en") return `I couldn't find a customer named ${queryName}.`;
  if (lang === "kn") return `${queryName} ಎಂಬ ಗ್ರಾಹಕರು ಕಂಡುಬಂದಿಲ್ಲ.`;
  return `${queryName} naam ka koi customer list mein nahi mila.`;
}

export async function executeVoiceIntent(
  parsed: ParsedCommand,
  options: {
    cookLang: string;
    tierUsed: "gemini" | "local" | "basic";
    originalText: string;
  }
): Promise<VoiceActionResult> {
  const { cookLang, tierUsed } = options;
  const intent = parsed.intent;
  const entities = parsed.entities ?? {};

  let cook = await prisma.cook.findFirst();
  if (!cook) {
    cook = await prisma.cook.create({
      data: {
        name: "Sunita Devi",
        phone: "+91 98765 43210",
        language: cookLang || "hi",
        defaultPrice: 3000,
      },
    });
  }

  const allCustomers = await prisma.customer.findMany({
    orderBy: { createdAt: "asc" },
  });

  const candidatesPool: CustomerMatchCandidate[] = allCustomers.map((c) => ({
    id: c.id,
    name: c.name,
    phone: c.phone,
    phoneLast4: c.phone ? c.phone.replace(/\D/g, "").slice(-4) : "",
    dietaryPref: c.dietaryPref,
    status: c.status,
    monthlyPrice: c.monthlyPrice,
  }));

  const currentMonth = getCurrentMonthKey();
  const todayUTC = getTodayUTC();
  const targetDate =
    entities.date === "tomorrow"
      ? new Date(todayUTC.getTime() + 24 * 60 * 60 * 1000)
      : todayUTC;

  // Helper to return result with fresh tally
  const buildResult = async (partial: Omit<VoiceActionResult, "tally">) => {
    const tally = await getDailyTally();
    return { ...partial, tally };
  };

  switch (intent) {
    case "tally": {
      const tally = await getDailyTally(entities.date === "tomorrow" ? targetDate : undefined);
      const responseText =
        tierUsed !== "basic" && parsed.responseText && entities.date !== "tomorrow"
          ? parsed.responseText
          : formatTallySpeech(tally, cookLang, entities.date);
      return {
        intent,
        entities,
        responseText,
        confidence: parsed.confidence,
        actionPerformed: false,
        actionSummary: `${entities.date === "tomorrow" ? "Tomorrow's" : "Today's"} tally: ${tally.activeTiffins} tiffins`,
        tally,
      };
    }

    case "add_customer": {
      const name = entities.customerName?.trim();
      if (!name) {
        const askName =
          cookLang === "en"
            ? "Sure! What is the new customer's name, diet, and monthly price?"
            : cookLang === "kn"
              ? "ಖಂಡಿತ! ಹೊಸ ಗ್ರಾಹಕರ ಹೆಸರು, ಆಹಾರ ಮತ್ತು ತಿಂಗಳ ದರ ಹೇಳಿ."
              : "Zaroor didi! Naye customer ka naam, khana (Jain/Regular) aur monthly price bataiye.";
        return buildResult({
          intent,
          entities,
          responseText: askName,
          confidence: parsed.confidence,
          actionPerformed: false,
        });
      }

      const dietaryPref = entities.dietaryPref || "regular";
      const monthlyPrice =
        entities.price && entities.price >= 100 ? Math.round(entities.price) : cook.defaultPrice;
      const customerLang = entities.language || cookLang || "hi";

      const created = await prisma.customer.create({
        data: {
          cookId: cook.id,
          name,
          language: customerLang,
          dietaryPref,
          monthlyPrice,
          status: "active",
          payments: {
            create: {
              month: currentMonth,
              amount: monthlyPrice,
              status: "pending",
              paidAmount: 0,
            },
          },
        },
      });

      const responseText =
        cookLang === "en"
          ? `Added ${created.name} (${getDietaryLabel(dietaryPref)}, ₹${monthlyPrice}/month).`
          : cookLang === "kn"
            ? `${created.name} ಅವರನ್ನು ಸೇರಿಸಲಾಗಿದೆ (${getDietaryLabel(dietaryPref)}, ₹${monthlyPrice}/ತಿಂಗಳು).`
            : `${created.name} ko add kar diya hai — ${getDietaryLabel(dietaryPref)} khana, ₹${monthlyPrice} mahina.`;

      return buildResult({
        intent,
        entities: { ...entities, customerName: created.name, dietaryPref, price: monthlyPrice },
        responseText,
        confidence: parsed.confidence,
        actionPerformed: true,
        actionSummary: `Added ${created.name} (${getDietaryLabel(dietaryPref)}, ₹${monthlyPrice}/mo)`,
        data: { customer: created },
      });
    }

    case "remove_customer": {
      const matches = resolveCustomerMatches(entities.customerName, options.originalText, candidatesPool);
      if (matches.length === 0) {
        return buildResult({
          intent,
          entities,
          responseText: customerNotFoundMsg(entities.customerName, cookLang),
          confidence: parsed.confidence,
          actionPerformed: false,
        });
      }
      if (matches.length > 1) {
        return buildResult({
          intent,
          entities,
          responseText: disambiguationPrompt(entities.customerName || "", matches, cookLang),
          confidence: parsed.confidence,
          actionPerformed: false,
          needsDisambiguation: true,
          candidates: matches.map((m) => ({
            id: m.id,
            name: m.name,
            phoneLast4: m.phoneLast4,
          })),
        });
      }

      const target = matches[0];
      await prisma.customer.delete({ where: { id: target.id } });

      const responseText =
        cookLang === "en"
          ? `Removed ${target.name} from your customer list.`
          : cookLang === "kn"
            ? `${target.name} ಅವರನ್ನು ಗ್ರಾಹಕರ ಪಟ್ಟಿಯಿಂದ ತೆಗೆದುಹಾಕಲಾಗಿದೆ.`
            : `${target.name} ko customer list se hata diya hai.`;

      return buildResult({
        intent,
        entities: { ...entities, customerName: target.name },
        responseText,
        confidence: parsed.confidence,
        actionPerformed: true,
        actionSummary: `Removed customer ${target.name}`,
        data: { removedId: target.id, removedName: target.name },
      });
    }

    case "skip": {
      const matches = resolveCustomerMatches(entities.customerName, options.originalText, candidatesPool);
      if (matches.length === 0) {
        return buildResult({
          intent,
          entities,
          responseText: customerNotFoundMsg(entities.customerName, cookLang),
          confidence: parsed.confidence,
          actionPerformed: false,
        });
      }
      if (matches.length > 1) {
        return buildResult({
          intent,
          entities,
          responseText: disambiguationPrompt(entities.customerName || "", matches, cookLang),
          confidence: parsed.confidence,
          actionPerformed: false,
          needsDisambiguation: true,
          candidates: matches.map((m) => ({
            id: m.id,
            name: m.name,
            phoneLast4: m.phoneLast4,
          })),
        });
      }

      const target = matches[0];
      await prisma.dailyOrder.upsert({
        where: {
          customerId_date: {
            customerId: target.id,
            date: targetDate,
          },
        },
        update: { status: "skipped", extraItems: null },
        create: {
          customerId: target.id,
          date: targetDate,
          status: "skipped",
        },
      });

      const dayWord =
        entities.date === "tomorrow"
          ? cookLang === "en"
            ? "tomorrow"
            : cookLang === "kn"
              ? "ನಾಳೆ"
              : "kal"
          : cookLang === "en"
            ? "today"
            : cookLang === "kn"
              ? "ಇಂದು"
              : "aaj";

      const freshTally = await getDailyTally();
      const responseText =
        cookLang === "en"
          ? `Marked ${target.name} as skipped for ${dayWord}. Today's tally is now ${freshTally.activeTiffins}.`
          : cookLang === "kn"
            ? `${target.name} ಅವರ ${dayWord} ಟಿಫಿನ್ ಸ್ಕಿಪ್ ಮಾಡಲಾಗಿದೆ. ಇಂದಿನ ಒಟ್ಟು: ${freshTally.activeTiffins}.`
            : `${target.name} ka ${dayWord} ka tiffin skip kar diya hai. Aaj ab ${freshTally.activeTiffins} tiffin hain.`;

      return {
        intent,
        entities: { ...entities, customerName: target.name },
        responseText,
        confidence: parsed.confidence,
        actionPerformed: true,
        actionSummary: `Skipped ${target.name} (${entities.date === "tomorrow" ? "tomorrow" : "today"})`,
        tally: freshTally,
        data: { customerId: target.id, status: "skipped" },
      };
    }

    case "cancel": {
      const matches = resolveCustomerMatches(entities.customerName, options.originalText, candidatesPool);
      if (matches.length === 0) {
        return buildResult({
          intent,
          entities,
          responseText: customerNotFoundMsg(entities.customerName, cookLang),
          confidence: parsed.confidence,
          actionPerformed: false,
        });
      }
      if (matches.length > 1) {
        return buildResult({
          intent,
          entities,
          responseText: disambiguationPrompt(entities.customerName || "", matches, cookLang),
          confidence: parsed.confidence,
          actionPerformed: false,
          needsDisambiguation: true,
          candidates: matches.map((m) => ({
            id: m.id,
            name: m.name,
            phoneLast4: m.phoneLast4,
          })),
        });
      }

      const target = matches[0];
      if (entities.permanent) {
        await prisma.customer.update({
          where: { id: target.id },
          data: { status: "cancelled", pauseUntil: null },
        });
      } else {
        await prisma.dailyOrder.upsert({
          where: {
            customerId_date: {
              customerId: target.id,
              date: targetDate,
            },
          },
          update: { status: "cancelled", extraItems: null },
          create: {
            customerId: target.id,
            date: targetDate,
            status: "cancelled",
          },
        });
      }

      const freshTally = await getDailyTally();
      const responseText =
        cookLang === "en"
          ? `Cancelled ${target.name}'s ${entities.permanent ? "subscription" : entities.date === "tomorrow" ? "tomorrow's tiffin" : "today's tiffin"}. Today's tally is ${freshTally.activeTiffins}.`
          : cookLang === "kn"
            ? `${target.name} ಅವರ ಟಿಫಿನ್ ರದ್ದುಗೊಳಿಸಲಾಗಿದೆ. ಇಂದಿನ ಒಟ್ಟು: ${freshTally.activeTiffins}.`
            : `${target.name} ka ${entities.permanent ? "subscription" : entities.date === "tomorrow" ? "kal ka tiffin" : "aaj ka tiffin"} cancel kar diya hai. Aaj ab ${freshTally.activeTiffins} tiffin hain.`;

      return {
        intent,
        entities: { ...entities, customerName: target.name },
        responseText,
        confidence: parsed.confidence,
        actionPerformed: true,
        actionSummary: `Cancelled ${target.name}`,
        tally: freshTally,
        data: { customerId: target.id, permanent: Boolean(entities.permanent) },
      };
    }

    case "pause": {
      const matches = resolveCustomerMatches(entities.customerName, options.originalText, candidatesPool);
      if (matches.length === 0) {
        return buildResult({
          intent,
          entities,
          responseText: customerNotFoundMsg(entities.customerName, cookLang),
          confidence: parsed.confidence,
          actionPerformed: false,
        });
      }
      if (matches.length > 1) {
        return buildResult({
          intent,
          entities,
          responseText: disambiguationPrompt(entities.customerName || "", matches, cookLang),
          confidence: parsed.confidence,
          actionPerformed: false,
          needsDisambiguation: true,
          candidates: matches.map((m) => ({
            id: m.id,
            name: m.name,
            phoneLast4: m.phoneLast4,
          })),
        });
      }

      const target = matches[0];
      const days = entities.days && entities.days > 0 ? entities.days : 3;
      const pauseUntil = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

      await prisma.customer.update({
        where: { id: target.id },
        data: { status: "paused", pauseUntil },
      });

      const freshTally = await getDailyTally();
      const responseText =
        cookLang === "en"
          ? `Paused ${target.name} for ${days} days. Today's tally is ${freshTally.activeTiffins}.`
          : cookLang === "kn"
            ? `${target.name} ಅವರ ಟಿಫಿನ್ ${days} ದಿನಗಳವರೆಗೆ ವಿರಾಮಗೊಳಿಸಲಾಗಿದೆ. ಇಂದಿನ ಒಟ್ಟು: ${freshTally.activeTiffins}.`
            : `${target.name} ka tiffin ${days} din ke liye pause kar diya hai. Aaj ab ${freshTally.activeTiffins} tiffin hain.`;

      return {
        intent,
        entities: { ...entities, customerName: target.name, days },
        responseText,
        confidence: parsed.confidence,
        actionPerformed: true,
        actionSummary: `Paused ${target.name} for ${days} days`,
        tally: freshTally,
        data: { customerId: target.id, days },
      };
    }

    case "resume": {
      const matches = resolveCustomerMatches(entities.customerName, options.originalText, candidatesPool);
      if (matches.length === 0) {
        return buildResult({
          intent,
          entities,
          responseText: customerNotFoundMsg(entities.customerName, cookLang),
          confidence: parsed.confidence,
          actionPerformed: false,
        });
      }
      if (matches.length > 1) {
        return buildResult({
          intent,
          entities,
          responseText: disambiguationPrompt(entities.customerName || "", matches, cookLang),
          confidence: parsed.confidence,
          actionPerformed: false,
          needsDisambiguation: true,
          candidates: matches.map((m) => ({
            id: m.id,
            name: m.name,
            phoneLast4: m.phoneLast4,
          })),
        });
      }

      const target = matches[0];
      await prisma.customer.update({
        where: { id: target.id },
        data: { status: "active", pauseUntil: null },
      });
      // Clear any skipped/cancelled order for today so resumed customer counts today
      await prisma.dailyOrder.deleteMany({
        where: {
          customerId: target.id,
          date: todayUTC,
          status: { in: ["skipped", "cancelled"] },
        },
      });

      const freshTally = await getDailyTally();
      const responseText =
        cookLang === "en"
          ? `Resumed ${target.name}'s tiffin. Today's tally is now ${freshTally.activeTiffins}.`
          : cookLang === "kn"
            ? `${target.name} ಅವರ ಟಿಫಿನ್ ಪುನಃ ಪ್ರಾರಂಭಿಸಲಾಗಿದೆ. ಇಂದಿನ ಒಟ್ಟು: ${freshTally.activeTiffins}.`
            : `${target.name} ka tiffin phir se chalu kar diya hai. Aaj ab ${freshTally.activeTiffins} tiffin hain.`;

      return {
        intent,
        entities: { ...entities, customerName: target.name },
        responseText,
        confidence: parsed.confidence,
        actionPerformed: true,
        actionSummary: `Resumed ${target.name}`,
        tally: freshTally,
        data: { customerId: target.id, status: "active" },
      };
    }

    case "extra": {
      const matches = resolveCustomerMatches(entities.customerName, options.originalText, candidatesPool);
      if (matches.length === 0) {
        return buildResult({
          intent,
          entities,
          responseText: customerNotFoundMsg(entities.customerName, cookLang),
          confidence: parsed.confidence,
          actionPerformed: false,
        });
      }
      if (matches.length > 1) {
        return buildResult({
          intent,
          entities,
          responseText: disambiguationPrompt(entities.customerName || "", matches, cookLang),
          confidence: parsed.confidence,
          actionPerformed: false,
          needsDisambiguation: true,
          candidates: matches.map((m) => ({
            id: m.id,
            name: m.name,
            phoneLast4: m.phoneLast4,
          })),
        });
      }

      const target = matches[0];
      const extraItems = entities.extraItems?.trim() || "Extra item";
      await prisma.dailyOrder.upsert({
        where: {
          customerId_date: {
            customerId: target.id,
            date: targetDate,
          },
        },
        update: { status: "extra", extraItems },
        create: {
          customerId: target.id,
          date: targetDate,
          status: "extra",
          extraItems,
        },
      });

      const responseText =
        cookLang === "en"
          ? `Noted "${extraItems}" for ${target.name}.`
          : cookLang === "kn"
            ? `${target.name} ಅವರಿಗೆ "${extraItems}" ಸೇರಿಸಲಾಗಿದೆ.`
            : `${target.name} ke liye "${extraItems}" note kar liya hai.`;

      return buildResult({
        intent,
        entities: { ...entities, customerName: target.name, extraItems },
        responseText,
        confidence: parsed.confidence,
        actionPerformed: true,
        actionSummary: `${target.name}: ${extraItems}`,
        data: { customerId: target.id, extraItems },
      });
    }

    case "diet_change": {
      const matches = resolveCustomerMatches(entities.customerName, options.originalText, candidatesPool);
      if (matches.length === 0) {
        return buildResult({
          intent,
          entities,
          responseText: customerNotFoundMsg(entities.customerName, cookLang),
          confidence: parsed.confidence,
          actionPerformed: false,
        });
      }
      if (matches.length > 1) {
        return buildResult({
          intent,
          entities,
          responseText: disambiguationPrompt(entities.customerName || "", matches, cookLang),
          confidence: parsed.confidence,
          actionPerformed: false,
          needsDisambiguation: true,
          candidates: matches.map((m) => ({
            id: m.id,
            name: m.name,
            phoneLast4: m.phoneLast4,
          })),
        });
      }

      const target = matches[0];
      const newDiet = entities.dietaryPref || "jain";
      await prisma.customer.update({
        where: { id: target.id },
        data: { dietaryPref: newDiet },
      });

      const responseText =
        cookLang === "en"
          ? `Updated ${target.name}'s diet preference to ${getDietaryLabel(newDiet)}.`
          : cookLang === "kn"
            ? `${target.name} ಅವರ ಆಹಾರವನ್ನು ${getDietaryLabel(newDiet)} ಗೆ ಬದಲಾಯಿಸಲಾಗಿದೆ.`
            : `${target.name} ka khana ab ${getDietaryLabel(newDiet)} set kar diya hai.`;

      return buildResult({
        intent,
        entities: { ...entities, customerName: target.name, dietaryPref: newDiet },
        responseText,
        confidence: parsed.confidence,
        actionPerformed: true,
        actionSummary: `${target.name} diet → ${getDietaryLabel(newDiet)}`,
        data: { customerId: target.id, dietaryPref: newDiet },
      });
    }

    case "payment_check": {
      const payments = await prisma.payment.findMany({
        where: { month: currentMonth },
        include: { customer: true },
        orderBy: { createdAt: "asc" },
      });

      if (entities.customerName) {
        const custMatches = resolveCustomerMatches(
          entities.customerName,
          options.originalText,
          candidatesPool
        );
        if (custMatches.length === 1) {
          const target = custMatches[0];
          const p = payments.find((row) => row.customerId === target.id);
          if (p) {
            const remaining = Math.max(0, p.amount - p.paidAmount);
            const isPaid = p.status === "paid" || remaining === 0;
            const singleMsg = isPaid
              ? cookLang === "en"
                ? `${target.name} has already paid ₹${p.amount} for this month.`
                : cookLang === "kn"
                  ? `${target.name} ಈ ತಿಂಗಳ ₹${p.amount} ಪಾವತಿಸಿದ್ದಾರೆ.`
                  : `${target.name} ka is mahine ka ₹${p.amount} payment ho chuka hai.`
              : cookLang === "en"
                ? `${target.name} still owes ₹${remaining} this month.`
                : cookLang === "kn"
                  ? `${target.name} ಅವರಿಂದ ₹${remaining} ಬಾಕಿ ಇದೆ.`
                  : `${target.name} ka ₹${remaining} payment baaki hai.`;
            return buildResult({
              intent,
              entities: { ...entities, customerName: target.name },
              responseText: singleMsg,
              confidence: parsed.confidence,
              actionPerformed: false,
              actionSummary: isPaid ? `${target.name}: Paid` : `${target.name}: ₹${remaining} pending`,
              data: {
                pendingCount: isPaid ? 0 : 1,
                totalPending: remaining,
                pendingCustomers: isPaid
                  ? []
                  : [
                      {
                        id: p.id,
                        customerId: p.customerId,
                        name: target.name,
                        remaining,
                        language: p.customer.language,
                      },
                    ],
              },
            });
          }
        }
      }

      const pendingList = payments
        .filter((p) => p.status !== "paid" && p.amount - p.paidAmount > 0)
        .map((p) => ({
          id: p.id,
          customerId: p.customerId,
          name: p.customer.name,
          remaining: Math.max(0, p.amount - p.paidAmount),
          language: p.customer.language,
        }));

      const totalPending = pendingList.reduce((sum, p) => sum + p.remaining, 0);
      const responseText = formatPendingPaymentsSpeech(pendingList, totalPending, cookLang);

      return buildResult({
        intent,
        entities,
        responseText,
        confidence: parsed.confidence,
        actionPerformed: false,
        actionSummary: `${pendingList.length} pending (₹${totalPending})`,
        data: { pendingCount: pendingList.length, totalPending, pendingCustomers: pendingList },
      });
    }

    case "payment_remind": {
      const payments = await prisma.payment.findMany({
        where: { month: currentMonth, status: { not: "paid" } },
        include: { customer: true },
      });

      let targetPayments = payments;
      if (entities.customerName) {
        const matches = findMatchingCustomers(entities.customerName, candidatesPool);
        if (matches.length === 1) {
          targetPayments = payments.filter((p) => p.customerId === matches[0].id);
        }
      }

      if (targetPayments.length === 0) {
        const msg =
          cookLang === "en"
            ? "No pending payments need reminders right now."
            : cookLang === "kn"
              ? "ಸದ್ಯಕ್ಕೆ ಯಾವುದೇ ಬಾಕಿ ಪಾವತಿಗಳಿಲ್ಲ."
              : "Abhi kisi ka payment baaki nahi hai didi.";
        return buildResult({
          intent,
          entities,
          responseText: msg,
          confidence: parsed.confidence,
          actionPerformed: false,
        });
      }

      await prisma.payment.updateMany({
        where: { id: { in: targetPayments.map((p) => p.id) } },
        data: { reminderSent: true },
      });

      const names = targetPayments.map((p) => p.customer.name.split(" ")[0]).join(", ");
      const responseText =
        cookLang === "en"
          ? `Sent payment reminders to ${targetPayments.length} customers: ${names}.`
          : cookLang === "kn"
            ? `${targetPayments.length} ಗ್ರಾಹಕರಿಗೆ ಪಾವತಿ ನೆನಪಿಸುವ ಸಂದೇಶ ಕಳುಹಿಸಲಾಗಿದೆ: ${names}.`
            : `${targetPayments.length} customers ko payment reminder bhej diya hai: ${names}.`;

      return buildResult({
        intent,
        entities,
        responseText,
        confidence: parsed.confidence,
        actionPerformed: true,
        actionSummary: `Sent ${targetPayments.length} payment reminders`,
        data: { remindedCount: targetPayments.length },
      });
    }

    case "menu_broadcast": {
      const menuText = entities.menuText?.trim() || options.originalText.trim();
      const responseText =
        cookLang === "en"
          ? `Got the menu: "${menuText}". Open the Menu page to translate & broadcast to all active subscribers.`
          : cookLang === "kn"
            ? `ಮೆನು ಸಿಕ್ಕಿದೆ: "${menuText}". ಎಲ್ಲಾ ಗ್ರಾಹಕರಿಗೆ ಕಳುಹಿಸಲು Menu ಪುಟವನ್ನು ತೆರೆಯಿರಿ.`
            : `Menu note kar liya: "${menuText}". Sabhi customers ko unki bhasha mein bhejne ke liye Menu tab kholein.`;

      return buildResult({
        intent,
        entities: { ...entities, menuText },
        responseText,
        confidence: parsed.confidence,
        actionPerformed: false,
        actionSummary: "Menu draft captured",
        data: { menuText },
      });
    }

    case "greeting": {
      const responseText =
        tierUsed !== "basic" && parsed.responseText
          ? parsed.responseText
          : cookLang === "en"
            ? `Namaste ${cook.name.split(" ")[0]}! How can I help in your kitchen today?`
            : cookLang === "kn"
              ? `ನಮಸ್ಕಾರ ${cook.name.split(" ")[0]} ಅಕ್ಕ! ಇಂದು ಅಡುಗೆಮನೆಯಲ್ಲಿ ಏನು ಸಹಾಯ ಬೇಕು?`
              : `Namaste ${cook.name.split(" ")[0]} didi! Boliye, aaj kya madad chahiye?`;
      return buildResult({
        intent,
        entities,
        responseText,
        confidence: parsed.confidence,
        actionPerformed: false,
      });
    }

    default: {
      const responseText =
        tierUsed !== "basic" && parsed.responseText
          ? parsed.responseText
          : cookLang === "en"
            ? "Sorry, I didn't catch that. Try asking: 'How many tiffins today?', 'Who hasn't paid?', or 'Skip Amit today'."
            : cookLang === "kn"
              ? "ಕ್ಷಮಿಸಿ, ಅರ್ಥವಾಗಲಿಲ್ಲ. ಹೀಗೆ ಕೇಳಿ: 'ಇಂದು ಎಷ್ಟು ಟಿಫಿನ್?', 'ಯಾರು ಪಾವತಿ ಮಾಡಿಲ್ಲ?'"
              : "Didi, samajh nahi aaya, ek baar aur boliye. Jaise: 'Aaj kitne tiffin?', 'Kisne payment nahi kiya?', ya 'Amit aaj skip kardo'.";
      return buildResult({
        intent: "unknown",
        entities,
        responseText,
        confidence: parsed.confidence,
        actionPerformed: false,
      });
    }
  }
}
