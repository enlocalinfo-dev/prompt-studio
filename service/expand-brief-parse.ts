import {
  composeTrainingStartPeriodFromSchedule,
  extractScheduleFromEstimateText,
  type ExpandedFromEstimate,
} from "@prompt-studio/core";

const JSON_SCHEMA = `{
  "clientName": "提案先（株式会社〇〇様）",
  "projectTitle": "研修名・件名",
  "documentDate": "見積日または資料版日（YYYY年M月D日）",
  "targetParticipants": "研修対象者（人数・役割・前提）",
  "trainingStartPeriod": "開始時期・決裁/申請締切/キックオフ（見積・備考から）",
  "scheduleInternalDecision": "社内決裁期限（見積・備考。なければ空）",
  "scheduleSubsidyDeadline": "助成申請締切（見積・備考。なければ空）",
  "scheduleTrainingStart": "研修開始月・第1回日（見積表の実施日から）",
  "scheduleSessionDates": "各回の日時・回数（見積表を箇条書きでそのまま）",
  "scheduleForSlide5": "■スライド5用：見積の日程を箇条書き（- で5行以内）。テンプレ日付は使わない",
  "mainEffects": "主な効果・ROIの要約（試算があれば記載、保証しない注記）",
  "trainingFeeExTax": "研修費税抜（見積金額）",
  "subsidyAndNet": "助成・差引・1人あたり（見積にあれば。なければ空文字）",
  "trainingDetailForSlides": "スライド2-3用：回数・カリキュラム・成果物の箇条書き",
  "notes": "不足・要確認事項"
}`;

export { JSON_SCHEMA as EXPAND_BRIEF_JSON_SCHEMA };

function buildScheduleForSlide5(obj: Record<string, string>, extractedText?: string): string {
  if (obj.scheduleForSlide5?.trim()) return obj.scheduleForSlide5.trim();

  const bullets: string[] = [];
  if (obj.scheduleInternalDecision?.trim()) {
    bullets.push(`- 社内決裁：${obj.scheduleInternalDecision.trim()}`);
  }
  if (obj.scheduleSubsidyDeadline?.trim()) {
    bullets.push(`- 助成申請締切：${obj.scheduleSubsidyDeadline.trim()}`);
  }
  if (obj.scheduleTrainingStart?.trim()) {
    bullets.push(`- 研修開始・第1回：${obj.scheduleTrainingStart.trim()}`);
  }
  if (obj.scheduleSessionDates?.trim()) {
    for (const line of obj.scheduleSessionDates.split(/\n+/)) {
      const t = line.trim();
      if (t) bullets.push(t.startsWith("-") ? t : `- ${t}`);
    }
  }
  if (bullets.length) return bullets.slice(0, 8).join("\n");

  if (extractedText?.trim()) {
    const h = extractScheduleFromEstimateText(extractedText);
    if (h) return h.split("\n").map((l) => (l.startsWith("-") ? l : `- ${l}`)).join("\n");
  }
  return "";
}

function buildTrainingStartPeriod(obj: Record<string, string>, scheduleForSlide5: string): string {
  if (obj.trainingStartPeriod?.trim()) return obj.trainingStartPeriod.trim();
  const fromFields = [
    obj.scheduleInternalDecision && `社内決裁：${obj.scheduleInternalDecision}`,
    obj.scheduleSubsidyDeadline && `助成申請締切：${obj.scheduleSubsidyDeadline}`,
    obj.scheduleTrainingStart && `研修開始：${obj.scheduleTrainingStart}`,
    obj.scheduleSessionDates?.replace(/\n+/g, "／"),
  ]
    .filter(Boolean)
    .join("／");
  if (fromFields) return fromFields.slice(0, 400);
  return composeTrainingStartPeriodFromSchedule(scheduleForSlide5.replace(/^-\s*/gm, ""));
}

export function parseExpandBriefJson(text: string, extractedText?: string): ExpandedFromEstimate {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const raw = fenced ? fenced[1].trim() : text.trim();
  const s = raw.indexOf("{");
  const e = raw.lastIndexOf("}");
  const obj = JSON.parse(raw.slice(s, e + 1)) as Record<string, string>;

  const scheduleForSlide5 = buildScheduleForSlide5(obj, extractedText);
  const trainingStartPeriod = buildTrainingStartPeriod(obj, scheduleForSlide5);

  return {
    tuning: {
      clientName: obj.clientName,
      projectTitle: obj.projectTitle,
      documentDate: obj.documentDate,
    },
    brief: {
      targetParticipants: obj.targetParticipants,
      trainingStartPeriod,
      mainEffects: obj.mainEffects,
      trainingFeeExTax: obj.trainingFeeExTax,
      subsidyAndNet: obj.subsidyAndNet ?? "",
    },
    trainingDetailForSlides: obj.trainingDetailForSlides,
    scheduleForSlide5: scheduleForSlide5 || undefined,
    notes: obj.notes,
  };
}
