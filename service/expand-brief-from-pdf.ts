import Anthropic from "@anthropic-ai/sdk";
import {
  heuristicParseEstimateText,
  inferTrainingNameFromEstimate,
  isUsableTrainingName,
  type ExpandedFromEstimate,
} from "@prompt-studio/core";
import { fetchPdfBase64FromBlobUrl } from "./pdf-blob-fetch.js";
import {
  sanitizeExpandBriefBody,
  shouldAttachPdfBinary,
  type ExpandBriefPdfPayload,
} from "./pdf-upload-limits.js";

import { ANTHROPIC_MODEL_CANDIDATES } from "./anthropic-models.js";
import { EXPAND_BRIEF_JSON_SCHEMA, parseExpandBriefJson } from "./expand-brief-parse.js";

function getClient(): Anthropic | null {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

function parseJson(text: string, extractedText?: string): ExpandedFromEstimate {
  return parseExpandBriefJson(text, extractedText);
}

export async function expandBriefFromEstimatePdf(
  body: ExpandBriefPdfPayload,
): Promise<{ expanded: ExpandedFromEstimate; usedLlm: boolean }> {
  const sanitized = sanitizeExpandBriefBody(body);
  const { fileName, extractedText, pdfBlobUrl } = sanitized;
  let pdfBase64 = sanitized.pdfBase64;

  if (shouldAttachPdfBinary(extractedText) && !pdfBase64 && pdfBlobUrl) {
    pdfBase64 = await fetchPdfBase64FromBlobUrl(pdfBlobUrl);
  }
  const heuristic = extractedText?.trim()
    ? heuristicParseEstimateText(extractedText, fileName)
    : { tuning: {}, brief: {}, trainingDetailForSlides: "" };
  const inferredName = inferTrainingNameFromEstimate(extractedText ?? "", fileName);
  if (!isUsableTrainingName(heuristic.tuning.projectTitle, extractedText ?? "") && inferredName) {
    heuristic.tuning.projectTitle = inferredName;
  }

  const client = getClient();
  if (!client) {
    return { expanded: heuristic, usedLlm: false };
  }

  const system = `You read EN Logical training estimate PDFs (見積書) and output JSON for a B-format executive slide deck prompt.
Facts only from the document. Do not invent subsidy rates. Use Japanese business tone.

Schedule (CRITICAL for slide 5):
- Extract EVERY implementation date, session number (第N回), time, deadline, and start month from tables and remarks.
- Fill scheduleSessionDates and scheduleForSlide5 from the estimate — never copy template example dates (9月10日, 10月開始, etc.).
- If the PDF lists course dates, list them verbatim in scheduleSessionDates.

Training name (CRITICAL for projectTitle):
- projectTitle is REQUIRED. Take it from 件名, 題名, サービス名, 品名, 品目, コース名, 講座名, or the first training item in the table.
- Never output the template sample name 「AI活用 営業プロセス改善研修」 unless that exact phrase appears in the PDF.

Audience and sessions (CRITICAL):
- targetParticipants MUST come from 受講対象 / 対象者 / 人数 / 定員 in the PDF. Never use 15名 + 営業企画2名 / 東日本営業 unless those exact facts appear in the PDF.
- trainingDetailForSlides MUST list the PDF's 回数 (全N回 / 第N回) and each session theme. Never copy the template 全4回 curriculum (商談準備→提案書→議事録→運用ガイド) unless the PDF says so.

Output ONLY valid JSON matching the schema.`;

  const userText = `File: ${fileName}
${extractedText?.trim() ? `Extracted text:\n${extractedText.slice(0, 45000)}` : "（テキスト層なし・PDF画像を参照）"}

Schema:
${EXPAND_BRIEF_JSON_SCHEMA}`;

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
      const expanded = parseJson(text, extractedText);
      const source = extractedText ?? "";
      const inferred = inferTrainingNameFromEstimate(source, fileName);
      if (!isUsableTrainingName(expanded.tuning.projectTitle, source) && inferred) {
        expanded.tuning.projectTitle = inferred;
      } else if (!expanded.tuning.projectTitle?.trim() && inferred) {
        expanded.tuning.projectTitle = inferred;
      }
      return { expanded, usedLlm: true };
    } catch {
      /* try next model */
    }
  }

  return { expanded: heuristic, usedLlm: false };
}
