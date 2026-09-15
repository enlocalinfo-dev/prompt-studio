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

const SAMPLE_TRAINING_NAME_COMPACT = "AI活用営業プロセス改善研修";

/** 型紙の見本研修名（実PDFに無いときは採用しない） */
export function isSampleTrainingName(value: string | undefined | null): boolean {
  if (!value?.trim()) return false;
  return value.replace(/\s+/g, "").includes(SAMPLE_TRAINING_NAME_COMPACT);
}

function compactJa(s: string): string {
  return s.replace(/\s+/g, "");
}

function cleanTrainingName(raw: string): string {
  return raw
    .replace(/^[\s　・\-–—【『「]+/, "")
    .replace(/[】』」]+$/g, "")
    .replace(/（伴走型・全4回）/g, "")
    .replace(/[（(]仮[）)]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}

function sourceHasSampleName(source: string): boolean {
  return compactJa(source).includes(SAMPLE_TRAINING_NAME_COMPACT);
}

/** 見積のラベル・本文から使える研修名か */
export function isUsableTrainingName(value: string | undefined | null, sourceText = ""): boolean {
  const t = cleanTrainingName(value ?? "");
  if (t.length < 3 || t.length > 80) return false;
  if (/^(研修費|合計|総額|税抜|税込|御中|見積|見積書|estimate|quotation|有効期限|助成|差引)$/i.test(t)) return false;
  if (/^(研修費|合計|総額|税抜|税込|御中|見積|有効期限|助成|差引)/.test(t)) return false;
  if (/研修費|税抜合計|御中|有効期限/.test(t) && !/(講座|セミナー|ワークショップ|コース)/.test(t)) return false;
  if (isSampleTrainingName(t) && !sourceHasSampleName(sourceText)) return false;
  return true;
}

function labeledField(text: string, labels: string[]): string | undefined {
  for (const label of labels) {
    const sameLine = new RegExp(`${label}[：:\\s　]+([^\\n]{3,80})`, "i");
    const m = text.match(sameLine);
    if (m?.[1] && isUsableTrainingName(m[1], text)) return cleanTrainingName(m[1]);

    const nextLine = new RegExp(`${label}[：:\\s　]*\\n+([^\\n]{3,80})`, "i");
    const n = text.match(nextLine);
    if (n?.[1] && isUsableTrainingName(n[1], text)) return cleanTrainingName(n[1]);
  }
  return undefined;
}

function nameFromFileName(fileName: string, sourceText: string): string | undefined {
  const base = fileName.replace(/\.pdf$/i, "").trim();
  if (!base) return undefined;
  const parts = base
    .replace(/^見積書?[_-]*/i, "")
    .split(/[_-]/)
    .map((p) => p.replace(/株式会社[^\s]*/g, "").trim())
    .filter(Boolean);
  for (const part of [...parts].reverse()) {
    if (isUsableTrainingName(part, sourceText) && !/^20\d{6}$/.test(part)) {
      return cleanTrainingName(part);
    }
  }
  if (isUsableTrainingName(base, sourceText)) return cleanTrainingName(base);
  return undefined;
}

/**
 * 見積PDFから研修名を必ず拾う。優先順は 件名 → サービス/品名 → 本文の講座名 → ファイル名。
 * 型紙見本「AI活用 営業プロセス改善研修」は、PDF本文に無い限り使わない。
 */
export function inferTrainingNameFromEstimate(text: string, fileName?: string): string {
  const source = text ?? "";

  const labeled = labeledField(source, [
    "件名",
    "題名",
    "案件名",
    "件\\s*名",
    "サービス名",
    "品名",
    "品目名",
    "品目",
    "コース名",
    "講座名",
    "研修名",
    "作業内容",
    "業務内容",
    "摘要",
  ]);
  if (labeled) return labeled;

  const lines = source
    .split(/\n+/)
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  for (const line of lines) {
    if (!/(研修|講座|セミナー|コース|ワークショップ)/.test(line)) continue;
    if (/研修費|研修開始|研修日|助成|税抜|合計|対象者/.test(line)) continue;
    const cut = line.replace(/^(?:内容|明細|項目)[：:\s]*/, "");
    if (isUsableTrainingName(cut, source)) return cleanTrainingName(cut);
  }

  const fromFile = fileName ? nameFromFileName(fileName, source) : undefined;
  if (fromFile) return fromFile;

  return "";
}

/** 見積PDFテキストからの簡易抽出（LLM前のたたき台） */
export function heuristicParseEstimateText(text: string, fileName?: string): ExpandedFromEstimate {
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

  const title = inferTrainingNameFromEstimate(text, fileName);
  if (title) out.tuning.projectTitle = title;

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
