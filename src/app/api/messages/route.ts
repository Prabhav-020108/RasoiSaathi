import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const messages = await prisma.message.findMany({
      include: {
        customer: {
          select: { id: true, name: true, language: true, dietaryPref: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const newCount = messages.filter((m) => m.status === "new").length;
    const processedCount = messages.filter((m) => m.status === "processed").length;

    return NextResponse.json({
      counts: {
        total: messages.length,
        new: newCount,
        processed: processedCount,
      },
      messages,
    });
  } catch (error) {
    console.error("GET /api/messages failed:", error);
    return NextResponse.json({ error: "Failed to load messages" }, { status: 500 });
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

    const senderName = typeof body.senderName === "string" ? body.senderName.trim() : "";
    const originalText = typeof body.originalText === "string" ? body.originalText.trim() : "";
    const originalLang =
      typeof body.originalLang === "string" && body.originalLang.trim()
        ? body.originalLang.trim()
        : "en";

    if (!senderName || !originalText) {
      return NextResponse.json(
        { error: "senderName and originalText are required" },
        { status: 400 }
      );
    }

    const matchedCustomer = await prisma.customer.findFirst({
      where: {
        name: { contains: senderName },
      },
    });

    const created = await prisma.message.create({
      data: {
        customerId: matchedCustomer?.id ?? null,
        senderName,
        originalText,
        originalLang,
        status: "new",
      },
    });

    return NextResponse.json({ message: created }, { status: 201 });
  } catch (error) {
    console.error("POST /api/messages failed:", error);
    return NextResponse.json({ error: "Failed to add message" }, { status: 500 });
  }
}
