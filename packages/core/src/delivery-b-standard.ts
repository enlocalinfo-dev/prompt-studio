/** B標準：20260724_研修デリバリー提案_サマリーシート標準 に準拠 */

export const DELIVERY_B_FORMAT = {
  id: "B" as const,
  label: "研修デリバリー提案",
  slideCount: 8,
  slideCountHint: "8枚固定",
  description:
    "経営者の社内決裁向けサマリー。8枚固定・①〜⑤＋実質負担（別スライド）＋次の一手。",
};

export interface DeliverySlideRole {
  order: number;
  slideLabel: string;
  element?: string;
  summary: string;
  visualization: string;
}

export const DELIVERY_B_SLIDES: DeliverySlideRole[] = [
  { order: 1, slideLabel: "表紙", summary: "研修名・提案先・ENロジカル・版日", visualization: "グラデ＋営業×AI線画" },
  {
    order: 2,
    slideLabel: "対象者",
    element: "①",
    summary: "人数・前提・対象外を明示",
    visualization: "組織＋ペルソナ",
  },
  {
    order: 3,
    slideLabel: "研修で行うこと",
    element: "②",
    summary: "全4回テーマと各回の成果物",
    visualization: "4ステップ横フロー",
  },
  {
    order: 4,
    slideLabel: "Before/After",
    element: "③",
    summary: "AI活用後の5ステップ変化（単語対比禁止）",
    visualization: "5段階階段2列",
  },
  {
    order: 5,
    slideLabel: "スケジュール",
    element: "④",
    summary: "社内決裁・申請締切・開始月を太枠で",
    visualization: "月軸ガント",
  },
  {
    order: 6,
    slideLabel: "ROI",
    element: "⑤",
    summary: "時間削減・試算（前提明示。助成差引は載せない）",
    visualization: "KPI＋棒グラフ",
  },
  {
    order: 7,
    slideLabel: "実質負担",
    summary: "研修費・助成見込み・差引後・1人あたり（ROIと別スライド）",
    visualization: "ウォーターフォール",
  },
  {
    order: 8,
    slideLabel: "次の一手",
    summary: "決裁・契約・キックオフ",
    visualization: "チェック3＋矢印",
  },
];

export interface DeliveryInputSection {
  id: string;
  title: string;
  mapsToSlide: string;
  fields: string[];
  hint: string;
}

/** アプリの入力フォーム ↔ スライドの対応 */
export const DELIVERY_B_INPUT_SECTIONS: DeliveryInputSection[] = [
  {
    id: "estimate",
    title: "見積PDF",
    mapsToSlide: "全体の起点",
    fields: ["ENロジカル見積書（PDF）"],
    hint: "読み込みで提案先・骨子3項目・研修費を自動入力。スキャンPDF可",
  },
  {
    id: "core",
    title: "骨子（3項目）",
    mapsToSlide: "2・5・6 ほか",
    fields: ["研修対象者", "研修開始時期", "主な効果"],
    hint: "②③④の詳細はB標準■固稿から案件に合わせて肉付け",
  },
  {
    id: "cost",
    title: "研修費",
    mapsToSlide: "7",
    fields: ["研修費（税抜）", "助成・差引・1人あたり（1行・任意）"],
    hint: "ROI（6）とは別スライド",
  },
  {
    id: "extra",
    title: "追加メモ",
    mapsToSlide: "全体",
    fields: ["音声・議事録・PDF/URL"],
    hint: "任意",
  },
];

export const DELIVERY_B_OUTPUT_NOTE =
  "読み手は経営層固定。出力は genspark_prompt.md（Genspark text 付き）。■固稿省略禁止・各スライド40%以上図解。";
