import type { PromptRuleDefaultsB, TuningB } from "@prompt-studio/core";
import {
  defaultBSlideRoleOrder,
  normalizeBSlideRoleOrder,
  syncBehaviorRulesWithSlideOrder,
} from "@prompt-studio/core";
import type { PromptRuleOverridesB } from "@prompt-studio/core";
import {
  diffOverridesFromDefaults,
  savePromptRuleOverrides,
} from "./promptRuleStorage";
import { saveTuningB } from "./storage";

export type RulesDraft = Required<PromptRuleDefaultsB> & { slideRoleOrder?: number[] };

/** 保存前に順序・ルール本文・上書きストレージを一括で揃える */
export function commitPromptRulesSave(input: {
  defaults: PromptRuleDefaultsB;
  draft: RulesDraft;
  slideRoleOrder: number[];
  tuning: TuningB;
  storageId: string;
  syncSlideOrder: boolean;
}): { draft: RulesDraft; slideRoleOrder: number[]; overrides: PromptRuleOverridesB } {
  const normalizedOrder = normalizeBSlideRoleOrder(input.slideRoleOrder, input.tuning);

  let behaviorRules = input.draft.behaviorRules;
  if (input.syncSlideOrder) {
    behaviorRules = syncBehaviorRulesWithSlideOrder(behaviorRules, normalizedOrder, input.tuning);
  }

  const draft: RulesDraft = {
    ...input.draft,
    behaviorRules,
    slideRoleOrder: normalizedOrder,
  };

  const overrides = diffOverridesFromDefaults(
    { ...draft, slideRoleOrder: normalizedOrder },
    input.defaults,
    input.tuning,
  );

  savePromptRuleOverrides(overrides, input.storageId);
  saveTuningB(input.tuning);

  return { draft, slideRoleOrder: normalizedOrder, overrides };
}

export function initialSlideRoleOrder(
  stored: PromptRuleOverridesB,
  tuning: TuningB,
): number[] {
  if (stored.slideRoleOrder?.length) {
    return normalizeBSlideRoleOrder(stored.slideRoleOrder, tuning);
  }
  return defaultBSlideRoleOrder();
}
