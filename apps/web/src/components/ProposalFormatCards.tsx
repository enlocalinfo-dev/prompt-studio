import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { PROPOSAL_FORMATS, formatCreatePath } from "../lib/proposalFormats";

const ease = [0.22, 1, 0.36, 1] as const;

export function ProposalFormatCards({ compact }: { compact?: boolean }) {
  const nav = useNavigate();

  return (
    <div className={`grid gap-4 ${compact ? "sm:grid-cols-2" : "md:grid-cols-3"}`}>
      {PROPOSAL_FORMATS.map((f, i) => (
        <motion.button
          key={`${f.title}-${i}`}
          type="button"
          disabled={!f.available}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.06, duration: 0.35, ease }}
          whileHover={f.available ? { y: -3, transition: { type: "spring", stiffness: 420, damping: 28 } } : undefined}
          whileTap={f.available ? { scale: 0.98 } : undefined}
          onClick={() => {
            if (f.available) nav(formatCreatePath(f.routeSlug));
          }}
          className={`group relative rounded-2xl border p-5 text-left transition-colors md:p-6 ${
            f.available
              ? "cursor-pointer border-en-border bg-white/[0.04] hover:border-en-primary/45 hover:bg-en-primary/8"
              : "cursor-not-allowed border-en-border/60 bg-en-deep/20 opacity-55"
          }`}
        >
          {!f.available && (
            <span className="absolute right-3 top-3 rounded-md bg-en-deep/80 px-2 py-0.5 text-[10px] font-medium text-en-muted">
              準備中
            </span>
          )}
          <span
            className={`inline-flex size-10 items-center justify-center rounded-xl text-sm font-bold ${
              f.available
                ? "bg-gradient-to-br from-en-primary to-en-secondary text-en-on-primary shadow-md shadow-en-primary/25"
                : "bg-en-deep text-en-muted"
            }`}
          >
            {f.available ? "B" : "—"}
          </span>
          <h3 className="mt-4 text-base font-semibold text-en-text">{f.title}</h3>
          <p className="mt-2 text-sm leading-relaxed text-en-muted">{f.description}</p>
          <p className="mt-3 text-[11px] text-en-primary-bright/90">{f.detail}</p>
          {f.available && (
            <p className="mt-4 text-xs font-medium text-en-text opacity-0 transition-opacity group-hover:opacity-100">
              クリックして PDF をアップロード →
            </p>
          )}
        </motion.button>
      ))}
    </div>
  );
}
