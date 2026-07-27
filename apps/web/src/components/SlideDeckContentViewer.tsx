import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { ParsedDesignSystem, SlideOutlineItem } from "@prompt-studio/core";
import { slidePreviewBulletLines } from "@prompt-studio/core";

type Props = {
  parsed: ParsedDesignSystem;
  slides: SlideOutlineItem[];
  /** 外部（プロンプトパート選択）から同期するスライド番号 */
  activeSlideNumber?: number;
  onActiveSlideChange?: (slideNumber: number) => void;
};

export function SlideDeckContentViewer({
  parsed,
  slides,
  activeSlideNumber,
  onActiveSlideChange,
}: Props) {
  const { colors } = parsed;
  const [index, setIndex] = useState(0);

  const sorted = useMemo(
    () => [...slides].sort((a, b) => a.slideNumber - b.slideNumber),
    [slides],
  );

  useEffect(() => {
    if (activeSlideNumber == null || sorted.length === 0) return;
    const i = sorted.findIndex((s) => s.slideNumber === activeSlideNumber);
    if (i >= 0) setIndex(i);
  }, [activeSlideNumber, sorted]);

  const current = sorted[index];
  const total = sorted.length;

  const go = useCallback(
    (next: number) => {
      if (total === 0) return;
      const clamped = Math.max(0, Math.min(total - 1, next));
      setIndex(clamped);
      const sn = sorted[clamped]?.slideNumber;
      if (sn != null) onActiveSlideChange?.(sn);
    },
    [total, sorted, onActiveSlideChange],
  );

  if (total === 0) {
    return (
      <p className="text-[11px] text-en-muted">
        ■固稿が読み取れると、スライドごとの内容プレビューを表示します。
      </p>
    );
  }

  const isCover = current.slideNumber === 1;
  const bullets = slidePreviewBulletLines(current);
  const roleLabel = current.sectionLabel.replace(/^スライド\d+｜/, "").trim();

  return (
    <div className="flex h-full min-h-[420px] flex-col gap-3">
      <p className="text-[10px] leading-relaxed text-en-muted">
        Google スライド風の<strong className="font-medium text-en-text">内容プレビュー</strong>
        です。■固稿から拾った文言＋不足分はプレースホルダー箇条書き（予測）です。
      </p>

      <div className="flex min-h-0 flex-1 flex-col gap-3 lg:flex-row">
        <aside className="flex shrink-0 gap-2 overflow-x-auto pb-1 lg:w-[108px] lg:flex-col lg:overflow-y-auto lg:overflow-x-hidden lg:pb-0">
          {sorted.map((s, i) => {
            const active = i === index;
            const thumbCover = s.slideNumber === 1;
            return (
              <button
                key={s.slideNumber}
                type="button"
                onClick={() => go(i)}
                className={`shrink-0 rounded-lg border p-1 transition-all lg:w-full ${
                  active
                    ? "border-en-primary ring-2 ring-en-primary/40"
                    : "border-en-border opacity-80 hover:border-en-primary/40 hover:opacity-100"
                }`}
              >
                <div
                  className="aspect-video w-[88px] overflow-hidden rounded md:w-[96px] lg:w-full"
                  style={{
                    backgroundColor: colors.background,
                    borderColor: colors.dividerLine,
                  }}
                >
                  {thumbCover ? (
                    <div
                      className="flex h-full flex-col justify-end p-1"
                      style={{
                        background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`,
                      }}
                    >
                      <p className="line-clamp-2 text-[6px] font-bold leading-tight text-white">
                        {s.headline.slice(0, 40)}
                      </p>
                    </div>
                  ) : (
                    <div className="flex h-full flex-col p-1">
                      <div className="h-0.5 w-3 rounded-full" style={{ backgroundColor: colors.accent }} />
                      <p
                        className="mt-0.5 line-clamp-3 text-[6px] leading-tight"
                        style={{ color: colors.primary }}
                      >
                        {s.headline.slice(0, 36)}
                      </p>
                    </div>
                  )}
                </div>
                <p className="mt-0.5 text-center font-mono text-[9px] text-en-muted">
                  {String(s.slideNumber).padStart(2, "0")}
                </p>
              </button>
            );
          })}
        </aside>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <AnimatePresence mode="wait">
            <motion.div
              key={current.slideNumber}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.22 }}
              className="aspect-video w-full max-w-3xl overflow-hidden rounded-xl border shadow-lg"
              style={{
                borderColor: colors.dividerLine,
                backgroundColor: colors.background,
              }}
            >
              {isCover ? (
                <CoverSlideFrame colors={colors} slide={current} bullets={bullets} />
              ) : (
                <ContentSlideFrame
                  colors={colors}
                  slide={current}
                  bullets={bullets}
                  roleLabel={roleLabel}
                />
              )}
            </motion.div>
          </AnimatePresence>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex gap-2">
              <button
                type="button"
                disabled={index <= 0}
                onClick={() => go(index - 1)}
                className="rounded-lg border border-en-border px-3 py-1.5 text-xs text-en-text disabled:opacity-40"
              >
                前へ
              </button>
              <button
                type="button"
                disabled={index >= total - 1}
                onClick={() => go(index + 1)}
                className="rounded-lg border border-en-border px-3 py-1.5 text-xs text-en-text disabled:opacity-40"
              >
                次へ
              </button>
            </div>
            <p className="font-mono text-xs text-en-muted">
              {index + 1} / {total}
              <span className="ml-2 hidden sm:inline text-en-text/80">{roleLabel}</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function CoverSlideFrame({
  colors,
  slide,
  bullets,
}: {
  colors: ParsedDesignSystem["colors"];
  slide: SlideOutlineItem;
  bullets: string[];
}) {
  return (
    <div
      className="flex h-full flex-col justify-end p-6 md:p-8"
      style={{
        background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 55%, ${colors.background} 100%)`,
      }}
    >
      <p className="text-[10px] font-medium text-white/85">表紙 · スライド {slide.slideNumber}</p>
      <h3 className="mt-2 text-lg font-bold leading-snug text-white md:text-xl">{slide.headline}</h3>
      {slide.subline && <p className="mt-2 text-xs leading-relaxed text-white/85">{slide.subline}</p>}
      <ul className="mt-4 space-y-1.5 border-t border-white/20 pt-3">
        {bullets.slice(0, 4).map((b) => (
          <li key={b} className="flex gap-2 text-[11px] leading-snug text-white/90">
            <span className="mt-1.5 size-1 shrink-0 rounded-full bg-white/70" />
            <span>{b}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ContentSlideFrame({
  colors,
  slide,
  bullets,
  roleLabel,
}: {
  colors: ParsedDesignSystem["colors"];
  slide: SlideOutlineItem;
  bullets: string[];
  roleLabel: string;
}) {
  return (
    <div className="flex h-full flex-col p-5 md:p-7">
      <div className="flex items-start justify-between gap-2">
        <div className="h-1 w-10 rounded-full" style={{ backgroundColor: colors.accent }} />
        <span className="text-[10px] text-en-muted">{roleLabel}</span>
      </div>
      <h3 className="mt-3 text-base font-bold leading-snug md:text-lg" style={{ color: colors.primary }}>
        {slide.headline}
      </h3>
      {slide.subline && (
        <p className="mt-1 text-xs leading-relaxed" style={{ color: colors.textSub }}>
          {slide.subline}
        </p>
      )}
      <ul className="mt-4 flex-1 space-y-2 overflow-y-auto pr-1">
        {bullets.map((b, i) => {
          const placeholder = b.includes("追加されていきます") || b.includes("具体化されます");
          return (
            <li
              key={`${b}-${i}`}
              className="flex gap-2 text-[11px] leading-relaxed md:text-xs"
              style={{ color: placeholder ? colors.textSub : colors.textMain }}
            >
              <span
                className="mt-1.5 size-1.5 shrink-0 rounded-full"
                style={{ backgroundColor: placeholder ? colors.textSub : colors.secondary }}
              />
              <span className={placeholder ? "italic opacity-90" : undefined}>{b}</span>
            </li>
          );
        })}
      </ul>
      <div className="mt-3 grid grid-cols-3 gap-2 border-t pt-3" style={{ borderColor: colors.dividerLine }}>
        <div
          className="h-10 rounded border"
          style={{ borderColor: colors.dividerLine, backgroundColor: colors.backgroundLight }}
        />
        <div
          className="col-span-2 h-10 rounded border"
          style={{ borderColor: colors.dividerLine, backgroundColor: colors.surfaceCard }}
        />
      </div>
      <p className="mt-1 text-[9px]" style={{ color: colors.textSub }}>
        図解エリア（プレビューでは線画ブロックのみ）
      </p>
    </div>
  );
}
