import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDailyTally } from "@/lib/tally";
import { getCurrentMonthKey, getTodayUTC } from "@/lib/utils";
import { confirmVoiceApproval, prepareVoiceApproval } from "@/lib/voice-approval";
import { ensureMonthlyBills } from "@/lib/payment-receipts";
import { geminiProcess, resolveGeminiKey, type GeminiVoiceContext } from "@/lib/gemini";
import { executeVoiceIntent } from "@/lib/voice-actions";
import { keywordProcess, type FallbackIntent, type ParsedCommand } from "@/lib/voice-fallback";
import { kitchenFastPath } from "@/lib/kitchen-fast-path";

export const dynamic = "force-dynamic";

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

function normalizeLocalParsed(raw: unknown): ParsedCommand | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const obj = raw as Record<string, unknown>;
  const intent = typeof obj.intent === "string" ? obj.intent.trim() : "";
  if (!VALID_INTENTS.has(intent as FallbackIntent)) return null;

  const rawEntities =
    obj.entities && typeof obj.entities === "object"
      ? (obj.entities as Record<string, unknown>)
      : {};

  const priceNum = Number(rawEntities.price);
  const daysNum = Number(rawEntities.days);
  const paymentAmount = Number(rawEntities.paymentAmount ?? rawEntities.payment_amount);

  return {
    intent: intent as FallbackIntent,
    entities: {
      ...(typeof rawEntities.customerName === "string" && rawEntities.customerName.trim()
        ? { customerName: rawEntities.customerName.trim() }
        : typeof rawEntities.customer_name === "string" && rawEntities.customer_name.trim()
          ? { customerName: rawEntities.customer_name.trim() }
          : {}),
      ...(typeof rawEntities.dietaryPref === "string" && rawEntities.dietaryPref.trim()
        ? { dietaryPref: rawEntities.dietaryPref.trim() }
        : typeof rawEntities.dietary_pref === "string" && rawEntities.dietary_pref.trim()
          ? { dietaryPref: rawEntities.dietary_pref.trim() }
          : {}),
      ...(Number.isFinite(priceNum) && priceNum > 0 ? { price: Math.round(priceNum) } : {}),
      ...(Number.isSafeInteger(paymentAmount) && paymentAmount > 0 ? { paymentAmount } : {}),
      ...(typeof rawEntities.deliveryNote === "string" ? { deliveryNote: rawEntities.deliveryNote.slice(0, 500) } : {}),
      ...(typeof rawEntities.extraItems === "string" && rawEntities.extraItems.trim()
        ? { extraItems: rawEntities.extraItems.trim() }
        : typeof rawEntities.extra_items === "string" && rawEntities.extra_items.trim()
          ? { extraItems: rawEntities.extra_items.trim() }
          : {}),
      ...(rawEntities.date === "tomorrow" || rawEntities.date === "today"
        ? { date: rawEntities.date }
        : {}),
      ...(Number.isFinite(daysNum) && daysNum > 0 ? { days: Math.round(daysNum) } : {}),
      ...(typeof rawEntities.language === "string" && rawEntities.language.trim()
        ? { language: rawEntities.language.trim() }
        : {}),
      ...(typeof rawEntities.menuText === "string" && rawEntities.menuText.trim()
        ? { menuText: rawEntities.menuText.trim() }
        : {}),
      ...(rawEntities.permanent === true ? { permanent: true } : {}),
    },
    confidence:
      typeof obj.confidence === "number" && Number.isFinite(obj.confidence)
        ? obj.confidence
        : 0.78,
    responseText: typeof obj.responseText === "string" ? obj.responseText : undefined,
    detectedLanguage:
      typeof obj.detectedLanguage === "string" ? obj.detectedLanguage : undefined,
  };
}

export async function POST(request: NextRequest) {
  try {
    let body: Record<string, unknown>;
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "Request body must be a JSON object" }, { status: 400 });
    }
    if (typeof body.confirmationToken === "string") {
      const confirmed = await confirmVoiceApproval(body.confirmationToken);
      return confirmed ? NextResponse.json(confirmed)
        : NextResponse.json({ error: "Confirmation expired. Please repeat the request." }, { status: 409 });
    }

    const text = typeof body.text === "string" ? body.text.trim() : "";
    if (!text) {
      return NextResponse.json({ error: "Voice command text is required" }, { status: 400 });
    }

    const geminiKey = resolveGeminiKey();

    await ensureMonthlyBills();
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

    const cookLang =
      typeof body.cookLang === "string" && body.cookLang.trim()
        ? body.cookLang.trim()
        : cook?.language || "hi";

    const pendingCustomers = payments
      .filter((p) => p.status !== "paid" && p.amount - p.paidAmount > 0)
      .map((p) => ({
        name: p.customer.name,
        remaining: Math.max(0, p.amount - p.paidAmount),
      }));

    let parsed: ParsedCommand | null = body.kitchen ? kitchenFastPath(text, customers) : null;
    let tierUsed: "gemini" | "local" | "basic" = "basic";
    let fallbackReason: string | undefined;

    // 1. Pre-parsed Tier 2 (RunAnywhere local LLM in browser)
    const localParsed = normalizeLocalParsed(body.localParsed);
    if (!parsed && localParsed && !geminiKey) {
      parsed = localParsed;
      tierUsed = "local";
    }

    // 2. Tier 1 Gemini Cloud AI
    if (!parsed) {
      if (geminiKey) {
        try {
          const context: GeminiVoiceContext = {
            cookName: cook?.name || "Sunita Devi",
            cookLang,
            defaultPrice: cook?.defaultPrice ?? 3000,
            todayISO: getTodayUTC().toISOString().slice(0, 10),
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

          parsed = await geminiProcess(text, cookLang, context, geminiKey);
          tierUsed = "gemini";
        } catch (err) {
          console.warn("Gemini voice parse failed; using Basic Mode.");
          fallbackReason = "Cloud AI unavailable; using Basic Mode.";
        }
      }
    }

    // 3. Tier 3 Rule-based keyword fallback
    if (!parsed) {
      parsed = keywordProcess(
        text,
        customers.map((c) => ({ id: c.id, name: c.name, phone: c.phone }))
      );
      tierUsed = "basic";
    }

    if (body.kitchen) {
      const receipt = text.match(/^(.+?)\s+(?:paid|भुगतान किया|ने दिए|ಪಾವತಿಸಿದರು|செலுத்தினார்|చెల్లించారు|ने भरले)\s*(?:₹|rs\.?\s*)?([0-9,]+)\s*(?:rupees|रुपये|ರೂಪಾಯಿ|ரூபாய்|రూపాయలు)?[.]?$/i);
      if (receipt) {
        parsed = {
          intent: "payment_record", confidence: 1,
          entities: { customerName: receipt[1].trim(), paymentAmount: Number(receipt[2].replaceAll(",", "")) },
        };
      }
      if (typeof body.lastCustomer === "string" && /\b(her|him|them)\b|उसे|ಅವರಿಗೆ|அவரை|వారిని|त्यांना/i.test(text)) {
        parsed.entities.customerName = body.lastCustomer;
      }
      if (["payment_record", "remove_customer", "payment_remind"].includes(parsed.intent) ||
          (parsed.intent === "cancel" && parsed.entities.permanent)) {
        return NextResponse.json(await prepareVoiceApproval({ parsed, cookLang, tierUsed, originalText: text }));
      }
    }
    const result = await executeVoiceIntent(parsed, {
      cookLang,
      tierUsed,
      originalText: text,
      deferMenuTranslation: body.kitchen === true,
    });

    return NextResponse.json({
      ...result,
      needsCustomerName: body.kitchen === true && parsed.intent === "add_customer" && !parsed.entities.customerName,
      tierUsed,
      detectedLanguage: parsed.detectedLanguage || cookLang,
      ...(fallbackReason ? { fallbackReason } : {}),
    });
  } catch (error) {
    console.error("POST /api/voice/process failed:", error);
    return NextResponse.json(
      { error: "Failed to process voice command" },
      { status: 500 }
    );
  }
}
