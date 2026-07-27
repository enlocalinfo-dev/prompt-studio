import Anthropic from "@anthropic-ai/sdk";
import type { TuningB } from "@prompt-studio/core";
import { loadPromptStudioCore } from "./load-core.js";

const REVISE_SYSTEM = `You are an expert editor for EN Logical B-format Genspark slide prompts (Japanese business training proposals).

Hard constraints:
- Preserve ALL 【...】 rule section headers and their block structure unless the user explicitly asks to change rules or YAML.
- Preserve design_system: YAML block exactly unless user asks to change design/tone/colors.
- Keep ■スライドN labels, order, and count unless user asks to add/remove slides.
- No emoji or decorative unicode symbols.
- Do not summarize or shorten ■ slide brief text unless the user asks to shorten.

Apply the user's edit instruction to slide ■ bodies, leads, and case-specific wording.

Output ONLY the complete Genspark input text (the entire content that would appear inside the \`\`\`text fence): from the opening role sentence through the design_system YAML. No markdown fences, no commentary.`;

function getClient(): Anthropic | null {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

export async function runRevisePrompt(body: {
  gensparkText: string;
  markdown: string;
  instruction: string;
  tuning: TuningB;
  focusLabel?: string;
}): Promise<{ gensparkText: string; markdown: string; usedLlm: boolean; error?: string }> {
  const client = getClient();
  const core = await loadPromptStudioCore();
  const { gensparkText, markdown, instruction, tuning, focusLabel } = body;

  if (!instruction.trim()) {
    return { gensparkText, markdown, usedLlm: false, error: "修正指示を入力してください" };
  }

  if (!client) {
    return { gensparkText, markdown, usedLlm: false, error: "AI修正には API キー設定が必要です（ローカル .env）" };
  }

  const user = `Case tuning:
${JSON.stringify(tuning, null, 2)}

${focusLabel ? `Focus for this edit: ${focusLabel}\n` : ""}

User edit instruction:
${instruction.trim()}

Current Genspark text to revise (full):
---
${gensparkText.slice(0, 48000)}
---`;

  try {
    const res = await client.messages.create({
      model: process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-20250514",
      max_tokens: 16384,
      system: REVISE_SYSTEM,
      messages: [{ role: "user", content: user }],
    });
    const block = res.content.find((c) => c.type === "text");
    const revised = block && block.type === "text" ? block.text.trim() : "";
    if (revised.length < 500 || !revised.includes("■")) {
      throw new Error("AI出力が短すぎるか、■固稿がありません");
    }
    const prev = core.extractGensparkText(markdown);
    let nextMarkdown = markdown;
    if (prev && markdown.includes(prev)) {
      nextMarkdown = markdown.replace(prev, revised);
    } else {
      nextMarkdown = markdown;
    }
    return { gensparkText: revised, markdown: nextMarkdown, usedLlm: true };
  } catch (e) {
    const err = e instanceof Error ? e.message : String(e);
    return { gensparkText, markdown, usedLlm: false, error: err };
  }
}
