import type { FormatId, Tuning, TuningA, TuningB } from "@prompt-studio/core";
import { isTuningA } from "@prompt-studio/core";
import { motion } from "framer-motion";
import { saveTuning } from "../lib/storage";

interface Props {
  formatId: FormatId;
  tuning: Tuning;
  onChange: (t: Tuning) => void;
}

export function FineTunePanel({ formatId, tuning, onChange }: Props) {
  const patch = (partial: Partial<Tuning>) => {
    const next = { ...tuning, ...partial } as Tuning;
    onChange(next);
    saveTuning(formatId, next);
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
          FT
        </span>
        <div>
          <h2 className="text-sm font-semibold text-en-text">ファインチューニング</h2>
          <p className="text-[11px] text-en-muted">localStorage に保存</p>
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
          研修名（表紙・骨子）
          <input
            className="input-en mt-1.5"
            value={tuning.projectTitle}
            onChange={(e) => patch({ projectTitle: e.target.value })}
            placeholder="例：AI活用 営業プロセス改善研修（伴走型・全4回）"
          />
        </label>
      </div>

      {isTuningA(tuning) ? (
        <TuningAFields tuning={tuning} patch={patch} />
      ) : (
        <TuningBFields tuning={tuning as TuningB} patch={patch} />
      )}
    </motion.div>
  );
}

function TuningAFields({
  tuning,
  patch,
}: {
  tuning: TuningA;
  patch: (p: Partial<TuningA>) => void;
}) {
  return (
    <div className="mt-5 space-y-4 border-t border-en-border pt-5">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-en-muted">Format A</p>
      <label className="block text-xs font-medium text-en-muted">
        枚数（15〜18）
        <input type="number" min={15} max={18} className="input-en mt-1.5" value={tuning.slideCount} onChange={(e) => patch({ slideCount: Number(e.target.value) })} />
      </label>
      <Toggle label="情報密度 1.5倍ロック" checked={tuning.density15x} onChange={(v) => patch({ density15x: v })} />
      <Toggle label="セクション区切りスライド" checked={tuning.sectionDividers} onChange={(v) => patch({ sectionDividers: v })} />
      <label className="block text-xs font-medium text-en-muted">
        読み手
        <select className="input-en mt-1.5" value={tuning.audience} onChange={(e) => patch({ audience: e.target.value as "executive" | "field" })}>
          <option value="executive">経営層</option>
          <option value="field">現場含む</option>
        </select>
      </label>
    </div>
  );
}

function TuningBFields({ tuning, patch }: { tuning: TuningB; patch: (p: Partial<TuningB>) => void }) {
  return (
    <div className="mt-5 space-y-4 border-t border-en-border pt-5">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-en-muted">Format B · 8枚固定</p>
      <Toggle label="実質負担スライド" checked={tuning.netCostSlide} onChange={(v) => patch({ netCostSlide: v })} />
      <Toggle label="図解・イラスト強調" checked={tuning.illustrationEmphasis} onChange={(v) => patch({ illustrationEmphasis: v })} />
      <p className="text-xs text-en-muted/90">文案省略禁止：常時 ON</p>
    </div>
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
