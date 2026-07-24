import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useToast } from "../components/Toast";
import { Button } from "../components/ui/Button";
import { loadSession } from "../lib/storage";

type Tab = "full" | "genspark" | "meta";

export function ResultPage() {
  const nav = useNavigate();
  const { push } = useToast();
  const session = loadSession();
  const [tab, setTab] = useState<Tab>("genspark");

  const content = useMemo(() => session?.result ?? null, [session]);

  if (!session || !content) {
    return (
      <div className="glass-panel rounded-2xl p-8 text-center text-sm text-en-muted">
        生成結果がありません。
        <div className="mt-4">
          <Button variant="secondary" onClick={() => nav("/")}>
            ホームへ
          </Button>
        </div>
      </div>
    );
  }

  const display =
    tab === "full"
      ? content.markdown
      : tab === "genspark"
        ? content.gensparkText || "（Genspark text ブロックが見つかりません）"
        : `推奨フォルダ名:\n${content.folderNameSuggestion}\n\nLLM: ${content.usedLlm ? "使用" : "モック/合成"}`;

  async function copyText() {
    await navigator.clipboard.writeText(display);
    push("コピーしました");
  }

  function downloadMd() {
    if (!content) return;
    const blob = new Blob([content.markdown], { type: "text/markdown;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "genspark_prompt.md";
    a.click();
    URL.revokeObjectURL(a.href);
    push("ダウンロードしました");
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "genspark", label: "Gensparkコピー用" },
    { id: "full", label: "全文" },
    { id: "meta", label: "版情報" },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}>
      <Button variant="ghost" className="!px-0 !py-1" onClick={() => nav(`/create/${session.formatId}`)}>
        ← 入力に戻る
      </Button>

      <div className="mt-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-en-accent">Step 2 — 出力</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">生成結果</h1>
        <p className="mt-2 font-mono text-xs text-en-muted">{content.folderNameSuggestion}</p>
      </div>

      <div className="glass-panel mt-6 overflow-hidden rounded-2xl">
        <div className="flex border-b border-en-border px-2 pt-2">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className="relative px-4 py-3 text-sm text-en-muted transition-colors hover:text-en-text"
            >
              {tab === t.id && (
                <motion.span
                  layoutId="result-tab"
                  className="absolute inset-x-1 bottom-0 h-0.5 rounded-full bg-gradient-to-r from-en-primary to-en-secondary"
                  transition={{ type: "spring", stiffness: 380, damping: 32 }}
                />
              )}
              <span className={`relative ${tab === t.id ? "font-medium text-en-text" : ""}`}>{t.label}</span>
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2 border-b border-en-border bg-en-deep/40 px-4 py-3">
          <Button variant="secondary" onClick={copyText}>
            コピー
          </Button>
          <Button variant="primary" onClick={downloadMd}>
            .md ダウンロード
          </Button>
        </div>

        <pre className="max-h-[58vh] overflow-auto p-4 font-mono text-[11px] leading-relaxed whitespace-pre-wrap text-en-text/90 md:p-5 md:text-xs">
          {display}
        </pre>
      </div>
    </motion.div>
  );
}
