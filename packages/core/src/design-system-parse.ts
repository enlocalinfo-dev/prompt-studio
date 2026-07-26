/** Genspark design_system（YAML 断片）から Studio 用の見た目予測を組み立てる */

export interface DesignSystemColors {
  primary: string;
  secondary: string;
  accent: string;
  textMain: string;
  textSub: string;
  background: string;
  backgroundLight: string;
  surfaceCard: string;
  dividerLine: string;
}

export interface ParsedDesignSystem {
  colors: DesignSystemColors;
  formatType?: string;
  slideCount?: number;
  proposer?: string;
  clientLabel?: string;
  trainingTitle?: string;
  toneHints: string[];
  source: "yaml" | "defaults";
  warnings: string[];
}

const B_DEFAULT_COLORS: DesignSystemColors = {
  primary: "#1A5F4A",
  secondary: "#2D8B6E",
  accent: "#C45C3E",
  textMain: "#111111",
  textSub: "#6B7280",
  background: "#FFFFFF",
  backgroundLight: "#F5F7FA",
  surfaceCard: "#FFFFFF",
  dividerLine: "#E5E7EB",
};

function pickYamlScalar(block: string, key: string): string | undefined {
  const re = new RegExp(`^\\s*${key}:\\s*"?([^"\\n#]+)"?\\s*$`, "im");
  const m = block.match(re);
  return m?.[1]?.trim();
}

function pickColor(block: string, key: string, fallback: string): string {
  const re = new RegExp(`${key}:\\s*["']?(#[0-9A-Fa-f]{3,8})["']?`, "i");
  const m = block.match(re);
  if (!m?.[1]) return fallback;
  const hex = m[1];
  if (hex.length === 4) {
    return `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`.toUpperCase();
  }
  return hex.toUpperCase();
}

/** design_system: から始まる YAML テキストを解析（完全パーサ不要・テンプレ固定キー向け） */
export function parseDesignSystemYaml(yamlText: string): ParsedDesignSystem {
  const warnings: string[] = [];
  let block = yamlText.trim();
  if (!block.includes("design_system:") && !block.includes("allowed_colors:")) {
    block = `design_system:\n${block}`;
  }

  const colors: DesignSystemColors = {
    primary: pickColor(block, "primary", B_DEFAULT_COLORS.primary),
    secondary: pickColor(block, "secondary", B_DEFAULT_COLORS.secondary),
    accent: pickColor(block, "accent", B_DEFAULT_COLORS.accent),
    textMain: pickColor(block, "text_main", B_DEFAULT_COLORS.textMain),
    textSub: pickColor(block, "text_sub", B_DEFAULT_COLORS.textSub),
    background: pickColor(block, "background", B_DEFAULT_COLORS.background),
    backgroundLight: pickColor(block, "background_light", B_DEFAULT_COLORS.backgroundLight),
    surfaceCard: pickColor(block, "surface_card", B_DEFAULT_COLORS.surfaceCard),
    dividerLine: pickColor(block, "divider_line", B_DEFAULT_COLORS.dividerLine),
  };

  if (!/#/.test(yamlText)) {
    warnings.push("カラー定義が見つからないため、B標準の既定パレットを表示しています。");
  }

  const formatType = pickYamlScalar(block, "format_type");
  const slideRaw = pickYamlScalar(block, "slide_count");
  const slideCount = slideRaw ? Number.parseInt(slideRaw, 10) : undefined;

  const proposer =
    pickYamlScalar(block, "proposer") ??
    pickYamlScalar(block, "proposerName") ??
    extractFromGensparkLock(yamlText, "提案元");
  const clientLabel =
    pickYamlScalar(block, "client_template") ??
    pickYamlScalar(block, "client") ??
    extractFromGensparkLock(yamlText, "提案先");
  const trainingTitle =
    pickYamlScalar(block, "training_name") ??
    pickYamlScalar(block, "product") ??
    extractFromGensparkLock(yamlText, "研修名");

  const toneHints: string[] = [];
  const requiredBlock = block.match(/required:([\s\S]*?)forbidden:/i)?.[1];
  if (requiredBlock) {
    for (const line of requiredBlock.split("\n")) {
      const t = line.replace(/^\s*-\s*/, "").trim();
      if (t) toneHints.push(t);
    }
  }

  return {
    colors,
    formatType,
    slideCount: Number.isFinite(slideCount) ? slideCount : undefined,
    proposer,
    clientLabel,
    trainingTitle,
    toneHints,
    source: warnings.length ? "defaults" : "yaml",
    warnings,
  };
}

function extractFromGensparkLock(text: string, label: string): string | undefined {
  const re = new RegExp(`${label}[：:][^\\n*]*\\*\\*([^*]+)\\*\\*`);
  const m = text.match(re);
  return m?.[1]?.trim();
}

/** プロンプト全文から design_system ブロックを抜き出して解析 */
export function parseDesignSystemFromGenspark(gensparkText: string): ParsedDesignSystem {
  const fenced = gensparkText.match(/```yaml\n([\s\S]*?)```/);
  if (fenced?.[1]) {
    return parseDesignSystemYaml(fenced[1]);
  }

  const inline = gensparkText.match(
    /【デザイン制約（YAML）】[\s\S]*?\n(design_system:[\s\S]*?)(?=\n```|\n━━━━━━━━|$)/,
  );
  if (inline?.[1]) {
    return parseDesignSystemYaml(inline[1]);
  }

  return parseDesignSystemYaml("");
}

/** 表紙・見出しプレビュー用の短い文案 */
export function sampleSlideCopyFromGenspark(gensparkText: string, parsed: ParsedDesignSystem): {
  coverTitle: string;
  coverSub: string;
  contentHeading: string;
  contentLead: string;
} {
  const slide1 = gensparkText.match(/■スライド1[^\n]*\n([\s\S]*?)(?=■スライド|$)/);
  const slide2 = gensparkText.match(/■スライド2[^\n]*\n([\s\S]*?)(?=■スライド|$)/);

  const line = (block: string | undefined, prefix: string) =>
    block
      ?.split("\n")
      .map((l) => l.trim())
      .find((l) => l.startsWith(prefix))
      ?.replace(/^-\s*/, "")
      ?.replace(/^[^：:]*[：:]\s*/, "") ?? "";

  const coverTitle =
    line(slide1?.[1], "- タイトル") ||
    parsed.trainingTitle ||
    "研修デリバリー提案（サマリー）";
  const coverSub =
    line(slide1?.[1], "- サブ") ||
    `${parsed.clientLabel ?? "ご提案先"}向け · ${parsed.proposer ?? "株式会社ENロジカル"}`;
  const contentHeading = line(slide2?.[1], "- 見出し") || "① 今回の研修の対象者";
  const contentLead =
    line(slide2?.[1], "- リード") ||
    "見出し・リードは■固稿どおり。ビジネス調・図解多めのレイアウト想定。";

  return { coverTitle, coverSub, contentHeading, contentLead };
}
