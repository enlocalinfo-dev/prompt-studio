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
import { EstimatePdfImportPanel } from "../components/EstimatePdfImportPanel";
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

  const appendSpeech = useCallback((chunk: string) => {
    setExtraNotes(chunk);
  }, []);

  const { supported, listening, error, start, stop } = useSpeechRecognition(appendSpeech);

  const effectiveTranscript = useMemo(
    () => buildTrainingBriefTranscript(brief, tuning, extraNotes, estimateSlideDetail),
    [brief, tuning, extraNotes, estimateSlideDetail],
  );

  async function handleGenerate() {
    if (!pdfLoaded && references.documents.length === 0) {
      push("先に見積PDFを読み込んでください");
      return;
    }
    setLoading(true);
    try {
      const result = await postGenerate({
        formatId: FORMAT_ID,
        transcript: effectiveTranscript,
        tuning,
        references,
      });
      const payload = {
        formatId: FORMAT_ID,
        transcript: effectiveTranscript,
        tuning,
        references,
        result: {
          markdown: result.markdown,
          gensparkText: result.gensparkText,
          folderNameSuggestion: result.folderNameSuggestion,
          usedLlm: result.usedLlm,
          structured: result.structured,
          segments: parseGensparkPrompt(result.markdown),
        },
      };
      saveSession(payload);
      push(
        result.generationMode === "llm-full" || result.generationMode === "llm-slides"
          ? "見積を反映したB標準プロンプトを生成しました"
          : "テンプレ合成で生成しました",
      );
      nav("/result", { replace: true, state: { session: payload } });
    } catch (e) {
      push(e instanceof Error ? e.message : "生成に失敗しました");
    } finally {
      setLoading(false);
    }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
      <Button variant="ghost" className="!px-0 !py-1" onClick={() => nav("/")}>
        ← 概要
      </Button>

      <EstimatePdfImportPanel
        brief={brief}
        tuning={tuning}
        onApplied={({ brief: b, tuning: t, document, slideDetail, notes }) => {
          setBrief(b);
          saveTrainingBrief(b);
          setTuning(t);
          saveTuningB(t);
          setEstimateSlideDetail(slideDetail ?? "");
          setPdfLoaded(true);
          setReferences((prev) => ({
            ...prev,
            documents: [document, ...prev.documents.filter((d) => d.name !== document.name)].slice(0, 5),
          }));
          if (notes?.trim()) setExtraNotes((prev) => (prev ? `${prev}\n${notes}` : notes));
        }}
      />

      <div className="mt-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-en-accent">Step 2 — 確認・生成</p>
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
          <Button className="mt-6 w-full !py-3.5" disabled={loading} onClick={handleGenerate}>
            {loading ? "生成中…" : "Genspark プロンプトを生成（8枚）"}
          </Button>
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
