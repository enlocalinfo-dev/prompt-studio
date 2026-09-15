import {
  composeTrainingStartPeriodFromSchedule,
  extractScheduleFromEstimateText,
  inferEstimateDeliveryFacts,
  inferTrainingNameFromEstimate,
  isSampleAudienceText,
  isSampleSessionPlan,
  isUsableTrainingName,
  resolveClientAndTrainingName,
  type ExpandedFromEstimate,
} from "@prompt-studio/core";

const JSON_SCHEMA = `{
  "clientName": "提案先（株式会社〇〇様）",
  "projectTitle": "見積の件名またはサービス名・品名（必須。型紙の見本研修名は使わない）",
  "documentDate": "見積日または資料版日（YYYY年M月D日）",
  "targetParticipants": "見積の受講対象・人数・役割（必須。型紙の15名＋企画2名は見積に無い限り使わない）",
  "trainingStartPeriod": "開始時期・決裁/申請締切/キックオフ（見積・備考から）",
  "scheduleInternalDecision": "社内決裁期限（見積・備考。なければ空）",
  "scheduleSubsidyDeadline": "助成申請締切（見積・備考。なければ空）",
  "scheduleTrainingStart": "研修開始月・第1回日（見積表の実施日から）",
  "scheduleSessionDates": "各回の日時・回数（見積表を箇条書きでそのまま）",
  "scheduleForSlide5": "■スライド5用：見積の日程を箇条書き（- で5行以内）。テンプレ日付は使わない",
  "mainEffects": "主な効果・ROIの要約（試算があれば記載、保証しない注記）",
  "trainingFeeExTax": "研修費税抜（見積金額）",
  "subsidyAndNet": "助成・差引・1人あたり（見積にあれば。なければ空文字）",
  "trainingDetailForSlides": "スライド3用：見積の回数・各回テーマ・時間（型紙の全4回見本は使わない）",
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

  const source = [extractedText ?? "", ...Object.values(obj).map((v) => String(v ?? ""))].join("\n");
  let projectTitle = String(obj.projectTitle ?? "").trim();
  if (!isUsableTrainingName(projectTitle, extractedText ?? "")) {
    projectTitle = inferTrainingNameFromEstimate(extractedText ?? "") || projectTitle;
  }
  const resolved = resolveClientAndTrainingName(
    String(obj.clientName ?? ""),
    projectTitle,
    source,
  );
  projectTitle = resolved.projectTitle;

  const facts = inferEstimateDeliveryFacts(source);
  let targetParticipants = String(obj.targetParticipants ?? "").trim();
  if (!targetParticipants || (isSampleAudienceText(targetParticipants) && !isSampleAudienceText(source))) {
    targetParticipants = facts.audienceLine || targetParticipants;
  }

  let trainingDetailForSlides = String(obj.trainingDetailForSlides ?? "").trim();
  if (!trainingDetailForSlides || (isSampleSessionPlan(trainingDetailForSlides) && !isSampleSessionPlan(source))) {
    trainingDetailForSlides = facts.sessionDetail || trainingDetailForSlides;
  }

  return {
    tuning: {
      clientName: resolved.clientName,
      projectTitle,
      documentDate: obj.documentDate,
    },
    brief: {
      targetParticipants,
      trainingStartPeriod,
      mainEffects: obj.mainEffects,
      trainingFeeExTax: obj.trainingFeeExTax,
      subsidyAndNet: obj.subsidyAndNet ?? "",
    },
    trainingDetailForSlides: trainingDetailForSlides || undefined,
    scheduleForSlide5: scheduleForSlide5 || undefined,
    notes: obj.notes,
  };
}
