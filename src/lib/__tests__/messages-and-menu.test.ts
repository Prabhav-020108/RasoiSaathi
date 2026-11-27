import { describe, it, mock } from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { getAutoReplyForIntent } from "../message-processor";
import { buildMenuTranslations, parseTranslationsJson } from "../menu-broadcast";
import { getDictionary } from "../../i18n";
import { prisma } from "../prisma";
import { POST as postMessage } from "../../app/api/messages/route";
import { GET as getMenuBroadcasts } from "../../app/api/menu/broadcast/route";

describe("Messages & Menu Broadcast (Day 3)", () => {
  it("POST /api/messages returns 400 when senderName or originalText is missing", async () => {
    const reqMissingSender = new NextRequest("http://localhost:3000/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ senderName: "", originalText: "Skip today" }),
    });
    const res1 = await postMessage(reqMissingSender);
    assert.equal(res1.status, 400);

    const reqMissingText = new NextRequest("http://localhost:3000/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ senderName: "Amit", originalText: "   " }),
    });
    const res2 = await postMessage(reqMissingText);
    assert.equal(res2.status, 400);
  });

  it("getAutoReplyForIntent covers all 7 core intents without Gemini key", () => {
    const intents = ["skip", "cancel", "pause", "extra", "payment", "greeting", "unknown"];
    for (const intent of intents) {
      const reply = getAutoReplyForIntent(intent, "hi");
      assert.ok(reply.length > 0, `Expected non-empty reply for ${intent}`);
    }
    assert.equal(
      getAutoReplyForIntent("skip", "hi"),
      "Theek hai! Aaj ka tiffin band kar diya. 🙏"
    );
    assert.equal(
      getAutoReplyForIntent("extra", "hi"),
      "Extra tiffin note kar liya! 🍱"
    );
  });

  it("buildMenuTranslations returns original text + suffix when Gemini key is absent", async () => {
    const originalEnvKey = process.env.GEMINI_API_KEY;
    process.env.GEMINI_API_KEY = "";
    try {
      const res = await buildMenuTranslations("Dal tadka, jeera rice", "hi", ["en", "kn"], null);
      assert.equal(res.hi, "Dal tadka, jeera rice");
      assert.equal(
        res.en,
        "Dal tadka, jeera rice (Original - translate with Gemini API)"
      );
      assert.equal(
        res.kn,
        "Dal tadka, jeera rice (Original - translate with Gemini API)"
      );
    } finally {
      if (originalEnvKey !== undefined) {
        process.env.GEMINI_API_KEY = originalEnvKey;
      } else {
        delete process.env.GEMINI_API_KEY;
      }
    }
  });

  it("GET /api/menu/broadcast returns broadcasts array", async () => {
    const originalFindMany = prisma.menuBroadcast.findMany;
    const mockFindMany = mock.fn(async () => [
      {
        id: "b1",
        date: new Date("2026-11-28T00:00:00Z"),
        menuText: "Dal tadka, jeera rice",
        translations: JSON.stringify({ hi: "Dal tadka, jeera rice" }),
        jainNote: null,
        sentAt: null,
        createdAt: new Date("2026-11-27T10:00:00Z"),
      },
    ]);
    (prisma.menuBroadcast as unknown as { findMany: typeof mockFindMany }).findMany = mockFindMany;

    try {
      const res = await getMenuBroadcasts();
      assert.equal(res.status, 200);
      const body = (await res.json()) as { broadcasts: Array<{ id: string; translations: Record<string, string> }> };
      assert.ok(Array.isArray(body.broadcasts));
      assert.equal(body.broadcasts.length, 1);
      assert.equal(body.broadcasts[0].id, "b1");
      assert.equal(body.broadcasts[0].translations.hi, "Dal tadka, jeera rice");
    } finally {
      (prisma.menuBroadcast as unknown as { findMany: typeof originalFindMany }).findMany =
        originalFindMany;
    }
  });

  it("i18n dictionaries include hi, en, kn, ta, te with messages and menu sections", () => {
    for (const code of ["hi", "en", "kn", "ta", "te"]) {
      const d = getDictionary(code);
      assert.ok(d.messages.title.length > 0, `Missing messages.title for ${code}`);
      assert.ok(d.menu.title.length > 0, `Missing menu.title for ${code}`);
    }
    assert.deepEqual(parseTranslationsJson("invalid"), {});
  });
});
