#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const promptStudioRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(promptStudioRoot, "..");
const outDir = path.join(promptStudioRoot, "packages/templates/snapshots");

const copies = [
  {
    src: path.join(
      repoRoot,
      "20260724_研修デリバリー提案_サマリーシート標準/genspark_prompt.md",
    ),
    dest: "format-b-master.md",
  },
  {
    src: path.join(
      repoRoot,
      "20260713_エン株式会社_ENロジカル_人事AX研修協業/genspark_prompt.md",
    ),
    dest: "format-a-master.md",
  },
  {
    src: path.join(repoRoot, "過去/加工ファイル/共通_Genspark_全案件必須ブロック.md"),
    dest: "universal-blocks.md",
  },
  {
    src: path.join(repoRoot, ".cursor/rules/genspark-proposal-format-split.mdc"),
    dest: "format-split.mdc",
  },
];

fs.mkdirSync(outDir, { recursive: true });

for (const { src, dest } of copies) {
  if (!fs.existsSync(src)) {
    console.warn(`skip (missing): ${src}`);
    continue;
  }
  const content = fs.readFileSync(src, "utf8");
  fs.writeFileSync(path.join(outDir, dest), content);
  console.log(`synced ${dest}`);
}

console.log("done:", outDir);
