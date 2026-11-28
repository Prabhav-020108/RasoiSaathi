import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildMenuTranslations, parseTranslationsJson, readLocalMenuTranslations } from "@/lib/menu-broadcast";
import { deliverInSimulator, supportedChatLanguage } from "@/lib/chat-delivery";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: NextRequest,
  context: { params: { id: string } }
) {
  try {
    let body: Record<string, unknown> = {};
    try {
      const raw = await request.text();
      if (raw.trim()) {
        body = JSON.parse(raw) as Record<string, unknown>;
      }
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const existing = await prisma.menuBroadcast.findUnique({
      where: { id: context.params.id },
    });
    if (!existing) {
      return NextResponse.json({ error: "Broadcast not found" }, { status: 404 });
    }
    const cook = await prisma.cook.findFirst();
    const sourceLanguage = supportedChatLanguage(existing.sourceLanguage ?? cook?.language ?? "hi");
    const audienceIds = existing.audienceIds ? JSON.parse(existing.audienceIds) as string[] : undefined;
    const customers = await prisma.customer.findMany({
      where: { cookId: cook?.id, status: "active", ...(audienceIds ? { id: { in: audienceIds } } : {}) },
      select: { id: true, name: true, language: true },
    });
    if (body.action === "revise") {
      const menuText = typeof body.menuText === "string" ? body.menuText.trim() : "";
      if (!menuText || existing.sentAt) {
        return NextResponse.json({ error: "An unsent menu and revised text are required" }, { status: 409 });
      }
      const fullText = existing.jainNote ? `${menuText}\n${existing.jainNote}` : menuText;
      const language = typeof body.sourceLanguage === "string" ? supportedChatLanguage(body.sourceLanguage) : sourceLanguage;
      const translations = body.deferTranslation === true ? { [language]: fullText } : await buildMenuTranslations(
        fullText,
        language, customers.map(({ language }) => language), undefined,
        readLocalMenuTranslations(body.localTranslations)
      );
      const changed = await prisma.menuBroadcast.updateMany({
        where: { id: existing.id, sentAt: null },
        data: { menuText, sourceLanguage: language, translations: JSON.stringify(translations) },
      });
      return changed.count ? NextResponse.json({ saved: true }) : NextResponse.json({ error: "The menu already went out" }, { status: 409 });
    }

    let sentAt = new Date();
    if (typeof body.sentAt === "string" && body.sentAt.trim()) {
      const parsed = new Date(body.sentAt);
      if (Number.isNaN(parsed.getTime())) {
        return NextResponse.json({ error: "Invalid sentAt date" }, { status: 400 });
      }
      sentAt = parsed;
    }

    const sourceText = existing.jainNote ? `${existing.menuText}\n${existing.jainNote}` : existing.menuText;
    const translations = parseTranslationsJson(existing.translations);
    if (!existing.sentAt && customers.some(({ language }) => !translations[language])) {
      Object.assign(translations, await buildMenuTranslations(sourceText, sourceLanguage, customers.map(({ language }) => language)));
    }
    const updated = await prisma.$transaction(async (db) => {
      const current = await db.menuBroadcast.findUniqueOrThrow({ where: { id: existing.id } });
      if (current.sentAt) return current;
      if (current.menuText !== existing.menuText || current.translations !== existing.translations) return null;
      for (const customer of customers) {
        const preview = translations[customer.language];
        const localized = Boolean(preview && !preview.endsWith(" (Original - translate with Gemini API)") &&
          (preview !== sourceText || customer.language === sourceLanguage));
        await deliverInSimulator(db, {
          id: `menu:${existing.id}:${customer.id}`, customerId: customer.id, recipientName: customer.name,
          kind: "menu", sourceText, sourceLanguage,
          text: localized ? preview : sourceText, language: localized ? customer.language : sourceLanguage,
        });
      }
      return db.menuBroadcast.update({
        where: { id: existing.id },
        data: { sentAt, translations: JSON.stringify(translations) },
      });
    });
    if (!updated) return NextResponse.json({ error: "The menu changed. Review it before sending." }, { status: 409 });

    return NextResponse.json({
      recipientCount: customers.length,
      broadcast: {
        id: updated.id,
        date: updated.date,
        menuText: updated.menuText,
        translations: parseTranslationsJson(updated.translations),
        jainNote: updated.jainNote,
        sentAt: updated.sentAt,
        createdAt: updated.createdAt,
      },
    });
  } catch (error) {
    console.error("PATCH /api/menu/broadcast/[id] failed:", error);
    return NextResponse.json({ error: "Failed to update broadcast" }, { status: 500 });
  }
}
