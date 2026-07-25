import type { FormatId, ReferenceBundle, Tuning } from "@prompt-studio/core";
import type { Extracted } from "@prompt-studio/core";

export interface GenerateResponse {
  structured: Extracted;
  markdown: string;
  gensparkText: string;
  folderNameSuggestion: string;
  usedLlm: boolean;
  generationMode?: "llm-full" | "llm-slides" | "mock";
  composeErrors?: string[];
}

export async function fetchUrlContent(url: string): Promise<{
  url: string;
  title?: string;
  text: string;
}> {
  const res = await fetch("/api/fetch-url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error ?? `URL取得失敗 (${res.status})`);
  }
  return data;
}

export async function postExpandBriefFromPdf(body: {
  fileName: string;
  extractedText?: string;
  pdfBase64?: string;
}): Promise<{
  expanded: import("@prompt-studio/core").ExpandedFromEstimate;
  usedLlm: boolean;
}> {
  const res = await fetch("/api/expand-brief", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail = typeof data.detail === "string" ? data.detail : "";
    throw new Error(detail ? `${data.error ?? "error"}: ${detail}` : (data.error ?? `HTTP ${res.status}`));
  }
  return data;
}

export async function postGenerate(body: {
  formatId: FormatId;
  transcript: string;
  tuning: Tuning;
  references?: ReferenceBundle;
}): Promise<GenerateResponse> {
  const res = await fetch("/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const detail = typeof err.detail === "string" ? err.detail : "";
    throw new Error(detail ? `${err.error ?? "error"}: ${detail}` : (err.error ?? `HTTP ${res.status}`));
  }
  return res.json();
}

export async function fetchHealth(): Promise<{ ok: boolean; llm: boolean }> {
  const res = await fetch("/api/health");
  return res.json();
}
