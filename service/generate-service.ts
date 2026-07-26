import { isBlobUploadConfigured } from "./blob-config.js";
import Anthropic from "@anthropic-ai/sdk";
import { composeSlideBriefsWithLlm, composeWithLlm, extractStructured } from "./llm.js";
import { loadMasterTemplate } from "./templates.js";
import { buildReferenceContext, type ReferenceBundle } from "./reference-context.js";
import { loadPromptStudioCore } from "./load-core.js";
import { mergeSlideBriefs } from "./markdown-merge.js";
import { applyTuningToBody } from "./apply-tuning-b.js";
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

function resolveGensparkText(core: Awaited<ReturnType<typeof loadPromptStudioCore>>, markdown: string, masterTuned: string): string {
  const fromMd = core.extractGensparkText(markdown);
  if (fromMd.length >= 800) return fromMd;
  const fromMaster = core.extractGensparkText(masterTuned);
  return fromMaster.length > fromMd.length ? fromMaster : fromMd;
}

async function generateFormatB(
  core: Awaited<ReturnType<typeof loadPromptStudioCore>>,
  anthropic: Anthropic | null,
  structured: import("@prompt-studio/core").Extracted,
  tuning: TuningB,
  master: string,
  transcript: string,
  referenceContext: string,
  references?: ReferenceBundle,
): Promise<{ markdown: string; generationMode: "llm-slides" | "mock"; composeErrors: string[] }> {
  const composeErrors: string[] = [];
  let mergedMaster = master;
  let generationMode: "llm-slides" | "mock" = "mock";

  if (anthropic) {
    const slideCompose = await composeSlideBriefsWithLlm(
      anthropic,
      "B",
      structured,
      tuning,
      master,
      transcript,
      referenceContext,
    );
    if (slideCompose.error) composeErrors.push(`slides: ${slideCompose.error}`);

    if (slideCompose.briefs.includes("■")) {
      mergedMaster = mergeSlideBriefs(master, slideCompose.briefs);
      generationMode = "llm-slides";
    } else {
      composeErrors.push("slides: B標準■固稿テンプレを使用（LLM差し替えなし）");
    }
  }

  const masterTuned = applyTuningToBody(mergedMaster, tuning);
  const markdown = core.composeMarkdown("B", structured, tuning, masterTuned, references);

  if (!core.extractGensparkText(markdown) && masterTuned.length > 500) {
    composeErrors.push("genspark-text: ```text ブロックをマスターから復元");
  }

  return { markdown, generationMode, composeErrors };
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

  if (master.includes("テンプレ未同期") || master.length < 2000) {
    throw new Error("B標準テンプレが読み込めません。デプロイ設定（service/template-snapshots）を確認してください。");
  }

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

  if (formatId === "B") {
    const b = await generateFormatB(
      core,
      anthropic,
      structured,
      tuning,
      master,
      transcript ?? "",
      referenceContext,
      references,
    );
    markdown = b.markdown;
    generationMode = b.generationMode;
    composeErrors.push(...b.composeErrors);
  } else if (anthropic) {
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
      composeErrors.push("fallback: template compose with extracted fields");
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

  const gensparkText = resolveGensparkText(core, markdown, applyTuningToBody(master, tuning));

  if (gensparkText.length < 500) {
    throw new Error(
      "Genspark用テキスト（```text ブロック）を抽出できませんでした。B標準テンプレが破損している可能性があります。",
    );
  }

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
    blobUpload: isBlobUploadConfigured(),
    templatesLive: templatesLive(),
  };
}
