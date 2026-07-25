import type { ReferenceDocument, TrainingDeliveryBrief, TuningB } from "@prompt-studio/core";
import { mergeExpandedIntoBrief } from "@prompt-studio/core";
import { motion } from "framer-motion";
import { useCallback, useRef, useState } from "react";
import { postExpandBriefFromPdf } from "../lib/api";
import { extractTextFromPdf } from "../lib/pdfExtract";
import { useToast } from "./Toast";
import { Button } from "./ui/Button";

async function fileToBase64(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  let binary = "";
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]!);
  return btoa(binary);
}

interface Props {
  onApplied: (payload: {
    brief: TrainingDeliveryBrief;
    tuning: TuningB;
    document: ReferenceDocument;
    slideDetail?: string;
    notes?: string;
  }) => void;
  tuning: TuningB;
  brief: TrainingDeliveryBrief;
}

export function EstimatePdfImportPanel({ onApplied, tuning, brief }: Props) {
  const { push } = useToast();
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [lastFile, setLastFile] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const dragDepth = useRef(0);

  const ingest = useCallback(
    async (file: File) => {
      if (!file.name.toLowerCase().endsWith(".pdf")) {
        push("見積PDF（.pdf）を選んでください");
        return;
      }
      setBusy(true);
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

        onApplied({
          brief: nextBrief,
          tuning: nextTuning,
          document: doc,
          slideDetail: expanded.trainingDetailForSlides,
          notes: expanded.notes,
        });

        setLastFile(file.name);
        push(
          usedLlm
            ? "見積PDFから骨子を反映しました（内容を確認してください）"
            : "PDFを読み込みました（テキスト抽出のみ。APIキーがあると自動入力精度が上がります）",
        );
      } catch (e) {
        push(e instanceof Error ? e.message : "見積PDFの読み込みに失敗しました");
      } finally {
        setBusy(false);
        if (fileRef.current) fileRef.current.value = "";
      }
    },
    [brief, onApplied, push, tuning],
  );

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-panel rounded-2xl p-5 md:p-6"
    >
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-en-accent">Step 1 — 見積PDF</p>
      <h2 className="mt-1 text-sm font-semibold text-en-text">見積書を読み込んで骨子を自動入力</h2>
      <p className="mt-2 text-xs leading-relaxed text-en-muted">
        ENロジカル形式の見積PDF（例：株式会社西利）を起点に、提案先・研修名・対象者・開始時期・効果・研修費を反映します。
        スキャンPDFもサーバー側で解釈します（Claude API）。
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
        className={`mt-4 cursor-pointer rounded-2xl border-2 border-dashed px-4 py-10 text-center transition-colors ${
          dragOver ? "border-en-primary/60 bg-en-primary/10" : "border-en-border bg-en-deep/35 hover:border-en-primary/35"
        } ${busy ? "pointer-events-none opacity-60" : ""}`}
      >
        {busy ? (
          <p className="text-sm font-medium text-en-accent">見積を解析中…（30秒ほどかかることがあります）</p>
        ) : (
          <>
            <p className="text-sm font-medium text-en-text">見積PDFをドロップ、またはクリック</p>
            <p className="mt-2 text-[11px] text-en-muted">10MBまで · 1ファイル</p>
            {lastFile && <p className="mt-3 text-[11px] text-en-primary-bright">最後に読み込み: {lastFile}</p>}
          </>
        )}
      </motion.div>

      <Button variant="secondary" className="mt-3" disabled={busy} onClick={() => fileRef.current?.click()}>
        PDFを選ぶ
      </Button>
    </motion.section>
  );
}
