import type { TuningB } from "./formats.js";
import type { TrainingDeliveryBrief } from "./training-brief.js";

export interface ExpandedFromEstimate {
  tuning: Partial<Pick<TuningB, "clientName" | "projectTitle" | "documentDate" | "proposerName">>;
  brief: Partial<TrainingDeliveryBrief>;
  /** スライド②③用の補足（見積のカリキュラム・回数など） */
  trainingDetailForSlides?: string;
  /** スライド5用：見積の日程・締切・各回日時（そのまま■スライド5に反映） */
  scheduleForSlide5?: string;
  notes?: string;
}

const SCHEDULE_LINE =
  /実施|研修日|開催|第[0-9０-９]+回|締切|申請|助成|キックオフ|決裁|開始|全[0-9０-９]+回|日程|期間|コース|回目|時間|:\d{2}/;

/** 見積PDFテキストからスライド5向け日程行を拾う */
export function extractScheduleFromEstimateText(text: string): string {
  const lines = text
    .split(/\n+/)
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter((l) => l.length > 2 && l.length < 220);

  const hits: string[] = [];
  for (const line of lines) {
    if (SCHEDULE_LINE.test(line) || /20\d{2}[年./]\d{1,2}/.test(line)) {
      hits.push(line);
    }
  }

  const dateSpans = [...text.matchAll(/20\d{2}[年./]\d{1,2}[月./]\d{1,2}日?/g)].map((m) => m[0]);
  const mdSpans = [...text.matchAll(/(?:^|[\s　])(\d{1,2})[月/](\d{1,2})日?/gm)].map((m) => `${m[1]}月${m[2]}日`);

  const uniq = [...new Set([...hits, ...dateSpans, ...mdSpans])].slice(0, 12);
  return uniq.join("\n");
}

export function composeTrainingStartPeriodFromSchedule(scheduleBlock: string, fallback?: string): string {
  const block = scheduleBlock.trim();
  if (!block) return fallback?.trim() ?? "";
  return block.replace(/\n+/g, "／").slice(0, 400);
}

/** 見積PDFテキストからの簡易抽出（LLM前のたたき台） */
export function heuristicParseEstimateText(text: string): ExpandedFromEstimate {
  const out: ExpandedFromEstimate = { tuning: {}, brief: {}, trainingDetailForSlides: "" };

  const scheduleBlock = extractScheduleFromEstimateText(text);
  if (scheduleBlock) {
    out.scheduleForSlide5 = scheduleBlock;
    out.brief.trainingStartPeriod = composeTrainingStartPeriodFromSchedule(scheduleBlock);
  }

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
