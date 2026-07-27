import type { PromptRuleDefaultsB, PromptRuleOverridesB } from "@prompt-studio/core";
import { defaultBSlideRoleOrder, normalizeBSlideRoleOrder } from "@prompt-studio/core";
import type { TuningB } from "@prompt-studio/core";

const LEGACY_KEY_B = "prompt-studio-rule-overrides-B";

function overridesKey(formatId: string): string {
  return `prompt-studio-rule-overrides-${formatId}`;
}

function fingerprintKey(formatId: string): string {
  return `prompt-studio-rule-defaults-hash-${formatId}`;
}

function migrateLegacyBIfNeeded(formatId: string): void {
  if (formatId !== "training-delivery") return;
  const key = overridesKey(formatId);
  if (localStorage.getItem(key)) return;
  const legacy = localStorage.getItem(LEGACY_KEY_B);
  if (legacy) {
    localStorage.setItem(key, legacy);
  }
}

export function loadPromptRuleOverrides(formatId: string = "training-delivery"): PromptRuleOverridesB {
  migrateLegacyBIfNeeded(formatId);
  try {
    const raw = localStorage.getItem(overridesKey(formatId));
    if (raw) return JSON.parse(raw) as PromptRuleOverridesB;
  } catch {
    /* ignore */
  }
  return {};
}

export function savePromptRuleOverrides(overrides: PromptRuleOverridesB, formatId: string = "training-delivery"): void {
  localStorage.setItem(overridesKey(formatId), JSON.stringify(overrides));
}

export function rememberDefaultsFingerprint(defaults: PromptRuleDefaultsB, formatId: string): void {
  const fp = `${defaults.contentPolicy.length}:${defaults.designYaml.length}:${defaults.behaviorRules.length}`;
  localStorage.setItem(fingerprintKey(formatId), fp);
}

export function clearPromptRuleOverrides(formatId: string): void {
  localStorage.removeItem(overridesKey(formatId));
}

export function mergeOverridesWithDefaults(
  defaults: PromptRuleDefaultsB,
  stored: PromptRuleOverridesB,
): Required<PromptRuleDefaultsB> & { slideRoleOrder?: number[] } {
  return {
    contentPolicy: stored.contentPolicy?.trim() ? stored.contentPolicy : defaults.contentPolicy,
    designYaml: stored.designYaml?.trim() ? stored.designYaml : defaults.designYaml,
    behaviorRules: stored.behaviorRules?.trim() ? stored.behaviorRules : defaults.behaviorRules,
    slideRoleOrder: stored.slideRoleOrder,
  };
}

function orderEqual(a: number[] | undefined, b: number[], tuning: TuningB): boolean {
  const na = normalizeBSlideRoleOrder(a, tuning);
  const nb = normalizeBSlideRoleOrder(b, tuning);
  return na.length === nb.length && na.every((v, i) => v === nb[i]);
}

export function diffOverridesFromDefaults(
  current: Required<PromptRuleDefaultsB> & { slideRoleOrder?: number[] },
  defaults: PromptRuleDefaultsB,
  tuning: TuningB,
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
  if (current.slideRoleOrder?.length && !orderEqual(current.slideRoleOrder, defaultBSlideRoleOrder(), tuning)) {
    out.slideRoleOrder = normalizeBSlideRoleOrder(current.slideRoleOrder, tuning);
  }
  return out;
}
