import { NextRequest, NextResponse } from "next/server";
import { geminiTranslate, resolveGeminiKey } from "@/lib/gemini";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    let body: Record<string, unknown>;
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const text = typeof body.text === "string" ? body.text.trim() : "";
    const fromLang = typeof body.fromLang === "string" ? body.fromLang.trim() : "auto";
    const toLang = typeof body.toLang === "string" ? body.toLang.trim() : "hi";

    if (!text) {
      return NextResponse.json({ error: "Text is required" }, { status: 400 });
    }

    const geminiKey = resolveGeminiKey();
    if (!geminiKey) {
      return NextResponse.json({
        translated: text,
        tierUsed: "basic",
        notice: "AI not configured — showing original text",
      });
    }

    try {
      const result = await geminiTranslate(text, fromLang, toLang, geminiKey);
      return NextResponse.json({
        translated: result.translated,
        detectedLang: result.detectedLang,
        tierUsed: "gemini",
      });
    } catch (err) {
      console.warn("Gemini translate failed, returning original text:", err);
      return NextResponse.json({
        translated: text,
        tierUsed: "basic",
        notice: "Translation failed — showing original text",
      });
    }
  } catch (error) {
    console.error("POST /api/translate failed:", error);
    return NextResponse.json({ error: "Translation request failed" }, { status: 500 });
  }
}
