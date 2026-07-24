import { createRequire } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";

/** Vercel serverless（CJS バンドル）から @prompt-studio/core を安全に読み込む */
export async function loadPromptStudioCore() {
  const candidates = [
    path.join(process.cwd(), "packages/core/dist/index.cjs"),
    path.join(process.cwd(), "packages/core/dist/index.js"),
    path.join(process.cwd(), "../packages/core/dist/index.cjs"),
  ];

  for (const entry of candidates) {
    if (entry.endsWith(".cjs")) {
      try {
        const req = createRequire(import.meta.url);
        return req(entry) as typeof import("@prompt-studio/core");
      } catch {
        /* try next */
      }
    } else {
      try {
        return await import(pathToFileURL(entry).href);
      } catch {
        /* try next */
      }
    }
  }

  throw new Error("@prompt-studio/core を読み込めません（dist/index.cjs をビルドしてください）");
}
