import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, unlinkSync, rmdirSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const project = `rasoisaathi-verify-${Date.now()}`;
const directory = mkdtempSync(path.join(tmpdir(), "rasoisaathi-compose-"));
const override = path.join(directory, "verify.yml");
writeFileSync(override, 'services:\n  rasoisaathi:\n    ports: !override\n      - "127.0.0.1:3012:3000"\n');
const args = ["compose", "-p", project, "-f", path.resolve("docker-compose.yml"), "-f", override];
function compose(...command) {
  const result = spawnSync("docker", [...args, ...command], {
    env: { ...process.env, GEMINI_API_KEY: "" }, stdio: "inherit",
  });
  assert.equal(result.status, 0, `docker compose ${command[0]} failed`);
}
const base = "http://127.0.0.1:3012";
async function json(url, body) {
  const r = await fetch(`${base}${url}`, body === undefined ? {} : {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
  assert.ok(r.ok, `${url} returned ${r.status}`);
  return r.json();
}
try {
  compose("up", "--build", "-d", "--wait", "--wait-timeout", "90");
  const health = await json("/api/health");
  assert.equal(health.geminiConfigured, false);
  assert.equal((await json("/api/customers")).customers.length, 10);
  assert.equal((await json("/api/tally")).activeTiffins, 8);
  for (const url of ["/", "/voice", "/messages", "/menu", "/settings", "/wasm/racommons.js"]) {
    assert.equal((await fetch(`${base}${url}`)).status, 200, url);
  }
  const api = spawnSync(process.execPath, ["scripts/e2e-verify.mjs", "--compose-test"], { stdio: "inherit" });
  assert.equal(api.status, 0, "API tests failed against the Docker app");
  if (process.env.VERIFY_BROWSER === "1") {
    const browser = spawnSync(process.execPath, ["node_modules/@playwright/test/cli.js", "test"], {
      env: { ...process.env, PLAYWRIGHT_BASE_URL: base }, stdio: "inherit",
    });
    assert.equal(browser.status, 0, "Browser tests failed against the Docker app");
    await json("/api/demo/reset", {});
  }
  const skipped = await json("/api/voice/process", { text: "Skip Priya today", cookLang: "en" });
  assert.equal(skipped.tierUsed, "basic");
  assert.equal(skipped.actionPerformed, true);
  assert.equal(skipped.tally.activeTiffins, 7);
  const menu = await json("/api/menu/broadcast", { menuText: "Dal, rice, roti" });
  assert.ok(menu.broadcast.id);
  compose("restart");
  for (let attempt = 0; attempt < 40; attempt++) {
    try {
      if ((await fetch(`${base}/api/health`)).ok) break;
    } catch { /* Wait for this isolated container to restart. */ }
    await new Promise((r) => setTimeout(r, 500));
  }
  assert.equal((await json("/api/tally")).activeTiffins, 7);
  assert.equal((await json("/api/menu/broadcast")).broadcasts[0].id, menu.broadcast.id);
  console.log("PASS: keyless Compose cold-start, seeded data, voice mutation, menu save, restart persistence.");
} catch (error) {
  compose("logs", "--tail", "50");
  throw error;
} finally {
  // Only resources belonging to this unique verification project are removed.
  compose("down", "--volumes");
  unlinkSync(override);
  rmdirSync(directory);
}
