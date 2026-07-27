import Anthropic from "@anthropic-ai/sdk";
import type { MeetingDocumentProposal } from "@prompt-studio/core";
import { emptyMeetingProposal } from "@prompt-studio/core";
import { ANTHROPIC_MODEL_CANDIDATES } from "./anthropic-models.js";
import { parseJsonFromLlm } from "./markdown-merge.js";

const PROPOSE_SYSTEM = `You analyze Japanese business meeting minutes (議事録) and propose ONE slide deck prompt plan for EN Logical.

Output ONLY valid JSON (no markdown fence) matching this schema:
{
  "pitch": string,
  "documentTitle": string,
  "rationale": string,
  "audience": string,
  "formatLabel": string,
  "suggestedEngine": "b" | "none",
  "outline": [ { "heading": string, "purpose": string } ],
  "briefDraft": {
    "targetParticipants": string,
    "trainingStartPeriod": string,
    "mainEffects": string,
    "trainingFeeExTax": string,
    "subsidyAndNet": string
  },
  "tuningDraft": {
    "clientName": string,
    "proposerName": string,
    "projectTitle": string
  },
  "contextForGeneration": string
}

Rules:
- Business Japanese, no emoji.
- Do not invent precise yen amounts unless stated in minutes; use "要確認" or leave empty.
- If minutes are about AI training / 研修 / 助成 / 見積 follow-up → suggestedEngine "b".
- If about partnership / 協業 / 新商品 → suggestedEngine "none", formatLabel describes A-style proposal (future).
- Extract client name from minutes when possible.`;

function getClient(): Anthropic | null {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

async function createText(client: Anthropic, user: string): Promise<string> {
  const errors: string[] = [];
  for (const model of ANTHROPIC_MODEL_CANDIDATES) {
    try {
      const msg = await client.messages.create({
        model,
        max_tokens: 4096,
        temperature: 0.25,
        system: PROPOSE_SYSTEM,
        messages: [{ role: "user", content: user }],
      });
      return msg.content
        .filter((b) => b.type === "text")
        .map((b) => b.text)
        .join("");
    } catch (e) {
      errors.push(e instanceof Error ? e.message.slice(0, 120) : String(e));
    }
  }
  throw new Error(errors.join(" | ") || "LLM failed");
}

function mockProposal(minutes: string): MeetingDocumentProposal {
  const base = emptyMeetingProposal();
  const snippet = minutes.trim().slice(0, 200).replace(/\s+/g, " ");
  const hasTraining = /研修|トレーニング|助成|カリキュラム|受講/.test(minutes);
  return {
    ...base,
    pitch: hasTraining
      ? "議事録の内容を踏まえ、経営層向けの研修導入サマリー（全8枚）を作成しましょう。"
      : "議事録をもとに、次のアクションが伝わる提案資料の骨子を作成しましょう。",
    documentTitle: snippet.slice(0, 40) || "提案資料（議事録より）",
    rationale:
      "議事録に記載された課題・合意事項を、決裁者が一覧できるスライド構成に整理するためです。",
    audience: "経営層・意思決定者",
    formatLabel: hasTraining ? "研修の提案書（8枚サマリー）" : "提案資料（形式は要すり合わせ）",
    suggestedEngine: hasTraining ? "b" : "none",
    outline: [
      { heading: "背景と課題", purpose: "議事録の論点を整理" },
      { heading: "提案の全体像", purpose: "合意した方向性の要約" },
      { heading: "スケジュール", purpose: "次のマイルストーン" },
      { heading: "期待効果", purpose: "ROI・定性効果" },
      { heading: "次のアクション", purpose: "担当と期限" },
    ],
    briefDraft: base.briefDraft,
    tuningDraft: {
      clientName: "",
      proposerName: "株式会社ENロジカル",
      projectTitle: snippet.slice(0, 50) || "提案（議事録より）",
    },
    contextForGeneration: `【議事録抜粋】\n${minutes.trim().slice(0, 8000)}`,
  };
}

function normalizeProposal(raw: unknown, minutes: string): MeetingDocumentProposal {
  const fallback = mockProposal(minutes);
  if (!raw || typeof raw !== "object") return fallback;
  const o = raw as Record<string, unknown>;

  const outlineRaw = Array.isArray(o.outline) ? o.outline : [];
  const outline = outlineRaw
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const h = item as Record<string, unknown>;
      const heading = String(h.heading ?? "").trim();
      const purpose = String(h.purpose ?? "").trim();
      if (!heading) return null;
      return { heading, purpose: purpose || "—" };
    })
    .filter(Boolean) as MeetingDocumentProposal["outline"];

  const brief = o.briefDraft && typeof o.briefDraft === "object" ? (o.briefDraft as Record<string, unknown>) : {};
  const tuning =
    o.tuningDraft && typeof o.tuningDraft === "object" ? (o.tuningDraft as Record<string, unknown>) : {};

  const engine = o.suggestedEngine === "b" ? "b" : o.suggestedEngine === "none" ? "none" : fallback.suggestedEngine;

  return {
    pitch: String(o.pitch ?? fallback.pitch).trim() || fallback.pitch,
    documentTitle: String(o.documentTitle ?? fallback.documentTitle).trim() || fallback.documentTitle,
    rationale: String(o.rationale ?? fallback.rationale).trim() || fallback.rationale,
    audience: String(o.audience ?? fallback.audience).trim() || fallback.audience,
    formatLabel: String(o.formatLabel ?? fallback.formatLabel).trim() || fallback.formatLabel,
    suggestedEngine: engine,
    outline: outline.length ? outline : fallback.outline,
    briefDraft: {
      targetParticipants: String(brief.targetParticipants ?? ""),
      trainingStartPeriod: String(brief.trainingStartPeriod ?? ""),
      mainEffects: String(brief.mainEffects ?? ""),
      trainingFeeExTax: String(brief.trainingFeeExTax ?? ""),
      subsidyAndNet: String(brief.subsidyAndNet ?? ""),
    },
    tuningDraft: {
      clientName: String(tuning.clientName ?? ""),
      proposerName: String(tuning.proposerName ?? "株式会社ENロジカル"),
      projectTitle: String(tuning.projectTitle ?? fallback.tuningDraft.projectTitle),
    },
    contextForGeneration: String(o.contextForGeneration ?? fallback.contextForGeneration).trim(),
  };
}

export async function runProposeFromMeeting(body: {
  minutes: string;
}): Promise<{ proposal: MeetingDocumentProposal; usedLlm: boolean; error?: string }> {
  const minutes = body.minutes?.trim() ?? "";
  if (minutes.length < 80) {
    return {
      proposal: emptyMeetingProposal(),
      usedLlm: false,
      error: "議事録は80文字以上入力してください",
    };
  }

  const client = getClient();
  if (!client) {
    return { proposal: mockProposal(minutes), usedLlm: false };
  }

  const user = `Meeting minutes (議事録):
---
${minutes.slice(0, 48000)}
---

Propose the best slide deck plan.`;

  try {
    const text = await createText(client, user);
    const parsed = parseJsonFromLlm(text);
    return { proposal: normalizeProposal(parsed, minutes), usedLlm: true };
  } catch (e) {
    const err = e instanceof Error ? e.message : String(e);
    return { proposal: mockProposal(minutes), usedLlm: false, error: err };
  }
}
