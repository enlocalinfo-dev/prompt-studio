/** Vercel serverless 用（@prompt-studio/core をモジュール初期化で require しない） */

export interface ReferenceDocument {
  name: string;
  text: string;
  kind: "pdf";
}

export interface ReferenceUrlItem {
  url: string;
  title?: string;
  text?: string;
}

export interface ReferenceBundle {
  urls: ReferenceUrlItem[];
  documents: ReferenceDocument[];
}

const DEFAULT_MAX = 55_000;

export function buildReferenceContext(
  bundle: ReferenceBundle | undefined,
  maxChars = DEFAULT_MAX,
): string {
  if (!bundle) return "";
  const parts: string[] = [];

  for (const doc of bundle.documents ?? []) {
    const t = (doc.text ?? "").trim();
    if (!t) continue;
    parts.push(`【PDF: ${doc.name}】\n${t}`);
  }

  for (const u of bundle.urls ?? []) {
    const t = (u.text ?? "").trim();
    if (!t) continue;
    const label = u.title?.trim() || u.url;
    parts.push(`【URL: ${label}】\n${u.url}\n${t}`);
  }

  if (parts.length === 0) return "";

  let combined = parts.join("\n\n---\n\n");
  if (combined.length > maxChars) {
    combined = `${combined.slice(0, maxChars)}\n\n…（参考資料は文字数上限で省略）`;
  }
  return combined;
}
