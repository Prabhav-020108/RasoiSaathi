import { NextRequest, NextResponse } from "next/server";
import { processMessageRecord } from "@/lib/message-processor";
import type { ParsedCommand } from "@/lib/voice-fallback";

export const dynamic = "force-dynamic";

export async function POST(
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

    const tierHint = typeof body.tierHint === "string" ? body.tierHint : undefined;
    const localParsed =
      body.localParsed && typeof body.localParsed === "object"
        ? (body.localParsed as ParsedCommand)
        : null;

    const result = await processMessageRecord(context.params.id, {
      tierHint,
      localParsed,
    });

    if (!result) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("POST /api/messages/[id]/process failed:", error);
    return NextResponse.json(
      { error: "Failed to process message" },
      { status: 500 }
    );
  }
}
