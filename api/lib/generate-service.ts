import Anthropic from "@anthropic-ai/sdk";
import { composeSlideBriefsWithLlm, composeWithLlm, extractStructured } from "./llm.js";
import { loadMasterTemplate } from "./templates.js";
import { buildReferenceContext, type ReferenceBundle } from "./reference-context.js";
import { loadPromptStudioCore } from "./load-core.js";
import { mergeSlideBriefs } from "./markdown-merge.js";
import type { TuningB } from "@prompt-studio/core";

type FormatId = "B";

function getAnthropic(): Anthropic | null {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

function templatesLive(): boolean {
  if (process.env.VERCEL === "1") return false;
  return process.env.TEMPLATES_LIVE !== "false";
}

function applyTuningToBody(body: string, tuning: TuningB): string {
  let out = body;
  out = out.replace(/\*\*2026年7月24日\*\*/g, `**${tuning.documentDate}**`);
  out = out.replace(/\*\*2026年7月13日\*\*/g, `**${tuning.documentDate}**`);
  out = out.replace(/2026年7月24日/g, tuning.documentDate);
  out = out.replace(/2026年7月13日/g, tuning.documentDate);
  out = out.replace(/株式会社ネクストリンク商事様/g, tuning.clientName);
  if (tuning.projectTitle) {
    out = out.replace(/人事AX研修 共同開発のご提案/g, tuning.projectTitle);
  }
  return out;
}

export async function runGenerate(body: {
  formatId: FormatId;
  transcript: string;
  tuning: TuningB;
  references?: ReferenceBundle;
}) {
  const core = await loadPromptStudioCore();
  const { formatId, transcript, tuning, references } = body;
  const referenceContext = buildReferenceContext(references);
  const devLive = templatesLive();
  const anthropic = getAnthropic();
  const master = loadMasterTemplate(formatId, devLive);

  const extractResult = await extractStructured(
    anthropic,
    formatId,
    transcript ?? "",
    referenceContext,
  );
  const structured = extractResult.data;

  let generationMode: "llm-full" | "llm-slides" | "mock" = "mock";
  let composeErrors: string[] = [];
  if (extractResult.error) composeErrors.push(`extract: ${extractResult.error}`);

  let markdown = "";

  // B（8枚デリバリー）: 全文再執筆は重く 60s を超えやすいため ■固稿の差し替えのみ LLM 化
  if (anthropic) {
    const slideCompose = await composeSlideBriefsWithLlm(
      anthropic,
      formatId,
      structured,
      tuning,
      master,
      transcript ?? "",
      referenceContext,
    );
    if (slideCompose.error) composeErrors.push(`slides: ${slideCompose.error}`);

    if (slideCompose.briefs.length > 200) {
      const merged = applyTuningToBody(mergeSlideBriefs(master, slideCompose.briefs), tuning);
      markdown = core.composeMarkdown(formatId, structured, tuning, merged, references);
      generationMode = "llm-slides";
    }
  }

  if (!markdown.trim() && anthropic) {
    const fullCompose = await composeWithLlm(
      anthropic,
      formatId,
      structured,
      tuning,
      master,
      transcript ?? "",
      referenceContext,
    );
    if (fullCompose.error) composeErrors.push(`full: ${fullCompose.error}`);

    if (fullCompose.markdown.trim().length > 400) {
      markdown = fullCompose.markdown;
      generationMode = "llm-full";
    }
  }

  if (!markdown.trim()) {
    const fallbackBody = applyTuningToBody(
      core.composeMarkdown(formatId, structured, tuning, master, references),
      tuning,
    );
    if (fallbackBody.trim().length > 400) {
      markdown = fallbackBody;
      generationMode = "mock";
      composeErrors.push("llm-fallback: template compose with extracted fields");
    } else if (anthropic) {
      const hint = composeErrors.length ? composeErrors.join("; ") : "unknown";
      throw new Error(
        `プロンプト生成に失敗しました（${hint}）。しばらくして再試行するか、骨子を短くしてください。`,
      );
    } else {
      markdown = core.generateMock(
        { formatId, transcript: transcript ?? "", tuning, references },
        master,
      ).markdown;
      generationMode = "mock";
    }
  }

  const gensparkText = core.extractGensparkText(markdown);
  const title =
    tuning.projectTitle ||
    (structured.formatId === "B" ? structured.trainingName : "協業提案");

  return {
    structured,
    markdown,
    gensparkText,
    folderNameSuggestion: core.folderNameFromDate(tuning.documentDate, title),
    usedLlm: generationMode !== "mock",
    generationMode,
    composeErrors: composeErrors.length ? composeErrors : undefined,
    templatesLive: devLive,
  };
}

export function runHealth() {
  return {
    ok: true,
    llm: Boolean(process.env.ANTHROPIC_API_KEY),
    templatesLive: templatesLive(),
  };
}
