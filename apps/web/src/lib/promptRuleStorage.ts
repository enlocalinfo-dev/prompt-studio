import type { PromptRuleDefaultsB, PromptRuleOverridesB } from "@prompt-studio/core";

const KEY = "prompt-studio-rule-overrides-B";
const DEFAULTS_KEY = "prompt-studio-rule-defaults-hash-B";

export function loadPromptRuleOverrides(): PromptRuleOverridesB {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as PromptRuleOverridesB;
  } catch {
    /* ignore */
  }
  return {};
}

export function savePromptRuleOverrides(overrides: PromptRuleOverridesB): void {
  localStorage.setItem(KEY, JSON.stringify(overrides));
}

/** テンプレ更新時にデフォルトが変わったら上書きをリセットするための簡易ハッシュ */
export function rememberDefaultsFingerprint(defaults: PromptRuleDefaultsB): void {
  const fp = `${defaults.contentPolicy.length}:${defaults.designYaml.length}:${defaults.behaviorRules.length}`;
  localStorage.setItem(DEFAULTS_KEY, fp);
}

export function clearPromptRuleOverrides(): void {
  localStorage.removeItem(KEY);
}

export function mergeOverridesWithDefaults(
  defaults: PromptRuleDefaultsB,
  stored: PromptRuleOverridesB,
): Required<PromptRuleOverridesB> {
  return {
    contentPolicy: stored.contentPolicy?.trim() ? stored.contentPolicy : defaults.contentPolicy,
    designYaml: stored.designYaml?.trim() ? stored.designYaml : defaults.designYaml,
    behaviorRules: stored.behaviorRules?.trim() ? stored.behaviorRules : defaults.behaviorRules,
  };
}

/** 保存用：デフォルトと同一なら undefined にしてストレージを軽くする */
export function diffOverridesFromDefaults(
  current: Required<PromptRuleOverridesB>,
  defaults: PromptRuleDefaultsB,
): PromptRuleOverridesB {
  const out: PromptRuleOverridesB = {};
  if (current.contentPolicy.trim() !== defaults.contentPolicy.trim()) {
    out.contentPolicy = current.contentPolicy;
  }
  if (current.designYaml.trim() !== defaults.designYaml.trim()) {
    out.designYaml = current.designYaml;
  }
  if (current.behaviorRules.trim() !== defaults.behaviorRules.trim()) {
    out.behaviorRules = current.behaviorRules;
  }
  return out;
}
