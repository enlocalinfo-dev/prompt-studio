import Anthropic from "@anthropic-ai/sdk";
import { composeWithLlm, extractStructured } from "./llm.js";
import { loadMasterTemplate } from "./templates.js";
import { buildReferenceContext, type ReferenceBundle } from "./reference-context.js";
import { loadPromptStudioCore } from "./load-core.js";

type FormatId = "A" | "B";

interface Tuning {
  clientName: string;
  documentDate: string;
  proposerName: string;
  projectTitle: string;
  slideCount?: number;
  netCostSlide?: boolean;
  illustrationEmphasis?: boolean;
  density15x?: boolean;
  sectionDividers?: boolean;
  audience?: string;
}

function getAnthropic(): Anthropic | null {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

function templatesLive(): boolean {
  if (process.env.VERCEL === "1") return false;
  return process.env.TEMPLATES_LIVE !== "false";
}

export async function runGenerate(body: {
  formatId: FormatId;
  transcript: string;
  tuning: Tuning;
  references?: ReferenceBundle;
}) {
  const core = await loadPromptStudioCore();
  const { formatId, transcript, tuning, references } = body;
  const referenceContext = buildReferenceContext(references);
  const devLive = templatesLive();
  const anthropic = getAnthropic();
  const master = loadMasterTemplate(formatId, devLive);

  const structured = await extractStructured(
    anthropic,
    formatId,
    transcript ?? "",
    referenceContext,
  );

  const llmMd = await composeWithLlm(
    anthropic,
    formatId,
    structured,
    tuning,
    master,
    referenceContext,
  );

  let markdown: string;
  if (llmMd.trim().length > 200) {
    markdown = llmMd;
  } else {
    markdown = core.generateMock(
      { formatId, transcript: transcript ?? "", tuning, references },
      master,
    ).markdown;
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
    usedLlm: Boolean(anthropic),
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
