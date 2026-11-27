import { NextRequest, NextResponse } from "next/server";
import { approveMessageRecord, processMessageRecord } from "@/lib/message-processor";
import { prisma } from "@/lib/prisma";
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
        const parsed: unknown = JSON.parse(raw);
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("Expected a JSON object");
        body = parsed as Record<string, unknown>;
      }
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const tierHint = typeof body.tierHint === "string" ? body.tierHint : undefined;
    const localParsed =
      body.localParsed && typeof body.localParsed === "object"
        ? (body.localParsed as ParsedCommand)
        : null;

    const id = context.params.id;
    if (body.action === "saveReply" || body.action === "approveReply") {
      const reply = typeof body.reply === "string" ? body.reply.trim() : "";
      if (body.action === "saveReply" && !reply) {
        return NextResponse.json({ error: "Reply text is required" }, { status: 400 });
      }
      const changed = await prisma.message.updateMany({
        where: { id, ...(body.action === "approveReply" ? { autoReply: { not: null } } : {}) },
        data: body.action === "approveReply"
          ? { replyApprovedAt: new Date() }
          : { autoReply: reply.slice(0, 4000), replyApprovedAt: null },
      });
      return changed.count ? NextResponse.json({ saved: true }) : NextResponse.json({ error: "Message or reply not found" }, { status: 404 });
    }
    const result = body.action === "approve"
      ? await approveMessageRecord(id, typeof body.proposal === "string" ? body.proposal : undefined)
      : await processMessageRecord(id, {
      tierHint,
      localParsed,
      localTranslation: typeof body.localTranslation === "string" ? body.localTranslation : undefined,
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
