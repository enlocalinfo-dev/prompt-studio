import Anthropic from "@anthropic-ai/sdk";
import {
  heuristicParseEstimateText,
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
    ? heuristicParseEstimateText(extractedText)
    : { tuning: {}, brief: {}, trainingDetailForSlides: "" };

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
      return { expanded, usedLlm: true };
    } catch {
      /* try next model */
    }
  }

  return { expanded: heuristic, usedLlm: false };
}
