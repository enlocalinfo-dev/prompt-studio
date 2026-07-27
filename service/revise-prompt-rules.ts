import Anthropic from "@anthropic-ai/sdk";
import type { PromptRuleDefaultsB } from "@prompt-studio/core";
import { ANTHROPIC_MODEL_CANDIDATES } from "./anthropic-models.js";
import { parseJsonFromLlm } from "./markdown-merge.js";

const SYSTEM = `You edit EN Logical Genspark **prompt rule** sections (Japanese B-format training proposals).

The user provides three blocks:
1. contentPolicy — case summary, what to write, ■固稿 lock policy
2. designYaml — design_system YAML (colors, tone, constraints)
3. behaviorRules — non-AI lock, illustration, business tone, slide count rules

Apply the user's instruction. Rules:
- No emoji or decorative unicode.
- Do NOT invent fake yen amounts.
- If user asks to reorder slides, update behaviorRules text to reflect order; do not delete ■固稿 lock sections unless asked.
- Preserve 【...】 section headers unless user asks to rename them.
- YAML must remain valid-ish (design_system: root).

Output ONLY JSON:
{
  "contentPolicy": string,
  "designYaml": string,
  "behaviorRules": string
}`;

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
        max_tokens: 12000,
        temperature: 0.2,
        system: SYSTEM,
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

export async function runRevisePromptRules(body: {
  contentPolicy: string;
  designYaml: string;
  behaviorRules: string;
  instruction: string;
}): Promise<{ rules: Required<PromptRuleDefaultsB>; usedLlm: boolean; error?: string }> {
  const { contentPolicy, designYaml, behaviorRules, instruction } = body;
  const base = { contentPolicy, designYaml, behaviorRules };

  if (!instruction.trim()) {
    return { rules: base, usedLlm: false, error: "修正指示を入力してください" };
  }

  const client = getClient();
  if (!client) {
    return { rules: base, usedLlm: false, error: "AI編集には API キー設定が必要です" };
  }

  const user = `Instruction:
${instruction.trim()}

---
contentPolicy:
${contentPolicy.slice(0, 12000)}

---
designYaml:
${designYaml.slice(0, 12000)}

---
behaviorRules:
${behaviorRules.slice(0, 12000)}
---`;

  try {
    const text = await createText(client, user);
    const parsed = parseJsonFromLlm(text) as Partial<PromptRuleDefaultsB> | null;
    if (!parsed?.contentPolicy || !parsed.designYaml || !parsed.behaviorRules) {
      throw new Error("AI出力のJSONが不完全です");
    }
    return {
      rules: {
        contentPolicy: String(parsed.contentPolicy),
        designYaml: String(parsed.designYaml),
        behaviorRules: String(parsed.behaviorRules),
      },
      usedLlm: true,
    };
  } catch (e) {
    const err = e instanceof Error ? e.message : String(e);
    return { rules: base, usedLlm: false, error: err };
  }
}
