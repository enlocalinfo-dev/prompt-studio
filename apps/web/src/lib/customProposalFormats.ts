import type { PromptRuleDefaultsB } from "@prompt-studio/core";

const STORAGE_KEY = "prompt-studio-custom-formats-v1";

export type CustomFormatEngine = "b" | "none";

export interface StoredCustomProposalFormat {
  id: string;
  title: string;
  description: string;
  detail: string;
  createSlug: string;
  rulesSlug: string;
  formatBadge: string;
  engine: CustomFormatEngine;
  /** 追加時点のルールひな形（リセット時の基準） */
  ruleDefaults: PromptRuleDefaultsB;
  createdAt: string;
}

export function loadCustomProposalFormats(): StoredCustomProposalFormat[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as StoredCustomProposalFormat[];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export function saveCustomProposalFormats(formats: StoredCustomProposalFormat[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(formats));
}

export function findCustomFormatBySlug(slug: string): StoredCustomProposalFormat | undefined {
  const s = slug.toLowerCase();
  return loadCustomProposalFormats().find(
    (f) => f.createSlug.toLowerCase() === s || f.rulesSlug.toLowerCase() === s,
  );
}

export function findCustomFormatById(id: string): StoredCustomProposalFormat | undefined {
  return loadCustomProposalFormats().find((f) => f.id === id);
}

function slugifyTitle(title: string): string {
  const base = title
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .slice(0, 28);
  return base || "custom";
}

export function uniqueSlugForTitle(title: string, reserved: Set<string>): string {
  let base = slugifyTitle(title);
  if (!reserved.has(base)) return base;
  for (let i = 2; i < 100; i++) {
    const candidate = `${base}-${i}`;
    if (!reserved.has(candidate)) return candidate;
  }
  return `${base}-${Date.now().toString(36).slice(-4)}`;
}

export function addCustomProposalFormat(input: {
  title: string;
  description: string;
  detail: string;
  ruleDefaults: PromptRuleDefaultsB;
  engine: CustomFormatEngine;
  reservedSlugs: Set<string>;
}): StoredCustomProposalFormat {
  const slug = uniqueSlugForTitle(input.title, input.reservedSlugs);
  const badge = input.title.trim().slice(0, 2) || "＋";
  const entry: StoredCustomProposalFormat = {
    id: `custom-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    title: input.title.trim(),
    description: input.description.trim(),
    detail: input.detail.trim(),
    createSlug: slug,
    rulesSlug: slug,
    formatBadge: badge,
    engine: input.engine,
    ruleDefaults: input.ruleDefaults,
    createdAt: new Date().toISOString(),
  };
  const next = [entry, ...loadCustomProposalFormats()];
  saveCustomProposalFormats(next);
  return entry;
}

export function removeCustomProposalFormat(id: string): void {
  saveCustomProposalFormats(loadCustomProposalFormats().filter((f) => f.id !== id));
}

export function updateCustomRuleDefaults(id: string, ruleDefaults: PromptRuleDefaultsB): void {
  const list = loadCustomProposalFormats();
  const idx = list.findIndex((f) => f.id === id);
  if (idx === -1) return;
  list[idx] = { ...list[idx], ruleDefaults };
  saveCustomProposalFormats(list);
}
