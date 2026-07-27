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
  pdfBlobUrl?: string;
}): Promise<{
  expanded: import("@prompt-studio/core").ExpandedFromEstimate;
  usedLlm: boolean;
}> {
  const res = await fetch("/api/expand-brief", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (res.status === 413) {
    throw new Error(
      "PDFが大きすぎて送信できません（HTTP 413）。PDFを圧縮するか、文字が選べる形式で保存し直してください。",
    );
  }
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
  ruleOverrides?: import("@prompt-studio/core").PromptRuleOverridesB;
}): Promise<GenerateResponse> {
  const res = await fetch("/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (res.status === 413) {
    throw new Error("送信データが大きすぎます（HTTP 413）。追加メモや参考資料を短くしてください。");
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const detail = typeof err.detail === "string" ? err.detail : "";
    if (detail) {
      throw new Error(detail.includes("プロンプト生成") ? detail : `プロンプト生成に失敗しました: ${detail}`);
    }
    throw new Error(err.error === "generate failed" ? "プロンプト生成に失敗しました。しばらくして再試行してください。" : (err.error ?? `HTTP ${res.status}`));
  }
  return res.json();
}

export async function fetchHealth(): Promise<{ ok: boolean; llm: boolean }> {
  const res = await fetch("/api/health");
  return res.json();
}

export async function postProposeFromMeeting(body: {
  minutes: string;
}): Promise<{
  proposal: import("@prompt-studio/core").MeetingDocumentProposal;
  usedLlm: boolean;
  error?: string;
}> {
  const res = await fetch("/api/propose-from-meeting", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(typeof data.detail === "string" ? data.detail : (data.error ?? `HTTP ${res.status}`));
  }
  return data;
}

export async function postRevisePromptRules(body: {
  contentPolicy: string;
  designYaml: string;
  behaviorRules: string;
  instruction: string;
}): Promise<{ rules: Required<import("@prompt-studio/core").PromptRuleDefaultsB>; usedLlm: boolean; error?: string }> {
  const res = await fetch("/api/revise-prompt-rules", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(typeof data.detail === "string" ? data.detail : (data.error ?? `HTTP ${res.status}`));
  }
  return data;
}

export async function postRevisePrompt(body: {
  gensparkText: string;
  markdown: string;
  instruction: string;
  tuning: Tuning;
  focusLabel?: string;
}): Promise<{ gensparkText: string; markdown: string; usedLlm: boolean; error?: string }> {
  const res = await fetch("/api/revise-prompt", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(typeof data.detail === "string" ? data.detail : (data.error ?? `HTTP ${res.status}`));
  }
  return data;
}
