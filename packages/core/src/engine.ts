import type { FormatId, Tuning } from "./formats.js";
import { isTuningA } from "./formats.js";
import type { ReferenceBundle } from "./references.js";
import { buildReferenceContext, referenceSummary } from "./references.js";

export interface ExtractedA {
  formatId: "A";
  targetAudience: string;
  oneLineMessage: string;
  readAction: string;
  toneNotes: string;
  slideOutline: string;
  keyFacts: string[];
  openItems: string[];
}

export interface ExtractedB {
  formatId: "B";
  trainingName: string;
  targetParticipants: string;
  trainingActivities: string;
  beforeAfterSteps: string;
  scheduleNotes: string;
  roiNotes: string;
  netCostNotes: string;
}

export type Extracted = ExtractedA | ExtractedB;

export interface GenerateInput {
  formatId: FormatId;
  transcript: string;
  tuning: Tuning;
  references?: ReferenceBundle;
}

export interface GenerateResult {
  structured: Extracted;
  markdown: string;
  gensparkText: string;
  folderNameSuggestion: string;
}

const UNIVERSAL_BLOCKS_A = `
━━━━━━━━━━━━━━━━━━━━━━━━━
【情報密度1.5倍ロック（数値必達）】
━━━━━━━━━━━━━━━━━━━━━━━━━
- 「1.5倍」は**下記最低行数を満たす**ことで達成する（抽象指示のみは不可）。
- **簡略化・「要点のみ」・カード1行化・フロー短ラベルのみは禁止**。
- **全内容スライド**：リード＋サブリード ＋ 本体 ＋ **補足1行**（可視テキスト**合計6行以上**）。

━━━━━━━━━━━━━━━━━━━━━━━━━
【非AI感・装飾ロック（必須）】
━━━━━━━━━━━━━━━━━━━━━━━━━
- **絵文字・スタンプ・ステッカー風記号は一切使用しない**。
- アイコンは**0〜2個/スライド**、**単色線画**のみ。

━━━━━━━━━━━━━━━━━━━━━━━━━
【ビジネストーン】
━━━━━━━━━━━━━━━━━━━━━━━━━
- トーン：**ビジネスライク**。禁止：直撃／解放（単独）／止める／口語の煽り。
`.trim();

function extractGensparkText(markdown: string): string {
  const marker = "## Gensparkへの入力";
  const idx = markdown.indexOf(marker);
  if (idx === -1) return "";
  const rest = markdown.slice(idx);
  const start = rest.indexOf("```text");
  if (start === -1) return "";
  const after = rest.slice(start + 7);
  const end = after.indexOf("```");
  if (end === -1) return "";
  return after.slice(0, end).trim();
}

function folderNameFromDate(dateJa: string, title: string): string {
  const m = dateJa.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
  const ymd = m
    ? `${m[1]}${m[2].padStart(2, "0")}${m[3].padStart(2, "0")}`
    : new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const slug = (title || "提案")
    .replace(/[^\w\u3040-\u30ff\u4e00-\u9faf]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);
  return `${ymd}_${slug || "提案"}`;
}

function mockExtractA(transcript: string): ExtractedA {
  const snippet = transcript.trim().slice(0, 280);
  const lines = transcript
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, 5);
  return {
    formatId: "A",
    targetAudience: lines[0]?.slice(0, 120) || "経営層・意思決定者",
    oneLineMessage: snippet
      ? "議事録内容を整理し、提案の全体像と次ステップの合意を得る"
      : "協業・提案の全体像を整理し、社内合意を得る",
    readAction: "座組・次ステップの合意",
    toneNotes: "ビジネスライク、口語・煽り禁止",
    slideOutline: "表紙→サマリー→背景→提案本体→協業/収益→次アクション",
    keyFacts: lines.length
      ? lines.map((l) => l.slice(0, 200))
      : ["（音声またはテキストで要望を入力してください）"],
    openItems: ["収益配分・未確定数値は要協議（捏造禁止）"],
  };
}

function mockExtractB(transcript: string): ExtractedB {
  const scheduleBlock = (() => {
    const start = transcript.indexOf("■見積書より（スライド5");
    if (start === -1) return "";
    const slice = transcript.slice(start, start + 1200);
    const end = slice.indexOf("【スケジュール固定ルール】");
    return (end > 0 ? slice.slice(0, end) : slice).replace(/\n+/g, " ").trim();
  })();

  const periodLine = transcript
    .split("\n")
    .find((l) => l.includes("【研修開始時期】") || (l.includes("研修開始") && l.includes("／")));

  return {
    formatId: "B",
    trainingName: "AI活用 営業プロセス改善研修",
    targetParticipants: transcript.slice(0, 200) || "BtoB営業・営業企画（人数は要確認）",
    trainingActivities: "全4回・伴走型（準備・提案・振り返り・運用ガイド）",
    beforeAfterSteps: "5ステップの Before/After（AI活用後を明示）",
    scheduleNotes:
      scheduleBlock ||
      periodLine?.slice(0, 300) ||
      (transcript.includes("月")
        ? (transcript.split("\n").find((l) => l.includes("月") && /締切|開始|第/.test(l))?.slice(0, 200) ??
          "社内決裁→申請締切→開始月（要日程調整）")
        : "社内決裁→申請締切→開始月（要日程調整）"),
    roiNotes: "時間削減試算（前提明示・試算例）",
    netCostNotes: "助成差引後の実質負担（別スライド）",
  };
}

export function mockExtract(formatId: FormatId, transcript: string): Extracted {
  return formatId === "B" ? mockExtractB(transcript) : mockExtractA(transcript);
}

export function composeMarkdown(
  formatId: FormatId,
  extracted: Extracted,
  tuning: Tuning,
  masterTemplate: string,
  references?: ReferenceBundle,
): string {
  const title =
    tuning.projectTitle ||
    (extracted.formatId === "B" ? extracted.trainingName : "協業・提案資料");
  const folder = folderNameFromDate(tuning.documentDate, title);

  const userSection =
    extracted.formatId === "A"
      ? `
## ユーザー要望（抽出）

- **読み手・ターゲット**: ${extracted.targetAudience}
- **一言メッセージ**: ${extracted.oneLineMessage}
- **読後アクション**: ${extracted.readAction}
- **スライド構成案**: ${extracted.slideOutline}
- **キーファクト**:
${extracted.keyFacts.map((f) => `  - ${f}`).join("\n")}
- **未確定・要協議**: ${extracted.openItems.join(" / ")}
`
      : `
## ユーザー要望（抽出）

- **研修名**: ${extracted.trainingName}
- **対象者**: ${extracted.targetParticipants}
- **研修で行うこと**: ${extracted.trainingActivities}
- **Before/After**: ${extracted.beforeAfterSteps}
- **スケジュール**: ${extracted.scheduleNotes}
- **ROI**: ${extracted.roiNotes}
- **実質負担**: ${extracted.netCostNotes}
`;

  const tuningSection = isTuningA(tuning)
    ? `
| 項目 | 内容 |
|------|------|
| 提案先 | ${tuning.clientName} |
| 資料版日 | ${tuning.documentDate} |
| 提案元 | ${tuning.proposerName} |
| 枚数 | ${tuning.slideCount}枚 |
| 情報密度1.5倍 | ${tuning.density15x ? "ON" : "OFF"} |
| セクション区切り | ${tuning.sectionDividers ? "あり" : "なし"} |
| 読み手 | ${tuning.audience === "executive" ? "経営層" : "現場含む"} |
`
    : `
| 項目 | 内容 |
|------|------|
| 提案先 | ${tuning.clientName} |
| 資料版日 | ${tuning.documentDate} |
| 提案元 | ${tuning.proposerName} |
| 枚数 | 8枚固定 |
| 実質負担スライド | ${tuning.netCostSlide ? "あり" : "なし"} |
| 図解強調 | ${tuning.illustrationEmphasis ? "ON" : "OFF"} |
`;

  let body = masterTemplate;
  body = body.replace(/\*\*2026年7月24日\*\*/g, `**${tuning.documentDate}**`);
  body = body.replace(/2026年7月24日/g, tuning.documentDate);
  body = body.replace(/株式会社ネクストリンク商事様/g, tuning.clientName);

  if (isTuningA(tuning) && tuning.density15x && !body.includes("【情報密度1.5倍ロック")) {
    const inject = `\n${UNIVERSAL_BLOCKS_A}\n`;
    const marker = "【表記ロック";
    if (body.includes(marker)) {
      body = body.replace(marker, `${inject}\n${marker}`);
    }
  }

  const refNote = referenceSummary(references);
  const refExcerpt = buildReferenceContext(references, 4000);

  const header = `# ${title}｜Genspark用プロンプト

## 版情報（Prompt Studio 生成）

${tuningSection}
${refNote ? `\n### 参考資料\n\n- ${refNote}\n` : ""}
${refExcerpt ? `\n<details><summary>参考資料抜粋（生成時）</summary>\n\n${refExcerpt}\n\n</details>\n` : ""}

### 推奨フォルダ名

\`${folder}\`

${userSection}

---

`;

  return header + body;
}

export function generateMock(
  input: GenerateInput,
  masterTemplate: string,
): GenerateResult {
  const structured = mockExtract(input.formatId, input.transcript);
  const markdown = composeMarkdown(
    input.formatId,
    structured,
    input.tuning,
    masterTemplate,
    input.references,
  );
  const gensparkText = extractGensparkText(markdown);
  const title =
    input.tuning.projectTitle ||
    (structured.formatId === "B" ? structured.trainingName : "協業提案");
  return {
    structured,
    markdown,
    gensparkText,
    folderNameSuggestion: folderNameFromDate(input.tuning.documentDate, title),
  };
}

export { extractGensparkText, folderNameFromDate };
