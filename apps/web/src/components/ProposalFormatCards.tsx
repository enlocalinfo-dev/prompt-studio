import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { PROPOSAL_FORMATS, formatCreatePath, formatRulesPath } from "../lib/proposalFormats";

const ease = [0.22, 1, 0.36, 1] as const;

type Mode = "create" | "rules";

export function ProposalFormatCards({ compact, mode = "create" }: { compact?: boolean; mode?: Mode }) {
  const nav = useNavigate();

  return (
    <div className={`grid gap-4 ${compact ? "sm:grid-cols-2" : "md:grid-cols-3"}`}>
      {PROPOSAL_FORMATS.map((f, i) => {
        const enabled = mode === "create" ? f.available : f.rulesAvailable;
        return (
          <motion.div
            key={f.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06, duration: 0.35, ease }}
            className={`relative rounded-2xl border p-5 md:p-6 ${
              enabled
                ? "border-en-border bg-white/[0.04]"
                : "border-en-border/60 bg-en-deep/20 opacity-55"
            }`}
          >
            {!enabled && (
              <span className="absolute right-3 top-3 rounded-md bg-en-deep/80 px-2 py-0.5 text-[10px] font-medium text-en-muted">
                準備中
              </span>
            )}
            <span
              className={`inline-flex size-10 items-center justify-center rounded-xl text-sm font-bold ${
                enabled
                  ? "bg-gradient-to-br from-en-primary to-en-secondary text-en-on-primary shadow-md shadow-en-primary/25"
                  : "bg-en-deep text-en-muted"
              }`}
            >
              {f.formatBadge}
            </span>
            <h3 className="mt-4 text-base font-semibold text-en-text">{f.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-en-muted">{f.description}</p>
            <p className="mt-3 text-[11px] text-en-primary-bright/90">{f.detail}</p>

            {mode === "create" && f.available && (
              <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={() => nav(formatCreatePath(f.createSlug))}
                  className="flex-1 rounded-xl bg-en-primary/90 px-3 py-2.5 text-xs font-medium text-en-on-primary hover:bg-en-primary"
                >
                  PDFで作成
                </button>
                <Link
                  to={formatRulesPath(f.rulesSlug)}
                  className="flex-1 rounded-xl border border-en-border px-3 py-2.5 text-center text-xs font-medium text-en-text hover:border-en-primary/40 hover:bg-white/[0.04]"
                >
                  プロンプトルール
                </Link>
              </div>
            )}

            {mode === "rules" && f.rulesAvailable && (
              <button
                type="button"
                onClick={() => nav(formatRulesPath(f.rulesSlug))}
                className="mt-5 w-full rounded-xl bg-en-primary/90 px-3 py-2.5 text-xs font-medium text-en-on-primary hover:bg-en-primary"
              >
                この資料のルールを編集
              </button>
            )}

            {mode === "create" && f.available && (
              <p className="mt-2 text-[10px] text-en-muted">ルールは資料の種類ごとに保存されます</p>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}
