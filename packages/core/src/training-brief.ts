import type { TuningB } from "./formats.js";

/** Format B：経営者判断用サマリー（入力は最小3項目＋価格） */
export interface TrainingDeliveryBrief {
  /** ① 研修対象者（スライド2） */
  targetParticipants: string;
  /** ④ 研修開始時期・決裁/締切/キックオフ（スライド5） */
  trainingStartPeriod: string;
  /** ⑤ 主な効果・ROIの要約（スライド6。②③はテンプレから適応） */
  mainEffects: string;
  /** ⑦ 研修費（税抜・人数・回数など） */
  trainingFeeExTax: string;
  /** ⑦ 助成・差引後・1人あたりなど（1欄にまとめて可） */
  subsidyAndNet: string;
}

export function defaultTrainingBrief(): TrainingDeliveryBrief {
  return {
    targetParticipants:
      "BtoBフィールド営業 15名（東日本営業）／営業企画 2名。PC・クラウド利用可。新入社員のみの座学は対象外。",
    trainingStartPeriod:
      "社内決裁：8月中旬まで／助成申請締切：9月10日（例）／研修開始：2026年10月（第1回）・全4回は10〜11月",
    mainEffects:
      "1人あたり月5時間削減×17名×12か月の試算例（490万円/年相当・保証しない）。提案スピード向上・属人化低減・CRM入力漏れ低減。",
    trainingFeeExTax: "170万円（税抜・17名・4回・試算例）",
    subsidyAndNet:
      "助成見込み127.5万円（75%・上限あり・例）→ 差引後42.5万円・約2.5万円/人。制度・審査により変動。",
  };
}

/** 旧フォーム localStorage からの移行 */
export function normalizeTrainingBrief(raw: unknown): TrainingDeliveryBrief {
  const d = defaultTrainingBrief();
  if (!raw || typeof raw !== "object") return d;
  const o = raw as Record<string, unknown>;

  if (typeof o.targetParticipants === "string") {
    return {
      targetParticipants: o.targetParticipants || d.targetParticipants,
      trainingStartPeriod: String(o.trainingStartPeriod ?? d.trainingStartPeriod),
      mainEffects: String(o.mainEffects ?? d.mainEffects),
      trainingFeeExTax: String(o.trainingFeeExTax ?? d.trainingFeeExTax),
      subsidyAndNet: String(o.subsidyAndNet ?? d.subsidyAndNet),
    };
  }

  if (typeof o.targetMain === "string") {
    const target = [o.targetMain, o.targetSub, o.targetPrerequisites, o.targetExcluded]
      .filter(Boolean)
      .join("／");
    const schedule = [o.internalDecisionDeadline, o.subsidyApplicationDeadline, o.trainingStartMonth, o.scheduleOther]
      .filter(Boolean)
      .join("／");
    const effects = [o.roiTimeSavings, o.roiQualitative, o.roiInvestment, o.beforeAfter]
      .filter(Boolean)
      .join("\n");
    const subsidy = [o.subsidyEstimate, o.netCostAfterSubsidy, o.costPerPerson, o.pricingNotes]
      .filter(Boolean)
      .join(" → ");
    return {
      targetParticipants: target || d.targetParticipants,
      trainingStartPeriod: schedule || d.trainingStartPeriod,
      mainEffects: effects || d.mainEffects,
      trainingFeeExTax: String(o.trainingFeeExTax ?? d.trainingFeeExTax),
      subsidyAndNet: subsidy || d.subsidyAndNet,
    };
  }

  return d;
}

export function buildTrainingBriefTranscript(
  brief: TrainingDeliveryBrief,
  tuning: Pick<TuningB, "clientName" | "projectTitle" | "documentDate" | "proposerName">,
  extraNotes: string,
  estimateSlideDetail?: string,
  estimateScheduleDetail?: string,
): string {
  const trainingName = tuning.projectTitle || "（研修名未入力）";
  const blocks = [
    "【研修デリバリー提案 B標準・骨子入力（経営者判断用）】",
    "読み手：経営層（社内決裁）。トーンはビジネスライク固定。",
    `提案先：${tuning.clientName}`,
    `提案元：${tuning.proposerName}`,
    `研修名：${trainingName}`,
    `資料版日：${tuning.documentDate}`,
    "",
    "■ 入力（以下3点をスライド2・5・6の中心に反映。②③④の細部はB標準■固稿をベースに整合させる）",
    "",
    "【研修対象者】（スライド2・①）",
    brief.targetParticipants,
    "",
    "【研修開始時期】（スライド5・④。申請締切・開始月ラベルを太枠で）",
    brief.trainingStartPeriod,
    "",
    "【主な効果】（スライド6・⑤ ROI。助成差引は載せない）",
    brief.mainEffects,
    "",
    "【研修費・実質負担】（スライド7・ROIと別スライド）",
    `研修費（税抜）：${brief.trainingFeeExTax}`,
    brief.subsidyAndNet ? `助成・差引・1人あたり：${brief.subsidyAndNet}` : "",
  ].filter(Boolean);

  const base = blocks.join("\n");
  const extra = extraNotes.trim();
  const parts: string[] = [base];
  if (estimateSlideDetail?.trim()) {
    parts.push("", "■見積書より（スライド②③の具体化）", estimateSlideDetail.trim());
  }
  if (estimateScheduleDetail?.trim()) {
    parts.push(
      "",
      "■見積書より（スライド5・スケジュール／見積と完全一致）",
      estimateScheduleDetail.trim(),
      "【スケジュール固定ルール】■スライド5の日付・回次・締切は上記見積どおり。マスターテンプレの例示日（8月中旬・9月10日・10月開始等）に置き換えない。",
    );
  }
  if (extra) {
    parts.push("", "■追加メモ", extra);
  }
  return parts.join("\n");
}
