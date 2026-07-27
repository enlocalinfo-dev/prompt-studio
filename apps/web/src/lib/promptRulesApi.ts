import { extractBRuleDefaults } from "@prompt-studio/core";
import type { PromptRuleDefaultsB } from "@prompt-studio/core";
import type { ProposalFormatDef } from "./proposalFormats";

export async function fetchBuiltinBRuleDefaults(): Promise<PromptRuleDefaultsB> {
  const res = await fetch("/api/templates/B");
  if (!res.ok) throw new Error("B標準テンプレを読み込めませんでした");
  const data = (await res.json()) as { content?: string };
  if (!data.content) throw new Error("テンプレ内容が空です");
  return extractBRuleDefaults(data.content);
}

export async function fetchPromptRuleDefaultsForFormat(format: ProposalFormatDef): Promise<PromptRuleDefaultsB> {
  if (format.customRuleDefaults) {
    return format.customRuleDefaults;
  }
  if (format.id === "training-delivery" || format.rulesSlug === "b") {
    return fetchBuiltinBRuleDefaults();
  }
  throw new Error("この資料種別のルールひな形がありません");
}
