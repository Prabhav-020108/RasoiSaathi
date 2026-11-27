import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildMenuTranslations, parseTranslationsJson } from "@/lib/menu-broadcast";
import { getTodayUTC } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const records = await prisma.menuBroadcast.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
    });

    const broadcasts = records.map((b) => ({
      id: b.id,
      date: b.date,
      menuText: b.menuText,
      translations: parseTranslationsJson(b.translations),
      jainNote: b.jainNote,
      sentAt: b.sentAt,
      createdAt: b.createdAt,
    }));

    return NextResponse.json({ broadcasts });
  } catch (error) {
    console.error("GET /api/menu/broadcast failed:", error);
    return NextResponse.json({ error: "Failed to load broadcasts" }, { status: 500 });
  }
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

    const menuText = typeof body.menuText === "string" ? body.menuText.trim() : "";
    if (!menuText) {
      return NextResponse.json({ error: "menuText is required" }, { status: 400 });
    }

    const jainNote =
      typeof body.jainNote === "string" && body.jainNote.trim()
        ? body.jainNote.trim()
        : null;

    const fullMenuText = jainNote ? `${menuText}\n${jainNote}` : menuText;

    const clientApiKey =
      (typeof body.apiKey === "string" ? body.apiKey : null) ??
      request.headers.get("x-gemini-key");

    const [cook, activeCustomers] = await Promise.all([
      prisma.cook.findFirst(),
      prisma.customer.findMany({
        where: { status: "active" },
        select: { language: true },
      }),
    ]);

    const cookLang = cook?.language || "hi";
    const targetLanguages = Array.from(
      new Set(activeCustomers.map((c) => c.language).filter(Boolean))
    );

    const translationsMap = await buildMenuTranslations(
      fullMenuText,
      cookLang,
      targetLanguages,
      clientApiKey
    );

    const tomorrowUTC = new Date(getTodayUTC().getTime() + 24 * 60 * 60 * 1000);
    let targetDate = tomorrowUTC;
    if (typeof body.targetDate === "string" && body.targetDate.trim()) {
      const parsed = new Date(body.targetDate);
      if (!Number.isNaN(parsed.getTime())) {
        targetDate = parsed;
      }
    }

    const created = await prisma.menuBroadcast.create({
      data: {
        date: targetDate,
        menuText,
        translations: JSON.stringify(translationsMap),
        jainNote,
      },
    });

    return NextResponse.json(
      {
        broadcast: {
          id: created.id,
          menuText: created.menuText,
          translations: translationsMap,
          jainNote: created.jainNote,
          date: created.date,
          sentAt: created.sentAt,
          createdAt: created.createdAt,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/menu/broadcast failed:", error);
    return NextResponse.json({ error: "Failed to create menu broadcast" }, { status: 500 });
  }
}
