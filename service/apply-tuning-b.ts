import type { TuningB } from "@prompt-studio/core";

/** B マスター内の案件固有表記を tuning で差し替え（■固稿・YAML・表記ロック） */
export function applyTuningToBody(body: string, tuning: TuningB): string {
  let out = body;
  out = out.replace(/\*\*2026年7月24日\*\*/g, `**${tuning.documentDate}**`);
  out = out.replace(/\*\*2026年7月13日\*\*/g, `**${tuning.documentDate}**`);
  out = out.replace(/2026年7月24日/g, tuning.documentDate);
  out = out.replace(/2026年7月13日/g, tuning.documentDate);
  out = out.replace(/株式会社ネクストリンク商事様/g, tuning.clientName);

  const title = tuning.projectTitle?.trim();
  if (title) {
    out = out.replace(/人事AX研修 共同開発のご提案/g, title);
    out = out.replace(/\*\*AI活用 営業プロセス改善研修\*\*/g, `**${title}**`);
    out = out.replace(/AI活用 営業プロセス改善研修（伴走型・全4回）/g, title);
    out = out.replace(/AI活用 営業プロセス改善研修/g, title);
    out = out.replace(
      /training_name: "AI活用 営業プロセス改善研修"/g,
      `training_name: "${title.replace(/"/g, '\\"')}"`,
    );
  }

  out = out.replace(
    /client_template: "株式会社ネクストリンク商事様"/g,
    `client_template: "${tuning.clientName.replace(/"/g, '\\"')}"`,
  );

  if (tuning.proposerName?.trim()) {
    out = out.replace(/提案元：**株式会社ENロジカル**/g, `提案元：**${tuning.proposerName}**`);
    out = out.replace(/proposer: "株式会社ENロジカル"/g, `proposer: "${tuning.proposerName.replace(/"/g, '\\"')}"`);
  }

  return out;
}
