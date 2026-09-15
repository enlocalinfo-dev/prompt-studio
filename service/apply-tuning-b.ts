import type { EstimateDeliveryFacts, TuningB } from "@prompt-studio/core";
import {
  isAuthoringInstructionText,
  isSampleSessionPlan,
  stripAuthoringInstructionLines,
} from "@prompt-studio/core";

function stripSource(sourceText: string): string {
  return stripAuthoringInstructionLines(sourceText ?? "");
}

/** B マスター内の案件固有表記を tuning で差し替え（■固稿・YAML・表記ロック） */
export function applyTuningToBody(body: string, tuning: TuningB): string {
  let out = body;
  out = out.replace(/\*\*2026年7月24日\*\*/g, `**${tuning.documentDate}**`);
  out = out.replace(/\*\*2026年7月13日\*\*/g, `**${tuning.documentDate}**`);
  out = out.replace(/2026年7月24日/g, tuning.documentDate);
  out = out.replace(/2026年7月13日/g, tuning.documentDate);
  const client = tuning.clientName?.trim() || "（見積の提案先）";
  out = out.replace(/株式会社ネクストリンク商事様/g, client);

  const title = tuning.projectTitle?.trim() || "（見積の件名・サービス名）";
  out = out.replace(/人事AX研修 共同開発のご提案/g, title);
  out = out.replace(/\*\*AI活用 営業プロセス改善研修\*\*/g, `**${title}**`);
  out = out.replace(/AI活用営業プロセス改善研修（伴走型・全4回）/g, title);
  out = out.replace(/AI活用 営業プロセス改善研修（伴走型・全4回）/g, title);
  out = out.replace(/AI活用営業プロセス改善研修/g, title);
  out = out.replace(/AI活用 営業プロセス改善研修/g, title);
  out = out.replace(
    /training_name: "AI活用 営業プロセス改善研修"/g,
    `training_name: "${title.replace(/"/g, '\\"')}"`,
  );

  out = out.replace(
    /client_template: "株式会社ネクストリンク商事様"/g,
    `client_template: "${client.replace(/"/g, '\\"')}"`,
  );

  if (tuning.proposerName?.trim()) {
    out = out.replace(/提案元：\*\*株式会社ENロジカル\*\*/g, `提案元：**${tuning.proposerName}**`);
    out = out.replace(/proposer: "株式会社ENロジカル"/g, `proposer: "${tuning.proposerName.replace(/"/g, '\\"')}"`);
  }

  return out;
}

function extractSectionLines(source: string, heading: RegExp): string[] {
  const idx = source.search(heading);
  if (idx < 0) return [];
  const lines: string[] = [];
  for (const raw of source.slice(idx).split("\n").slice(1)) {
    const t = raw.trim();
    if (!t) {
      if (lines.length) break;
      continue;
    }
    if (/^【|^■/.test(t) && lines.length) break;
    if (isAuthoringInstructionText(t)) continue;
    lines.push(t.replace(/^[-・]\s*/, ""));
  }
  return lines.filter(Boolean);
}

/** 型紙の人数・回数・見本カリキュラムを、見積の事実で上書きする */
export function applyEstimateFactsToBody(
  body: string,
  facts: EstimateDeliveryFacts,
  sourceText: string,
): string {
  let out = body;
  const src = stripSource(sourceText);
  const pdfHas = (re: RegExp) => re.test(src);

  const n = facts.sessionCount;
  if (n != null && n > 0) {
    out = out.replace(/全4回/g, `全${n}回`);
    out = out.replace(/全４回/g, `全${n}回`);
    out = out.replace(/4回・17名/g, `${n}回・${facts.headcount != null ? `${facts.headcount}名` : "見積の人数"}`);
  } else if (!pdfHas(/全\s*[4４]\s*回/)) {
    out = out.replace(/伴走型・全4回/g, "見積の回数に準拠");
    out = out.replace(/全4回/g, "見積記載の回数");
    out = out.replace(/全４回/g, "見積記載の回数");
  }

  const h = facts.headcount;
  const rawAudience = facts.audienceLine.trim();
  const audience = isAuthoringInstructionText(rawAudience) ? "" : rawAudience;
  if (h != null && h > 0) {
    if (h !== 17) out = out.replace(/17名/g, `${h}名`);
    if (h !== 15) {
      out = out.replace(/BtoBフィールド営業 \*\*15名\*\*（事業部：東日本営業）/g, audience || `受講 ${h}名（見積より）`);
      out = out.replace(/\*\*15名\*\*/g, `**${h}名**`);
      out = out.replace(/15名/g, `${h}名`);
    }
  } else if (audience && !isSampleLikeSource(src)) {
    out = out.replace(/主対象：BtoBフィールド営業 \*\*15名\*\*（事業部：東日本営業）/g, `主対象：${audience}`);
    if (!pdfHas(/17\s*名/)) out = out.replace(/17名/g, "見積の人数");
    if (!pdfHas(/15\s*名/)) out = out.replace(/15名/g, "見積の人数");
  } else if (!pdfHas(/15\s*名/) && !pdfHas(/17\s*名/)) {
    out = out.replace(/主対象：BtoBフィールド営業 \*\*15名\*\*（事業部：東日本営業）/g, "主対象：見積の受講対象（人数は見積に準拠）");
    out = out.replace(/15名/g, "見積の人数");
    out = out.replace(/17名/g, "見積の人数");
  }

  if (!pdfHas(/営業企画/) || !pdfHas(/2\s*名/)) {
    out = out.replace(/副対象：営業企画 \*\*2名\*\*（テンプレ整備・横展開担当）/g, audience ? `対象の内訳：${audience}` : "副対象：見積に部署内訳の記載がなければ省略");
  }
  if (!pdfHas(/東日本営業/)) {
    out = out.replace(/東日本営業/g, "見積の対象部署");
  }

  if (audience) {
    out = out.replace(
      /見出し：受講対象——現場営業と企画が同じ型を持つ/g,
      `見出し：受講対象——${audience}`,
    );
    out = out.replace(
      /リード：BtoB営業と営業企画が、同じテンプレとAIの型を共有する前提で設計します/g,
      `リード：${audience}を対象に設計します`,
    );
  }
  if (n != null && n > 0) {
    out = out.replace(/見出し：全4回——学ぶより「自社の型を作る」伴走/g, `見出し：全${n}回——見積の実施内容`);
    out = out.replace(/サブ：伴走型・全4回——準備・提案・振り返りをAIで標準化/g, `サブ：全${n}回（見積より）`);
    out = out.replace(/見出し：見積記載の回数——学ぶより「自社の型を作る」伴走/g, `見出し：全${n}回——見積の実施内容`);
  } else if (facts.sessionDetail && !isAuthoringInstructionText(facts.sessionDetail)) {
    const firstSession = facts.sessionDetail.split("\n").find((l) => !isAuthoringInstructionText(l)) ?? "";
    if (firstSession && !isAuthoringInstructionText(firstSession)) {
      out = out.replace(/見出し：全4回——学ぶより「自社の型を作る」伴走/g, `見出し：${firstSession}`);
      out = out.replace(/見出し：見積記載の回数——学ぶより「自社の型を作る」伴走/g, `見出し：${firstSession}`);
    }
  }

  if (facts.sessionDetail && !isSampleSessionPlan(facts.sessionDetail)) {
    const detail = facts.sessionDetail.replace(/\n/g, "／");
    out = out.replace(/第1回：商談準備のAI化（リサーチ・仮説・質問設計）→ 成果物：準備チェックリスト1式/g, `実施内容（見積）：${detail}`);
    if (!pdfHas(/第2回：提案書/)) {
      out = out.replace(/第2回：提案書・見積説明資料のたたき台生成 → 成果物：提案テンプレ1式\n/g, "");
      out = out.replace(/第3回：議事録・振り返り・次アクションの自動化 → 成果物：振り返りフォーマット1式\n/g, "");
      out = out.replace(/第4回：チーム展開・運用ルール・セキュリティ → 成果物：運用ガイド（社内版）\n/g, "");
    }
  }

  out = applyScheduleAndMoneyFromBrief(out, src);
  return out;
}

function applyScheduleAndMoneyFromBrief(body: string, src: string): string {
  let out = body;
  const schedule = extractSectionLines(src, /^■見積書より（スライド5/m);
  const period = extractSectionLines(src, /^【研修開始時期】/m);
  const scheduleText = (schedule.length ? schedule : period).filter((l) => !/テンプレ|例示日/.test(l));
  if (scheduleText.length >= 2) {
    const bullets = scheduleText.slice(0, 6).map((l) => `- ${l.replace(/^-\s*/, "")}`).join("\n");
    out = out.replace(
      /- 本提案の社内決裁：\*\*2026年8月15日まで\*\*[^\n]*\n- 助成金等 申請締切：\*\*2026年9月10日\*\*[^\n]*\n- 契約・キックオフ：\*\*2026年9月下旬\*\*[^\n]*\n- 研修開始月：\*\*2026年10月\*\*[^\n]*\n- 定着確認：\*\*2026年12月\*\*[^\n]*/,
      bullets,
    );
  }

  const feeLines = extractSectionLines(src, /^【研修費・実質負担】/m);
  const fee = feeLines.find((l) => /研修費/.test(l)) ?? "";
  const subsidy = feeLines.find((l) => /助成|差引|1人/.test(l)) ?? "";
  if (fee && !/170万円/.test(fee)) {
    out = out.replace(/- 研修費（税抜・例）：\*\*170万円\*\*[^\n]*/, `- ${fee}`);
  }
  if (subsidy && !/127\.5万円|42\.5万円/.test(subsidy)) {
    out = out.replace(/- 助成見込み（例）：[^\n]*/, `- ${subsidy}`);
  }

  const effects = extractSectionLines(src, /^【主な効果】/m);
  const effectLine = effects[0] ?? "";
  if (effectLine && !/490万円/.test(effectLine) && /円|時間|万/.test(effectLine)) {
    out = out.replace(/- 換算：5h × 17 × 12[^\n]*/, `- 効果（見積）：${effectLine}`);
  }
  return out;
}

function isSampleLikeSource(src: string): boolean {
  return /BtoBフィールド営業/.test(src) && /15名/.test(src) && /営業企画/.test(src);
}
