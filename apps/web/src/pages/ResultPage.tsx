import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { parseGensparkPrompt, type PromptSegment } from "@prompt-studio/core";
import { PromptWorkspace } from "../components/PromptWorkspace";
import { useToast } from "../components/Toast";
import { Button } from "../components/ui/Button";
import { loadSession, saveSession, type SessionPayload } from "../lib/storage";

type LocationState = { session?: SessionPayload };

export function ResultPage() {
  const nav = useNavigate();
  const location = useLocation();
  const { push } = useToast();
  const navState = (location.state as LocationState | null)?.session;

  const [session, setSession] = useState<SessionPayload | null>(() => navState ?? loadSession());

  useEffect(() => {
    const next = navState ?? loadSession();
    if (next) {
      if (navState) saveSession(navState);
      setSession(next);
    }
  }, [location.key, navState]);

  const content = session?.result ?? null;

  const segments: PromptSegment[] = useMemo(() => {
    if (!content) return [];
    if (content.segments?.length) return content.segments;
    return parseGensparkPrompt(content.markdown);
  }, [content]);

  if (!session || !content) {
    return (
      <div className="glass-panel rounded-2xl p-8 text-center text-sm text-en-muted">
        生成結果がありません。先にプロンプトを生成してください。
        <div className="mt-4">
          <Button variant="secondary" onClick={() => nav("/")}>
            ホームへ
          </Button>
        </div>
      </div>
    );
  }

  async function copyGenspark() {
    const text = content!.gensparkText || content!.markdown;
    await navigator.clipboard.writeText(text);
    push("Genspark 用 text をコピーしました");
  }

  function downloadMd() {
    const blob = new Blob([content!.markdown], { type: "text/markdown;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "genspark_prompt.md";
    a.click();
    URL.revokeObjectURL(a.href);
    push("ダウンロードしました");
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
    >
      <Button variant="ghost" className="!px-0 !py-1" onClick={() => nav("/create")}>
        ← 骨子入力に戻る
      </Button>

      <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-en-accent">Step 2 — プロンプト</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">生成結果（2ペイン確認）</h1>
          <p className="mt-2 font-mono text-xs text-en-muted">{content.folderNameSuggestion}</p>
          <p className="mt-1 text-[11px] text-en-muted">
            {content.usedLlm ? "Claude 生成" : "テンプレ合成"} · {segments.length} パート
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={copyGenspark}>
            Genspark 全文コピー
          </Button>
          <Button variant="primary" onClick={downloadMd}>
            .md ダウンロード
          </Button>
        </div>
      </div>

      <div className="mt-6">
        <PromptWorkspace
          segments={segments}
          gensparkText={content.gensparkText || content.markdown}
          onCopySegment={async (text) => {
            await navigator.clipboard.writeText(text);
            push("コピーしました");
          }}
        />
      </div>
    </motion.div>
  );
}
