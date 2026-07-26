import { motion } from "framer-motion";
import type { SlideOutlineItem } from "@prompt-studio/core";

export function SlideOutlinePanel({
  slides,
  variant = "full",
}: {
  slides: SlideOutlineItem[];
  variant?: "compact" | "full";
}) {
  if (slides.length === 0) {
    return (
      <p className="text-[11px] text-en-muted">
        ■固稿が見つかりません。プロンプト生成後に8枚分の一覧が表示されます。
      </p>
    );
  }

  const isCompact = variant === "compact";

  return (
    <div
      className={
        isCompact
          ? "max-h-[220px] overflow-y-auto rounded-xl border border-en-border bg-en-deep/30 p-3"
          : "mt-4 rounded-xl border border-en-border bg-en-deep/30 p-3 md:p-4"
      }
    >
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <h4 className="text-[11px] font-semibold text-en-text">
          全{slides.length}枚の内容一覧
        </h4>
        <span className="text-[10px] text-en-muted">■固稿から自動抽出</span>
      </div>

      <ol className={`space-y-2 ${isCompact ? "text-[10px]" : "text-[11px]"}`}>
        {slides.map((s, i) => (
          <motion.li
            key={`${s.slideNumber}-${s.sectionLabel}`}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03 }}
            className="border-b border-en-border/60 pb-2 last:border-0 last:pb-0"
          >
            <div className="flex gap-2">
              <span className="shrink-0 font-mono text-[10px] font-bold text-en-primary-bright">
                {String(s.slideNumber).padStart(2, "0")}
              </span>
              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 font-medium leading-snug text-en-text/95">
                  {s.headline}
                </p>
                {!isCompact && (
                  <p className="mt-0.5 line-clamp-1 text-[10px] text-en-muted">{s.sectionLabel}</p>
                )}
                {s.subline && (
                  <p className={`mt-1 line-clamp-2 text-en-muted ${isCompact ? "text-[9px]" : "text-[10px]"}`}>
                    {s.subline}
                  </p>
                )}
              </div>
            </div>
          </motion.li>
        ))}
      </ol>
    </div>
  );
}
