import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/browser",
  workers: 1,
  use: { baseURL: process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3011", viewport: { width: 360, height: 740 } },
  webServer: process.env.PLAYWRIGHT_BASE_URL ? undefined : {
    command: "node scripts/start-test-server.mjs",
    url: "http://127.0.0.1:3011/api/health",
    reuseExistingServer: false,
    timeout: 60000,
  },
});
