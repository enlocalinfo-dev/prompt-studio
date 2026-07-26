import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { PromptSegment } from "@prompt-studio/core";
import { parseDesignSystemFromGenspark, parseDesignSystemYaml } from "@prompt-studio/core";
import { SlidePreviewMock } from "./SlidePreviewMock";
import { DesignSystemSlidePreview } from "./DesignSystemSlidePreview";

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
  const active = useMemo(
    () => segments.find((s) => s.id === activeId) ?? segments[0],
    [activeId, segments],
  );

  const designParsed = useMemo(
    () => parseDesignSystemFromGenspark(gensparkText),
    [gensparkText],
  );

  const activeDesign = useMemo(() => {
    if (active?.kind !== "yaml") return designParsed;
    return parseDesignSystemYaml(active.body);
  }, [active, designParsed]);

  if (!active) return null;

  const copyPayload =
    active.kind === "yaml" || active.kind === "global_rule" || active.kind === "preamble"
      ? gensparkText
      : active.body;

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
            {s.mandatory && (
              <span className="mr-1 font-semibold text-en-accent">必須</span>
            )}
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
          <div className="border-b border-en-border bg-en-deep/50 px-4 py-4 md:px-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-en-accent">
              このパートの定義
            </p>
            <p className="mt-2 text-sm leading-relaxed text-en-text md:text-[15px]">
              {active.purpose}
            </p>
            {active.mandatory && (
              <p className="mt-2 text-[11px] text-en-muted">
                YAML・共通ルールはスライド■固稿とセットで Genspark に引き継ぎます（改変禁止）。
              </p>
            )}
          </div>

          <div className="grid gap-0 lg:grid-cols-2 lg:divide-x lg:divide-en-border">
            <div className="flex min-h-[280px] flex-col border-b border-en-border lg:border-b-0">
              <div className="flex items-center justify-between border-b border-en-border px-4 py-2.5">
                <span className="text-xs font-semibold text-en-text">プロンプト原文</span>
                <button
                  type="button"
                  onClick={() => onCopySegment(copyPayload)}
                  className="text-[11px] font-medium text-en-primary-bright hover:underline"
                >
                  この部分を含めコピー
                </button>
              </div>
              <pre className="max-h-[42vh] flex-1 overflow-auto p-4 font-mono text-[10px] leading-relaxed whitespace-pre-wrap text-en-text/90 md:text-[11px]">
                {active.body}
              </pre>
            </div>

            <div className="flex min-h-[280px] flex-col p-4 md:p-5">
              <span className="mb-3 text-xs font-semibold text-en-text">
                {active.kind === "yaml" ? "スライド見た目の予測（YAML反映）" : "スライド／ルールの見え方"}
              </span>
              {active.kind === "yaml" ? (
                <DesignSystemSlidePreview
                  parsed={activeDesign}
                  gensparkText={gensparkText}
                  yamlBody={active.body}
                />
              ) : (
                <SlidePreviewMock
                  title={active.previewTitle ?? active.label}
                  lines={active.previewLines ?? []}
                  kind={active.kind}
                  slideLabel={active.label}
                  designColors={designParsed.colors}
                />
              )}
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      <p className="text-center text-[11px] text-en-muted">
        {segments.length} パート（ルール＋スライド）— チップで切り替え
      </p>
    </div>
  );
}
