import { useState } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { formatCreatePath, formatRulesPath, type ProposalFormatDef } from "../lib/proposalFormats";
import { useProposalFormats } from "../hooks/useProposalFormats";
import { AddProposalFormatModal } from "./AddProposalFormatModal";
import { removeCustomProposalFormat } from "../lib/customProposalFormats";
import { clearPromptRuleOverrides } from "../lib/promptRuleStorage";

const ease = [0.22, 1, 0.36, 1] as const;

type Mode = "create" | "rules";

export function ProposalFormatCards({ compact, mode = "create" }: { compact?: boolean; mode?: Mode }) {
  const nav = useNavigate();
  const { formats, refresh } = useProposalFormats();
  const [addOpen, setAddOpen] = useState(false);

  function handleRemove(f: ProposalFormatDef) {
    if (!f.isCustom) return;
    if (!window.confirm(`「${f.title}」を削除しますか？ルールの上書きも消えます。`)) return;
    removeCustomProposalFormat(f.id);
    clearPromptRuleOverrides(f.id);
    refresh();
  }

  return (
    <>
      <div className={`grid gap-4 ${compact ? "sm:grid-cols-2" : "md:grid-cols-3"}`}>
        {formats.map((f, i) => {
          const createEnabled = mode === "create" && f.available;
          const rulesEnabled = mode === "rules" && f.rulesAvailable;
          return (
            <motion.div
              key={f.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04, duration: 0.35, ease }}
              className={`relative rounded-2xl border p-5 md:p-6 ${
                createEnabled || rulesEnabled
                  ? "border-en-border bg-white/[0.04]"
                  : mode === "create" && !f.available
                    ? "border-en-border/60 bg-en-deep/20 opacity-80"
                    : "border-en-border bg-white/[0.04]"
              }`}
            >
              {f.isCustom && (
                <button
                  type="button"
                  onClick={() => handleRemove(f)}
                  className="absolute right-3 top-3 text-[10px] text-en-muted hover:text-en-accent"
                >
                  削除
                </button>
              )}
              <span
                className={`inline-flex size-10 items-center justify-center rounded-xl text-sm font-bold ${
                  f.rulesAvailable || f.available
                    ? "bg-gradient-to-br from-en-primary to-en-secondary text-en-on-primary shadow-md shadow-en-primary/25"
                    : "bg-en-deep text-en-muted"
                }`}
              >
                {f.formatBadge.slice(0, 3)}
              </span>
              <h3 className="mt-4 text-base font-semibold text-en-text">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-en-muted">{f.description}</p>
              <p className="mt-3 text-[11px] text-en-primary-bright/90">{f.detail}</p>
              {f.isCustom && f.engine === "none" && mode === "create" && (
                <p className="mt-2 text-[10px] text-en-accent">ルール編集のみ（PDF作成は未接続）</p>
              )}

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

              {mode === "create" && !f.available && f.rulesAvailable && (
                <Link
                  to={formatRulesPath(f.rulesSlug)}
                  className="mt-5 block w-full rounded-xl border border-en-border px-3 py-2.5 text-center text-xs font-medium text-en-text hover:border-en-primary/40"
                >
                  プロンプトルールを編集
                </Link>
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
            </motion.div>
          );
        })}

        <motion.button
          type="button"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: formats.length * 0.04, duration: 0.35, ease }}
          onClick={() => setAddOpen(true)}
          className="flex min-h-[200px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-en-primary/35 bg-en-primary/5 p-5 text-center transition-colors hover:border-en-primary/55 hover:bg-en-primary/10 md:min-h-[220px]"
        >
          <span className="flex size-12 items-center justify-center rounded-full bg-en-primary/20 text-2xl font-light text-en-primary-bright">
            +
          </span>
          <span className="mt-3 text-sm font-semibold text-en-text">資料の種類を追加</span>
          <span className="mt-1 text-xs text-en-muted">YAML・ルール付きで登録</span>
        </motion.button>
      </div>

      <AddProposalFormatModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onAdded={(slug) => {
          refresh();
          if (mode === "rules") nav(formatRulesPath(slug));
        }}
      />
    </>
  );
}
