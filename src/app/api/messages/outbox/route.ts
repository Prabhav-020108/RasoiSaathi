import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { deliverInSimulator, supportedChatLanguage } from "@/lib/chat-delivery";
import { geminiTranslate, resolveGeminiKey } from "@/lib/gemini";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const text = typeof body?.text === "string" ? body.text.trim().slice(0, 4000) : "";
  const sender = typeof body?.recipientName === "string" ? body.recipientName.trim().slice(0, 100) : "";
  if (!text || !sender) return NextResponse.json({ error: "Recipient and message are required" }, { status: 400 });
  const [cook, customer] = await Promise.all([
    prisma.cook.findFirst(),
    typeof body.customerId === "string" ? prisma.customer.findUnique({ where: { id: body.customerId } }) : null,
  ]);
  if (typeof body.customerId === "string" && !customer) return NextResponse.json({ error: "Customer not found" }, { status: 404 });
  const sourceLanguage = supportedChatLanguage(cook?.language ?? "hi");
  const target = supportedChatLanguage(customer?.language ?? body.language ?? sourceLanguage);
  let translated = text;
  let language = sourceLanguage;
  if (target !== sourceLanguage) {
    const key = resolveGeminiKey();
    try {
      const value = key
        ? (await geminiTranslate(text, sourceLanguage, target, key)).translated
        : typeof body.localTranslation === "string" ? body.localTranslation.slice(0, 4000) : "";
      if (value.trim() && value.trim() !== text) {
        translated = value.trim();
        language = target;
      }
    } catch { /* Keep the original and its actual language on provider failure. */ }
  }
  const delivery = await deliverInSimulator(prisma, {
    recipientName: customer?.name ?? sender, customerId: customer?.id, kind: "manual",
    sourceText: text, sourceLanguage, text: translated, language,
  });
  return NextResponse.json({ delivery, translationUnavailable: target !== language }, { status: 201 });
}
