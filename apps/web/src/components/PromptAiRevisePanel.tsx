import { useState } from "react";
import { motion } from "framer-motion";
import { parseGensparkPrompt, type TuningB } from "@prompt-studio/core";
import { postRevisePrompt } from "../lib/api";
import { Button } from "./ui/Button";
import { useToast } from "./Toast";

export function PromptAiRevisePanel({
  gensparkText,
  markdown,
  tuning,
  focusLabel,
  disabled,
  onRevised,
}: {
  gensparkText: string;
  markdown: string;
  tuning: TuningB;
  focusLabel?: string;
  disabled?: boolean;
  onRevised: (payload: { gensparkText: string; markdown: string }) => void;
}) {
  const { pushSuccess, pushError } = useToast();
  const [instruction, setInstruction] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!instruction.trim()) {
      pushError("修正内容を入力してください");
      return;
    }
    setLoading(true);
    try {
      const result = await postRevisePrompt({
        gensparkText,
        markdown,
        instruction,
        tuning,
        focusLabel,
      });
      if (result.error) {
        pushError(result.error);
        return;
      }
      onRevised({ gensparkText: result.gensparkText, markdown: result.markdown });
      pushSuccess(result.usedLlm ? "AIでプロンプトを更新しました" : "更新しました");
      setInstruction("");
    } catch (e) {
      pushError(e instanceof Error ? e.message : "修正に失敗しました");
    } finally {
      setLoading(false);
    }
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-panel mt-8 rounded-2xl p-5 md:p-6"
    >
      <h2 className="text-lg font-semibold text-en-text">AIで内容修正</h2>
      <p className="mt-2 text-sm text-en-muted">
        指示を入力すると、■固稿や文案をAIが調整します。ルール・YAMLは指示がない限り維持されます。反映後は上のプレビューと履歴が更新されます。
      </p>
      {focusLabel && (
        <p className="mt-2 text-xs text-en-primary-bright">いまのフォーカス: {focusLabel}</p>
      )}
      <textarea
        className="input-en mt-4 min-h-[120px] w-full text-sm leading-relaxed"
        placeholder="例：スライド6のROI試算を保守的な数値に書き換える／対象者を20名に変更／イラスト指示を控えめに"
        value={instruction}
        disabled={disabled || loading}
        onChange={(e) => setInstruction(e.target.value)}
      />
      <div className="mt-4 flex flex-wrap gap-3">
        <Button disabled={disabled || loading} onClick={() => void submit()}>
          {loading ? "修正中…" : "AIで反映"}
        </Button>
      </div>
    </motion.section>
  );
}

/** セッション更新用：segments 再解析 */
export function segmentsAfterRevise(markdown: string, gensparkText: string) {
  return parseGensparkPrompt(markdown.length > 100 ? markdown : gensparkText);
}
