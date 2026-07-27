import type { PromptRuleOverridesB, TuningB } from "@prompt-studio/core";
import { loadPromptStudioCore } from "./load-core.js";

/** マスター markdown にプロンプトルール上書き・枚数／イラスト方針を適用（案件表記の差し替えは後段） */
export async function applyMasterRulesOnly(
  master: string,
  tuning: TuningB,
  ruleOverrides?: PromptRuleOverridesB,
): Promise<string> {
  const core = await loadPromptStudioCore();
  return core.applyPromptRulesToMaster(master, ruleOverrides, tuning);
}
