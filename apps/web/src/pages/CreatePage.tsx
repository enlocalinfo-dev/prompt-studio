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
import { FineTunePanel } from "../components/FineTunePanel";
import {
  ReferenceMaterialsPanel,
  emptyReferences,
} from "../components/ReferenceMaterialsPanel";
import { TrainingDeliveryBriefForm } from "../components/TrainingDeliveryBriefForm";
import { useToast } from "../components/Toast";
import { Button } from "../components/ui/Button";
import { useSpeechRecognition } from "../hooks/useSpeechRecognition";
import { postGenerate } from "../lib/api";
import { loadTrainingBrief, loadTuningB, saveSession } from "../lib/storage";

const FORMAT_ID = "B" as const;
const ease = [0.22, 1, 0.36, 1] as const;

export function CreatePage() {
  const nav = useNavigate();
  const { push } = useToast();

  const [extraNotes, setExtraNotes] = useState("");
  const [brief, setBrief] = useState<TrainingDeliveryBrief>(() => loadTrainingBrief());
  const [references, setReferences] = useState<ReferenceBundle>(() => emptyReferences());
  const [tuning, setTuning] = useState<TuningB>(() => loadTuningB());
  const [loading, setLoading] = useState(false);

  const appendSpeech = useCallback((chunk: string) => {
    setExtraNotes(chunk);
  }, []);

  const { supported, listening, error, start, stop } = useSpeechRecognition(appendSpeech);

  const effectiveTranscript = useMemo(
    () => buildTrainingBriefTranscript(brief, tuning, extraNotes),
    [brief, tuning, extraNotes],
  );

  async function handleGenerate() {
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
          ? "B標準プロンプトを生成しました"
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
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease }}>
      <Button variant="ghost" className="!px-0 !py-1" onClick={() => nav("/")}>
        ← 概要・入力一覧
      </Button>

      <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-en-accent">Step 1 — 骨子入力</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight md:text-3xl">{DELIVERY_B_FORMAT.label}</h1>
          <p className="mt-1 text-sm text-en-muted">全{DELIVERY_B_FORMAT.slideCount}枚 · ①〜⑤＋実質負担</p>
        </div>
        <div className="flex gap-2 text-[11px] text-en-muted">
          <span className="rounded-full border border-en-border px-2.5 py-1">骨子</span>
          <span className="rounded-full border border-en-border px-2.5 py-1 opacity-50">生成</span>
          <span className="rounded-full border border-en-border px-2.5 py-1 opacity-50">確認</span>
        </div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_340px]">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05, duration: 0.35, ease }}
          className="glass-panel rounded-2xl p-5 md:p-6"
        >
          <div className="mb-5 flex flex-wrap items-center gap-3">
            {supported ? (
              <Button variant={listening ? "secondary" : "primary"} onClick={listening ? stop : start}>
                {listening ? "停止" : "音声で追加メモ"}
              </Button>
            ) : (
              <span className="text-xs text-en-muted">音声非対応</span>
            )}
            {listening && (
              <motion.span
                animate={{ opacity: [0.4, 1, 0.4] }}
                transition={{ duration: 1.2, repeat: Infinity }}
                className="text-xs font-medium text-en-accent"
              >
                聞き取り中…
              </motion.span>
            )}
          </div>
          {error && <p className="mb-4 text-xs font-medium text-en-accent-strong">{error}</p>}
          <TrainingDeliveryBriefForm
            brief={brief}
            tuning={tuning}
            onBriefChange={setBrief}
            extraNotes={extraNotes}
            onExtraNotesChange={setExtraNotes}
          />

          <Button className="mt-6 w-full !py-3.5" disabled={loading} onClick={handleGenerate}>
            {loading ? "生成中…" : "Genspark プロンプトを生成"}
          </Button>
        </motion.div>

        <FineTunePanel tuning={tuning} onChange={setTuning} />
      </div>

      <ReferenceMaterialsPanel value={references} onChange={setReferences} />

      {referenceSummary(references) && (
        <p className="mt-3 text-center text-[11px] text-en-muted">{referenceSummary(references)}</p>
      )}
    </motion.div>
  );
}
