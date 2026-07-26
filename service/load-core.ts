import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

function repoRoots(): string[] {
  const cwd = process.cwd();
  const roots = [cwd, path.resolve(cwd, ".."), path.resolve(cwd, "../..")];
  const du = (globalThis as { __dirname?: string }).__dirname;
  if (typeof du === "string") {
    roots.push(du, path.resolve(du, "../.."));
  }
  return [...new Set(roots)];
}

function resolveCoreEntry(): { path: string; kind: "cjs" | "esm" } | null {
  for (const root of repoRoots()) {
    const cjs = path.join(root, "packages/core/dist/serverless.cjs");
    if (fs.existsSync(cjs)) return { path: cjs, kind: "cjs" };
    const legacy = path.join(root, "packages/core/dist/index.cjs");
    if (fs.existsSync(legacy)) return { path: legacy, kind: "cjs" };
    const esm = path.join(root, "packages/core/dist/index.js");
    if (fs.existsSync(esm)) return { path: esm, kind: "esm" };
  }
  return null;
}

/** Vercel serverless（CJS バンドル）から @prompt-studio/core を安全に読み込む */
export async function loadPromptStudioCore() {
  const entry = resolveCoreEntry();
  if (!entry) {
    throw new Error("@prompt-studio/core を読み込めません（pnpm --filter @prompt-studio/core build）");
  }

  if (entry.kind === "esm") {
    return await import(pathToFileURL(entry.path).href);
  }

  const root = path.dirname(path.dirname(path.dirname(entry.path)));
  const pkgJson = path.join(root, "package.json");
  const req = fs.existsSync(pkgJson)
    ? createRequire(pkgJson)
    : createRequire(entry.path);
  return req(entry.path) as typeof import("@prompt-studio/core");
}
