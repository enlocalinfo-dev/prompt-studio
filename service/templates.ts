import fs from "node:fs";
import path from "node:path";
import type { FormatId } from "@prompt-studio/core";
import { SNAPSHOTS } from "./templates-bundled.js";

const SNAPSHOT_FILES: Record<FormatId, string> = {
  A: "format-a-master.md",
  B: "format-b-master.md",
};

function findSnapshot(formatId: FormatId): string | null {
  const file = SNAPSHOT_FILES[formatId];
  const rel = path.join("packages", "templates", "snapshots", file);
  const apiRel = path.join("api", "lib", "template-snapshots", file);
  const roots = [
    process.cwd(),
    path.join(process.cwd(), "prompt-studio"),
    path.join(process.cwd(), ".."),
    path.dirname(process.cwd()),
  ];
  const seen = new Set<string>();
  for (const root of roots) {
    for (const sub of [apiRel, rel]) {
      const full = path.join(root, sub);
      if (seen.has(full)) continue;
      seen.add(full);
      if (fs.existsSync(full)) return full;
    }
  }
  return null;
}

function findLive(formatId: FormatId): string | null {
  const rel =
    formatId === "A"
      ? "20260713_エン株式会社_ENロジカル_人事AX研修協業/genspark_prompt.md"
      : "20260724_研修デリバリー提案_サマリーシート標準/genspark_prompt.md";
  const roots = [
    path.resolve(process.cwd(), ".."),
    path.resolve(process.cwd(), "../.."),
    process.cwd(),
  ];
  for (const root of roots) {
    const full = path.join(root, rel);
    if (fs.existsSync(full)) return full;
  }
  return null;
}

export function loadMasterTemplate(formatId: FormatId, devLive: boolean): string {
  if (devLive) {
    const live = findLive(formatId);
    if (live) return fs.readFileSync(live, "utf8");
  }
  const snap = findSnapshot(formatId);
  if (snap) return fs.readFileSync(snap, "utf8");
  const bundled = SNAPSHOTS[formatId];
  if (bundled?.length > 100) return bundled;
  return `# ${formatId} テンプレ未同期\n\npnpm sync-templates を実行してください。\n`;
}

export function templatesMeta(devLive: boolean) {
  return {
    devLive,
    cwd: process.cwd(),
    snapshotA: findSnapshot("A"),
    snapshotB: findSnapshot("B"),
  };
}
