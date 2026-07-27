import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { parseGensparkPrompt, type PromptSegment } from "@prompt-studio/core";
import { PromptWorkspace } from "../components/PromptWorkspace";
import { StickyCopyBar } from "../components/StickyCopyBar";
import { useToast } from "../components/Toast";
import { Button } from "../components/ui/Button";
import { loadSession, saveSession, type SessionPayload } from "../lib/storage";

type LocationState = { session?: SessionPayload };

export function ResultPage() {
  const nav = useNavigate();
  const location = useLocation();
  const { pushSuccess, pushError } = useToast();
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
        表示する結果がありません。先に見積PDFから作成してください。
        <div className="mt-4 flex justify-center gap-2">
          <Button variant="primary" onClick={() => nav("/create/b")}>
            作成を開始
          </Button>
        </div>
      </div>
    );
  }

  async function copyGenspark() {
    const text = content!.gensparkText || content!.markdown;
    try {
      await navigator.clipboard.writeText(text);
      pushSuccess("コピーしました。Genspark に貼り付けてください。");
    } catch {
      pushError("コピーできませんでした");
    }
  }

  function downloadMd() {
    const blob = new Blob([content!.markdown], { type: "text/markdown;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "genspark_prompt.md";
    a.click();
    URL.revokeObjectURL(a.href);
    pushSuccess("ファイルを保存しました");
  }

  return (
    <>
      <StickyCopyBar visible onCopy={() => void copyGenspark()} onDownload={downloadMd} />
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="pb-28"
      >
        <Button variant="ghost" className="!px-0 !py-1" onClick={() => nav("/create")}>
          ← 作成に戻る
        </Button>

        <div className="mt-4">
          <h1 className="text-2xl font-semibold tracking-tight">プレビュー</h1>
          <p className="mt-2 font-mono text-xs text-en-muted">{content.folderNameSuggestion}</p>
        </div>

        <div className="mt-6">
          <PromptWorkspace
            segments={segments}
            gensparkText={content.gensparkText || content.markdown}
            onCopySegment={async (text) => {
              await navigator.clipboard.writeText(text);
              pushSuccess("コピーしました");
            }}
          />
        </div>
      </motion.div>
    </>
  );
}
