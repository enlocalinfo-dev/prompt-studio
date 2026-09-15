/** Genspark text 内の ■固稿から、8枚分の見出し一覧を抽出 */

export interface SlideOutlineItem {
  /** 1〜8 など */
  slideNumber: number;
  /** ■行のラベル（例: スライド2｜① 今回の研修の対象者） */
  sectionLabel: string;
  /** 見出し・タイトル・リードの代表1行 */
  headline: string;
  /** 補助1行（リード or サブリード） */
  subline?: string;
  /** ■固稿から抽出した箇条書き（プレビュー用） */
  bullets: string[];
  /** 【図解】行。プレビュー下部に出す */
  diagramNote?: string;
}

const TEMPLATE_HEADLINES = [
  "受講対象——現場営業と企画が同じ型を持つ",
  "全4回——学ぶより「自社の型を作る」伴走",
  "目指すのは「AI後」の営業プロセス",
  "社内決裁と助成申請——いつまでに何を終えるか",
  "時間削減の試算——前提を明示したうえでの効果イメージ",
  "助成金を踏まえた実質負担——社内決裁用のコスト整理",
  "次のステップ——決裁からキックオフまで",
  "AI活用 営業プロセス改善研修 ご提案",
];

const DISTINCTIVE_PREFIXES = [
  "主対象",
  "対象の内訳",
  "提案先",
  "タイトル",
  "第1回",
  "実施内容",
  "研修費",
  "助成見込み",
  "本提案の社内決裁",
  "研修開始月",
  "効果仮定",
  "チェック1",
];

function isTemplateHeadline(value: string | undefined): boolean {
  const v = (value ?? "").trim();
  if (!v) return false;
  return TEMPLATE_HEADLINES.some((t) => v.includes(t) || t.includes(v));
}

function isDiagramLine(value: string): boolean {
  return /【図解/.test(value.trim());
}

function isInstructionLine(value: string): boolean {
  const t = value.trim();
  if (!t) return false;
  if (isDiagramLine(t)) return true;
  if (/対象・回数ロック|スケジュール固定ルール|入力ルール/.test(t)) return true;
  if (/見積に無い場合/.test(t)) return true;
  if (/^禁止[：:]/.test(t)) return true;
  if (/禁止[：:].{0,12}(全[0-9０-９]+回|15名|商談準備)/.test(t)) return true;
  return false;
}

function stripPrefix(body: string): string {
  return body.replace(/^[【\s]*[^：:]{1,16}[：:]\s*/, "").trim();
}

function lineBodies(block: string): string[] {
  const out: string[] = [];
  for (const line of block.split("\n")) {
    const t = line.trim();
    if (!t || isInstructionLine(t)) continue;
    if (t.startsWith("-")) {
      const body = t.replace(/^-\s*/, "").trim();
      if (body && !isInstructionLine(body) && !isInstructionLine(stripPrefix(body))) out.push(body);
      continue;
    }
    if (/^(見出し|タイトル|リード|サブリード|サブ|主対象|副対象|対象の内訳|第[0-9０-９]+回|提案先|研修費|実施内容)/.test(t)) {
      out.push(t);
    }
  }
  return out;
}

function bulletValue(bodies: string[], prefixes: string[]): string | undefined {
  for (const body of bodies) {
    for (const p of prefixes) {
      if (body.startsWith(p)) {
        return body.slice(p.length).replace(/^[：:\s]+/, "").trim();
      }
    }
  }
  return undefined;
}

function extractDiagramNote(block: string): string | undefined {
  const notes: string[] = [];
  for (const line of block.split("\n")) {
    const t = line.trim().replace(/^-\s*/, "");
    if (!isDiagramLine(t)) continue;
    const body = t
      .replace(/^【図解(?:イメージ)?】/, "")
      .replace(/^[：:\s]+/, "")
      .trim();
    if (body) notes.push(body);
  }
  return notes.join(" ") || undefined;
}

function extractBullets(bodies: string[], max = 20): string[] {
  const bullets: string[] = [];
  for (const raw of bodies) {
    let body = raw;
    if (!body || isInstructionLine(body) || body.startsWith("【図解")) continue;
    if (body.length > 160) body = `${body.slice(0, 160)}…`;
    bullets.push(body);
    if (bullets.length >= max) break;
  }
  return bullets;
}

function pickDistinctive(bodies: string[]): string | undefined {
  for (const p of DISTINCTIVE_PREFIXES) {
    const hit = bodies.find((b) => b.startsWith(p));
    if (hit) {
      const v = stripPrefix(hit);
      if (v.length >= 3) return v.slice(0, 80);
    }
  }
  return undefined;
}

function parseSlideNumber(labelLine: string): number {
  const m = labelLine.match(/スライド\s*(\d+)/i) ?? labelLine.match(/^■\s*(\d+)/);
  return m?.[1] ? Number.parseInt(m[1], 10) : 0;
}

/** プレビュー用：固稿の箇条を優先。同じ仮文言で全枚を埋めない */
export function slidePreviewBulletLines(item: SlideOutlineItem): string[] {
  const fromBrief = item.bullets.filter(
    (b) => b.length > 0 && !b.startsWith("【") && !isInstructionLine(b),
  );
  const headline = item.headline?.trim();
  const sub = item.subline?.trim();
  const uniq = [...new Set(fromBrief.map((s) => s.trim()))].filter((line) => {
    if (!line || isInstructionLine(line)) return false;
    if (line === headline || line === sub) return false;
    if (headline && stripPrefix(line) === headline) return false;
    return true;
  });

  if (uniq.length > 0) return uniq.slice(0, 16);
  if (headline && !isTemplateHeadline(headline) && !isInstructionLine(headline)) return [headline];
  return [];
}

export function parseSlideOutlinesFromGenspark(gensparkText: string): SlideOutlineItem[] {
  const text = gensparkText.trim();
  if (!text.includes("■")) return [];

  const parts = text.split(/(?=^■)/m).filter((p) => /^■/.test(p.trim()));
  const items: SlideOutlineItem[] = [];

  for (const part of parts) {
    const lines = part.trim().split("\n");
    const headLine = lines[0]?.replace(/^■\s*/, "").trim() ?? "";
    if (/^S\d|区切り|｜0[1-5]\s/.test(headLine)) continue;
    if (/見積書より|入力ルール|対象・回数ロック|スケジュール固定/.test(headLine)) continue;

    const body = lines.slice(1).join("\n");
    const bodies = lineBodies(body);
    const labeledHeadline = bulletValue(bodies, ["見出し", "タイトル", "1行サマリー"]);
    const distinctive = pickDistinctive(bodies);
    const firstRaw = bodies[0] ? stripPrefix(bodies[0]) : undefined;
    const first = firstRaw && !isInstructionLine(firstRaw) ? firstRaw : undefined;

    let headline = [labeledHeadline, distinctive, first, headLine].find(
      (v) => v && !isTemplateHeadline(v) && !isInstructionLine(v),
    ) ?? headLine;
    if (isTemplateHeadline(headline) && distinctive && !isInstructionLine(distinctive)) {
      headline = distinctive;
    }

    const labeledSub = bulletValue(bodies, ["リード", "サブリード", "サブ"]);
    const subline =
      (labeledSub && !isInstructionLine(labeledSub) ? labeledSub : undefined) ??
      (distinctive && distinctive !== headline && !isInstructionLine(distinctive) ? distinctive : undefined);

    const slideNumber = parseSlideNumber(headLine) || items.length + 1;

    items.push({
      slideNumber,
      sectionLabel: headLine,
      headline,
      subline,
      bullets: extractBullets(bodies),
      diagramNote: extractDiagramNote(body),
    });
  }

  return items.sort((a, b) => a.slideNumber - b.slideNumber);
}
