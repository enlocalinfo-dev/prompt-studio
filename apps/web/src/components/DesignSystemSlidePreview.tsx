import { motion } from "framer-motion";
import type { ParsedDesignSystem } from "@prompt-studio/core";
import { sampleSlideCopyFromGenspark } from "@prompt-studio/core";

const SWATCH_LABELS: { key: keyof ParsedDesignSystem["colors"]; label: string }[] = [
  { key: "primary", label: "Primary" },
  { key: "secondary", label: "Secondary" },
  { key: "accent", label: "Accent" },
  { key: "textMain", label: "本文" },
  { key: "textSub", label: "補助" },
  { key: "backgroundLight", label: "薄背景" },
];

export function DesignSystemSlidePreview({
  parsed,
  gensparkText,
  yamlBody,
}: {
  parsed: ParsedDesignSystem;
  gensparkText: string;
  yamlBody: string;
}) {
  const { colors } = parsed;
  const copy = sampleSlideCopyFromGenspark(gensparkText || yamlBody, parsed);

  return (
    <div className="flex h-full min-h-[280px] flex-col gap-3">
      <p className="text-[10px] leading-relaxed text-en-muted">
        Genspark 実行前の<strong className="font-medium text-en-text">見た目予測</strong>
        です。YAML のカラーと■固稿から、表紙・本文スライドの雰囲気を確認できます。
      </p>

      <div className="flex flex-wrap gap-2">
        {SWATCH_LABELS.map(({ key, label }) => (
          <div key={key} className="flex items-center gap-1.5 rounded-lg border border-en-border bg-en-deep/40 px-2 py-1">
            <span
              className="size-4 shrink-0 rounded border border-black/10"
              style={{ backgroundColor: colors[key] }}
            />
            <span className="text-[9px] text-en-muted">
              {label}{" "}
              <span className="font-mono text-en-text/80">{colors[key]}</span>
            </span>
          </div>
        ))}
      </div>

      {parsed.warnings.map((w) => (
        <p key={w} className="text-[10px] text-en-accent">
          {w}
        </p>
      ))}

      <div className="grid flex-1 gap-2 sm:grid-cols-2">
        <MiniSlide
          variant="cover"
          colors={colors}
          title={copy.coverTitle}
          sub={copy.coverSub}
          meta={`${parsed.slideCount ?? 8}枚 · ${parsed.formatType ?? "B_delivery"}`}
        />
        <MiniSlide
          variant="content"
          colors={colors}
          title={copy.contentHeading}
          sub={copy.contentLead}
          meta="図解40%以上 · 補足行あり（B標準）"
        />
      </div>

      {parsed.toneHints.length > 0 && (
        <ul className="text-[9px] leading-relaxed text-en-muted">
          {parsed.toneHints.slice(0, 3).map((t) => (
            <li key={t}>トーン: {t}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

function MiniSlide({
  variant,
  colors,
  title,
  sub,
  meta,
}: {
  variant: "cover" | "content";
  colors: ParsedDesignSystem["colors"];
  title: string;
  sub: string;
  meta: string;
}) {
  const isCover = variant === "cover";

  return (
    <motion.div
      layout
      className="aspect-video overflow-hidden rounded-lg border shadow-md"
      style={{
        borderColor: colors.dividerLine,
        backgroundColor: colors.background,
      }}
    >
      {isCover ? (
        <div
          className="flex h-full flex-col justify-end p-3"
          style={{
            background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 55%, ${colors.background} 100%)`,
          }}
        >
          <p className="text-[8px] font-medium text-white/85">{meta}</p>
          <h4 className="mt-1 line-clamp-2 text-[11px] font-bold leading-tight text-white">{title}</h4>
          <p className="mt-0.5 line-clamp-2 text-[8px] leading-snug text-white/80">{sub}</p>
          <div className="mt-2 h-6 w-full rounded opacity-40" style={{ backgroundColor: colors.backgroundLight }} />
        </div>
      ) : (
        <div className="flex h-full flex-col p-3">
          <div className="h-0.5 w-8 rounded-full" style={{ backgroundColor: colors.accent }} />
          <h4
            className="mt-2 line-clamp-2 text-[10px] font-bold leading-snug"
            style={{ color: colors.primary }}
          >
            {title}
          </h4>
          <p className="mt-1 line-clamp-3 flex-1 text-[8px] leading-relaxed" style={{ color: colors.textSub }}>
            {sub}
          </p>
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
