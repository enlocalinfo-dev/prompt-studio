export type ProposalFormatId = "training-delivery" | "collaboration-a" | "quick-5";

export type ProposalFormatDef = {
  id: ProposalFormatId;
  /** 作成画面 `/create/:slug` */
  createSlug: string;
  /** ルール画面 `/rules/:slug` */
  rulesSlug: string;
  title: string;
  description: string;
  detail: string;
  available: boolean;
  rulesAvailable: boolean;
  formatBadge: string;
};

export const PROPOSAL_FORMATS: ProposalFormatDef[] = [
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
  },
  {
    id: "collaboration-a",
    createSlug: "a",
    rulesSlug: "a",
    title: "協業・商品化の提案書",
    description: "章立て15枚前後の経営向け提案（準備中）",
    detail: "A形式 · 音声メモと参照資料から作成",
    available: false,
    rulesAvailable: false,
    formatBadge: "A",
  },
  {
    id: "quick-5",
    createSlug: "quick5",
    rulesSlug: "quick5",
    title: "5枚クイック提案",
    description: "短尺の提案資料用（準備中）",
    detail: "要点整理型 · 5枚固定",
    available: false,
    rulesAvailable: false,
    formatBadge: "5",
  },
];

export function formatCreatePath(createSlug: string): string {
  return `/create/${createSlug}`;
}

export function formatRulesPath(rulesSlug: string): string {
  return `/rules/${rulesSlug}`;
}

export function getFormatByCreateSlug(slug: string): ProposalFormatDef | undefined {
  const s = slug.toLowerCase();
  return PROPOSAL_FORMATS.find((f) => f.createSlug.toLowerCase() === s);
}

export function getFormatByRulesSlug(slug: string): ProposalFormatDef | undefined {
  const s = slug.toLowerCase();
  return PROPOSAL_FORMATS.find((f) => f.rulesSlug.toLowerCase() === s);
}

/** 作成フローで使う formatId（API・ルール上書き） */
export function formatIdFromCreateSlug(slug: string): ProposalFormatId | null {
  return getFormatByCreateSlug(slug)?.id ?? null;
}
