import type { ReferenceBundle, ReferenceDocument, ReferenceUrlItem } from "@prompt-studio/core";
import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useRef, useState } from "react";
import { fetchUrlContent } from "../lib/api";
import { extractTextFromPdf } from "../lib/pdfExtract";
import { useToast } from "./Toast";
import { Button } from "./ui/Button";

const MAX_URLS = 5;
const MAX_PDFS = 5;

export function emptyReferences(): ReferenceBundle {
  return { urls: [], documents: [] };
}

function isPdfFile(file: File): boolean {
  return file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
}

function pdfFilesFromList(files: FileList | File[]): File[] {
  return Array.from(files).filter(isPdfFile);
}

interface Props {
  value: ReferenceBundle;
  onChange: (next: ReferenceBundle) => void;
}

export function ReferenceMaterialsPanel({ value, onChange }: Props) {
  const { push } = useToast();
  const [urlDraft, setUrlDraft] = useState("");
  const [busyUrl, setBusyUrl] = useState(false);
  const [busyPdf, setBusyPdf] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const dragDepthRef = useRef(0);

  const pdfSlotsLeft = MAX_PDFS - value.documents.length;
  const pdfDisabled = busyPdf || pdfSlotsLeft <= 0;

  const ingestPdfFiles = useCallback(
    async (raw: FileList | File[]) => {
      const pdfs = pdfFilesFromList(raw);
      if (!pdfs.length) {
        push("PDFファイル（.pdf）を選ぶか、ここにドロップしてください");
        return;
      }
      if (value.documents.length >= MAX_PDFS) {
        push(`PDFは最大${MAX_PDFS}件までです`);
        return;
      }

      setBusyPdf(true);
      try {
        const added: ReferenceDocument[] = [];
        for (const file of pdfs) {
          if (value.documents.length + added.length >= MAX_PDFS) break;
          const text = await extractTextFromPdf(file);
          added.push({ name: file.name, text, kind: "pdf" });
        }
        if (added.length) {
          onChange({ ...value, documents: [...value.documents, ...added] });
          push(`PDF ${added.length}件を読み込みました`);
        }
      } catch (e) {
        push(e instanceof Error ? e.message : "PDFの読み込みに失敗しました");
      } finally {
        setBusyPdf(false);
        if (fileRef.current) fileRef.current.value = "";
      }
    },
    [onChange, push, value],
  );

  async function addUrl() {
    const raw = urlDraft.trim();
    if (!raw) return;
    if (value.urls.length >= MAX_URLS) return;
    setBusyUrl(true);
    try {
      const fetched = await fetchUrlContent(raw);
      const item: ReferenceUrlItem = {
        url: fetched.url,
        title: fetched.title,
        text: fetched.text,
      };
      onChange({ ...value, urls: [...value.urls, item] });
      setUrlDraft("");
    } catch (e) {
      push(e instanceof Error ? e.message : "URLの取得に失敗しました");
    } finally {
      setBusyUrl(false);
    }
  }

  function onDragEnter(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (pdfDisabled) return;
    dragDepthRef.current += 1;
    setDragOver(true);
  }

  function onDragLeave(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    dragDepthRef.current -= 1;
    if (dragDepthRef.current <= 0) {
      dragDepthRef.current = 0;
      setDragOver(false);
    }
  }

  function onDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!pdfDisabled) {
      e.dataTransfer.dropEffect = "copy";
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    dragDepthRef.current = 0;
    setDragOver(false);
    if (pdfDisabled) return;
    void ingestPdfFiles(e.dataTransfer.files);
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
      className="glass-panel mt-6 rounded-2xl p-5 md:p-6"
    >
      <h2 className="text-sm font-semibold text-en-text">追加参考資料（任意）</h2>
      <p className="mt-1 text-xs leading-relaxed text-en-muted">
        見積PDF以外の資料がある場合のみ。メインは上の見積PDF読み込みです。
      </p>

      <div className="mt-5">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-en-muted">PDF</p>
        <input
          ref={fileRef}
          type="file"
          accept="application/pdf,.pdf"
          multiple
          className="hidden"
          onChange={(e) => void ingestPdfFiles(e.target.files ?? [])}
        />

        <motion.div
          role="button"
          tabIndex={pdfDisabled ? -1 : 0}
          aria-label="PDFをドラッグ＆ドロップするか、クリックしてファイルを選択"
          aria-disabled={pdfDisabled}
          onKeyDown={(e) => {
            if (pdfDisabled) return;
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              fileRef.current?.click();
            }
          }}
          onClick={() => {
            if (!pdfDisabled) fileRef.current?.click();
          }}
          onDragEnter={onDragEnter}
          onDragLeave={onDragLeave}
          onDragOver={onDragOver}
          onDrop={onDrop}
          animate={{
            scale: dragOver ? 1.01 : 1,
            borderColor: dragOver
              ? "rgba(24, 139, 168, 0.65)"
              : "rgba(148, 180, 210, 0.12)",
          }}
          transition={{ type: "spring", stiffness: 420, damping: 32 }}
          className={`relative mt-2 cursor-pointer rounded-2xl border-2 border-dashed px-4 py-8 text-center outline-none transition-colors ${
            pdfDisabled ? "cursor-not-allowed opacity-55" : "hover:border-en-primary/40"
          } ${dragOver ? "bg-en-primary/10" : "bg-en-deep/35"}`}
        >
          <AnimatePresence mode="wait">
            {busyPdf ? (
              <motion.p
                key="busy"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="text-sm font-medium text-en-accent"
              >
                PDFを読み込み中…
              </motion.p>
            ) : dragOver ? (
              <motion.p
                key="drop"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="text-sm font-semibold text-en-primary-bright"
              >
                ここにドロップ
              </motion.p>
            ) : (
              <motion.div
                key="idle"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
              >
                <p className="text-sm font-medium text-en-text">
                  PDFをドラッグ＆ドロップ
                </p>
                <p className="mt-2 text-xs text-en-muted">
                  またはクリックしてファイルを選択（1ファイル10MBまで）
                </p>
                {pdfSlotsLeft < MAX_PDFS && (
                  <p className="mt-2 text-[11px] text-en-muted/90">
                    あと {pdfSlotsLeft} 件追加できます
                  </p>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            variant="secondary"
            disabled={pdfDisabled}
            onClick={(e) => {
              e.stopPropagation();
              fileRef.current?.click();
            }}
          >
            ファイルを選ぶ
          </Button>
        </div>

        <ul className="mt-3 space-y-2">
          {value.documents.map((d, i) => (
            <li
              key={`${d.name}-${i}`}
              className="flex items-center justify-between gap-3 rounded-xl border border-en-border bg-en-deep/40 px-3 py-2.5 text-xs"
            >
              <div className="min-w-0">
                <p className="truncate font-medium text-en-text">{d.name}</p>
                <p className="text-en-muted">{d.text.length.toLocaleString()} 文字</p>
              </div>
              <button
                type="button"
                className="shrink-0 text-en-muted hover:text-en-accent-strong"
                onClick={() =>
                  onChange({
                    ...value,
                    documents: value.documents.filter((_, j) => j !== i),
                  })
                }
              >
                削除
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-6 border-t border-en-border pt-5">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-en-muted">URL（任意）</p>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <input
            className="input-en flex-1"
            type="url"
            placeholder="https://..."
            value={urlDraft}
            onChange={(e) => setUrlDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void addUrl();
              }
            }}
          />
          <Button
            variant="secondary"
            disabled={busyUrl || !urlDraft.trim() || value.urls.length >= MAX_URLS}
            onClick={() => void addUrl()}
          >
            {busyUrl ? "取得中…" : "追加"}
          </Button>
        </div>
        <ul className="mt-3 space-y-2">
          {value.urls.map((u, i) => (
            <li
              key={`${u.url}-${i}`}
              className="flex items-start justify-between gap-3 rounded-xl border border-en-border bg-en-deep/40 px-3 py-2.5 text-xs"
            >
              <div className="min-w-0">
                <p className="truncate font-medium text-en-text">{u.title ?? u.url}</p>
                <p className="truncate text-en-muted">{u.url}</p>
                {u.text && (
                  <p className="mt-1 line-clamp-2 text-en-muted/90">
                    {u.text.slice(0, 120)}
                    {u.text.length > 120 ? "…" : ""}
                  </p>
                )}
              </div>
              <button
                type="button"
                className="shrink-0 text-en-muted hover:text-en-accent-strong"
                onClick={() =>
                  onChange({ ...value, urls: value.urls.filter((_, j) => j !== i) })
                }
              >
                削除
              </button>
            </li>
          ))}
        </ul>
      </div>
    </motion.section>
  );
}
