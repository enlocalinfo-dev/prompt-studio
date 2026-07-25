import { motion } from "framer-motion";
import type { PromptSegmentKind } from "@prompt-studio/core";

const kindLabel: Record<PromptSegmentKind, string> = {
  yaml: "YAML",
  global_rule: "必須ルール",
  slide: "内容",
  section_divider: "章区切り",
  checklist: "チェック",
  preamble: "全体",
};

export function SlidePreviewMock({
  title,
  lines,
  kind,
  slideLabel,
}: {
  title: string;
  lines: string[];
  kind: PromptSegmentKind;
  slideLabel?: string;
}) {
  const isYaml = kind === "yaml";
  const isRule = kind === "global_rule" || kind === "preamble";

  return (
    <motion.div
      layout
      className="flex h-full min-h-[220px] flex-col overflow-hidden rounded-xl border border-en-border bg-gradient-to-br from-[#0a1628] to-[#0d2137] shadow-inner"
    >
      <div className="flex items-center justify-between border-b border-white/10 px-3 py-2">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-en-accent">
          {kindLabel[kind]}
        </span>
        <span className="truncate text-[10px] text-en-muted">{slideLabel ?? "16:9 プレビュー"}</span>
      </div>

      <div className="relative flex flex-1 flex-col p-4 md:p-5">
        {isYaml ? (
          <div className="space-y-1 font-mono text-[10px] leading-relaxed text-en-primary-bright/90">
            {lines.map((l, i) => (
              <div key={i} className="truncate">
                {l}
              </div>
            ))}
            <p className="pt-2 text-[10px] text-en-muted">… density_quota / tone_and_manner 等</p>
          </div>
        ) : isRule ? (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-en-text">{title}</h3>
            <ul className="space-y-1.5 text-[11px] leading-relaxed text-en-muted">
              {lines.map((l, i) => (
                <li key={i} className="flex gap-2">
                  <span className="mt-1.5 size-1 shrink-0 rounded-full bg-en-primary" />
                  <span>{l.replace(/^[-*]\s*/, "")}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <>
            <div className="mb-3 h-1 w-12 rounded-full bg-gradient-to-r from-en-primary to-en-secondary" />
            <h3 className="text-base font-semibold leading-snug text-en-text md:text-lg">{title}</h3>
            <ul className="mt-3 flex-1 space-y-2 overflow-hidden">
              {lines.map((l, i) => (
                <motion.li
                  key={i}
                  initial={{ opacity: 0, x: 6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="text-[11px] leading-relaxed text-en-muted md:text-xs"
                >
                  {l.replace(/^[-*]\s*/, "")}
                </motion.li>
              ))}
            </ul>
            {kind === "section_divider" && (
              <div className="mt-auto flex gap-4 pt-4">
                <span className="text-4xl font-bold text-white/20">01</span>
                <p className="text-xs text-en-muted">{title}</p>
              </div>
            )}
          </>
        )}

        <div
          aria-hidden
          className="pointer-events-none absolute -right-8 -top-8 size-32 rounded-full bg-en-primary/10 blur-2xl"
        />
      </div>
    </motion.div>
  );
}
