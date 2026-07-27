export type ProposalFormatId = "training-delivery" | "collaboration-a" | "quick-5";

export type ProposalFormatDef = {
  id: ProposalFormatId;
  routeSlug: "b";
  title: string;
  description: string;
  detail: string;
  available: boolean;
};

export const PROPOSAL_FORMATS: ProposalFormatDef[] = [
  {
    id: "training-delivery",
    routeSlug: "b",
    title: "研修の提案書",
    description: "見積PDFから、経営者向けサマリー全8枚用の Genspark 指示文を作成",
    detail: "ENロジカル形式の見積1枚 · デリバリー提案（B形式）",
    available: true,
  },
  {
    id: "collaboration-a",
    routeSlug: "b",
    title: "協業・商品化の提案書",
    description: "章立て15枚前後の経営向け提案（準備中）",
    detail: "A形式 · 音声メモと参照資料から作成",
    available: false,
  },
  {
    id: "quick-5",
    routeSlug: "b",
    title: "5枚クイック提案",
    description: "短尺の提案資料用（準備中）",
    detail: "要点整理型 · 5枚固定",
    available: false,
  },
];

export function formatCreatePath(slug: string): string {
  return `/create/${slug}`;
}
