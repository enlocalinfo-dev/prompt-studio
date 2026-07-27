import {
  DELIVERY_B_SLIDES,
  effectiveBSlideCount,
  extractBRuleDefaults,
  PROMPT_RULE_LOGIC_SUMMARY,
  type PromptRuleDefaultsB,
} from "@prompt-studio/core";

export async function fetchPromptRuleDefaults(): Promise<PromptRuleDefaultsB> {
  const res = await fetch("/api/templates/B");
  if (!res.ok) throw new Error("B標準テンプレを読み込めませんでした");
  const data = (await res.json()) as { content?: string };
  if (!data.content) throw new Error("テンプレ内容が空です");
  return extractBRuleDefaults(data.content);
}

export { DELIVERY_B_SLIDES, effectiveBSlideCount, PROMPT_RULE_LOGIC_SUMMARY };
