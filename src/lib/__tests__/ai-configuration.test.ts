import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { resolveEffectiveAITier } from "../ai-provider";
import { keywordProcess } from "../voice-fallback";
import { POST as translate } from "../../app/api/translate/route";

describe("server-managed AI configuration", () => {
  it("uses Gemini when configured, regardless of remembered fallback preference", () => {
    const originalWindow = globalThis.window;
    Object.defineProperty(globalThis, "window", { configurable: true, value: {
      localStorage: { getItem: () => "basic" },
    } });
    try {
      assert.deepEqual(resolveEffectiveAITier(true), { tier: "gemini", needsSetupPrompt: false });
      assert.deepEqual(resolveEffectiveAITier(false), { tier: "basic", needsSetupPrompt: false });
    } finally {
      if (originalWindow === undefined) Reflect.deleteProperty(globalThis, "window");
      else Object.defineProperty(globalThis, "window", { configurable: true, value: originalWindow });
    }
  });

  it("ignores client API keys and returns a no-key translation fallback", async () => {
    const originalKey = process.env.GEMINI_API_KEY;
    process.env.GEMINI_API_KEY = "";
    try {
      const response = await translate(new NextRequest("http://localhost/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-gemini-key": "ignored-client-key" },
        body: JSON.stringify({ text: "Skip tomorrow", apiKey: "ignored-body-key", toLang: "hi" }),
      }));
      assert.equal(response.status, 200);
      assert.equal((await response.json()).tierUsed, "basic");
    } finally {
      if (originalKey === undefined) delete process.env.GEMINI_API_KEY;
      else process.env.GEMINI_API_KEY = originalKey;
    }
  });
});

describe("payment receipt intent safety", () => {
  const customers = [{ id: "priya", name: "Priya Sharma" }];
  it("recognizes explicit full-payment commands", () => {
    for (const text of ["Priya ka payment aa gaya", "Mark Priya payment paid", "Priya payment received"]) {
      assert.equal(keywordProcess(text, customers).intent, "payment_record", text);
    }
  });
  it("never marks questions, negations, or partial receipts fully paid", () => {
    for (const text of ["Has Priya payment received?", "Priya ka payment nahi aaya", "Priya payment received 1000", "Priya partial payment received"]) {
      assert.notEqual(keywordProcess(text, customers).intent, "payment_record", text);
    }
  });
  it("keeps menu items from becoming individual customer order changes", () => {
    const parsed = keywordProcess("Kal ka menu: Jain dal, extra paneer, rice", customers);
    assert.equal(parsed.intent, "menu_broadcast");
    assert.equal(parsed.entities.menuText, "Jain dal, extra paneer, rice");
  });
});
