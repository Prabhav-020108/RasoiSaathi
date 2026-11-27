import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const cook = await prisma.cook.findFirst();
    if (!cook) {
      return NextResponse.json({ cook: null }, { status: 200 });
    }
    return NextResponse.json({ cook });
  } catch (error) {
    console.error("GET /api/cook failed:", error);
    return NextResponse.json({ error: "Failed to load cook profile" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
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

    const name = typeof body.name === "string" ? body.name.trim() : undefined;
    const phone = typeof body.phone === "string" ? body.phone.trim() : undefined;
    const language = typeof body.language === "string" ? body.language.trim() : undefined;
    const defaultPrice =
      body.defaultPrice !== undefined ? Number(body.defaultPrice) : undefined;

    if (defaultPrice !== undefined && (!Number.isFinite(defaultPrice) || defaultPrice < 0)) {
      return NextResponse.json({ error: "Invalid defaultPrice" }, { status: 400 });
    }

    const existing = await prisma.cook.findFirst();
    if (!existing) {
      const created = await prisma.cook.create({
        data: {
          name: name || "Sunita Devi",
          phone: phone || "+91 98765 43210",
          language: language || "hi",
          defaultPrice: defaultPrice ?? 3000,
        },
      });
      return NextResponse.json({ cook: created });
    }

    const updated = await prisma.cook.update({
      where: { id: existing.id },
      data: {
        ...(name !== undefined && name.length > 0 ? { name } : {}),
        ...(phone !== undefined && phone.length > 0 ? { phone } : {}),
        ...(language !== undefined && language.length > 0 ? { language } : {}),
        ...(defaultPrice !== undefined ? { defaultPrice: Math.round(defaultPrice) } : {}),
      },
    });

    return NextResponse.json({ cook: updated });
  } catch (error) {
    console.error("PUT /api/cook failed:", error);
    return NextResponse.json({ error: "Failed to update cook profile" }, { status: 500 });
  }
}
