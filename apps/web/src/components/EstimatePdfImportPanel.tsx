import type { PromptSegment, ReferenceDocument, TrainingDeliveryBrief, TuningB } from "@prompt-studio/core";
import { mergeExpandedIntoBrief } from "@prompt-studio/core";
import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import { postExpandBriefFromPdf } from "../lib/api";
import { extractTextFromPdf } from "../lib/pdfExtract";
import { PromptWorkspace } from "./PromptWorkspace";
import { InlineAlert } from "./InlineAlert";
import { useToast } from "./Toast";
import { Button } from "./ui/Button";

async function fileToBase64(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  let binary = "";
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]!);
  return btoa(binary);
}

export type PdfAppliedPayload = {
  brief: TrainingDeliveryBrief;
  tuning: TuningB;
  document: ReferenceDocument;
  slideDetail?: string;
  notes?: string;
};

export type InlinePromptResult = {
  markdown: string;
  gensparkText: string;
  folderNameSuggestion: string;
  usedLlm: boolean;
  segments: PromptSegment[];
};

export type PdfPhase = "idle" | "parsing" | "generating" | "ready" | "error";

interface Props {
  brief: TrainingDeliveryBrief;
  tuning: TuningB;
  promptResult: InlinePromptResult | null;
  onApplied: (payload: PdfAppliedPayload) => void;
  onAutoGenerate: (payload: PdfAppliedPayload) => Promise<InlinePromptResult>;
  onPhaseChange?: (phase: PdfPhase) => void;
}

export function EstimatePdfImportPanel({
  brief,
  tuning,
  promptResult,
  onApplied,
  onAutoGenerate,
  onPhaseChange,
}: Props) {
  const { pushSuccess, pushError } = useToast();
  const [phase, setPhaseState] = useState<PdfPhase>("idle");
  const setPhase = useCallback(
    (p: PdfPhase) => {
      setPhaseState(p);
      onPhaseChange?.(p);
    },
    [onPhaseChange],
  );
  const [dragOver, setDragOver] = useState(false);
  const [lastFile, setLastFile] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const dragDepth = useRef(0);

  const busy = phase === "parsing" || phase === "generating";

  const ingest = useCallback(
    async (file: File) => {
      if (!file.name.toLowerCase().endsWith(".pdf")) {
        pushError("見積PDF（.pdf）を選んでください");
        return;
      }
      setErrorMessage(null);
      setPhase("parsing");
      try {
        let extractedText = "";
        try {
          extractedText = await extractTextFromPdf(file);
        } catch {
          extractedText = "";
        }

        const pdfBase64 = await fileToBase64(file);
        const { expanded, usedLlm } = await postExpandBriefFromPdf({
          fileName: file.name,
          extractedText,
          pdfBase64,
        });

        const nextBrief = mergeExpandedIntoBrief(brief, expanded.brief ?? {});
        const nextTuning: TuningB = {
          ...tuning,
          clientName: expanded.tuning?.clientName?.trim() || tuning.clientName,
          projectTitle: expanded.tuning?.projectTitle?.trim() || tuning.projectTitle,
          documentDate: expanded.tuning?.documentDate?.trim() || tuning.documentDate,
        };

        const doc: ReferenceDocument = {
          name: file.name,
          text: extractedText || `（${file.name} — サーバーでPDFを解釈）`,
          kind: "pdf",
        };

        const applied: PdfAppliedPayload = {
          brief: nextBrief,
          tuning: nextTuning,
          document: doc,
          slideDetail: expanded.trainingDetailForSlides,
          notes: expanded.notes,
        };

        onApplied(applied);
        setLastFile(file.name);

        if (!usedLlm) {
          pushSuccess("PDFを読み込みました。内容を確認してください。");
        }

        setPhase("generating");
        await onAutoGenerate(applied);
        setPhase("ready");
        pushSuccess("提案用プロンプトが完成しました。下の「コピー」から Genspark へ進めます。");
      } catch (e) {
        const msg = e instanceof Error ? e.message : "処理に失敗しました";
        setErrorMessage(msg);
        setPhase("error");
        pushError(msg);
      } finally {
        if (fileRef.current) fileRef.current.value = "";
      }
    },
    [brief, onApplied, onAutoGenerate, pushError, pushSuccess, setPhase, tuning],
  );

  useEffect(() => {
    onPhaseChange?.(phase);
  }, [onPhaseChange, phase]);

  const showWorkspace = phase === "ready" && promptResult && promptResult.segments.length > 0;

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-panel rounded-2xl p-5 md:p-6"
    >
      <p className="text-xs font-semibold text-en-accent">ステップ 1</p>
      <h2 className="mt-1 text-lg font-semibold text-en-text">見積PDFを選ぶ</h2>
      <p className="mt-2 text-sm leading-relaxed text-en-muted">
        ENロジカル形式の見積PDFから、提案先・研修内容・費用を読み取り、スライド8枚分の指示文を自動作成します。
      </p>

      {phase === "error" && errorMessage && (
        <div className="mt-4">
          <InlineAlert
            tone="error"
            title="処理できませんでした"
            message={errorMessage}
            action={
              <Button variant="secondary" className="!py-1.5 !text-xs" onClick={() => fileRef.current?.click()}>
                別のPDFを選ぶ
              </Button>
            }
            onDismiss={() => {
              setPhase("idle");
              setErrorMessage(null);
            }}
          />
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="application/pdf,.pdf"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void ingest(f);
        }}
      />

      <motion.div
        role="button"
        tabIndex={0}
        aria-label="見積PDFをアップロード"
        onClick={() => !busy && fileRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") fileRef.current?.click();
        }}
        onDragEnter={(e) => {
          e.preventDefault();
          dragDepth.current += 1;
          setDragOver(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          dragDepth.current -= 1;
          if (dragDepth.current <= 0) setDragOver(false);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = "copy";
        }}
        onDrop={(e) => {
          e.preventDefault();
          dragDepth.current = 0;
          setDragOver(false);
          const f = e.dataTransfer.files?.[0];
          if (f) void ingest(f);
        }}
        className={`mt-4 cursor-pointer rounded-2xl border-2 border-dashed px-4 py-10 text-center transition-colors ${
          dragOver ? "border-en-primary/60 bg-en-primary/10" : "border-en-border bg-en-deep/35 hover:border-en-primary/35"
        } ${busy ? "pointer-events-none opacity-70" : ""}`}
      >
        {(phase === "idle" || phase === "ready") && (
          <>
            <p className="text-sm font-medium text-en-text">
              {lastFile ? `選択中: ${lastFile}` : "PDFをドロップ、またはクリックして選択"}
            </p>
            <p className="mt-2 text-xs text-en-muted">
              {lastFile ? "クリックで別のPDFに差し替えられます" : "10MBまで · PDF 1ファイル"}
            </p>
            {phase === "ready" && promptResult && (
              <p className="mt-3 text-xs text-en-primary-bright">作成完了 · {promptResult.folderNameSuggestion}</p>
            )}
          </>
        )}
        {(phase === "parsing" || phase === "generating") && (
          <p className="text-sm font-medium text-en-accent">処理中です。画面全体の進行表示をご確認ください。</p>
        )}
      </motion.div>

      <Button variant="secondary" className="mt-3" disabled={busy} onClick={() => fileRef.current?.click()}>
        {lastFile ? "PDFを差し替え" : "PDFを選ぶ"}
      </Button>

      <AnimatePresence>
        {showWorkspace && promptResult && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.35 }}
            className="mt-6 overflow-hidden border-t border-en-border pt-6"
          >
            <p className="text-xs font-semibold text-en-text">内容のプレビュー</p>
            <p className="mt-1 text-xs text-en-muted">問題なければ、画面下の「貼り付け用の文をコピー」を押してください。</p>
            <div className="mt-4">
              <PromptWorkspace
                segments={promptResult.segments}
                gensparkText={promptResult.gensparkText || promptResult.markdown}
                onCopySegment={async (text) => {
                  await navigator.clipboard.writeText(text);
                  pushSuccess("コピーしました");
                }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  );
}
