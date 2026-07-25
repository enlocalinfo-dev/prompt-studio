import { motion } from "framer-motion";

export type GenPhase = "parsing" | "generating" | null;

export function GenerationProgressOverlay({ phase }: { phase: GenPhase }) {
  if (!phase) return null;

  const step = phase === "parsing" ? 1 : 2;
  const label =
    phase === "parsing"
      ? "見積PDFを読み取っています"
      : "提案用プロンプトを作成しています";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[90] flex items-center justify-center bg-en-deep/80 backdrop-blur-sm"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="mx-4 w-full max-w-md rounded-2xl border border-en-border bg-en-panel p-6 shadow-2xl">
        <p className="text-xs font-medium text-en-accent">処理中（{step}/2）</p>
        <p className="mt-2 text-lg font-semibold text-en-text">{label}</p>
        <p className="mt-2 text-sm leading-relaxed text-en-muted">
          通常1〜2分かかります。この画面を閉じずにお待ちください。
        </p>
        <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-white/10">
          <motion.div
            className="h-full bg-gradient-to-r from-en-primary to-en-secondary"
            initial={{ width: "8%" }}
            animate={{ width: phase === "parsing" ? "45%" : "88%" }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          />
        </div>
      </div>
    </motion.div>
  );
}
