import type { PromptRuleDefaultsB, PromptRuleOverridesB } from "@prompt-studio/core";
import type { ProposalFormatId } from "./proposalFormats";

const LEGACY_KEY_B = "prompt-studio-rule-overrides-B";

function overridesKey(formatId: ProposalFormatId): string {
  return `prompt-studio-rule-overrides-${formatId}`;
}

function fingerprintKey(formatId: ProposalFormatId): string {
  return `prompt-studio-rule-defaults-hash-${formatId}`;
}

function migrateLegacyBIfNeeded(formatId: ProposalFormatId): void {
  if (formatId !== "training-delivery") return;
  const key = overridesKey(formatId);
  if (localStorage.getItem(key)) return;
  const legacy = localStorage.getItem(LEGACY_KEY_B);
  if (legacy) {
    localStorage.setItem(key, legacy);
  }
}

export function loadPromptRuleOverrides(formatId: ProposalFormatId = "training-delivery"): PromptRuleOverridesB {
  migrateLegacyBIfNeeded(formatId);
  try {
    const raw = localStorage.getItem(overridesKey(formatId));
    if (raw) return JSON.parse(raw) as PromptRuleOverridesB;
  } catch {
    /* ignore */
  }
  return {};
}

export function savePromptRuleOverrides(
  overrides: PromptRuleOverridesB,
  formatId: ProposalFormatId = "training-delivery",
): void {
  localStorage.setItem(overridesKey(formatId), JSON.stringify(overrides));
}

export function rememberDefaultsFingerprint(
  defaults: PromptRuleDefaultsB,
  formatId: ProposalFormatId = "training-delivery",
): void {
  const fp = `${defaults.contentPolicy.length}:${defaults.designYaml.length}:${defaults.behaviorRules.length}`;
  localStorage.setItem(fingerprintKey(formatId), fp);
}

export function clearPromptRuleOverrides(formatId: ProposalFormatId = "training-delivery"): void {
  localStorage.removeItem(overridesKey(formatId));
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
