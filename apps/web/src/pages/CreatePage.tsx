import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import type { ReferenceBundle, TrainingDeliveryBrief, TuningB } from "@prompt-studio/core";
import {
  buildTrainingBriefTranscript,
  parseGensparkPrompt,
  referenceSummary,
} from "@prompt-studio/core";
import {
  EstimatePdfImportPanel,
  type InlinePromptResult,
  type PdfAppliedPayload,
  type PdfPhase,
} from "../components/EstimatePdfImportPanel";
import { FineTunePanel } from "../components/FineTunePanel";
import { GenerationProgressOverlay, type GenPhase } from "../components/GenerationProgressOverlay";
import { InlineAlert } from "../components/InlineAlert";
import { ReferenceMaterialsPanel, emptyReferences } from "../components/ReferenceMaterialsPanel";
import { RecentCasesList } from "../components/RecentCasesList";
import { ProposalFormatCards } from "../components/ProposalFormatCards";
import { StickyCopyBar } from "../components/StickyCopyBar";
import { TrainingDeliveryBriefForm } from "../components/TrainingDeliveryBriefForm";
import { useToast } from "../components/Toast";
import { Button } from "../components/ui/Button";
import { useSpeechRecognition } from "../hooks/useSpeechRecognition";
import { postGenerate } from "../lib/api";
import {
  findHistory,
  loadExtraNotes,
  loadHistory,
  loadSession,
  loadTrainingBrief,
  loadTuningB,
  pushHistory,
  saveExtraNotes,
  saveSession,
  saveTrainingBrief,
  saveTuningB,
} from "../lib/storage";
import { navigateToPromptDetail } from "../lib/promptNavigation";
import { loadPromptRuleOverrides } from "../lib/promptRuleStorage";

const FORMAT_ID = "B" as const;

type FieldErrors = Partial<Record<"clientName" | "documentDate" | "proposerName" | "pdf", string>>;

function validateTuning(tuning: TuningB, pdfLoaded: boolean, refsLen: number): FieldErrors {
  const err: FieldErrors = {};
  if (!pdfLoaded && refsLen === 0) err.pdf = "先に見積PDFを読み込んでください";
  if (!tuning.clientName?.trim()) err.clientName = "提案先を入力してください";
  if (!tuning.documentDate?.trim()) err.documentDate = "資料版日を入力してください";
  if (!tuning.proposerName?.trim()) err.proposerName = "提案元を入力してください";
  return err;
}

export function CreatePage() {
  const nav = useNavigate();
  const location = useLocation();
  const { formatId: formatParam } = useParams<{ formatId?: string }>();
  const { pushSuccess, pushError } = useToast();

  const formatSlug = formatParam?.toLowerCase();
  const showTrainingDeliveryFlow = formatSlug === "b";
  const history = loadHistory();

  const [extraNotes, setExtraNotes] = useState(() => loadExtraNotes());
  const [estimateSlideDetail, setEstimateSlideDetail] = useState("");
  const [brief, setBrief] = useState<TrainingDeliveryBrief>(() => loadTrainingBrief());
  const [references, setReferences] = useState<ReferenceBundle>(() => emptyReferences());
  const [tuning, setTuning] = useState<TuningB>(() => loadTuningB());
  const [loading, setLoading] = useState(false);
  const [pdfLoaded, setPdfLoaded] = useState(false);
  const [inlinePrompt, setInlinePrompt] = useState<InlinePromptResult | null>(null);
  const [pdfPhase, setPdfPhase] = useState<PdfPhase>("idle");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [step2Open, setStep2Open] = useState(false);
  const [bannerError, setBannerError] = useState<string | null>(null);

  const overlayPhase: GenPhase =
    pdfPhase === "parsing" ? "parsing" : pdfPhase === "generating" || loading ? "generating" : null;

  const formLocked = pdfPhase === "parsing" || pdfPhase === "generating" || loading;

  useEffect(() => {
    if (!showTrainingDeliveryFlow) return;
    const session = loadSession();
    const r = session?.result;
    if (!r?.markdown && !r?.gensparkText) return;
    const segments =
      r.segments?.length && r.segments.length > 0 ? r.segments : parseGensparkPrompt(r.markdown);
    setInlinePrompt({
      markdown: r.markdown,
      gensparkText: r.gensparkText,
      folderNameSuggestion: r.folderNameSuggestion,
      usedLlm: r.usedLlm,
      segments,
    });
    setPdfLoaded(true);
  }, [showTrainingDeliveryFlow]);

  useEffect(() => {
    const id = (location.state as { restoreHistoryId?: string } | null)?.restoreHistoryId;
    if (!id) return;
    const h = findHistory(id);
    if (!h) return;
    setBrief(h.brief);
    saveTrainingBrief(h.brief);
    setTuning(h.tuning);
    saveTuningB(h.tuning);
    setPdfLoaded(true);
    setStep2Open(true);
    if (h.result?.markdown || h.result?.gensparkText) {
      const segments =
        h.result.segments?.length && h.result.segments.length > 0
          ? h.result.segments
          : parseGensparkPrompt(h.result.markdown ?? "");
      setInlinePrompt({
        markdown: h.result.markdown ?? "",
        gensparkText: h.result.gensparkText,
        folderNameSuggestion: h.result.folderNameSuggestion,
        usedLlm: h.result.usedLlm,
        segments,
      });
    }
    window.history.replaceState({}, "", location.pathname);
  }, [location.pathname, location.state]);

  useEffect(() => {
    if (pdfLoaded || pdfPhase === "ready") setStep2Open(true);
  }, [pdfLoaded, pdfPhase]);

  const appendSpeech = useCallback((chunk: string) => {
    setExtraNotes((prev) => {
      const next = prev ? `${prev}\n${chunk}` : chunk;
      saveExtraNotes(next);
      return next;
    });
  }, []);

  const setExtraNotesPersisted = useCallback((v: string) => {
    setExtraNotes(v);
    saveExtraNotes(v);
  }, []);

  const { supported, listening, error, start, stop } = useSpeechRecognition(appendSpeech);

  const runGenerate = useCallback(
    async (input: {
      brief: TrainingDeliveryBrief;
      tuning: TuningB;
      extraNotes: string;
      estimateSlideDetail: string;
      references: ReferenceBundle;
      openResultPage?: boolean;
    }): Promise<InlinePromptResult> => {
      const transcript = buildTrainingBriefTranscript(
        input.brief,
        input.tuning,
        input.extraNotes,
        input.estimateSlideDetail,
      );
      const result = await postGenerate({
        formatId: FORMAT_ID,
        transcript,
        tuning: input.tuning,
        references: input.references,
        ruleOverrides: loadPromptRuleOverrides(),
      });
      const inline: InlinePromptResult = {
        markdown: result.markdown,
        gensparkText: result.gensparkText,
        folderNameSuggestion: result.folderNameSuggestion,
        usedLlm: result.usedLlm,
        segments: parseGensparkPrompt(result.markdown),
      };
      const payload = {
        formatId: FORMAT_ID,
        transcript,
        tuning: input.tuning,
        references: input.references,
        result: {
          ...inline,
          structured: result.structured,
        },
      };
      saveSession(payload);
      pushHistory({
        clientName: input.tuning.clientName,
        projectTitle: input.tuning.projectTitle,
        documentDate: input.tuning.documentDate,
        brief: input.brief,
        tuning: input.tuning,
        gensparkPreview: inline.gensparkText.slice(0, 120),
        result: {
          markdown: inline.markdown,
          gensparkText: inline.gensparkText,
          folderNameSuggestion: inline.folderNameSuggestion,
          usedLlm: inline.usedLlm,
          segments: inline.segments,
        },
      });
      setInlinePrompt(inline);
      if (input.openResultPage) {
        nav("/prompt", { replace: true, state: { session: payload } });
      }
      return inline;
    },
    [nav],
  );

  const handlePdfApplied = useCallback((payload: PdfAppliedPayload) => {
    setBrief(payload.brief);
    saveTrainingBrief(payload.brief);
    setTuning(payload.tuning);
    saveTuningB(payload.tuning);
    setEstimateSlideDetail(payload.slideDetail ?? "");
    setPdfLoaded(true);
    setFieldErrors({});
    setBannerError(null);
    setReferences((prev) => ({
      ...prev,
      documents: [payload.document, ...prev.documents.filter((d) => d.name !== payload.document.name)].slice(0, 5),
    }));
    if (payload.notes?.trim()) {
      setExtraNotes((prev) => {
        const next = prev ? `${prev}\n${payload.notes}` : payload.notes!;
        saveExtraNotes(next);
        return next;
      });
    }
  }, []);

  const handleAutoGenerateFromPdf = useCallback(
    async (payload: PdfAppliedPayload) => {
      const mergedNotes = payload.notes?.trim() ? payload.notes : extraNotes;
      const refs: ReferenceBundle = {
        documents: [payload.document],
        urls: references.urls,
      };
      return runGenerate({
        brief: payload.brief,
        tuning: payload.tuning,
        extraNotes: mergedNotes,
        estimateSlideDetail: payload.slideDetail ?? "",
        references: refs,
        openResultPage: true,
      });
    },
    [extraNotes, references.urls, runGenerate],
  );

  async function handleRegenerate() {
    const errs = validateTuning(tuning, pdfLoaded, references.documents.length);
    setFieldErrors(errs);
    if (Object.keys(errs).length > 0) {
      const first = errs.pdf ?? errs.clientName ?? errs.documentDate ?? errs.proposerName;
      pushError(first ?? "入力を確認してください");
      return;
    }
    setLoading(true);
    setBannerError(null);
    try {
      await runGenerate({
        brief,
        tuning,
        extraNotes,
        estimateSlideDetail,
        references,
        openResultPage: false,
      });
      pushSuccess("内容を反映して再作成しました");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "作成に失敗しました";
      setBannerError(msg);
      pushError(msg);
    } finally {
      setLoading(false);
    }
  }

  async function copyGenspark() {
    if (!inlinePrompt) return;
    try {
      await navigator.clipboard.writeText(inlinePrompt.gensparkText || inlinePrompt.markdown);
      pushSuccess("コピーしました。Genspark に貼り付けてください。");
    } catch {
      pushError("コピーできませんでした。ブラウザの権限を確認してください。");
    }
  }

  function downloadMd() {
    if (!inlinePrompt) return;
    const blob = new Blob([inlinePrompt.markdown], { type: "text/markdown;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "genspark_prompt.md";
    a.click();
    URL.revokeObjectURL(a.href);
    pushSuccess("ファイルを保存しました");
  }

  const showSticky = Boolean(inlinePrompt?.gensparkText || inlinePrompt?.markdown);

  if (!showTrainingDeliveryFlow) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        <Button variant="ghost" className="!px-0 !py-1" onClick={() => nav("/")}>
          ← トップ
        </Button>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight">作成する資料を選ぶ</h1>
        <p className="mt-2 max-w-xl text-sm text-en-muted">
          カードを選ぶと、見積PDFをドロップする画面に進みます。
        </p>
        <div className="mt-8">
          <ProposalFormatCards compact />
        </div>
        <p className="mt-6 text-center text-sm">
          <Link to="/rules" className="text-en-primary-bright hover:underline">
            先にプロンプトルール（8枚のロジック・YAML）を確認・編集する
          </Link>
        </p>
        <RecentCasesList items={history} className="mt-10" />
      </motion.div>
    );
  }

  return (
    <>
      <GenerationProgressOverlay phase={overlayPhase} />
      <StickyCopyBar visible={showSticky} onCopy={() => void copyGenspark()} onDownload={downloadMd} busy={loading} />

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className={showSticky ? "pb-28" : ""}
      >
        <Button variant="ghost" className="!px-0 !py-1" onClick={() => nav("/")}>
          ← トップ
        </Button>

        <div className="mt-2 flex flex-wrap items-baseline gap-2">
          <h1 className="text-xl font-semibold text-en-text md:text-2xl">研修の提案書</h1>
          <span className="rounded-md bg-en-primary/15 px-2 py-0.5 text-[10px] font-semibold text-en-primary-bright">
            見積PDF → 全8枚
          </span>
        </div>

        {bannerError && (
          <div className="mt-4">
            <InlineAlert
              tone="error"
              title="作成に失敗しました"
              message={bannerError}
              action={
                <Button variant="secondary" className="!py-1.5 !text-xs" onClick={() => void handleRegenerate()}>
                  再試行
                </Button>
              }
              onDismiss={() => setBannerError(null)}
            />
          </div>
        )}

        <EstimatePdfImportPanel
          brief={brief}
          tuning={tuning}
          promptResult={inlinePrompt}
          onApplied={handlePdfApplied}
          onAutoGenerate={handleAutoGenerateFromPdf}
          onPhaseChange={setPdfPhase}
          onOpenPromptDetail={() => navigateToPromptDetail(nav)}
        />

        {!pdfLoaded && pdfPhase === "idle" && (
          <p className="mt-4 text-sm text-en-muted">PDFを読み込むと、内容の確認・修正ができるようになります。</p>
        )}

        {(pdfLoaded || step2Open) && (
          <div className="mt-8">
            <button
              type="button"
              onClick={() => setStep2Open((o) => !o)}
              className="flex w-full items-center justify-between rounded-xl border border-en-border bg-white/[0.02] px-4 py-3 text-left"
            >
              <span>
                <span className="text-xs font-semibold text-en-accent">ステップ 2</span>
                <span className="ml-2 text-sm font-semibold text-en-text">内容を確認・修正する</span>
              </span>
              <span className="text-xs text-en-muted">{step2Open ? "閉じる" : "開く"}</span>
            </button>

            <AnimatePresence>
              {step2Open && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
                    <div className={`glass-panel rounded-2xl p-5 md:p-6 ${formLocked ? "pointer-events-none opacity-60" : ""}`}>
                      {fieldErrors.pdf && (
                        <div className="mb-4">
                          <InlineAlert tone="error" title={fieldErrors.pdf} />
                        </div>
                      )}
                      <div className="mb-4 flex flex-wrap items-center gap-3">
                        {supported && (
                          <Button variant={listening ? "secondary" : "primary"} onClick={listening ? stop : start}>
                            {listening ? "音声入力を停止" : "音声でメモ"}
                          </Button>
                        )}
                      </div>
                      {error && <p className="mb-4 text-xs text-en-accent-strong">{error}</p>}
                      <TrainingDeliveryBriefForm
                        brief={brief}
                        tuning={tuning}
                        onBriefChange={setBrief}
                        extraNotes={extraNotes}
                        onExtraNotesChange={setExtraNotesPersisted}
                        disabled={formLocked}
                      />
                      <div className="mt-6 flex flex-col gap-2 sm:flex-row">
                        <Button className="flex-1 !py-3.5" disabled={loading || formLocked} onClick={() => void handleRegenerate()}>
                          {loading ? "作成中…" : "修正を反映して再作成"}
                        </Button>
                        <Button
                          variant="secondary"
                          className="flex-1 !py-3.5"
                          disabled={!inlinePrompt}
                          onClick={() => navigateToPromptDetail(nav)}
                        >
                          プロンプト詳細を見る
                        </Button>
                      </div>
                    </div>
                    <FineTunePanel
                      tuning={tuning}
                      onChange={setTuning}
                      disabled={formLocked}
                      fieldErrors={fieldErrors}
                    />
                  </div>

                  <ReferenceMaterialsPanel value={references} onChange={setReferences} />
                  {referenceSummary(references) && (
                    <p className="mt-3 text-center text-xs text-en-muted">{referenceSummary(references)}</p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        <RecentCasesList items={history} className="mt-10" />
      </motion.div>
    </>
  );
}
