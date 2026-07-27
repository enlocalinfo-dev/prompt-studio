import { motion } from "framer-motion";
import type { ParsedDesignSystem } from "@prompt-studio/core";

export function SlideMiniPreview({
  variant,
  colors,
  title,
  sub,
  meta,
  highlighted,
  slideNumber,
}: {
  variant: "cover" | "content";
  colors: ParsedDesignSystem["colors"];
  title: string;
  sub?: string;
  meta: string;
  highlighted?: boolean;
  slideNumber?: number;
}) {
  const isCover = variant === "cover";

  return (
    <motion.div
      layout
      className={`aspect-video overflow-hidden rounded-lg border shadow-md transition-shadow ${
        highlighted ? "ring-2 ring-en-primary ring-offset-2 ring-offset-en-deep" : ""
      }`}
      style={{
        borderColor: colors.dividerLine,
        backgroundColor: colors.background,
      }}
    >
      {isCover ? (
        <div
          className="relative flex h-full flex-col justify-end p-3"
          style={{
            background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 55%, ${colors.background} 100%)`,
          }}
        >
          {slideNumber != null && (
            <span className="absolute left-2 top-2 rounded bg-black/25 px-1.5 py-0.5 font-mono text-[8px] text-white">
              {String(slideNumber).padStart(2, "0")}
            </span>
          )}
          <p className="text-[8px] font-medium text-white/85">{meta}</p>
          <h4 className="mt-1 line-clamp-2 text-[11px] font-bold leading-tight text-white">{title}</h4>
          {sub && <p className="mt-0.5 line-clamp-2 text-[8px] leading-snug text-white/80">{sub}</p>}
          <div className="mt-2 h-6 w-full rounded opacity-40" style={{ backgroundColor: colors.backgroundLight }} />
        </div>
      ) : (
        <div className="relative flex h-full flex-col p-3">
          {slideNumber != null && (
            <span
              className="absolute right-2 top-2 rounded px-1.5 py-0.5 font-mono text-[8px]"
              style={{ backgroundColor: colors.backgroundLight, color: colors.textSub }}
            >
              {String(slideNumber).padStart(2, "0")}
            </span>
          )}
          <div className="h-0.5 w-8 rounded-full" style={{ backgroundColor: colors.accent }} />
          <h4 className="mt-2 line-clamp-2 pr-8 text-[10px] font-bold leading-snug" style={{ color: colors.primary }}>
            {title}
          </h4>
          {sub && (
            <p className="mt-1 line-clamp-3 flex-1 text-[8px] leading-relaxed" style={{ color: colors.textSub }}>
              {sub}
            </p>
          )}
          <div className="mt-2 grid grid-cols-2 gap-1">
            <div
              className="h-8 rounded border p-1"
              style={{ borderColor: colors.dividerLine, backgroundColor: colors.backgroundLight }}
            >
              <div className="h-1 w-3/4 rounded" style={{ backgroundColor: colors.secondary, opacity: 0.5 }} />
            </div>
            <div
              className="h-8 rounded border p-1"
              style={{ borderColor: colors.dividerLine, backgroundColor: colors.surfaceCard }}
            >
              <div className="h-1 w-2/3 rounded" style={{ backgroundColor: colors.accent, opacity: 0.45 }} />
            </div>
          </div>
          <p className="mt-1 text-[7px]" style={{ color: colors.textSub }}>
            {meta}
          </p>
        </div>
      )}
    </motion.div>
  );
}
