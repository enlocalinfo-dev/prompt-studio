import type { TuningB } from "@prompt-studio/core";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { saveTuningB } from "../lib/storage";

interface Props {
  tuning: TuningB;
  onChange: (t: TuningB) => void;
  disabled?: boolean;
  fieldErrors?: Partial<Record<"clientName" | "documentDate" | "proposerName", string>>;
}

export function FineTunePanel({ tuning, onChange, disabled = false, fieldErrors = {} }: Props) {
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
      <div>
        <h2 className="text-sm font-semibold text-en-text">案件情報</h2>
        <p className="text-xs text-en-muted">表紙・版表示に使います</p>
      </div>

      <div className={`mt-5 space-y-4 ${disabled ? "opacity-50 pointer-events-none" : ""}`}>
        <MetaField
          label="提案先（必須）"
          value={tuning.clientName}
          error={fieldErrors.clientName}
          onChange={(v) => patch({ clientName: v })}
        />
        <MetaField
          label="資料版日（必須）"
          value={tuning.documentDate}
          error={fieldErrors.documentDate}
          placeholder="例：2026年7月25日"
          onChange={(v) => patch({ documentDate: v })}
        />
        <MetaField
          label="提案元（必須）"
          value={tuning.proposerName}
          error={fieldErrors.proposerName}
          onChange={(v) => patch({ proposerName: v })}
        />
        <MetaField
          label="研修名"
          value={tuning.projectTitle}
          placeholder="例：AI活用 営業プロセス改善研修（全4回）"
          onChange={(v) => patch({ projectTitle: v })}
        />
      </div>

      <div className={`mt-5 space-y-4 border-t border-en-border pt-5 ${disabled ? "opacity-50 pointer-events-none" : ""}`}>
        <p className="text-xs font-medium text-en-muted">出力オプション</p>
        <Toggle label="実質負担のスライドを含める" checked={tuning.netCostSlide} onChange={(v) => patch({ netCostSlide: v })} />
        <Toggle label="図解・イラストを多めに指示" checked={tuning.illustrationEmphasis} onChange={(v) => patch({ illustrationEmphasis: v })} />
        <p className="pt-2 text-center text-[11px]">
          <Link to="/rules" className="text-en-primary-bright hover:underline">
            プロンプトルール（枚数・YAML・禁止事項）を編集
          </Link>
        </p>
      </div>
    </motion.div>
  );
}

function MetaField({
  label,
  value,
  onChange,
  error,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  placeholder?: string;
}) {
  return (
    <label className="block text-xs font-medium text-en-muted">
      {label}
      <input
        className={`input-en mt-1.5 ${error ? "border-en-accent-strong/50" : ""}`}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
      {error && <span className="mt-1 block text-[11px] text-en-accent-strong">{error}</span>}
    </label>
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
