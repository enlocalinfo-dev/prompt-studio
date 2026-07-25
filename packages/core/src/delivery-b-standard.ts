/** B標準：20260724_研修デリバリー提案_サマリーシート標準 に準拠 */

export const DELIVERY_B_FORMAT = {
  id: "B" as const,
  label: "研修デリバリー提案",
  slideCount: 8,
  slideCountHint: "8枚固定",
  description:
    "導入企業向けサマリー。8枚固定・①〜⑤＋実質負担（別スライド）＋次の一手。サマリー1枚再配置は作らない。",
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
    id: "meta",
    title: "案件メタ（ファインチューニング）",
    mapsToSlide: "1・表紙／表記ロック",
    fields: ["提案先", "資料版日", "研修名", "提案元（ENロジカル）"],
    hint: "表紙・YAML client_template / training_name に反映",
  },
  {
    id: "readers",
    title: "想定読者",
    mapsToSlide: "全体トーン",
    fields: ["読み手（人事・事業部長・経営層など）"],
    hint: "資料の前提として固定",
  },
  {
    id: "target",
    title: "① 対象者",
    mapsToSlide: "スライド2",
    fields: ["主対象", "副対象", "前提・スキル", "対象外"],
    hint: "人数・事業部名は案件ごとに差し替え",
  },
  {
    id: "training",
    title: "② 研修内容",
    mapsToSlide: "スライド3",
    fields: ["形式・回数", "各回テーマと成果物（1行1回）"],
    hint: "伴走型・成果物名まで書く（省略禁止）",
  },
  {
    id: "ba",
    title: "③ Before/After",
    mapsToSlide: "スライド4",
    fields: ["5ステップの Before/After"],
    hint: "Before①〜⑤ / After①〜⑤ の形が理想",
  },
  {
    id: "schedule",
    title: "④ スケジュール",
    mapsToSlide: "スライド5",
    fields: ["社内決裁期限", "助成申請締切", "研修開始月", "その他日程"],
    hint: "申請締切・開始月は必須ラベルとして強調",
  },
  {
    id: "roi",
    title: "⑤ ROI",
    mapsToSlide: "スライド6",
    fields: ["投資前提", "時間削減試算", "定性効果"],
    hint: "試算例・保証しない注記。助成金はここに書かない",
  },
  {
    id: "cost",
    title: "⑦ 実質負担",
    mapsToSlide: "スライド7",
    fields: ["研修費（税抜）", "助成見込み", "差引後", "1人あたり", "価格注記"],
    hint: "ROIスライドと混ぜない",
  },
  {
    id: "extra",
    title: "追加メモ",
    mapsToSlide: "固稿への反映（LLM）",
    fields: ["議事録・音声メモ・PDF/URL参考資料"],
    hint: "未入力項目の補完や表現調整に使う",
  },
];

export const DELIVERY_B_OUTPUT_NOTE =
  "出力は genspark_prompt.md 形式（Genspark 用 text ブロック付き）。■固稿は削らず、各スライド40%以上図解。";
