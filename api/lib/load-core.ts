import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

/** Vercel serverless（CJS バンドル）から @prompt-studio/core を安全に読み込む */
export async function loadPromptStudioCore() {
  const cwd = process.cwd();
  const pkgJson = path.join(cwd, "package.json");
  const req = fs.existsSync(pkgJson)
    ? createRequire(pkgJson)
    : createRequire(path.join(cwd, "api/generate.ts"));

  const cjsPath = path.join(cwd, "packages/core/dist/index.cjs");
  if (fs.existsSync(cjsPath)) {
    return req(cjsPath) as typeof import("@prompt-studio/core");
  }

  const esmPath = path.join(cwd, "packages/core/dist/index.js");
  if (fs.existsSync(esmPath)) {
    return await import(pathToFileURL(esmPath).href);
  }

  throw new Error("@prompt-studio/core を読み込めません（pnpm --filter @prompt-studio/core build）");
}
