import type { ParsedDesignSystem, SlideOutlineItem } from "@prompt-studio/core";
import { SlideMiniPreview } from "./SlideMiniPreview";

export function AllSlidesAppearanceGrid({
  parsed,
  slides,
  highlightSlideNumber,
}: {
  parsed: ParsedDesignSystem;
  slides: SlideOutlineItem[];
  highlightSlideNumber?: number;
}) {
  const { colors } = parsed;
  const count = slides.length || parsed.slideCount || 8;

  if (slides.length === 0) {
    return (
      <p className="text-[11px] text-en-muted">
        ■固稿が読み取れると、全スライドの見た目予測を表示します。
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-[10px] leading-relaxed text-en-muted">
        YAML パレットと■固稿から、<strong className="font-medium text-en-text">全{count}枚</strong>
        のミニプレビューです（Genspark 実行前のイメージ）。
      </p>
      <div className="flex flex-wrap gap-1.5">
        {(["primary", "secondary", "accent"] as const).map((key) => (
          <span
            key={key}
            className="inline-flex items-center gap-1 rounded border border-en-border px-1.5 py-0.5 text-[8px] text-en-muted"
          >
            <span className="size-3 rounded" style={{ backgroundColor: colors[key] }} />
            {colors[key]}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2 xl:grid-cols-4">
        {slides.map((s) => {
          const isCover = s.slideNumber === 1;
          const highlighted = highlightSlideNumber === s.slideNumber;
          return (
            <SlideMiniPreview
              key={s.slideNumber}
              variant={isCover ? "cover" : "content"}
              colors={colors}
              title={s.headline}
              sub={s.subline}
              slideNumber={s.slideNumber}
              highlighted={highlighted}
              meta={isCover ? "表紙" : s.sectionLabel.replace(/^スライド\d+｜/, "").slice(0, 24)}
            />
          );
        })}
      </div>
    </div>
  );
}
