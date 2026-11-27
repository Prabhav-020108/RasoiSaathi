import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildMenuTranslations, parseTranslationsJson, readLocalMenuTranslations } from "@/lib/menu-broadcast";

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
    if (body.action === "revise") {
      const menuText = typeof body.menuText === "string" ? body.menuText.trim() : "";
      if (!menuText || existing.sentAt) {
        return NextResponse.json({ error: "An unsent menu and revised text are required" }, { status: 409 });
      }
      const cook = await prisma.cook.findFirst();
      const customers = await prisma.customer.findMany({ where: { status: "active" }, select: { language: true } });
      const translations = await buildMenuTranslations(
        existing.jainNote ? `${menuText}\n${existing.jainNote}` : menuText,
        cook?.language ?? "hi", customers.map(({ language }) => language), undefined,
        readLocalMenuTranslations(body.localTranslations)
      );
      const changed = await prisma.menuBroadcast.updateMany({
        where: { id: existing.id, sentAt: null },
        data: { menuText, translations: JSON.stringify(translations) },
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

    const updated = await prisma.menuBroadcast.update({
      where: { id: context.params.id },
      data: { sentAt: existing.sentAt ?? sentAt },
    });

    return NextResponse.json({
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
