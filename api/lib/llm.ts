import Anthropic from "@anthropic-ai/sdk";
import type { Extracted, FormatId, Tuning } from "@prompt-studio/core";
import { loadPromptStudioCore } from "./load-core.js";

const MODEL = "claude-sonnet-4-20250514";

function schemaHint(formatId: FormatId): string {
  if (formatId === "B") {
    return `JSON only:
{
  "formatId": "B",
  "trainingName": string,
  "targetParticipants": string,
  "trainingActivities": string,
  "beforeAfterSteps": string,
  "scheduleNotes": string (must mention application deadline and start month if known),
  "roiNotes": string,
  "netCostNotes": string
}`;
  }
  return `JSON only:
{
  "formatId": "A",
  "targetAudience": string,
  "oneLineMessage": string,
  "readAction": string,
  "toneNotes": string,
  "slideOutline": string,
  "keyFacts": string[],
  "openItems": string[] (include "要協議" for unknown percentages)
}`;
}

export async function extractStructured(
  client: Anthropic | null,
  formatId: FormatId,
  transcript: string,
  referenceContext = "",
): Promise<Extracted> {
  const { mockExtract } = await loadPromptStudioCore();
  if (!client || !process.env.ANTHROPIC_API_KEY) {
    return mockExtract(formatId, transcript);
  }

  const system = `You extract structured briefing fields for Genspark prompt authoring.
Format ${formatId}. Japanese business tone. Do not invent revenue share percentages.
Return valid JSON matching the schema. No markdown fences.`;

  const refBlock = referenceContext
    ? `\n\nReference materials (PDF/URL — treat as factual source; do not invent beyond this):\n${referenceContext.slice(0, 40000)}`
    : "";

  const user = `Transcript / user request:\n${transcript || "（未入力）"}${refBlock}\n\nSchema:\n${schemaHint(formatId)}`;

  try {
    const msg = await client.messages.create({
      model: MODEL,
      max_tokens: 2048,
      system,
      messages: [{ role: "user", content: user }],
    });
    const text = msg.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("");
    const json = JSON.parse(text.replace(/^```json?\s*|\s*```$/g, "").trim());
    return json as Extracted;
  } catch {
    return mockExtract(formatId, transcript);
  }
}

export async function composeWithLlm(
  client: Anthropic | null,
  formatId: FormatId,
  extracted: Extracted,
  tuning: Tuning,
  masterTemplate: string,
  referenceContext = "",
): Promise<string> {
  if (!client || !process.env.ANTHROPIC_API_KEY) {
    return "";
  }

  const system = `You are an expert at writing genspark_prompt.md for EN Logical.
Merge structured user data into the master template. Keep all mandatory rule blocks.
Do not use emoji. Do not fabricate revenue percentages.
Output complete markdown including ## Gensparkへの入力 with a \`\`\`text block.`;

  const refBlock = referenceContext
    ? `\nreference_materials (PDF/URL excerpts — prioritize over guesswork):\n${referenceContext.slice(0, 50000)}\n`
    : "";

  const user = `formatId: ${formatId}
tuning: ${JSON.stringify(tuning, null, 2)}
extracted: ${JSON.stringify(extracted, null, 2)}
${refBlock}
Master template (adapt dates, client name, and slide briefs; keep locks):
---
${masterTemplate.slice(0, 120000)}
---`;

  try {
    const msg = await client.messages.create({
      model: MODEL,
      max_tokens: 16000,
      system,
      messages: [{ role: "user", content: user }],
    });
    return msg.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("");
  } catch {
    return "";
  }
}
