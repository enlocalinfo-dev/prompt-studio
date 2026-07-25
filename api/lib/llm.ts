import Anthropic from "@anthropic-ai/sdk";
import type { Extracted, FormatId, Tuning } from "@prompt-studio/core";
import { loadPromptStudioCore } from "./load-core.js";
import {
  ANTHROPIC_MODEL_CANDIDATES,
} from "./anthropic-models.js";
import {
  AUTHORING_SYSTEM,
  EXTRACT_SYSTEM,
  SLIDE_BRIEFS_SYSTEM,
} from "./authoring-prompt.js";
import {
  extractSlideBriefSection,
  mergeSlideBriefs,
  parseJsonFromLlm,
  slideHeadingsOutline,
} from "./markdown-merge.js";

function schemaHint(formatId: FormatId): string {
  if (formatId === "B") {
    return `{
  "formatId": "B",
  "trainingName": string,
  "targetParticipants": string,
  "trainingActivities": string,
  "beforeAfterSteps": string,
  "scheduleNotes": string,
  "roiNotes": string,
  "netCostNotes": string
}`;
  }
  return `{
  "formatId": "A",
  "targetAudience": string,
  "oneLineMessage": string,
  "readAction": string,
  "toneNotes": string,
  "slideOutline": string,
  "keyFacts": string[],
  "openItems": string[]
}`;
}

async function createText(
  client: Anthropic,
  system: string,
  user: string,
  maxTokens: number,
): Promise<string> {
  const errors: string[] = [];
  for (const model of ANTHROPIC_MODEL_CANDIDATES) {
    try {
      const msg = await client.messages.create({
        model,
        max_tokens: maxTokens,
        temperature: 0.2,
        system,
        messages: [{ role: "user", content: user }],
      });
      return msg.content
        .filter((b) => b.type === "text")
        .map((b) => b.text)
        .join("");
    } catch (e) {
      const err = e instanceof Error ? e.message : String(e);
      errors.push(`${model}: ${err.slice(0, 160)}`);
    }
  }
  throw new Error(errors.join(" | ") || "LLM request failed");
}

export type ExtractResult = { data: Extracted; usedLlm: boolean; error?: string };

export async function extractStructured(
  client: Anthropic | null,
  formatId: FormatId,
  transcript: string,
  referenceContext = "",
): Promise<ExtractResult> {
  const { mockExtract } = await loadPromptStudioCore();
  if (!client || !process.env.ANTHROPIC_API_KEY) {
    return { data: mockExtract(formatId, transcript), usedLlm: false };
  }

  const refBlock = referenceContext
    ? `\n\nReference materials (prioritize facts; do not invent beyond this):\n${referenceContext.slice(0, 35000)}`
    : "";

  const user = `formatId: ${formatId}

Meeting minutes / user input (summarize into schema; do NOT return the full text as a single field value):
---
${transcript || "（未入力）"}
---${refBlock}

Schema:
${schemaHint(formatId)}`;

  try {
    const text = await createText(client, EXTRACT_SYSTEM, user, 4096);
    const json = parseJsonFromLlm(text);
    return { data: json as Extracted, usedLlm: true };
  } catch (e) {
    const err = e instanceof Error ? e.message : String(e);
    return { data: mockExtract(formatId, transcript), usedLlm: false, error: err };
  }
}

export async function composeSlideBriefsWithLlm(
  client: Anthropic | null,
  formatId: FormatId,
  extracted: Extracted,
  tuning: Tuning,
  masterTemplate: string,
  transcript: string,
  referenceContext = "",
): Promise<{ briefs: string; usedLlm: boolean; error?: string }> {
  if (!client || !process.env.ANTHROPIC_API_KEY) {
    return { briefs: "", usedLlm: false };
  }

  const outline = slideHeadingsOutline(masterTemplate);
  const exampleSection = extractSlideBriefSection(masterTemplate).slice(0, 8000);

  const user = `formatId: ${formatId}
tuning: ${JSON.stringify(tuning, null, 2)}
structured_extract: ${JSON.stringify(extracted, null, 2)}

Original user / meeting input (facts only — do not paste verbatim into slides):
${transcript.slice(0, 12000)}

${referenceContext ? `References:\n${referenceContext.slice(0, 20000)}\n` : ""}

Slide IDs to keep (same ■ labels and order):
${outline}

Example section format (structure reference only — replace ALL content for this case):
---
${exampleSection}
---

Output ONLY the ■ slide brief blocks for this case (no section header line).`;

  try {
    const briefs = await createText(client, SLIDE_BRIEFS_SYSTEM, user, 12000);
    if (!briefs.includes("■")) {
      throw new Error("Slide briefs missing ■ markers");
    }
    return { briefs: briefs.trim(), usedLlm: true };
  } catch (e) {
    const err = e instanceof Error ? e.message : String(e);
    return { briefs: "", usedLlm: false, error: err };
  }
}

export async function composeWithLlm(
  client: Anthropic | null,
  formatId: FormatId,
  extracted: Extracted,
  tuning: Tuning,
  masterTemplate: string,
  transcript: string,
  referenceContext = "",
): Promise<{ markdown: string; usedLlm: boolean; error?: string }> {
  if (!client || !process.env.ANTHROPIC_API_KEY) {
    return { markdown: "", usedLlm: false };
  }

  const user = `formatId: ${formatId}
tuning: ${JSON.stringify(tuning, null, 2)}
structured_extract: ${JSON.stringify(extracted, null, 2)}

User / meeting input:
${transcript.slice(0, 14000)}

${referenceContext ? `References:\n${referenceContext.slice(0, 25000)}\n` : ""}

Master template — adapt ALL case-specific text (■ slides, 案件要約, client, dates). Keep locks and YAML:
---
${masterTemplate.slice(0, 100000)}
---`;

  try {
    const md = await createText(client, AUTHORING_SYSTEM, user, 16000);
    if (md.trim().length < 400) {
      throw new Error("Full compose output too short");
    }
    return { markdown: md, usedLlm: true };
  } catch (e) {
    const err = e instanceof Error ? e.message : String(e);
    return { markdown: "", usedLlm: false, error: err };
  }
}
