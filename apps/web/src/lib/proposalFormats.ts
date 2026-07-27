import {
  findCustomFormatById,
  findCustomFormatBySlug,
  loadCustomProposalFormats,
  type StoredCustomProposalFormat,
} from "./customProposalFormats";

export type BuiltInFormatId = "training-delivery";

export type ProposalFormatId = BuiltInFormatId | string;

export type ProposalFormatEngine = "b" | "none";

export type ProposalFormatDef = {
  id: ProposalFormatId;
  createSlug: string;
  rulesSlug: string;
  title: string;
  description: string;
  detail: string;
  available: boolean;
  rulesAvailable: boolean;
  formatBadge: string;
  engine: ProposalFormatEngine;
  isCustom: boolean;
  /** カスタム形式のルールひな形（built-in は undefined → API から取得） */
  customRuleDefaults?: import("@prompt-studio/core").PromptRuleDefaultsB;
};

const BUILTIN: ProposalFormatDef[] = [
  {
    id: "training-delivery",
    createSlug: "b",
    rulesSlug: "b",
    title: "研修の提案書",
    description: "見積PDFから、経営者向けサマリー全8枚用の Genspark 指示文を作成",
    detail: "ENロジカル形式の見積1枚 · デリバリー提案（B形式）",
    available: true,
    rulesAvailable: true,
    formatBadge: "B",
    engine: "b",
    isCustom: false,
  },
];

function customToDef(c: StoredCustomProposalFormat): ProposalFormatDef {
  return {
    id: c.id,
    createSlug: c.createSlug,
    rulesSlug: c.rulesSlug,
    title: c.title,
    description: c.description,
    detail: c.detail,
    available: c.engine === "b",
    rulesAvailable: true,
    formatBadge: c.formatBadge,
    engine: c.engine,
    isCustom: true,
    customRuleDefaults: c.ruleDefaults,
  };
}

export function listAllProposalFormats(): ProposalFormatDef[] {
  return [...BUILTIN, ...loadCustomProposalFormats().map(customToDef)];
}

export function allReservedSlugs(): Set<string> {
  return new Set(listAllProposalFormats().flatMap((f) => [f.createSlug.toLowerCase(), f.rulesSlug.toLowerCase()]));
}

/** @deprecated 一覧は listAllProposalFormats を使用 */
export const PROPOSAL_FORMATS = BUILTIN;

export function formatCreatePath(createSlug: string): string {
  return `/create/${createSlug}`;
}

export function formatRulesPath(rulesSlug: string): string {
  return `/rules/${rulesSlug}`;
}

export function getFormatByCreateSlug(slug: string): ProposalFormatDef | undefined {
  const s = slug.toLowerCase();
  const custom = findCustomFormatBySlug(slug);
  if (custom) return customToDef(custom);
  return BUILTIN.find((f) => f.createSlug.toLowerCase() === s);
}

export function getFormatByRulesSlug(slug: string): ProposalFormatDef | undefined {
  const s = slug.toLowerCase();
  const custom = findCustomFormatBySlug(slug);
  if (custom) return customToDef(custom);
  return BUILTIN.find((f) => f.rulesSlug.toLowerCase() === s);
}

export function formatStorageId(format: ProposalFormatDef): string {
  return format.id;
}

/** 作成フローで使う storage id（API・ルール上書き） */
export function formatIdFromCreateSlug(slug: string): string | null {
  const f = getFormatByCreateSlug(slug);
  return f ? formatStorageId(f) : null;
}

export function getFormatById(id: string): ProposalFormatDef | undefined {
  const built = BUILTIN.find((f) => f.id === id);
  if (built) return built;
  const custom = findCustomFormatById(id);
  return custom ? customToDef(custom) : undefined;
}
