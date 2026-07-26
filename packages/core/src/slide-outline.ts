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
}

function bulletValue(block: string, prefixes: string[]): string | undefined {
  for (const line of block.split("\n")) {
    const t = line.trim();
    if (!t.startsWith("-")) continue;
    const body = t.replace(/^-\s*/, "");
    for (const p of prefixes) {
      if (body.startsWith(p)) {
        return body.slice(p.length).replace(/^[：:\s]+/, "").trim();
      }
    }
  }
  return undefined;
}

function firstBullet(block: string): string | undefined {
  for (const line of block.split("\n")) {
    const t = line.trim();
    if (t.startsWith("-") && !t.startsWith("- 【")) {
      return t.replace(/^-\s*/, "").slice(0, 120);
    }
  }
  return undefined;
}

function parseSlideNumber(labelLine: string): number {
  const m = labelLine.match(/スライド\s*(\d+)/i) ?? labelLine.match(/^■\s*(\d+)/);
  return m?.[1] ? Number.parseInt(m[1], 10) : 0;
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

    const body = lines.slice(1).join("\n");
    const headline =
      bulletValue(body, ["見出し", "タイトル", "1行サマリー", "チェック1"]) ??
      firstBullet(body) ??
      headLine;

    const subline =
      bulletValue(body, ["リード", "サブリード", "サブ"]) ??
      bulletValue(body, ["チェック2"]);

    const slideNumber = parseSlideNumber(headLine) || items.length + 1;

    items.push({
      slideNumber,
      sectionLabel: headLine,
      headline,
      subline,
    });
  }

  return items.sort((a, b) => a.slideNumber - b.slideNumber);
}
