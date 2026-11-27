import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const databaseUrl = "file:./api-test.db";
const useComposeTest = process.argv.includes("--compose-test");
if (!useComposeTest) {
  fs.closeSync(fs.openSync("prisma/api-test.db", "a"));
  const schema = spawnSync(process.execPath, ["node_modules/prisma/build/index.js", "db", "push", "--skip-generate"], {
    env: { ...process.env, DATABASE_URL: databaseUrl }, stdio: "inherit",
  });
  assert.equal(schema.status, 0, "Could not initialize isolated API test database");
}

function readEnvKey() {
  const envPath = path.join(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) return "";
  const txt = fs.readFileSync(envPath, "utf8");
  const m = txt.match(/^GEMINI_API_KEY=(.+)$/m);
  return m ? m[1].trim().replace(/^["']|["']$/g, "") : "";
}

async function waitForHealth(url) {
  for (let i = 0; i < 40; i++) {
    try {
      const r = await fetch(`${url}/api/health`);
      if (r.ok) return r.json();
    } catch {
      // retry
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  throw new Error("Server failed to start within timeout");
}

async function runSuite(modeName, envOverrides) {
  console.log(`\n=== STARTING MODE: ${modeName} ===`);
  const child = useComposeTest ? null : spawn(
    process.execPath,
    ["node_modules/next/dist/bin/next", "start", "-p", "3005"],
    {
      env: { ...process.env, ...envOverrides, DATABASE_URL: databaseUrl },
      stdio: ["ignore", "pipe", "pipe"],
    }
  );
  let logs = "";
  child?.stdout.on("data", (d) => (logs += d.toString()));
  child?.stderr.on("data", (d) => (logs += d.toString()));

  try {
    const base = useComposeTest ? "http://127.0.0.1:3012" : "http://127.0.0.1:3005";
    const health = await waitForHealth(base);
    console.log("Health:", health);
    if (useComposeTest) assert.equal(health.geminiConfigured, false);

    let res = await fetch(`${base}/api/demo/reset`, { method: "POST" });
    assert.equal(res.status, 200);

    for (const p of [
      "/",
      "/voice",
      "/customers",
      "/payments",
      "/settings",
      "/messages",
      "/menu",
      "/wasm/racommons.js",
      "/wasm/racommons-llamacpp.js",
    ]) {
      console.log("Checking GET", p);
      const r = await fetch(`${base}${p}`, { signal: AbortSignal.timeout(10000) });
      assert.equal(r.status, 200, `Expected 200 for GET ${p}, got ${r.status}`);
    }

    // 1. Empty text -> 400
    console.log("Checking empty POST /api/voice/process");
    res = await fetch(`${base}/api/voice/process`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "   " }),
      signal: AbortSignal.timeout(10000),
    });
    assert.equal(res.status, 400);

    // 2. Tally check
    console.log("Checking tally voice command");
    res = await fetch(`${base}/api/voice/process`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "Aaj kitne tiffin banane hain?", cookLang: "hi" }),
      signal: AbortSignal.timeout(30000),
    });
    assert.equal(res.status, 200);
    let data = await res.json();
    console.log(modeName, "tally:", data.intent, data.tierUsed, data.tally.activeTiffins, "->", data.responseText);
    assert.equal(data.intent, "tally");
    assert.equal(data.tally.activeTiffins, 8);
    if (modeName === "TIER1_GEMINI") {
      assert.equal(data.tierUsed, "gemini", "Configured Gemini must actually handle the command");
      console.log("PASS: live server-configured Gemini handles voice commands by default");
      return;
    }

    // 3. Add customer by voice
    res = await fetch(`${base}/api/voice/process`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: "Naya customer jodo, naam Kavita Patel, Jain khana, monthly 3200",
        cookLang: "hi",
      }),
    });
    data = await res.json();
    console.log(modeName, "add:", data.intent, data.actionPerformed, data.tally.activeTiffins, "->", data.responseText);
    assert.equal(data.intent, "add_customer");
    assert.equal(data.actionPerformed, true);
    assert.equal(data.tally.activeTiffins, 9);

    // 4. Pause customer by voice
    res = await fetch(`${base}/api/voice/process`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "Kavita Patel ko 4 din pause kardo", cookLang: "hi" }),
    });
    data = await res.json();
    console.log(modeName, "pause:", data.intent, data.actionPerformed, data.tally.activeTiffins);
    assert.equal(data.intent, "pause");
    assert.equal(data.actionPerformed, true);
    assert.equal(data.tally.activeTiffins, 8);

    // 5. Resume customer by voice
    res = await fetch(`${base}/api/voice/process`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "Kavita Patel ko resume kardo", cookLang: "hi" }),
    });
    data = await res.json();
    console.log(modeName, "resume:", data.intent, data.actionPerformed, data.tally.activeTiffins);
    assert.equal(data.intent, "resume");
    assert.equal(data.actionPerformed, true);
    assert.equal(data.tally.activeTiffins, 9);

    // 6. Skip customer by voice
    res = await fetch(`${base}/api/voice/process`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "Priya Sharma aaj skip kardo", cookLang: "hi" }),
    });
    data = await res.json();
    console.log(modeName, "skip:", data.intent, data.actionPerformed, data.tally.activeTiffins);
    assert.equal(data.intent, "skip");
    assert.equal(data.actionPerformed, true);
    assert.equal(data.tally.activeTiffins, 8);

    // 7. Cancel customer by voice
    res = await fetch(`${base}/api/voice/process`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "Rajesh Kumar ka tiffin aaj cancel karo", cookLang: "hi" }),
    });
    data = await res.json();
    console.log(modeName, "cancel:", data.intent, data.actionPerformed, data.tally.activeTiffins);
    assert.equal(data.intent, "cancel");
    assert.equal(data.actionPerformed, true);
    assert.equal(data.tally.activeTiffins, 7);

    // 8. Payment check by voice
    res = await fetch(`${base}/api/voice/process`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "Kisne payment nahi kiya?", cookLang: "hi" }),
    });
    data = await res.json();
    console.log(modeName, "payment_check:", data.intent, data.data.pendingCount, "->", data.responseText);
    assert.equal(data.intent, "payment_check");
    assert.ok(data.data.pendingCount >= 5);

    // 9. Remove customer by voice
    res = await fetch(`${base}/api/voice/process`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "Kavita Patel ko remove karo", cookLang: "hi" }),
    });
    data = await res.json();
    console.log(modeName, "remove:", data.intent, data.actionPerformed, data.tally.activeTiffins);
    assert.equal(data.intent, "remove_customer");
    assert.equal(data.actionPerformed, true);
    assert.equal(data.tally.activeTiffins, 6);

    // 10. Tier 2 localParsed execution path
    res = await fetch(`${base}/api/voice/process`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: "dummy local",
        cookLang: "en",
        localParsed: { intent: "tally", entities: {}, confidence: 0.85 },
      }),
    });
    data = await res.json();
    assert.equal(data.tierUsed, "local");
    assert.equal(data.intent, "tally");

    // 11. Translate endpoint
    res = await fetch(`${base}/api/translate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "Please skip tomorrow", fromLang: "en", toLang: "hi" }),
    });
    data = await res.json();
    console.log(modeName, "translate:", data);
    assert.ok(data.translated);

    // 12. Receipt updates payment; repeated receipt is harmless.
    const command = async (text) => {
      const response = await fetch(`${base}/api/voice/process`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, cookLang: "en" }),
      });
      assert.equal(response.status, 200);
      return response.json();
    };
    data = await command("Priya ka payment aa gaya");
    assert.equal(data.intent, "payment_record");
    assert.equal(data.actionPerformed, true);
    assert.equal((await command("Priya ka payment aa gaya")).actionPerformed, false);

    // 13. Extra orders and dietary changes persist.
    assert.equal((await command("Pooja ko 3 extra roti")).actionPerformed, true);
    assert.equal((await command("Sanjay ka khana Jain kardo")).actionPerformed, true);
    const currentCustomers = (await (await fetch(`${base}/api/customers`)).json()).customers;
    assert.equal(currentCustomers.find((c) => c.name === "Sanjay Gupta").dietaryPref, "jain");

    // 14. A dictated menu creates a real saved draft.
    data = await command("Kal ka menu: dal tadka, rice, roti");
    assert.equal(data.actionPerformed, true);
    assert.ok(data.data.broadcastId);

    // 15. Process an inbox message once, preserving tomorrow's date.
    const messages = (await (await fetch(`${base}/api/messages`)).json()).messages;
    const sarah = messages.find((m) => m.senderName.includes("Sarah"));
    const processMessage = (action) => fetch(`${base}/api/messages/${sarah.id}/process`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }),
    }).then((r) => r.json());
    const review = await processMessage("read");
    assert.equal(review.actionPerformed, false);
    assert.equal(review.message.status, "review");
    assert.equal((await processMessage("approve")).actionPerformed, true);
    assert.equal((await processMessage("approve")).alreadyProcessed, true);

    await fetch(`${base}/api/demo/reset`, { method: "POST" });
    console.log(`=== PASSED MODE: ${modeName} ===`);
  } catch (err) {
    console.error("Server logs:\n", logs);
    throw err;
  } finally {
    child?.kill();
    await new Promise((r) => setTimeout(r, 500));
  }
}

const cloudRequested = !useComposeTest && process.argv.includes("--cloud") && !process.argv.includes("--no-cloud");
const key = cloudRequested ? readEnvKey() : "";
if (key) {
  await runSuite("TIER1_GEMINI", { GEMINI_API_KEY: key });
} else {
  console.log("Skipping live Gemini test (requires --cloud and a key in .env)");
}
await runSuite("NO_KEY_FALLBACK", { GEMINI_API_KEY: "" });
console.log("\nALL E2E FLOWS PASSED");
