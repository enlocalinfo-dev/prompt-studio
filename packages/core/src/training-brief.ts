import type { TuningB } from "./formats.js";

/** Format B：研修デリバリー提案（8枚）の骨子入力 */
export interface TrainingDeliveryBrief {
  /** 読み手（資料の想定読者） */
  readers: string;
  /** ① 主対象 */
  targetMain: string;
  /** ① 副対象・横展開 */
  targetSub: string;
  /** ① 前提・スキル */
  targetPrerequisites: string;
  /** ① 対象外 */
  targetExcluded: string;
  /** ② 各回の内容（全4回など） */
  trainingSessions: string;
  /** ② 回数・時間などの補足 */
  trainingFormatNotes: string;
  /** ③ Before/After（5ステップ等） */
  beforeAfter: string;
  /** ④ 社内決裁期限 */
  internalDecisionDeadline: string;
  /** ④ 助成申請締切 */
  subsidyApplicationDeadline: string;
  /** ④ 研修開始月・キックオフ */
  trainingStartMonth: string;
  /** ④ その他日程 */
  scheduleOther: string;
  /** ⑤ 投資・コスト前提 */
  roiInvestment: string;
  /** ⑤ 時間削減・試算 */
  roiTimeSavings: string;
  /** ⑤ 定性効果 */
  roiQualitative: string;
  /** ⑦ 研修費（税抜） */
  trainingFeeExTax: string;
  /** ⑦ 助成見込み */
  subsidyEstimate: string;
  /** ⑦ 差引後負担 */
  netCostAfterSubsidy: string;
  /** ⑦ 1人あたり */
  costPerPerson: string;
  /** 価格・助成の注記 */
  pricingNotes: string;
}

export function defaultTrainingBrief(): TrainingDeliveryBrief {
  return {
    readers: "人事・研修担当、事業部長、経営層（社内決裁前）",
    targetMain: "BtoBフィールド営業 15名（事業部：東日本営業）",
    targetSub: "営業企画 2名（テンプレ整備・横展開担当）",
    targetPrerequisites: "PC・クラウドツールの日常利用可／商談・提案書作成経験あり",
    targetExcluded: "新入社員のみの座学（別途オンボーディング想定）",
    trainingSessions: [
      "第1回：商談準備のAI化（リサーチ・仮説・質問設計）→ 成果物：準備チェックリスト1式",
      "第2回：提案書・見積説明資料のたたき台生成 → 成果物：提案テンプレ1式",
      "第3回：議事録・振り返り・次アクションの自動化 → 成果物：振り返りフォーマット1式",
      "第4回：チーム展開・運用ルール・セキュリティ → 成果物：運用ガイド（社内版）",
    ].join("\n"),
    trainingFormatNotes: "伴走型・全4回（各90分等は契約時に確定）",
    beforeAfter:
      "Before：顧客情報収集・商談準備・提案書作成・商談後処理・振り返りが属人化\nAfter：AI下調べ・テンプレ＋AI下書き・半自動CRM・チームで検索できるログ（5ステップで記載）",
    internalDecisionDeadline: "2026年8月15日まで（予算・人数確定）",
    subsidyApplicationDeadline: "2026年9月10日（助成申請の最終日・例）",
    trainingStartMonth: "2026年10月（第1回）／全4回：10月2回・11月2回",
    scheduleOther: "契約・キックオフ：9月下旬／定着確認：12月",
    roiInvestment: "研修費（4回・17名）＋担当者の受講工数（要見積り）",
    roiTimeSavings:
      "1人あたり月5時間 × 17名 × 12か月 × 4,800円/h ≒ 490万円/年（試算例・保証しない）",
    roiQualitative: "提案スピード向上、属人化低減、CRM入力漏れ低減",
    trainingFeeExTax: "170万円（税抜・17名・4回・試算例）",
    subsidyEstimate: "人材開発支援助成等 75%・上限あり → 見込み127.5万円（試算例）",
    netCostAfterSubsidy: "42.5万円（税抜・試算例）",
    costPerPerson: "約2.5万円/人（17名按分・試算例）",
    pricingNotes: "助成率・上限は制度・審査により変動。見積・要件は契約前に個別確認",
  };
}

export function buildTrainingBriefTranscript(
  brief: TrainingDeliveryBrief,
  tuning: Pick<TuningB, "clientName" | "projectTitle" | "documentDate" | "proposerName">,
  extraNotes: string,
): string {
  const trainingName = tuning.projectTitle || "（研修名未入力）";
  const blocks = [
    "【研修デリバリー提案 B標準・骨子入力】",
    `提案先：${tuning.clientName}`,
    `提案元：${tuning.proposerName}`,
    `研修名：${trainingName}`,
    `資料版日：${tuning.documentDate}`,
    `読み手：${brief.readers}`,
    "",
    "■① 今回の研修の対象者（スライド2）",
    `主対象：${brief.targetMain}`,
    `副対象：${brief.targetSub}`,
    `前提：${brief.targetPrerequisites}`,
    `対象外：${brief.targetExcluded}`,
    "",
    "■② 今回の研修で行うこと（スライド3）",
    brief.trainingFormatNotes,
    brief.trainingSessions,
    "",
    "■③ AI活用後の Before / After（スライド4）",
    brief.beforeAfter,
    "",
    "■④ 大枠スケジュール（スライド5）",
    `社内決裁：${brief.internalDecisionDeadline}`,
    `助成申請締切：${brief.subsidyApplicationDeadline}`,
    `研修開始月：${brief.trainingStartMonth}`,
    brief.scheduleOther,
    "",
    "■⑤ ROI・時間削減（スライド6）",
    `投資：${brief.roiInvestment}`,
    `効果試算：${brief.roiTimeSavings}`,
    `定性：${brief.roiQualitative}`,
    "",
    "■⑦ 実質負担・価格（スライド7）",
    `研修費（税抜）：${brief.trainingFeeExTax}`,
    `助成見込み：${brief.subsidyEstimate}`,
    `差引後：${brief.netCostAfterSubsidy}`,
    `1人あたり：${brief.costPerPerson}`,
    brief.pricingNotes,
  ];

  const base = blocks.join("\n");
  const extra = extraNotes.trim();
  if (!extra) return base;
  return `${base}\n\n■追加メモ・音声入力\n${extra}`;
}
