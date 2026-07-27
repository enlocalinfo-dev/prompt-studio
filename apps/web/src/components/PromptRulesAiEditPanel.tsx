import { useState } from "react";
import { motion } from "framer-motion";
import type { PromptRuleDefaultsB } from "@prompt-studio/core";
import { postRevisePromptRules } from "../lib/api";
import { Button } from "./ui/Button";
import { useToast } from "./Toast";

export function PromptRulesAiEditPanel({
  draft,
  disabled,
  onRevised,
}: {
  draft: Required<PromptRuleDefaultsB>;
  disabled?: boolean;
  onRevised: (next: Required<PromptRuleDefaultsB>) => void;
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
      const result = await postRevisePromptRules({
        contentPolicy: draft.contentPolicy,
        designYaml: draft.designYaml,
        behaviorRules: draft.behaviorRules,
        instruction,
      });
      if (result.error) {
        pushError(result.error);
        return;
      }
      onRevised(result.rules);
      pushSuccess(result.usedLlm ? "AIでルールを更新しました" : "更新しました");
      setInstruction("");
    } catch (e) {
      pushError(e instanceof Error ? e.message : "修正に失敗しました");
    } finally {
      setLoading(false);
    }
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-panel rounded-2xl border border-en-secondary/30 p-5 md:p-6"
    >
      <h2 className="text-lg font-semibold text-en-text">AIで内容を編集</h2>
      <p className="mt-2 text-sm text-en-muted">
        内容方針・デザインYAML・出力ルールの3区分を、自然言語の指示でまとめて直せます。スライドの■固稿そのものは案件生成時に差し替わります（ここでは共通ルールを編集）。
      </p>
      <textarea
        className="input-en mt-4 min-h-[100px] w-full text-sm leading-relaxed"
        placeholder="例：イラスト指示をさらに控えめに／primary色を #1565C0 に／8枚固定の文言を7枚用に書き換え／ビジネストーンの禁止語を追加"
        value={instruction}
        disabled={disabled || loading}
        onChange={(e) => setInstruction(e.target.value)}
      />
      <div className="mt-4">
        <Button disabled={disabled || loading} onClick={() => void submit()}>
          {loading ? "反映中…" : "AIでルールに反映"}
        </Button>
      </div>
    </motion.section>
  );
}
