import Anthropic from "@anthropic-ai/sdk";
import {
  heuristicParseEstimateText,
  type ExpandedFromEstimate,
} from "@prompt-studio/core";
import {
  sanitizeExpandBriefBody,
  shouldAttachPdfBinary,
} from "./pdf-upload-limits.js";

import { ANTHROPIC_MODEL_CANDIDATES } from "./anthropic-models.js";

const JSON_SCHEMA = `{
  "clientName": "提案先（株式会社〇〇様）",
  "projectTitle": "研修名・件名",
  "documentDate": "見積日または資料版日（YYYY年M月D日）",
  "targetParticipants": "研修対象者（人数・役割・前提）",
  "trainingStartPeriod": "開始時期・決裁/申請締切/キックオフ（見積・備考から）",
  "mainEffects": "主な効果・ROIの要約（試算があれば記載、保証しない注記）",
  "trainingFeeExTax": "研修費税抜（見積金額）",
  "subsidyAndNet": "助成・差引・1人あたり（見積にあれば。なければ空文字）",
  "trainingDetailForSlides": "スライド2-3用：回数・カリキュラム・成果物の箇条書き",
  "notes": "不足・要確認事項"
}`;

function getClient(): Anthropic | null {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

function parseJson(text: string): ExpandedFromEstimate {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const raw = fenced ? fenced[1].trim() : text.trim();
  const s = raw.indexOf("{");
  const e = raw.lastIndexOf("}");
  const obj = JSON.parse(raw.slice(s, e + 1)) as Record<string, string>;
  return {
    tuning: {
      clientName: obj.clientName,
      projectTitle: obj.projectTitle,
      documentDate: obj.documentDate,
    },
    brief: {
      targetParticipants: obj.targetParticipants,
      trainingStartPeriod: obj.trainingStartPeriod,
      mainEffects: obj.mainEffects,
      trainingFeeExTax: obj.trainingFeeExTax,
      subsidyAndNet: obj.subsidyAndNet ?? "",
    },
    trainingDetailForSlides: obj.trainingDetailForSlides,
    notes: obj.notes,
  };
}

export async function expandBriefFromEstimatePdf(body: {
  fileName: string;
  extractedText?: string;
  pdfBase64?: string;
}): Promise<{ expanded: ExpandedFromEstimate; usedLlm: boolean }> {
  const sanitized = sanitizeExpandBriefBody(body);
  const { fileName, extractedText, pdfBase64 } = sanitized;
  const heuristic = extractedText?.trim()
    ? heuristicParseEstimateText(extractedText)
    : { tuning: {}, brief: {}, trainingDetailForSlides: "" };

  const client = getClient();
  if (!client) {
    return { expanded: heuristic, usedLlm: false };
  }

  const system = `You read EN Logical training estimate PDFs (見積書) and output JSON for a B-format executive slide deck prompt.
Facts only from the document. Do not invent subsidy rates. Use Japanese business tone.
Output ONLY valid JSON matching the schema.`;

  const userText = `File: ${fileName}
${extractedText?.trim() ? `Extracted text:\n${extractedText.slice(0, 45000)}` : "（テキスト層なし・PDF画像を参照）"}

Schema:
${JSON_SCHEMA}`;

  const content: Anthropic.MessageCreateParams["messages"][0]["content"] = [];

  if (shouldAttachPdfBinary(extractedText) && pdfBase64 && pdfBase64.length > 100) {
    content.push({
      type: "document",
      source: {
        type: "base64",
        media_type: "application/pdf",
        data: pdfBase64,
      },
    } as Anthropic.DocumentBlockParam);
  }

  content.push({ type: "text", text: userText });

  for (const model of ANTHROPIC_MODEL_CANDIDATES) {
    try {
      const msg = await client.messages.create({
        model,
        max_tokens: 4096,
        temperature: 0.1,
        system,
        messages: [{ role: "user", content }],
      });
      const text = msg.content
        .filter((b) => b.type === "text")
        .map((b) => b.text)
        .join("");
      const expanded = parseJson(text);
      return { expanded, usedLlm: true };
    } catch {
      /* try next model */
    }
  }

  return { expanded: heuristic, usedLlm: false };
}
