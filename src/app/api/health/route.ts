import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isConfiguredGeminiKey } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET() {
  const geminiConfigured = isConfiguredGeminiKey(process.env.GEMINI_API_KEY);
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({
      status: "ok",
      db: "connected",
      geminiConfigured,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Health check failed:", error);
    return NextResponse.json(
      {
        status: "error",
        db: "disconnected",
        geminiConfigured,
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
