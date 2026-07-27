import type { TuningB } from "./formats.js";
import { DELIVERY_B_SLIDES } from "./delivery-b-standard.js";

const SLIDE_SECTION_START = "【各スライドの確定内容（■固稿）】";
const SECTION_END_MARKERS = ["【最終自己チェック】", "【デザイン制約（YAML）】"];

export function defaultBSlideRoleOrder(): number[] {
  return DELIVERY_B_SLIDES.map((s) => s.order);
}

/** 有効な roleId の並び（7は netCostSlide OFF 時除外） */
export function normalizeBSlideRoleOrder(order: number[] | undefined, tuning: TuningB): number[] {
  const all = defaultBSlideRoleOrder();
  const allowed = new Set(tuning.netCostSlide ? all : all.filter((n) => n !== 7));
  let seq = (order?.length ? order.filter((n) => allowed.has(n)) : [...allowed]) as number[];
  for (const n of all) {
    if (allowed.has(n) && !seq.includes(n)) seq.push(n);
  }
  return seq;
}

export function isDefaultBSlideRoleOrder(order: number[] | undefined, tuning: TuningB): boolean {
  const a = normalizeBSlideRoleOrder(order, tuning);
  const b = normalizeBSlideRoleOrder(undefined, tuning);
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

function parseSlideBlocks(section: string): Map<number, string> {
  const map = new Map<number, string>();
  const chunks = section.split(/(?=■スライド\d+｜)/);
  for (const chunk of chunks) {
    const m = chunk.match(/^■スライド(\d+)｜/);
    if (!m) continue;
    const num = Number.parseInt(m[1]!, 10);
    map.set(num, chunk.trim());
  }
  return map;
}

function renumberSlideBlock(block: string, newIndex: number): string {
  return block.replace(/^■スライド\d+｜/, `■スライド${newIndex}｜`);
}

function orderSequenceLabel(order: number[] | undefined, tuning: TuningB): string {
  const roles = new Map(DELIVERY_B_SLIDES.map((s) => [s.order, s]));
  const labels = normalizeBSlideRoleOrder(order, tuning).map((roleId, i) => {
    const r = roles.get(roleId);
    const name = r?.slideLabel ?? `スライド${roleId}`;
    return `${i + 1}.${name}`;
  });
  return labels.join(" → ");
}

function patchOrderMentions(text: string, order: number[] | undefined, tuning: TuningB): string {
  const seq = orderSequenceLabel(order, tuning);
  const count = normalizeBSlideRoleOrder(order, tuning).length;
  let out = text;
  out = out.replace(/順序：\*\*1→2→3→4→5→6→7→8\*\*/g, `順序：**${seq}**`);
  out = out.replace(/順序1→8/g, `順序: ${seq}`);
  out = out.replace(/\*\*8枚\*\*・順序1→8/g, `**${count}枚**・${seq}`);
  out = out.replace(/- \[ \] \*\*8枚\*\*・順序1→8/g, `- [ ] **${count}枚**・${seq}`);
  if (out.includes("【スライド出力順（ルール設定）】")) {
    out = out.replace(
      /【スライド出力順（ルール設定）】[\s\S]*?(?=━━━━━━━━━━━━━━━━━━━━━━━━━|$)/,
      `【スライド出力順（ルール設定）】\n- 出力順（role→枚番号）: ${seq}\n- ■固稿ブロックはこの順で並べ替え済み。Genspark は■スライド1から順に生成すること。\n\n`,
    );
  } else if (out.includes(BEHAVIOR_INJECT_ANCHOR)) {
    out = out.replace(
      BEHAVIOR_INJECT_ANCHOR,
      `${BEHAVIOR_INJECT_ANCHOR}\n\n【スライド出力順（ルール設定）】\n- 出力順: ${seq}\n- ■固稿の並び順に従い、スライド1から${count}枚を生成すること。\n\n`,
    );
  }
  return out;
}

const BEHAVIOR_INJECT_ANCHOR = "【非AI感・装飾ロック】";

/** ■固稿セクションを roleId 順に並べ替え、見出し番号を 1..n に振り直す */
export function applySlideRoleOrderToGensparkText(
  text: string,
  order: number[] | undefined,
  tuning: TuningB,
): string {
  if (isDefaultBSlideRoleOrder(order, tuning)) {
    return patchOrderMentions(text, order, tuning);
  }

  const start = text.indexOf(SLIDE_SECTION_START);
  if (start === -1) return patchOrderMentions(text, order, tuning);

  let end = text.length;
  for (const marker of SECTION_END_MARKERS) {
    const i = text.indexOf(marker, start + 1);
    if (i !== -1 && i < end) end = i;
  }

  const before = text.slice(0, start);
  const section = text.slice(start, end);
  const after = text.slice(end);

  const firstSlide = section.indexOf("■スライド");
  if (firstSlide === -1) return text;

  const header = section.slice(0, firstSlide);
  const body = section.slice(firstSlide);
  const blocks = parseSlideBlocks(body);
  if (blocks.size === 0) return text;

  const seq = normalizeBSlideRoleOrder(order, tuning);
  const reordered: string[] = [];
  seq.forEach((roleId, idx) => {
    const block = blocks.get(roleId);
    if (block) reordered.push(renumberSlideBlock(block, idx + 1));
  });

  const newSection = `${header}${reordered.join("\n\n")}\n\n`;
  return patchOrderMentions(before + newSection + after, order, tuning);
}

export function slideRoleOrderSummary(order: number[] | undefined, tuning: TuningB): string {
  return orderSequenceLabel(order, tuning);
}
