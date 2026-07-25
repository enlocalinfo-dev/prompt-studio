import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptsDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(scriptsDir, "..");
const src = path.join(root, "packages/templates/snapshots");
const out = path.join(root, "api/lib/templates-bundled.ts");

const files = { A: "format-a-master.md", B: "format-b-master.md" };
const parts = ["import type { FormatId } from \"@prompt-studio/core\";", "", "export const SNAPSHOTS: Record<FormatId, string> = {"];

for (const [id, name] of Object.entries(files)) {
  const text = fs.readFileSync(path.join(src, name), "utf8");
  parts.push(`  ${id}: ${JSON.stringify(text)},`);
}
parts.push("};", "");

fs.writeFileSync(out, parts.join("\n"));
console.log("wrote", out);
