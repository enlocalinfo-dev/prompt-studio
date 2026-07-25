import type { TuningB } from "./formats.js";
import type { TrainingDeliveryBrief } from "./training-brief.js";

export interface ExpandedFromEstimate {
  tuning: Partial<Pick<TuningB, "clientName" | "projectTitle" | "documentDate" | "proposerName">>;
  brief: Partial<TrainingDeliveryBrief>;
  /** スライド②③用の補足（見積のカリキュラム・回数など） */
  trainingDetailForSlides?: string;
  notes?: string;
}

/** 見積PDFテキストからの簡易抽出（LLM前のたたき台） */
export function heuristicParseEstimateText(text: string): ExpandedFromEstimate {
  const out: ExpandedFromEstimate = { tuning: {}, brief: {}, trainingDetailForSlides: "" };

  const client =
    text.match(/(?:御中|様)[\s\S]{0,40}?(株式会社[^\s　]+)/)?.[1] ??
    text.match(/(株式会社[^\s　]+)(?:\s*御中|様)/)?.[1] ??
    text.match(/(株式会社[^\s　]+)/)?.[1];
  if (client) out.tuning.clientName = client.includes("様") ? client : `${client}様`;

  const title =
    text.match(/(?:研修|講座|セミナー|コース)[^\n]{0,60}/)?.[0] ??
    text.match(/(?:件名|題名)[：:\s]*([^\n]+)/)?.[1]?.trim();
  if (title) out.tuning.projectTitle = title.replace(/^件名[：:\s]*/, "").slice(0, 80);

  const date =
    text.match(/(20\d{2})[年./](\d{1,2})[月./](\d{1,2})/)?.[0] ??
    text.match(/見積(?:有効)?期限[：:\s]*([^\n]+)/)?.[1]?.trim();
  if (date) out.tuning.documentDate = date.includes("年") ? date : undefined;

  const yen =
    text.match(/(?:合計|総額|税抜)[^\d]{0,12}([\d,]+)\s*円/)?.[1] ??
    text.match(/([\d,]+)\s*円\s*(?:\(税抜\)|税抜)/)?.[1];
  if (yen) out.brief.trainingFeeExTax = `${yen.replace(/,/g, "")}円（見積より）`;

  const people = text.match(/(\d+)\s*名/)?.[1];
  if (people) {
    out.brief.targetParticipants = `受講 ${people}名（見積より。部署・役割は要確認）`;
  }

  const sessions = text.match(/第[0-9０-９]+回[^\n]+/g);
  if (sessions?.length) {
    out.trainingDetailForSlides = sessions.slice(0, 8).join("\n");
  }

  out.brief.mainEffects =
    out.brief.mainEffects ??
    "見積記載の研修目的・効果をスライド6に試算付きで展開（数値は見積・ヒアリングに準拠、保証しない）。";

  return out;
}

export function mergeExpandedIntoBrief(
  current: TrainingDeliveryBrief,
  partial: Partial<TrainingDeliveryBrief>,
): TrainingDeliveryBrief {
  return {
    targetParticipants: partial.targetParticipants?.trim() || current.targetParticipants,
    trainingStartPeriod: partial.trainingStartPeriod?.trim() || current.trainingStartPeriod,
    mainEffects: partial.mainEffects?.trim() || current.mainEffects,
    trainingFeeExTax: partial.trainingFeeExTax?.trim() || current.trainingFeeExTax,
    subsidyAndNet: partial.subsidyAndNet?.trim() || current.subsidyAndNet,
  };
}
