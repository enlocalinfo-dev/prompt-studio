import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptsDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(scriptsDir, "..");
const src = path.join(root, "packages/templates/snapshots");
const dest = path.join(root, "service/template-snapshots");

if (!fs.existsSync(src)) {
  console.warn("copy-snapshots-for-api: source missing", src);
  process.exit(0);
}

fs.mkdirSync(dest, { recursive: true });
for (const name of fs.readdirSync(src)) {
  const from = path.join(src, name);
  if (!fs.statSync(from).isFile()) continue;
  fs.copyFileSync(from, path.join(dest, name));
}
console.log("copied template snapshots -> service/template-snapshots");
