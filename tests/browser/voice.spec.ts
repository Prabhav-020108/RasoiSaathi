import { expect, test, type Page } from "@playwright/test";

async function emitSpeech(page: Page, text: string, final = true, confidence = 0.95) {
  await page.waitForFunction(() => Boolean((window as unknown as { recognition?: { onresult?: unknown } }).recognition?.onresult));
  await page.evaluate(({ text, final, confidence }) => {
    const w = window as unknown as {
      recognition: { onresult: (e: unknown) => void };
    };
    const handler = w.recognition.onresult;
    const event = { results: [{ isFinal: final, 0: { transcript: text, confidence } }] };
    handler(event);
    if (final) handler(event); // Late duplicate callbacks must be ignored.
  }, { text, final, confidence });
}

test.beforeEach(async ({ page, request }) => {
  expect((await request.post("/api/demo/reset")).ok()).toBeTruthy();
  await page.addInitScript(() => {
    const w = window as unknown as Record<string, unknown>;
    class Recognition {
      onstart: (() => void) | null = null;
      onresult: ((e: unknown) => void) | null = null;
      onerror: ((e: unknown) => void) | null = null;
      onend: (() => void) | null = null;
      start() { w.recognition = this; this.onstart?.(); }
      stop() { this.onend?.(); }
      abort() { this.onend?.(); }
    }
    w.SpeechRecognition = Recognition;
    w.spoken = [];
    Object.defineProperty(window, "speechSynthesis", { value: {
      cancel() {}, getVoices() { return []; },
      speak(u: SpeechSynthesisUtterance) {
        (w.spoken as string[]).push(u.text);
        u.onstart?.(new Event("start") as SpeechSynthesisEvent);
        setTimeout(() => u.onend?.(new Event("end") as SpeechSynthesisEvent), 10);
      },
    } });
  });
});

test("Kitchen Mode rearms and requires a spoken confirmation for a partial receipt", async ({ page, request }) => {
  await request.put("/api/cook", { data: { language: "en" } });
  await page.goto("/");
  await page.getByRole("button", { name: "Start Kitchen Mode" }).click();
  await emitSpeech(page, "Skip Priya today");
  await emitSpeech(page, "RasoiSaathi");
  await expect(page.getByText("I'm listening.", { exact: true }).first()).toBeVisible();
  await emitSpeech(page, "How many tiffins today?");
  await expect(page.getByText(/Today you have 8 tiffins/)).toBeVisible();
  await emitSpeech(page, "RasoiSaathi Priya paid 1000");
  await expect(page.getByText(/Priya Sharma.*₹1000.*Say yes/)).toBeVisible();
  const getDue = async () => {
    const { payments } = await (await request.get("/api/payments")).json();
    return payments.find((payment: { customer: { name: string } }) => payment.customer.name === "Priya Sharma").paidAmount;
  };
  expect(await getDue()).toBe(0);
  await emitSpeech(page, "yes");
  await expect.poll(getDue).toBe(1000);
  await emitSpeech(page, "stop kitchen mode");
  await expect(page.getByRole("button", { name: "Start Kitchen Mode" })).toBeVisible();
});

test("Kitchen Mode reads a new Hindi skip in Kannada and waits for approval", async ({ page, request }) => {
  await request.put("/api/cook", { data: { language: "kn" } });
  await page.goto("/");
  await page.getByRole("button", { name: "ಅಡುಗೆ ಮೋಡ್ ಆರಂಭಿಸಿ" }).click();
  await emitSpeech(page, "RasoiSaathi");
  await emitSpeech(page, "ಇಂದು ಎಷ್ಟು ಟಿಫಿನ್?");
  await expect(page.getByText(/ಇಂದು ಒಟ್ಟು 8/)).toBeVisible();
  const created = await request.post("/api/messages", {
    data: { senderName: "Priya Sharma", originalLang: "hi", originalText: "कल मेरा टिफिन मत भेजना।" },
  });
  expect(created.ok()).toBeTruthy();
  const { message } = await created.json();
  const tomorrowCount = async () => (await (await request.get("/api/tally?day=tomorrow")).json()).activeTiffins;
  const before = await tomorrowCount();
  await expect(page.getByText(/ಟಿಫಿನ್ ಬೇಡ ಎಂಬ ವಿನಂತಿ/)).toBeVisible({ timeout: 12000 });
  await emitSpeech(page, "ಬೇಡ");
  await expect(page.getByText("ಸರಿ, ರದ್ದು ಮಾಡಿದೆ.", { exact: true })).toBeVisible();
  expect(await tomorrowCount()).toBe(before);
  await emitSpeech(page, "ರಸೋಯಿ ಸಾಥಿ ಸಂದೇಶಗಳನ್ನು ಓದಿ");
  await expect(page.getByText(/ಟಿಫಿನ್ ಬೇಡ ಎಂಬ ವಿನಂತಿ/)).toBeVisible();
  await emitSpeech(page, "ಹೌದು");
  await expect.poll(tomorrowCount).toBe(before - 1);
  await expect(page.getByText(/ನಿಮ್ಮ ಟಿಫಿನ್ ಕಳುಹಿಸುವುದಿಲ್ಲ/)).toBeVisible();
  await emitSpeech(page, "ಹೌದು");
  const readSaved = async () => {
    const { messages } = await (await request.get("/api/messages")).json();
    return messages.find((item: { id: string }) => item.id === message.id);
  };
  await expect.poll(async () => Boolean((await readSaved()).replyApprovedAt)).toBe(true);
  expect((await readSaved()).autoReply).toMatch(/आपका टिफ़िन नहीं भेजा जाएगा/);
  const repeated = await request.post(`/api/messages/${message.id}/process`, { data: { action: "approve" } });
  expect((await repeated.json()).alreadyProcessed).toBe(true);
  expect(await tomorrowCount()).toBe(before - 1);
  expect((await (await request.get("/api/tally")).json()).activeTiffins).toBe(8);
});

test("Kitchen Mode corrects and approves a single menu draft", async ({ page, request }) => {
  await request.put("/api/cook", { data: { language: "en" } });
  await page.goto("/");
  await page.getByRole("button", { name: "Start Kitchen Mode" }).click();
  await emitSpeech(page, "RasoiSaathi, menu: dal and rice");
  await expect(page.getByText(/dal and rice.*Say yes/)).toBeVisible();
  await emitSpeech(page, "edit");
  await emitSpeech(page, "dal and roti");
  await expect(page.getByText(/dal and roti.*Say yes/)).toBeVisible();
  await emitSpeech(page, "yes");
  const broadcasts = async () => (await (await request.get("/api/menu/broadcast")).json()).broadcasts;
  await expect.poll(async () => Boolean((await broadcasts())[0]?.sentAt)).toBe(true);
  expect(await broadcasts()).toHaveLength(1);
  expect((await broadcasts())[0].menuText).toBe("dal and roti");
});

test("payment reminder preview opens without recording a payment", async ({ page, request }) => {
  const voice = (data: object) => request.post("/api/voice/process", { data });
  const proposal = await (await voice({ text: "Send payment reminders", cookLang: "en", kitchen: true })).json();
  expect(proposal.actionPerformed).toBe(false);
  const confirmed = await (await voice({ confirmationToken: proposal.confirmationToken })).json();
  const preview = confirmed.data.reminders.find((row: { name: string }) => row.name === "Priya Sharma").preview;
  await page.goto(preview);
  await expect(page.getByRole("heading", { name: "Simulated UPI reminder" })).toBeVisible();
  const { payments } = await (await request.get("/api/payments")).json();
  expect(payments.find((row: { customer: { name: string } }) => row.customer.name === "Priya Sharma").paidAmount).toBe(0);
});

test("M activates voice; final speech updates orders once and speaks the result", async ({ page, request }, testInfo) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "AI Key Not Configured" })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("dashboard.png") });
  await page.keyboard.press("m");
  await expect(page).toHaveURL(/\/voice\?listen=1/);
  await expect(page.getByRole("button", { name: "Stop listening", exact: true })).toBeVisible();
  let commands = 0;
  page.on("request", (r) => { if (r.url().endsWith("/api/voice/process")) commands++; });
  await emitSpeech(page, "Skip Priya today");
  await expect(page.getByText("Skipped Priya Sharma (today)", { exact: true })).toBeVisible();
  await expect(page.getByText("Skipped Priya Sharma (today)", { exact: true })).toBeInViewport();
  await expect.poll(async () => (await (await request.get("/api/tally")).json()).activeTiffins).toBe(7);
  await expect.poll(() => page.evaluate(() => (window as unknown as { spoken: string[] }).spoken.length)).toBe(1);
  expect(commands).toBe(1);
  await page.screenshot({ path: testInfo.outputPath("voice.png") });
  await page.keyboard.press("m");
  await expect(page.getByRole("button", { name: "Stop listening", exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Start listening", exact: true })).toBeVisible();
});

test("typing m leaves text fields active and no key-entry UI exists", async ({ page }) => {
  await page.goto("/settings");
  await expect(page.locator('input[type="password"]')).toHaveCount(0);
  const input = page.locator("input").first();
  await expect(page.getByRole("button", { name: "किचन मोड शुरू करें" })).toBeEnabled();
  await input.fill("");
  await input.press("m");
  await expect(input).toHaveValue("m");
  await expect(page).toHaveURL(/\/settings$/);
  await input.blur();
  await page.getByRole("button", { name: "No AI Key" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByRole("dialog").locator('input[type="password"]')).toHaveCount(0);
  await expect(page.getByText(/Enter Gemini|Save Key|Paste Gemini/)).toHaveCount(0);
});

test("configured Gemini overrides a remembered Basic Mode without a key notice", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("rasoisaathi_ai_mode", "basic");
    localStorage.setItem("rasoisaathi_gemini_key", "legacy-key");
  });
  await page.route("**/api/health", (r) => r.fulfill({ json: { status: "ok", geminiConfigured: true } }));
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Gemini AI" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "AI Key Not Configured" })).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem("rasoisaathi_gemini_key"))).toBeNull();
  await page.goto("/settings");
  await expect(page.getByText("Connected", { exact: true })).toBeVisible();
  await expect(page.getByText("AI Key Not Configured", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("recognition errors and unfinished speech never execute a command", async ({ page, request }) => {
  await page.goto("/voice?listen=1");
  await expect(page.getByRole("button", { name: "Stop listening", exact: true })).toBeVisible();
  await emitSpeech(page, "Skip Priya", false);
  await page.evaluate(() => {
    const rec = (window as unknown as { recognition: { onerror: (e: unknown) => void; onend: (() => void) | null } }).recognition;
    const lateEnd = rec.onend;
    rec.onerror({ error: "network" });
    lateEnd?.();
  });
  await expect(page.getByText(/internet chahiye/)).toBeVisible();
  expect((await (await request.get("/api/tally")).json()).activeTiffins).toBe(8);
});

test("spoken payment receipts and menus persist", async ({ page, request }) => {
  await page.goto("/voice?listen=1");
  await expect(page.getByRole("button", { name: "Stop listening", exact: true })).toBeVisible();
  await emitSpeech(page, "Priya ka payment aa gaya");
  await expect(page.getByText("Priya Sharma: ₹3500 paid", { exact: true })).toBeVisible();
  const payments = (await (await request.get("/api/payments")).json()).payments;
  expect(payments.find((p: { customer: { name: string } }) => p.customer.name === "Priya Sharma").status).toBe("paid");
  await page.keyboard.press("m");
  await expect(page.getByRole("button", { name: "Stop listening", exact: true })).toBeVisible();
  await emitSpeech(page, "Kal ka menu: dal tadka, rice, roti");
  await expect(page.getByText("Menu draft saved", { exact: true })).toBeVisible();
  expect((await (await request.get("/api/menu/broadcast")).json()).broadcasts[0].menuText).toContain("dal tadka");
});

test("low-confidence speech asks for repetition without changing data", async ({ page, request }) => {
  await page.goto("/voice?listen=1");
  await expect(page.getByRole("button", { name: "Stop listening", exact: true })).toBeVisible();
  await emitSpeech(page, "Skip Priya today", true, 0.3);
  await expect(page.getByText(/kitchen mein shor tha/)).toBeVisible();
  expect((await (await request.get("/api/tally")).json()).activeTiffins).toBe(8);
});
