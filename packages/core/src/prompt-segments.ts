import { extractGensparkText } from "./engine.js";

export type PromptSegmentKind =
  | "yaml"
  | "global_rule"
  | "slide"
  | "section_divider"
  | "checklist"
  | "preamble";

export interface PromptSegment {
  id: string;
  label: string;
  kind: PromptSegmentKind;
  /** Genspark に渡す該当部分の原文 */
  body: string;
  /** 画面上部に表示する「このパートの定義」 */
  purpose: string;
  slideKey?: string;
  mandatory?: boolean;
  previewTitle?: string;
  previewLines?: string[];
}

function inferSlidePurpose(label: string, body: string): string {
  if (/表紙/.test(label)) {
    return "提案資料の表紙です。タイトル・提案先・版日を固定し、以降スライドの前提（読み手・協業の骨子）を示します。";
  }
  if (/エグゼクティブ|サマリー/.test(label)) {
    return "意思決定者向けの要約スライドです。結論と3論点（カード）を先に示し、詳細を読む前の合意形成を目的とします。";
  }
  if (/^S\d|区切り|｜0[1-5]\s/.test(label) || /｜01 |｜02 |｜03 |｜04 |｜05 /.test(label)) {
    return `章の区切り（セクション扉）です。「${label}」以降の内容スライドのテーマを宣言し、視覚的に章を切り替えます。`;
  }
  if (/ロードマップ|次アクション|Next/.test(label)) {
    return "合意後の進め方を示すクロージングです。期限・担当・次の意思決定ポイントを明示します。";
  }
  if (/ROI|実質負担|助成/.test(label)) {
    return "投資対効果または実質コストを説明するスライドです。試算前提と数値根拠を省略せず、経営判断材料として提示します。";
  }
  if (/Before|After|対象者|研修で|スケジュール/.test(label)) {
    return "研修デリバリー提案の必須要素です。導入企業が判断しやすいよう、固稿どおりの分量と図解指示を維持します。";
  }

  const lead =
    body.match(/^-\s*リード[：:]\s*(.+)$/m) ??
    body.match(/^-\s*見出し[：:]\s*(.+)$/m) ??
    body.match(/^-\s*1行サマリー[：:]\s*(.+)$/m);
  if (lead) {
    const msg = lead[1].trim();
    return `このスライドは「${msg}」を中心に説明します。■固稿・図解指示を要約せず反映してください。`;
  }

  return `Genspark 向けの確定原稿（${label}）です。下記テキストと【図解】指示をそのまま引き継ぎ、ルール（YAML・密度・トーン）に従って生成します。`;
}

function classifySlide(label: string): PromptSegmentKind {
  if (/^S\d|｜0[1-5]\s|区切り/.test(label)) return "section_divider";
  return "slide";
}

function previewFromBody(label: string, body: string): { title: string; lines: string[] } {
  const titlePart = label.split("｜").pop()?.trim() ?? label;
  const lines: string[] = [];
  for (const line of body.split("\n")) {
    const t = line.trim();
    if (!t.startsWith("-")) continue;
    const cleaned = t.replace(/^-\s*/, "").slice(0, 72);
    if (cleaned) lines.push(cleaned);
    if (lines.length >= 6) break;
  }
  return { title: titlePart, lines };
}

function purposeForRule(title: string): string {
  if (/情報密度|1\.5倍|密度/.test(title)) {
    return "全内容スライド共通の数値クォータ（1.5倍）です。行数・カード行数・補足行などを必達とし、簡略化は禁止です。";
  }
  if (/非AI|装飾|絵文字/.test(title)) {
    return "見た目のルールです。絵文字・スタンプ風記号を禁止し、ビジネス資料としてのトーンを固定します。";
  }
  if (/ビジネス|トーン/.test(title)) {
    return "文言トーンのルールです。口語・煽り語を避け、経営層向けのビジネスライクな表現に統一します。";
  }
  if (/表記|デザイン|レイアウト|可視化/.test(title)) {
    return "レイアウト・可視化タイプの制約です。スライドごとの■固稿と併せて Genspark が守るべき設計指示です。";
  }
  return `必須の共通ルールブロック（${title}）です。スライド固稿とセットでそのまま Genspark に引き継ぎます。`;
}

/** Genspark 投入 text または markdown 全体から、ナビゲーション用セグメントを抽出 */
export function parseGensparkPrompt(markdown: string): PromptSegment[] {
  const text = extractGensparkText(markdown) || markdown;
  const segments: PromptSegment[] = [];
  let idx = 0;

  const yamlRe = /```yaml\n([\s\S]*?)```/g;
  let ym: RegExpExecArray | null;
  while ((ym = yamlRe.exec(text)) !== null) {
    const body = ym[1].trim();
    segments.push({
      id: `yaml-${idx++}`,
      label: "design_system（YAML）",
      kind: "yaml",
      body,
      purpose:
        "デザインシステム・density_quota・generation_constraints など、ルールベースの機械可読定義です。スライド■固稿とセットで必ず Genspark に渡し、改変しないでください。",
      mandatory: true,
      previewTitle: "YAML ルールセット",
      previewLines: body.split("\n").slice(0, 8),
    });
  }

  if (!segments.some((s) => s.kind === "yaml")) {
    const inlineYaml = text.match(
      /【デザイン制約（YAML）】[\s\S]*?\n(design_system:[\s\S]*?)(?=\n```|\n━━━━━━━━|$)/,
    );
    if (inlineYaml?.[1]?.trim()) {
      const body = inlineYaml[1].trim();
      segments.push({
        id: `yaml-${idx++}`,
        label: "design_system（YAML）",
        kind: "yaml",
        body,
        purpose:
          "Genspark text 内の design_system 定義です。コピー時はスライド■固稿とセットで渡してください。",
        mandatory: true,
        previewTitle: "YAML ルールセット",
        previewLines: body.split("\n").slice(0, 8),
      });
    }
  }

  const firstSlide = text.search(/^■/m);
  const preamble = firstSlide > 0 ? text.slice(0, firstSlide).trim() : "";
  if (preamble.length > 80) {
    const withoutYaml = preamble.replace(/```yaml[\s\S]*?```/g, "").trim();
    if (withoutYaml.length > 40) {
      segments.push({
        id: `preamble-${idx++}`,
        label: "全体指示・ロール定義",
        kind: "preamble",
        body: withoutYaml,
        purpose:
          "Genspark への役割・トーン・全体方針の指示です。各スライド生成時もこの前提（ENロジカル提案資料としての制約）を維持します。",
        mandatory: true,
        previewTitle: "全体指示",
        previewLines: withoutYaml.split("\n").filter((l) => l.trim()).slice(0, 6),
      });
    }
  }

  const slideStart = text.search(/^■/m);
  const headText = slideStart >= 0 ? text.slice(0, slideStart) : text;

  const ruleBlockRe = /【([^】]+)】([\s\S]*?)(?=【|■|$)/g;
  let rm: RegExpExecArray | null;
  while ((rm = ruleBlockRe.exec(headText)) !== null) {
    const title = rm[1].trim();
    const body = `【${title}】\n${rm[2].trim()}`.trim();
    if (body.length < 30) continue;
    if (/各スライドの確定内容|固稿/.test(title)) continue;
    const kind: PromptSegmentKind = /チェック|自己/.test(title) ? "checklist" : "global_rule";
    segments.push({
      id: `rule-${idx++}`,
      label: title,
      kind,
      body,
      purpose: purposeForRule(title),
      mandatory: kind !== "checklist",
      previewTitle: title,
      previewLines: rm[2]
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean)
        .slice(0, 6),
    });
  }

  const slideParts = text.split(/(?=^■)/m).filter((p) => p.startsWith("■"));
  for (const part of slideParts) {
    const lines = part.split("\n");
    const head = lines[0]?.replace(/^■\s*/, "").trim() ?? "スライド";
    const body = part.trim();
    const kind = classifySlide(head);
    const { title, lines: previewLines } = previewFromBody(head, lines.slice(1).join("\n"));
    segments.push({
      id: `slide-${idx++}`,
      label: head,
      kind,
      body,
      purpose: inferSlidePurpose(head, body),
      slideKey: head.split("｜")[0]?.trim(),
      previewTitle: title,
      previewLines,
    });
  }

  if (segments.length === 0) {
    segments.push({
      id: "full-0",
      label: "プロンプト全文",
      kind: "preamble",
      body: text.slice(0, 12000),
      purpose: "生成された Genspark 用プロンプトです。セクション分割が見つからないため全文を表示しています。",
      previewTitle: "プロンプト",
      previewLines: text.split("\n").slice(0, 8),
    });
  }

  return segments;
}
