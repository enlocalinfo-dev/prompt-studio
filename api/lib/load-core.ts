import path from "node:path";
import { pathToFileURL } from "node:url";

/** Vercel serverless: パッケージ名解決の require を避け、ESM を file URL で読み込む */
export async function loadPromptStudioCore() {
  const candidates = [
    path.join(process.cwd(), "packages/core/dist/index.js"),
    path.join(process.cwd(), "../packages/core/dist/index.js"),
  ];
  for (const entry of candidates) {
    try {
      return await import(pathToFileURL(entry).href);
    } catch {
      /* try next */
    }
  }
  const dynamicImport = new Function(
    "specifier",
    "return import(specifier)",
  ) as (specifier: string) => Promise<typeof import("@prompt-studio/core")>;
  return dynamicImport("@prompt-studio/core");
}
