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

/** 入力ルール・禁止注記。受講対象や回数として使わない */
export function isAuthoringInstructionText(value: string | undefined | null): boolean {
  const raw = (value ?? "").trim();
  if (!raw) return false;
  if (/対象・回数ロック|スケジュール固定ルール|入力ルール/.test(raw)) return true;
  if (/見積に無い場合/.test(raw)) return true;
  if (/^禁止[：:]/.test(raw)) return true;
  if (/禁止[：:].{0,8}(全[0-9０-９]+回|15名|商談準備)/.test(raw)) return true;
  if (/型紙見本/.test(raw) && /使わない|禁止/.test(raw)) return true;
  return false;
}

export function stripAuthoringInstructionLines(text: string): string {
  return (text ?? "")
    .split("\n")
    .filter((line) => !isAuthoringInstructionText(line))
    .join("\n");
}

/** 「【研修対象者】」見出しの次行。ロック文中の同表記は無視する */
export function extractLabeledBriefLine(source: string, label: string): string {
  const cleaned = stripAuthoringInstructionLines(source);
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const matched = cleaned.match(new RegExp(`^${escaped}[^\\n]*\\n([^\\n]+)`, "m"));
  const next = matched?.[1]?.trim() ?? "";
  if (!next || isAuthoringInstructionText(next) || /^【/.test(next) || /^■/.test(next)) return "";
  return next;
}

/** 見積PDFテキストからスライド5向け日程行を拾う */
export function extractScheduleFromEstimateText(text: string): string {
  const lines = text
    .split(/\n+/)
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter((l) => l.length > 2 && l.length < 220);

  const hits: string[] = [];
  for (const line of lines) {
    if (isAuthoringInstructionText(line)) continue;
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
    .replace(/お見積もり?$/g, "")
    .replace(/見積もり?$/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}

export function stripClientHonorific(name: string): string {
  return (name ?? "")
    .replace(/株式会社/g, "")
    .replace(/[様]$/u, "")
    .replace(/御中$/u, "")
    .replace(/\s+/g, "")
    .trim();
}

/** 提案先（福寿園様）を研修名にしない */
export function isClientNameUsedAsTitle(title: string, clientName: string): boolean {
  const t = stripClientHonorific(title);
  const c = stripClientHonorific(clientName);
  if (!t || !c) return false;
  return t === c || (t.length >= 2 && c.length >= 2 && (c.includes(t) || t.includes(c)));
}

export function inferClientNameFromEstimate(text: string): string {
  const source = stripAuthoringInstructionLines(text ?? "");
  const labeled =
    source.match(/(?:提案先|宛先|お客様|御中)[：:\s　]*([^\n]{2,40})/)?.[1]?.trim() ??
    source.match(/^([^\n]{2,30}?)様/m)?.[1]?.trim();
  if (labeled && !/発行|ページ|続き|ENロジカル|お見積/.test(labeled)) {
    const name = labeled.replace(/[：:\s　]+$/g, "").trim();
    return /様$/.test(name) ? name : `${name}様`;
  }
  const sama = source.match(/(?:^|\n)([一-龯ぁ-んァ-ンA-Za-z0-9]{2,20})様/);
  if (sama?.[1] && !/発行|担当|講師/.test(sama[1])) return `${sama[1]}様`;
  return "";
}

/** 提案先と研修名が入れ替わっていたら戻す */
export function resolveClientAndTrainingName(
  clientName: string,
  projectTitle: string,
  sourceText: string,
  fileName?: string,
): { clientName: string; projectTitle: string } {
  let client = (clientName ?? "").trim();
  let title = cleanTrainingName(projectTitle ?? "");
  const inferredClient = inferClientNameFromEstimate(sourceText);
  const inferredTitle = inferTrainingNameFromEstimate(sourceText, fileName);

  if (!client && inferredClient) client = inferredClient;
  const titleHasCourseWord = /(研修|講座|セミナー|コース|ワーク)/.test(title);
  const titleLooksLikeClient =
    Boolean(title) &&
    !titleHasCourseWord &&
    (isClientNameUsedAsTitle(title, client || inferredClient) ||
      /様$/.test(title) ||
      (!client && title.length <= 12));
  if (title && titleLooksLikeClient) {
    if (!client) client = /様$/.test(title) ? title : `${title}様`;
    title = inferredTitle && !isClientNameUsedAsTitle(inferredTitle, client) ? inferredTitle : "";
  }
  if (!title && inferredTitle && !isClientNameUsedAsTitle(inferredTitle, client)) title = inferredTitle;
  if (!title) {
    const course =
      sourceText.match(/基礎講座[^\\n]{0,16}/)?.[0] ??
      sourceText.match(/AI研修/)?.[0] ??
      "";
    if (course) title = cleanTrainingName(course);
  }
  return { clientName: client, projectTitle: title };
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
  if (/様$/.test(t) && !/(研修|講座|セミナー|コース)/.test(t)) return false;
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

export type EstimateDeliveryFacts = {
  headcount: number | null;
  sessionCount: number | null;
  sessionHours: string;
  targetRole: string;
  sessionLines: string[];
  audienceLine: string;
  sessionDetail: string;
};

function toAsciiDigits(s: string): string {
  return s.replace(/[０-９]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xfee0));
}

function toCount(s: string): number {
  return Number(toAsciiDigits(s));
}

/** 型紙見本の対象者（15名＋企画2名） */
export function isSampleAudienceText(value: string | undefined | null): boolean {
  if (!value?.trim()) return false;
  const c = value.replace(/\s+/g, "");
  return c.includes("15名") && (c.includes("営業企画") || c.includes("東日本営業") || c.includes("BtoBフィールド営業"));
}

/** 型紙見本の全4回カリキュラム */
export function isSampleSessionPlan(value: string | undefined | null): boolean {
  if (!value?.trim()) return false;
  const c = value.replace(/\s+/g, "");
  return c.includes("全4回") && (c.includes("商談準備") || c.includes("運用ガイド"));
}

/**
 * 見積本文から人数・回数・対象・各回を拾う。
 * 型紙の15名／2名／17名／全4回は、PDFにその数字が無い限り使わない。
 */
export function inferEstimateDeliveryFacts(text: string): EstimateDeliveryFacts {
  const source = stripAuthoringInstructionLines(text ?? "");

  const labeledHead =
    source.match(/(?:受講人数|受講|対象人数|定員|人数)[^\d０-９]{0,16}([0-9０-９]{1,3})\s*名/) ??
    source.match(/(?:受講人数|受講|対象人数|定員|人数)[^\d０-９]{0,16}([0-9０-９]{1,3})\s*人(?![円万時])/);
  const allHeads = [
    ...source.matchAll(/([0-9０-９]{1,3})\s*名(?![円])/g),
    ...source.matchAll(/([0-9０-９]{1,3})\s*人(?![円万時])/g),
  ]
    .map((m) => toCount(m[1]))
    .filter((n) => n >= 1 && n <= 400);
  let headcount: number | null = labeledHead ? toCount(labeledHead[1]) : null;
  if (headcount == null && allHeads.length) {
    const withoutTiny = allHeads.filter((n) => n !== 2 || allHeads.some((x) => x >= 5));
    headcount = Math.max(...(withoutTiny.length ? withoutTiny : allHeads));
  }
  const sessionLines = [...source.matchAll(/第[0-9０-９]+回[^\n]{0,80}/g)]
    .map((m) => m[0].replace(/\s+/g, " ").trim())
    .filter((l) => l.length > 3);

  const allKai = source.match(/全\s*([0-9０-９]+)\s*回/);
  const labeledKai = source.match(/(?:回数|実施回数)[^\d０-９]{0,8}([0-9０-９]+)\s*回/);
  const days = source.match(/([0-9０-９]+)\s*日間/);
  const numbered = [...source.matchAll(/第[0-9０-９]+回/g)];
  let sessionCount: number | null = null;
  if (allKai) sessionCount = toCount(allKai[1]);
  else if (labeledKai) sessionCount = toCount(labeledKai[1]);
  else if (days) sessionCount = toCount(days[1]);
  else if (numbered.length >= 1) sessionCount = numbered.length;
  if (sessionCount === 4 && !/全\s*[4４]\s*回/.test(source) && numbered.length !== 4 && !labeledKai && !days) {
    sessionCount = numbered.length || null;
  }

  const hoursMatch =
    source.match(/(?:各回|1回あたり|一回)[^\n]{0,8}([0-9０-９]+(?:\.[0-9]+)?)\s*時間/) ??
    source.match(/各回\s*([0-9０-９]+)\s*分/) ??
    source.match(/([0-9０-９]+)\s*分\s*[×x／/]/);
  const sessionHours = hoursMatch ? hoursMatch[0].replace(/\s+/g, "") : "";

  const roleLabeled =
    source.match(/(?:受講対象|対象者|対象)[：:\s　]+([^\n]{3,60})/) ??
    source.match(/(?:受講対象|対象者|対象)\n+([^\n]{3,60})/);
  let targetRole = "";
  if (roleLabeled?.[1] && !/対象外|税|円|回/.test(roleLabeled[1])) {
    targetRole = roleLabeled[1].replace(/^[：:\s　]+/, "").trim();
  }
  if (!targetRole) {
    const roleHit = source.match(/((?:経営層|管理職|マネージャー|リーダー|人事|エンジニア|企画|営業(?!企画2名))[^\n]{0,20})/);
    if (roleHit?.[1] && !/営業企画\s*\*?2名/.test(roleHit[1])) targetRole = roleHit[1].trim();
  }

  const uniqueSessions = [...new Set(sessionLines)].slice(0, 10);

  const audienceLine = [targetRole, headcount != null ? `${headcount}名（見積より）` : ""]
    .filter(Boolean)
    .join("／")
    .replace(/／+/g, "／");

  const sessionDetail = [
    sessionCount != null ? `全${sessionCount}回（見積より）` : "",
    sessionHours,
    ...uniqueSessions,
  ]
    .filter(Boolean)
    .join("\n");

  return {
    headcount,
    sessionCount,
    sessionHours,
    targetRole,
    sessionLines: uniqueSessions,
    audienceLine,
    sessionDetail,
  };
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
    inferClientNameFromEstimate(text) ||
    text.match(/(?:御中|様)[\s\S]{0,40}?(株式会社[^\s　]+)/)?.[1] ||
    text.match(/(株式会社[^\s　]+)(?:\s*御中|様)/)?.[1] ||
    text.match(/(株式会社[^\s　]+)/)?.[1] ||
    "";
  if (client) out.tuning.clientName = client.includes("様") ? client : `${client}様`;

  const title = inferTrainingNameFromEstimate(text, fileName);
  const resolved = resolveClientAndTrainingName(out.tuning.clientName ?? "", title, text, fileName);
  out.tuning.clientName = resolved.clientName;
  if (resolved.projectTitle) out.tuning.projectTitle = resolved.projectTitle;

  const date =
    text.match(/(20\d{2})[年./](\d{1,2})[月./](\d{1,2})/)?.[0] ??
    text.match(/見積(?:有効)?期限[：:\s]*([^\n]+)/)?.[1]?.trim();
  if (date) out.tuning.documentDate = date.includes("年") ? date : undefined;

  const yen =
    text.match(/(?:合計|総額|税抜)[^\d]{0,12}([\d,]+)\s*円/)?.[1] ??
    text.match(/([\d,]+)\s*円\s*(?:\(税抜\)|税抜)/)?.[1];
  if (yen) out.brief.trainingFeeExTax = `${yen.replace(/,/g, "")}円（見積より）`;

  const facts = inferEstimateDeliveryFacts(text);
  if (facts.audienceLine) out.brief.targetParticipants = facts.audienceLine;
  if (facts.sessionDetail) out.trainingDetailForSlides = facts.sessionDetail;

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
