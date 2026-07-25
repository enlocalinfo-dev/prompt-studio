import { useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import type { ReferenceBundle, TrainingDeliveryBrief, TuningB } from "@prompt-studio/core";
import {
  DELIVERY_B_FORMAT,
  buildTrainingBriefTranscript,
  parseGensparkPrompt,
  referenceSummary,
} from "@prompt-studio/core";
import {
  EstimatePdfImportPanel,
  type InlinePromptResult,
  type PdfAppliedPayload,
} from "../components/EstimatePdfImportPanel";
import { FineTunePanel } from "../components/FineTunePanel";
import { ReferenceMaterialsPanel, emptyReferences } from "../components/ReferenceMaterialsPanel";
import { TrainingDeliveryBriefForm } from "../components/TrainingDeliveryBriefForm";
import { useToast } from "../components/Toast";
import { Button } from "../components/ui/Button";
import { useSpeechRecognition } from "../hooks/useSpeechRecognition";
import { postGenerate } from "../lib/api";
import { loadTrainingBrief, loadTuningB, saveSession, saveTrainingBrief, saveTuningB } from "../lib/storage";

const FORMAT_ID = "B" as const;

export function CreatePage() {
  const nav = useNavigate();
  const { push } = useToast();

  const [extraNotes, setExtraNotes] = useState("");
  const [estimateSlideDetail, setEstimateSlideDetail] = useState("");
  const [brief, setBrief] = useState<TrainingDeliveryBrief>(() => loadTrainingBrief());
  const [references, setReferences] = useState<ReferenceBundle>(() => emptyReferences());
  const [tuning, setTuning] = useState<TuningB>(() => loadTuningB());
  const [loading, setLoading] = useState(false);
  const [pdfLoaded, setPdfLoaded] = useState(false);
  const [inlinePrompt, setInlinePrompt] = useState<InlinePromptResult | null>(null);

  const appendSpeech = useCallback((chunk: string) => {
    setExtraNotes(chunk);
  }, []);

  const { supported, listening, error, start, stop } = useSpeechRecognition(appendSpeech);

  const effectiveTranscript = useMemo(
    () => buildTrainingBriefTranscript(brief, tuning, extraNotes, estimateSlideDetail),
    [brief, tuning, extraNotes, estimateSlideDetail],
  );

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
      setInlinePrompt(inline);
      if (input.openResultPage) {
        nav("/result", { replace: true, state: { session: payload } });
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
    setReferences((prev) => ({
      ...prev,
      documents: [payload.document, ...prev.documents.filter((d) => d.name !== payload.document.name)].slice(0, 5),
    }));
    if (payload.notes?.trim()) {
      setExtraNotes((prev) => (prev ? `${prev}\n${payload.notes}` : payload.notes!));
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
        openResultPage: false,
      });
    },
    [extraNotes, references.urls, runGenerate],
  );

  async function handleRegenerate() {
    if (!pdfLoaded && references.documents.length === 0) {
      push("先に見積PDFを読み込んでください");
      return;
    }
    setLoading(true);
    try {
      await runGenerate({
        brief,
        tuning,
        extraNotes,
        estimateSlideDetail,
        references,
        openResultPage: false,
      });
      push("プロンプトを再生成しました（Step 1 の表示も更新されています）");
    } catch (e) {
      push(e instanceof Error ? e.message : "生成に失敗しました");
    } finally {
      setLoading(false);
    }
  }

  function openFullResultPage() {
    if (!inlinePrompt) {
      push("先にPDFから生成するか、再生成してください");
      return;
    }
    nav("/result");
  }

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
      <Button variant="ghost" className="!px-0 !py-1" onClick={() => nav("/")}>
        ← 概要
      </Button>

      <EstimatePdfImportPanel
        brief={brief}
        tuning={tuning}
        promptResult={inlinePrompt}
        onApplied={handlePdfApplied}
        onAutoGenerate={handleAutoGenerateFromPdf}
      />

      <div className="mt-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-en-accent">Step 2 — 骨子の確認・再生成</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight md:text-3xl">{DELIVERY_B_FORMAT.label}</h1>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="glass-panel rounded-2xl p-5 md:p-6">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            {supported && (
              <Button variant={listening ? "secondary" : "primary"} onClick={listening ? stop : start}>
                {listening ? "停止" : "音声メモ"}
              </Button>
            )}
          </div>
          {error && <p className="mb-4 text-xs text-en-accent-strong">{error}</p>}
          <TrainingDeliveryBriefForm
            brief={brief}
            tuning={tuning}
            onBriefChange={setBrief}
            extraNotes={extraNotes}
            onExtraNotesChange={setExtraNotes}
          />
          <div className="mt-6 flex flex-col gap-2 sm:flex-row">
            <Button className="flex-1 !py-3.5" disabled={loading} onClick={handleRegenerate}>
              {loading ? "再生成中…" : "骨子を直して再生成"}
            </Button>
            <Button variant="secondary" className="flex-1 !py-3.5" disabled={!inlinePrompt} onClick={openFullResultPage}>
              結果を全画面で開く
            </Button>
          </div>
        </div>
        <FineTunePanel tuning={tuning} onChange={setTuning} />
      </div>

      <ReferenceMaterialsPanel value={references} onChange={setReferences} />

      {referenceSummary(references) && (
        <p className="mt-3 text-center text-[11px] text-en-muted">{referenceSummary(references)}</p>
      )}
    </motion.div>
  );
}
