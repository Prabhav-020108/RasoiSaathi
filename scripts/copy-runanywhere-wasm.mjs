import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const outDir = path.join(root, "public", "wasm");

const sources = [
  path.join(root, "node_modules", "@runanywhere", "web", "wasm"),
  path.join(root, "node_modules", "@runanywhere", "web-llamacpp", "wasm"),
];

fs.mkdirSync(outDir, { recursive: true });

let copied = 0;
for (const dir of sources) {
  if (!fs.existsSync(dir)) continue;
  for (const entry of fs.readdirSync(dir)) {
    if (entry.endsWith(".js") || entry.endsWith(".wasm")) {
      const src = path.join(dir, entry);
      const dst = path.join(outDir, entry);
      fs.copyFileSync(src, dst);
      copied += 1;
    }
  }
}

console.log(`[copy-runanywhere-wasm] Copied ${copied} WASM/glue files to public/wasm`);
