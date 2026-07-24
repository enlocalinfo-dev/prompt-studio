import fs from "node:fs";
import path from "node:path";
import type { FormatId } from "@prompt-studio/core";

function resolvePromptStudioRoot(): string {
  const candidates = [
    process.cwd(),
    path.join(process.cwd(), "prompt-studio"),
    path.join(process.cwd(), ".."),
  ];
  for (const root of candidates) {
    const snap = path.join(root, "packages/templates/snapshots/format-b-master.md");
    if (fs.existsSync(snap)) return root;
  }
  return process.cwd();
}

const promptStudioRoot = resolvePromptStudioRoot();
const repoRoot = path.resolve(promptStudioRoot, "..");

const SNAPSHOT = {
  A: path.join(promptStudioRoot, "packages/templates/snapshots/format-a-master.md"),
  B: path.join(promptStudioRoot, "packages/templates/snapshots/format-b-master.md"),
};

const LIVE = {
  A: path.join(
    repoRoot,
    "20260713_エン株式会社_ENロジカル_人事AX研修協業/genspark_prompt.md",
  ),
  B: path.join(
    repoRoot,
    "20260724_研修デリバリー提案_サマリーシート標準/genspark_prompt.md",
  ),
};

export function loadMasterTemplate(formatId: FormatId, devLive: boolean): string {
  if (devLive) {
    const live = LIVE[formatId];
    if (fs.existsSync(live)) return fs.readFileSync(live, "utf8");
  }
  const snap = SNAPSHOT[formatId];
  if (fs.existsSync(snap)) return fs.readFileSync(snap, "utf8");
  return `# ${formatId} テンプレ未同期\n\npnpm sync-templates を実行してください。\n`;
}

export function templatesMeta(devLive: boolean) {
  return {
    devLive,
    repoRoot,
    paths: { snapshot: SNAPSHOT, live: LIVE },
  };
}
