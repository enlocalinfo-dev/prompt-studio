import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import type { FormatId, ReferenceBundle, TrainingDeliveryBrief, Tuning } from "@prompt-studio/core";
import {
  FORMATS,
  buildTrainingBriefTranscript,
  isTuningA,
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
import { loadTrainingBrief, loadTuning, saveSession } from "../lib/storage";

const ease = [0.22, 1, 0.36, 1] as const;

export function CreatePage() {
  const { formatId } = useParams<{ formatId: FormatId }>();
  const nav = useNavigate();
  const { push } = useToast();
  const id = formatId === "A" || formatId === "B" ? formatId : "A";
  const isB = id === "B";

  const [transcript, setTranscript] = useState("");
  const [brief, setBrief] = useState<TrainingDeliveryBrief>(() => loadTrainingBrief());
  const [references, setReferences] = useState<ReferenceBundle>(() => emptyReferences());
  const [tuning, setTuning] = useState<Tuning>(() => loadTuning(id));
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setTuning(loadTuning(id));
    if (id === "B") {
      setBrief(loadTrainingBrief());
    }
  }, [id]);

  const appendSpeech = useCallback(
    (chunk: string) => {
      setTranscript(chunk);
    },
    [],
  );

  const { supported, listening, error, start, stop } = useSpeechRecognition(appendSpeech);
  const meta = FORMATS[id];

  const effectiveTranscript = useMemo(() => {
    if (!isB || isTuningA(tuning)) {
      return transcript;
    }
    return buildTrainingBriefTranscript(brief, tuning, transcript);
  }, [brief, isB, tuning, transcript]);

  async function handleGenerate() {
    setLoading(true);
    try {
      const result = await postGenerate({
        formatId: id,
        transcript: effectiveTranscript,
        tuning,
        references,
      });
      const payload = {
        formatId: id,
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
        result.generationMode === "llm-full"
          ? "議事録を反映したプロンプトを生成しました"
          : result.generationMode === "llm-slides"
            ? "スライド固稿を議事録から生成しました"
            : result.usedLlm
              ? "Claude で生成しました"
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
        ← ホーム
      </Button>

      <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-en-accent">Step 1 — 入力</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight md:text-3xl">{meta.label}</h1>
          <p className="mt-1 text-sm text-en-muted">{meta.slideCountHint}</p>
        </div>
        <div className="flex gap-2 text-[11px] text-en-muted">
          <span className="rounded-full border border-en-border px-2.5 py-1">要望</span>
          <span className="rounded-full border border-en-border px-2.5 py-1 opacity-50">生成</span>
          <span className="rounded-full border border-en-border px-2.5 py-1 opacity-50">出力</span>
        </div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_340px]">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05, duration: 0.35, ease }}
          className="glass-panel rounded-2xl p-5 md:p-6"
        >
          {isB && !isTuningA(tuning) ? (
            <>
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
                extraNotes={transcript}
                onExtraNotesChange={setTranscript}
              />
            </>
          ) : (
            <>
              <h2 className="text-sm font-semibold text-en-text">要望（音声 / テキスト）</h2>
              <p className="mt-1 text-xs leading-relaxed text-en-muted">
                対象者・内容・日程・ROI など。話したあとテキストで直せます。
              </p>

              <div className="mt-5 flex flex-wrap items-center gap-3">
                {supported ? (
                  <Button variant={listening ? "secondary" : "primary"} onClick={listening ? stop : start}>
                    {listening ? "停止" : "音声入力"}
                  </Button>
                ) : (
                  <span className="text-xs text-en-muted">音声非対応 — テキスト入力</span>
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
              {error && <p className="mt-2 text-xs font-medium text-en-accent-strong">{error}</p>}

              <textarea
                className="input-en mt-4 min-h-[260px] resize-y leading-relaxed"
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                placeholder="例：協業先・枚数・読み手・未確定事項…"
              />
            </>
          )}

          <Button className="mt-6 w-full !py-3.5" disabled={loading} onClick={handleGenerate}>
            {loading ? "生成中…" : "プロンプトを生成"}
          </Button>
        </motion.div>

        <FineTunePanel formatId={id} tuning={tuning} onChange={setTuning} />
      </div>

      <ReferenceMaterialsPanel value={references} onChange={setReferences} />

      {referenceSummary(references) && (
        <p className="mt-3 text-center text-[11px] text-en-muted">{referenceSummary(references)}</p>
      )}
    </motion.div>
  );
}
