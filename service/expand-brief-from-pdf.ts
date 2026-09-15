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
  const { fileName, extractedText, pdfBlobUrl, pageImages } = sanitized;
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

Training name vs client (CRITICAL):
- clientName = the addressee (〇〇様 / 御中). Example: 福寿園様 is the CLIENT, not the course name.
- projectTitle = the course (AI研修 / 基礎講座 / 件名・品名). NEVER put the client name into projectTitle.
- Never output the template sample name 「AI活用 営業プロセス改善研修」 unless that exact phrase appears in the PDF.

Audience and sessions (CRITICAL):
- targetParticipants MUST come from 受講対象 / 対象者 / 受講人数 / 人数 / 定員. Accept 人 and 名 (例: 20人 = 20名). Never use 15名 + 営業企画2名 / 東日本営業 unless those exact facts appear in the PDF.
- trainingDetailForSlides MUST list 全N回 and each session date/theme from the calendar (例: 全5回). Never copy the template 全4回 curriculum (商談準備→提案書→議事録→運用ガイド) unless the PDF says so.
- Fees and ROI: copy 税抜/税込/助成/実質負担 and 年間削減 from the estimate. Do not keep 170万円 / 490万円 template numbers.

Output ONLY valid JSON matching the schema.`;

  const userText = `File: ${fileName}
${extractedText?.trim() ? `Extracted text:\n${extractedText.slice(0, 45000)}` : pageImages?.length ? `（テキスト層なし。${pageImages.length}ページの画像を参照して、表・人数・回数・日程・金額をそのまま抜き出す）` : "（テキスト層なし・PDF画像を参照）"}

Schema:
${EXPAND_BRIEF_JSON_SCHEMA}`;

  const content: Anthropic.MessageCreateParams["messages"][0]["content"] = [];

  if (pageImages?.length) {
    for (const img of pageImages) {
      content.push({
        type: "image",
        source: {
          type: "base64",
          media_type: img.mimeType,
          data: img.data,
        },
      });
    }
  } else if (shouldAttachPdfBinary(extractedText) && pdfBase64 && pdfBase64.length > 100) {
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

  let lastError = "";
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
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e);
    }
  }

  if (pageImages?.length && !extractedText?.trim()) {
    throw new Error(
      `画像PDFの読み取りに失敗しました。しばらくしてから、同じPDFをもう一度入れてください。${lastError ? `（${lastError.slice(0, 120)}）` : ""}`,
    );
  }

  return { expanded: heuristic, usedLlm: false };
}
