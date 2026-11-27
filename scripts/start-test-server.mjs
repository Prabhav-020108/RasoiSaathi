import { spawn, spawnSync } from "node:child_process";
import { closeSync, openSync } from "node:fs";

// A dedicated database keeps browser tests away from the cook's local data.
const env = {
  ...process.env,
  DATABASE_URL: "file:./browser-test.db",
  GEMINI_API_KEY: "",
  ...(process.env.BROWSER_TEST_DEV ? { NEXT_DIST_DIR: ".next-browser-tests" } : {}),
};
// Prisma's Windows schema engine can fail to create a missing file when spawned.
// Opening in append mode creates it without altering an existing test database.
closeSync(openSync("prisma/browser-test.db", "a"));
const schema = spawnSync(process.execPath, ["node_modules/prisma/build/index.js", "db", "push", "--skip-generate"], {
  env, stdio: "inherit",
});
if (schema.status !== 0) process.exit(schema.status || 1);
const server = spawn(process.execPath, ["node_modules/next/dist/bin/next", process.env.BROWSER_TEST_DEV ? "dev" : "start", "-p", "3011", "-H", "127.0.0.1"], {
  env, stdio: "inherit",
});
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => server.kill());
server.on("exit", (code) => process.exit(code || 0));
