import { motion, AnimatePresence } from "framer-motion";

type Tone = "error" | "success" | "info";

const styles: Record<Tone, string> = {
  error: "border-en-accent-strong/40 bg-en-accent-strong/10 text-en-text",
  success: "border-en-primary/40 bg-en-primary/10 text-en-text",
  info: "border-en-border bg-white/[0.04] text-en-muted",
};

export function InlineAlert({
  tone,
  title,
  message,
  action,
  onDismiss,
}: {
  tone: Tone;
  title: string;
  message?: string;
  action?: React.ReactNode;
  onDismiss?: () => void;
}) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        role={tone === "error" ? "alert" : "status"}
        className={`rounded-xl border px-4 py-3 ${styles[tone]}`}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">{title}</p>
            {message && <p className="mt-1 text-xs leading-relaxed opacity-90">{message}</p>}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {action}
            {onDismiss && (
              <button
                type="button"
                onClick={onDismiss}
                className="rounded-lg px-2 py-1 text-xs text-en-muted hover:bg-white/10 hover:text-en-text"
              >
                閉じる
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
