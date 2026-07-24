export type FormatId = "A" | "B";

export type Audience = "executive" | "field";

export interface CommonTuning {
  clientName: string;
  documentDate: string;
  proposerName: string;
  projectTitle: string;
}

export interface TuningA extends CommonTuning {
  slideCount: number;
  density15x: boolean;
  sectionDividers: boolean;
  audience: Audience;
}

export interface TuningB extends CommonTuning {
  slideCount: 8;
  netCostSlide: boolean;
  illustrationEmphasis: boolean;
}

export type Tuning = TuningA | TuningB;

export interface FormatMeta {
  id: FormatId;
  label: string;
  description: string;
  slideCountHint: string;
}

export const FORMATS: Record<FormatId, FormatMeta> = {
  A: {
    id: "A",
    label: "一般の提案",
    description: "協業・商品化・経営層向けの合意形成（15〜18枚前後）",
    slideCountHint: "15〜18枚",
  },
  B: {
    id: "B",
    label: "研修のデリバリー提案",
    description: "導入企業向けサマリー（8枚・5要素＋実質負担）",
    slideCountHint: "8枚固定",
  },
};

export function defaultTuning(formatId: FormatId, documentDate: string): Tuning {
  const common: CommonTuning = {
    clientName: "株式会社ネクストリンク商事様",
    documentDate,
    proposerName: "株式会社ENロジカル",
    projectTitle: "",
  };
  if (formatId === "B") {
    return {
      ...common,
      slideCount: 8,
      netCostSlide: true,
      illustrationEmphasis: true,
      projectTitle: "AI活用 営業プロセス改善研修",
    };
  }
  return {
    ...common,
    slideCount: 18,
    density15x: true,
    sectionDividers: true,
    audience: "executive",
    projectTitle: "協業・提案資料",
  };
}

export function isTuningA(t: Tuning): t is TuningA {
  return "density15x" in t;
}
