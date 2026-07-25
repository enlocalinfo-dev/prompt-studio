import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const pkgRoot = path.join(here, "..");
const srcDir = path.join(pkgRoot, "dist-cjs");
const outDir = path.join(pkgRoot, "dist");

if (!fs.existsSync(srcDir)) {
  console.error("dist-cjs がありません。先に tsc -p tsconfig.cjs.json を実行してください。");
  process.exit(1);
}

for (const file of fs.readdirSync(srcDir)) {
  if (!file.endsWith(".js")) continue;
  const base = file.slice(0, -3);
  let content = fs.readFileSync(path.join(srcDir, file), "utf8");
  content = content.replace(/require\("\.\/([^"]+)\.js"\)/g, 'require("./$1.cjs")');
  fs.writeFileSync(path.join(outDir, `${base}.cjs`), content);
}

console.log("CJS bundle written to packages/core/dist/*.cjs");
