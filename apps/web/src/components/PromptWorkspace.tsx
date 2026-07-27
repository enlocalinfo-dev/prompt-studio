import { useMemo, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { PromptSegment } from "@prompt-studio/core";
import {
  parseDesignSystemFromGenspark,
  parseSlideOutlinesFromGenspark,
} from "@prompt-studio/core";
import { SlideDeckContentViewer } from "./SlideDeckContentViewer";
import { SlideOutlinePanel } from "./SlideOutlinePanel";

function slideNumberFromSegment(seg: PromptSegment): number | undefined {
  if (seg.kind !== "slide") return undefined;
  const m = seg.label.match(/スライド\s*(\d+)/i) ?? seg.slideKey?.match(/(\d+)/);
  return m?.[1] ? Number.parseInt(m[1], 10) : undefined;
}

export function PromptWorkspace({
  segments,
  gensparkText,
  onCopySegment,
}: {
  segments: PromptSegment[];
  gensparkText: string;
  onCopySegment: (text: string) => void;
}) {
  const [activeId, setActiveId] = useState(segments[0]?.id ?? "");
  const [deckSlide, setDeckSlide] = useState<number | undefined>(undefined);
  const active = useMemo(
    () => segments.find((s) => s.id === activeId) ?? segments[0],
    [activeId, segments],
  );

  const designParsed = useMemo(
    () => parseDesignSystemFromGenspark(gensparkText),
    [gensparkText],
  );

  const slideOutline = useMemo(
    () => parseSlideOutlinesFromGenspark(gensparkText),
    [gensparkText],
  );

  const highlightSlide = deckSlide ?? (active ? slideNumberFromSegment(active) : undefined);

  useEffect(() => {
    const fromSeg = active ? slideNumberFromSegment(active) : undefined;
    if (fromSeg != null) setDeckSlide(fromSeg);
  }, [active]);

  if (!active) return null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
        {segments.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setActiveId(s.id)}
            className={`shrink-0 rounded-lg border px-2.5 py-1.5 text-left text-[10px] transition-colors md:text-[11px] ${
              s.id === active.id
                ? "border-en-primary/50 bg-en-primary/15 text-en-text"
                : "border-en-border bg-white/[0.02] text-en-muted hover:border-en-primary/30 hover:text-en-text"
            }`}
          >
            {s.mandatory && <span className="mr-1 font-semibold text-en-accent">必須</span>}
            <span className="line-clamp-2 max-w-[9rem]">{s.label}</span>
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={active.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.22 }}
          className="glass-panel overflow-hidden rounded-2xl"
        >
          <div className="border-b border-en-border bg-en-deep/50 px-4 py-4 md:px-6 md:py-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-en-accent">
              このパートの定義
            </p>
            <p className="mt-2 text-sm leading-relaxed text-en-text md:text-[15px]">
              {active.purpose}
            </p>
            {active.mandatory && (
              <p className="mt-2 text-[11px] text-en-muted">
                YAML・共通ルールはスライド■固稿とセットで Genspark に引き継ぎます。
              </p>
            )}
          </div>

          <div className="grid gap-0 xl:grid-cols-2 xl:divide-x xl:divide-en-border">
            <div className="flex min-h-[360px] flex-col border-b border-en-border xl:min-h-[520px] xl:border-b-0">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-en-border px-4 py-3 md:px-5">
                <div>
                  <span className="text-xs font-semibold text-en-text">プロンプト原文（Genspark用・全文）</span>
                  <p className="mt-0.5 text-[10px] text-en-muted">
                    必須ルール・■固稿・YAML をすべて含みます。選択中: {active.label}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onCopySegment(gensparkText)}
                  className="shrink-0 rounded-lg bg-en-primary/20 px-3 py-1.5 text-[11px] font-medium text-en-primary-bright hover:bg-en-primary/30"
                >
                  このグループを含め全文コピー
                </button>
              </div>
              <pre className="max-h-[55vh] flex-1 overflow-auto p-4 font-mono text-[10px] leading-relaxed whitespace-pre-wrap text-en-text/90 md:max-h-[65vh] md:p-5 md:text-[11px] xl:max-h-[72vh]">
                {gensparkText}
              </pre>
            </div>

            <div className="flex min-h-[360px] flex-col p-4 md:p-6 xl:min-h-[520px]">
              <span className="mb-3 text-xs font-semibold text-en-text">スライド内容プレビュー（全枚）</span>
              <SlideDeckContentViewer
                parsed={designParsed}
                slides={slideOutline}
                activeSlideNumber={highlightSlide}
                onActiveSlideChange={setDeckSlide}
              />
              <details className="mt-4 rounded-xl border border-en-border/60 bg-en-deep/20 p-3">
                <summary className="cursor-pointer text-[11px] font-medium text-en-text">
                  全{slideOutline.length || "—"}枚のテキスト一覧
                </summary>
                <SlideOutlinePanel slides={slideOutline} />
              </details>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      <p className="text-center text-[11px] text-en-muted">
        {segments.length} パート — チップで定義を切り替え（原文は常に全文表示）
      </p>
    </div>
  );
}
