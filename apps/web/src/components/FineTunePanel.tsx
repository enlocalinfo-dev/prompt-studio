import type { TuningB } from "@prompt-studio/core";
import { motion } from "framer-motion";
import { saveTuningB } from "../lib/storage";

interface Props {
  tuning: TuningB;
  onChange: (t: TuningB) => void;
}

export function FineTunePanel({ tuning, onChange }: Props) {
  const patch = (partial: Partial<TuningB>) => {
    const next = { ...tuning, ...partial };
    onChange(next);
    saveTuningB(next);
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 14 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.38, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
      className="glass-panel sticky top-36 rounded-2xl p-5 md:p-6"
    >
      <div className="flex items-center gap-2">
        <span className="flex size-8 items-center justify-center rounded-lg bg-en-primary/15 text-xs font-bold text-en-accent">
          B
        </span>
        <div>
          <h2 className="text-sm font-semibold text-en-text">案件メタ</h2>
          <p className="text-[11px] text-en-muted">表紙・表記ロック用</p>
        </div>
      </div>

      <div className="mt-5 space-y-4">
        <label className="block text-xs font-medium text-en-muted">
          提案先
          <input className="input-en mt-1.5" value={tuning.clientName} onChange={(e) => patch({ clientName: e.target.value })} />
        </label>
        <label className="block text-xs font-medium text-en-muted">
          資料版日
          <input className="input-en mt-1.5" value={tuning.documentDate} onChange={(e) => patch({ documentDate: e.target.value })} />
        </label>
        <label className="block text-xs font-medium text-en-muted">
          提案元
          <input className="input-en mt-1.5" value={tuning.proposerName} onChange={(e) => patch({ proposerName: e.target.value })} />
        </label>
        <label className="block text-xs font-medium text-en-muted">
          研修名（表紙・骨子）
          <input
            className="input-en mt-1.5"
            value={tuning.projectTitle}
            onChange={(e) => patch({ projectTitle: e.target.value })}
            placeholder="例：AI活用 営業プロセス改善研修（伴走型・全4回）"
          />
        </label>
      </div>

      <div className="mt-5 space-y-4 border-t border-en-border pt-5">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-en-muted">B標準 · 8枚固定</p>
        <Toggle label="実質負担スライド（7）" checked={tuning.netCostSlide} onChange={(v) => patch({ netCostSlide: v })} />
        <Toggle label="図解・イラスト強調" checked={tuning.illustrationEmphasis} onChange={(v) => patch({ illustrationEmphasis: v })} />
        <p className="text-xs text-en-muted/90">■固稿の文案省略は常に禁止</p>
      </div>
    </motion.div>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 text-sm">
      <span className="text-en-muted">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${checked ? "bg-gradient-to-r from-en-primary to-en-secondary shadow-inner shadow-en-primary/25" : "bg-white/10"}`}
      >
        <motion.span
          layout
          transition={{ type: "spring", stiffness: 520, damping: 32 }}
          className={`absolute top-0.5 size-6 rounded-full bg-white shadow-md ${checked ? "left-[22px]" : "left-0.5"}`}
        />
      </button>
    </label>
  );
}
