import type { PromptSegment, ReferenceDocument, TrainingDeliveryBrief, TuningB } from "@prompt-studio/core";
import { mergeExpandedIntoBrief } from "@prompt-studio/core";
import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useRef, useState } from "react";
import { postExpandBriefFromPdf } from "../lib/api";
import { extractTextFromPdf } from "../lib/pdfExtract";
import { PromptWorkspace } from "./PromptWorkspace";
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

type Phase = "idle" | "parsing" | "generating" | "ready" | "error";

interface Props {
  brief: TrainingDeliveryBrief;
  tuning: TuningB;
  promptResult: InlinePromptResult | null;
  onApplied: (payload: PdfAppliedPayload) => void;
  onAutoGenerate: (payload: PdfAppliedPayload) => Promise<InlinePromptResult>;
}

export function EstimatePdfImportPanel({
  brief,
  tuning,
  promptResult,
  onApplied,
  onAutoGenerate,
}: Props) {
  const { push } = useToast();
  const [phase, setPhase] = useState<Phase>("idle");
  const [dragOver, setDragOver] = useState(false);
  const [lastFile, setLastFile] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const dragDepth = useRef(0);

  const busy = phase === "parsing" || phase === "generating";

  const ingest = useCallback(
    async (file: File) => {
      if (!file.name.toLowerCase().endsWith(".pdf")) {
        push("見積PDF（.pdf）を選んでください");
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
          text: extractedText || `（${file.name} — PDFをClaudeで解釈）`,
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

        push(
          usedLlm
            ? "見積を反映しました。プロンプトを生成しています…"
            : "PDFを読み込みました。プロンプトを生成しています…",
        );

        setPhase("generating");
        await onAutoGenerate(applied);
        setPhase("ready");
        push("Genspark プロンプトを生成しました（下で確認・コピーできます）");
      } catch (e) {
        const msg = e instanceof Error ? e.message : "処理に失敗しました";
        setErrorMessage(msg);
        setPhase("error");
        push(msg);
      } finally {
        if (fileRef.current) fileRef.current.value = "";
      }
    },
    [brief, onApplied, onAutoGenerate, push, tuning],
  );

  async function copyGenspark() {
    if (!promptResult) return;
    const text = promptResult.gensparkText || promptResult.markdown;
    await navigator.clipboard.writeText(text);
    push("Genspark 用 text をコピーしました");
  }

  function downloadMd() {
    if (!promptResult) return;
    const blob = new Blob([promptResult.markdown], { type: "text/markdown;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "genspark_prompt.md";
    a.click();
    URL.revokeObjectURL(a.href);
    push("ダウンロードしました");
  }

  const showWorkspace = phase === "ready" && promptResult && promptResult.segments.length > 0;

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-panel rounded-2xl p-5 md:p-6"
    >
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-en-accent">Step 1 — 見積PDF → プロンプト</p>
      <h2 className="mt-1 text-sm font-semibold text-en-text">見積PDFを選ぶと、ここで骨子入力と生成まで進みます</h2>
      <p className="mt-2 text-xs leading-relaxed text-en-muted">
        解析後に自動で Genspark 用プロンプト（8枚）を生成し、このエリア内で2ペイン確認できます。骨子の修正は Step 2 から再生成できます。
      </p>

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
        className={`mt-4 cursor-pointer rounded-2xl border-2 border-dashed px-4 py-8 text-center transition-colors ${
          dragOver ? "border-en-primary/60 bg-en-primary/10" : "border-en-border bg-en-deep/35 hover:border-en-primary/35"
        } ${busy ? "pointer-events-none opacity-70" : ""} ${showWorkspace ? "py-5" : "py-10"}`}
      >
        {phase === "parsing" && (
          <p className="text-sm font-medium text-en-accent">見積を解析中…（30秒ほどかかることがあります）</p>
        )}
        {phase === "generating" && (
          <div>
            <p className="text-sm font-medium text-en-accent">Genspark プロンプトを生成中…（8枚）</p>
            <p className="mt-2 text-[11px] text-en-muted">Claude が B 標準テンプレに沿って執筆しています</p>
          </div>
        )}
        {phase === "error" && (
          <div>
            <p className="text-sm font-medium text-en-accent-strong">エラー: {errorMessage}</p>
            <p className="mt-2 text-[11px] text-en-muted">別のPDFを選ぶか、しばらくして再試行してください</p>
          </div>
        )}
        {(phase === "idle" || phase === "ready") && (
          <>
            <p className="text-sm font-medium text-en-text">
              {lastFile ? `選択中: ${lastFile}` : "見積PDFをドロップ、またはクリック"}
            </p>
            <p className="mt-2 text-[11px] text-en-muted">
              {lastFile ? "クリックで別のPDFに差し替え" : "10MBまで · 1ファイル"}
            </p>
            {phase === "ready" && promptResult && (
              <p className="mt-3 text-[11px] text-en-primary-bright">
                生成完了 · {promptResult.usedLlm ? "Claude" : "テンプレ合成"} · {promptResult.folderNameSuggestion}
              </p>
            )}
          </>
        )}
      </motion.div>

      <div className="mt-3 flex flex-wrap gap-2">
        <Button variant="secondary" disabled={busy} onClick={() => fileRef.current?.click()}>
          {lastFile ? "PDFを差し替え" : "PDFを選ぶ"}
        </Button>
        {showWorkspace && (
          <>
            <Button variant="secondary" onClick={() => void copyGenspark()}>
              Genspark 全文コピー
            </Button>
            <Button variant="primary" onClick={downloadMd}>
              .md ダウンロード
            </Button>
          </>
        )}
      </div>

      <AnimatePresence>
        {showWorkspace && promptResult && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.35 }}
            className="mt-6 overflow-hidden border-t border-en-border pt-6"
          >
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-en-accent">生成結果（このPDFから）</p>
            <div className="mt-4">
              <PromptWorkspace
                segments={promptResult.segments}
                gensparkText={promptResult.gensparkText || promptResult.markdown}
                onCopySegment={async (text) => {
                  await navigator.clipboard.writeText(text);
                  push("コピーしました");
                }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  );
}
