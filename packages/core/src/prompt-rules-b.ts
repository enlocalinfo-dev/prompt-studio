import { extractGensparkText } from "./engine.js";
import { applySlideRoleOrderToGensparkText } from "./slide-order-b.js";
import type { TuningB } from "./formats.js";

/** ユーザーが上書きする3区分（B形式・Genspark text 内） */
export interface PromptRuleOverridesB {
  /** 案件要約・文案ロックなど「何を書くか」 */
  contentPolicy?: string;
  /** design_system: 以降の YAML 本文（design_system: 行を含む） */
  designYaml?: string;
  /** 非AI・イラスト・トーン・最優先ルールなど「どう見せるか／禁止事項」 */
  behaviorRules?: string;
  /** B形式：スライド roleId（1=表紙…8=次の一手）の出力順 */
  slideRoleOrder?: number[];
}

export interface PromptRuleDefaultsB {
  contentPolicy: string;
  designYaml: string;
  behaviorRules: string;
}

const CONTENT_START = "【案件要約（B標準・確定）】";
const BEHAVIOR_START = "【非AI感・装飾ロック】";
const SLIDES_START = "【各スライドの確定内容（■固稿）】";
const YAML_START = "design_system:";

const ILLUSTRATION_EMPHASIS_ON = `【イラスト・図解ロック（本件必須）】
━━━━━━━━━━━━━━━━━━━━━━━━━
- **各スライドの視覚面積40%以上**を図解・イラストに割く（表紙・8枚目は50%以上可）
- **文字だけのスライド禁止**。各スライドの【図解イメージ】を必ず反映
- 左イラスト右テキスト／右イラスト左テキストを交互に。YAMLパレット内の色のみ
- 5段階階段・ガント・ウォーターフォール・ペルソナ等、**スライドごとに図解タイプを変える**`;

const ILLUSTRATION_EMPHASIS_OFF = `【イラスト・図解ロック（控えめ）】
━━━━━━━━━━━━━━━━━━━━━━━━━
- 図解・フロー・チャート中心。**装飾イラストは最小限**（各スライド視覚面積**20〜30%**目安）
- 文字だけのスライドは禁止。各スライドの【図解イメージ】は**図表・線画アイコン**で反映
- 大きな人物イラスト・シーン画は**使わない**。YAMLパレット内の色のみ
- スライドごとに図解タイプは変えるが、**イラスト枚数を増やさない**`;

export function effectiveBSlideCount(tuning: TuningB): number {
  return tuning.netCostSlide ? 8 : 7;
}

function sliceBetween(text: string, startMarker: string, endMarker: string): string {
  const start = text.indexOf(startMarker);
  if (start === -1) return "";
  const end = text.indexOf(endMarker, start + 1);
  if (end === -1) return text.slice(start).trim();
  return text.slice(start, end).trim();
}

function replaceBetween(text: string, startMarker: string, endMarker: string, replacement: string): string {
  const start = text.indexOf(startMarker);
  if (start === -1) return text;
  const end = text.indexOf(endMarker, start + 1);
  if (end === -1) return text;
  const block = replacement.endsWith("\n") ? replacement : `${replacement}\n\n`;
  return text.slice(0, start) + block + text.slice(end);
}

function replaceDesignYaml(text: string, yamlBody: string): string {
  const start = text.indexOf(YAML_START);
  if (start === -1) return text;
  const fence = text.indexOf("```", start);
  const end = fence === -1 ? text.length : fence;
  const body = yamlBody.trim();
  return text.slice(0, start) + body + (fence === -1 ? "" : "\n\n") + text.slice(end);
}

/** Bマスター markdown から編集用デフォルト3区分を抽出 */
export function extractBRuleDefaults(masterMarkdown: string): PromptRuleDefaultsB {
  const text = extractGensparkText(masterMarkdown) || masterMarkdown;
  const contentPolicy = sliceBetween(text, CONTENT_START, BEHAVIOR_START);
  const behaviorRules = sliceBetween(text, BEHAVIOR_START, SLIDES_START);
  let designYaml = "";
  const yamlIdx = text.indexOf(YAML_START);
  if (yamlIdx !== -1) {
    const fence = text.indexOf("```", yamlIdx);
    designYaml = text.slice(yamlIdx, fence === -1 ? text.length : fence).trim();
  }
  return {
    contentPolicy: contentPolicy || "",
    designYaml,
    behaviorRules: behaviorRules || "",
  };
}

function swapIllustrationBlock(behavior: string, emphasis: boolean): string {
  if (!behavior.includes("【イラスト・図解ロック")) return behavior;
  const mild = ILLUSTRATION_EMPHASIS_OFF;
  const strong = ILLUSTRATION_EMPHASIS_ON;
  if (emphasis) {
    if (behavior.includes("【イラスト・図解ロック（控えめ）】")) {
      return behavior.replace(/【イラスト・図解ロック（控えめ）】[\s\S]*?(?=━━━━━━━━━━━━━━━━━━━━━━━━━\n【ビジネストーン】)/, `${strong}\n`);
    }
    return behavior;
  }
  if (behavior.includes("【イラスト・図解ロック（本件必須）】")) {
    return behavior.replace(/【イラスト・図解ロック（本件必須）】[\s\S]*?(?=━━━━━━━━━━━━━━━━━━━━━━━━━\n【ビジネストーン】)/, `${mild}\n`);
  }
  return behavior;
}

function applyNetCostSlidePolicy(text: string, tuning: TuningB): string {
  if (tuning.netCostSlide) return text;
  let out = text.replace(/■スライド\d+｜[^\n]*実質負担[\s\S]*?(?=■スライド\d+｜|$)/, "");
  out = out.replace(/■スライド8｜/, "■スライド7｜");
  const chunks = out.split(/(?=■スライド\d+｜)/);
  let idx = 0;
  out = chunks
    .map((c) => {
      if (!/^■スライド\d+｜/.test(c)) return c;
      idx += 1;
      return c.replace(/^■スライド\d+｜/, `■スライド${idx}｜`);
    })
    .join("");
  out = out.replace(/\*\*8枚固定\*\*/g, "**7枚固定**");
  out = out.replace(/全8枚固定/g, "全7枚固定");
  out = out.replace(/順序：\*\*1→2→3→4→5→6→7→8\*\*/g, "順序：**1→2→3→4→5→6→7**");
  out = out.replace(/助成金差引後の負担は\*\*次スライド（実質負担）\*\*で示します/g, "助成金・実質負担の数値は見積・別資料で共有（本資料ではROIのみ）");
  out = out.replace(/slide_count: 8/g, "slide_count: 7");
  out = out.replace(/net_cost_slide: 7/g, "net_cost_slide: null");
  out = out.replace(/\*\*8枚\*\*・順序1→8/g, "**7枚**・順序1→7");
  out = out.replace(/実質負担は7のみ/g, "実質負担スライドなし");
  out = out.replace(/各内容スライド（2〜7）/g, "各内容スライド（2〜6）");
  return out;
}

/** Genspark 投入 text 本体にルール上書き・出力オプションを適用 */
export function applyPromptRulesToGensparkText(
  gensparkText: string,
  overrides: PromptRuleOverridesB | undefined,
  tuning: TuningB,
): string {
  let inner = gensparkText;

  if (overrides?.contentPolicy?.trim()) {
    inner = replaceBetween(inner, CONTENT_START, BEHAVIOR_START, overrides.contentPolicy.trim());
  }

  let behavior = overrides?.behaviorRules?.trim() || sliceBetween(inner, BEHAVIOR_START, SLIDES_START);
  behavior = swapIllustrationBlock(behavior, tuning.illustrationEmphasis);
  if (overrides?.behaviorRules?.trim()) {
    inner = replaceBetween(inner, BEHAVIOR_START, SLIDES_START, behavior);
  } else if (behavior !== sliceBetween(inner, BEHAVIOR_START, SLIDES_START)) {
    inner = replaceBetween(inner, BEHAVIOR_START, SLIDES_START, behavior);
  }

  if (overrides?.designYaml?.trim()) {
    inner = replaceDesignYaml(inner, overrides.designYaml.trim());
  }

  inner = applySlideRoleOrderToGensparkText(inner, overrides?.slideRoleOrder, tuning);

  inner = applyNetCostSlidePolicy(inner, tuning);
  return inner;
}

/** マスター markdown 全体に適用（```text ブロック内のみ差し替え） */
export function applyPromptRulesToMaster(
  masterMarkdown: string,
  overrides: PromptRuleOverridesB | undefined,
  tuning: TuningB,
): string {
  const inner = extractGensparkText(masterMarkdown);
  if (!inner) return masterMarkdown;
  const updated = applyPromptRulesToGensparkText(inner, overrides, tuning);
  if (updated === inner) return masterMarkdown;
  return masterMarkdown.replace(inner, updated);
}

export const PROMPT_RULE_LOGIC_SUMMARY = {
  pipeline: [
    "見積PDF・入力フォーム → 構造化（extract）",
    "B標準マスターの■固稿部分のみ LLM が案件用に差し替え",
    "案件情報（提案先・版日等）をマスター内表記に反映",
    "プロンプトルール（3区分）と出力オプションをマスターに合成",
    "Genspark 用 text を抽出して完成",
  ],
  slideCountNote:
    "B形式の標準は8枚（表紙＋①〜⑤＋実質負担＋次の一手）。「実質負担スライドを含めない」OFF 時はスライド7（実質負担）を除き7枚で出力します。",
  illustrationNote:
    "「図解・イラストを多め」OFF 時は、40%以上のイラスト必須をやめ、図表中心・20〜30%の控えめ指示に差し替えます。",
};
