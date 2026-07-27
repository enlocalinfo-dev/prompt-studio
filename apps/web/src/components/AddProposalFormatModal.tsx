import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { PromptRuleDefaultsB } from "@prompt-studio/core";
import { addCustomProposalFormat } from "../lib/customProposalFormats";
import { allReservedSlugs } from "../lib/proposalFormats";
import { fetchBuiltinBRuleDefaults } from "../lib/promptRulesApi";
import { Button } from "./ui/Button";
import { useToast } from "./Toast";

type Props = {
  open: boolean;
  onClose: () => void;
  onAdded: (rulesSlug: string) => void;
};

const EMPTY_DEFAULTS: PromptRuleDefaultsB = {
  contentPolicy: "【案件要約】\n（ここに内容方針を記載）",
  designYaml: "design_system:\n  format_type: custom\n  tone_and_manner:\n    required:\n      - business-like Japanese",
  behaviorRules: "【非AI感・装飾ロック】\n- 絵文字・装飾用Unicode記号は使用しない",
};

export function AddProposalFormatModal({ open, onClose, onAdded }: Props) {
  const { pushSuccess, pushError } = useToast();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [detail, setDetail] = useState("");
  const [copyFromB, setCopyFromB] = useState(true);
  const [enablePdf, setEnablePdf] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [contentPolicy, setContentPolicy] = useState("");
  const [designYaml, setDesignYaml] = useState("");
  const [behaviorRules, setBehaviorRules] = useState("");
  const [busy, setBusy] = useState(false);

  function resetForm() {
    setTitle("");
    setDescription("");
    setDetail("");
    setCopyFromB(true);
    setEnablePdf(false);
    setShowAdvanced(false);
    setContentPolicy("");
    setDesignYaml("");
    setBehaviorRules("");
  }

  async function handleSubmit() {
    if (!title.trim()) {
      pushError("資料の名前を入力してください");
      return;
    }
    setBusy(true);
    try {
      let ruleDefaults: PromptRuleDefaultsB;
      if (showAdvanced && (contentPolicy.trim() || designYaml.trim() || behaviorRules.trim())) {
        ruleDefaults = {
          contentPolicy: contentPolicy.trim() || EMPTY_DEFAULTS.contentPolicy,
          designYaml: designYaml.trim() || EMPTY_DEFAULTS.designYaml,
          behaviorRules: behaviorRules.trim() || EMPTY_DEFAULTS.behaviorRules,
        };
      } else if (copyFromB) {
        ruleDefaults = await fetchBuiltinBRuleDefaults();
      } else {
        ruleDefaults = EMPTY_DEFAULTS;
      }

      const entry = addCustomProposalFormat({
        title,
        description: description || "プロンプトルールを編集してから利用できます",
        detail: detail || "カスタム資料種別",
        ruleDefaults,
        engine: enablePdf ? "b" : "none",
        reservedSlugs: allReservedSlugs(),
      });

      pushSuccess(`「${entry.title}」を追加しました`);
      resetForm();
      onClose();
      onAdded(entry.rulesSlug);
    } catch (e) {
      pushError(e instanceof Error ? e.message : "追加に失敗しました");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 16, opacity: 0 }}
            className="glass-panel max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl p-5 md:p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold text-en-text">資料の種類を追加</h2>
            <p className="mt-2 text-sm text-en-muted">
              協業・商品化など、新しい資料種別を登録します。YAML・ルールは追加後に編集できます。
            </p>

            <label className="mt-4 block text-xs font-medium text-en-muted">
              資料名（必須）
              <input
                className="input-en mt-1.5 w-full"
                value={title}
                placeholder="例：協業・商品化の提案書"
                onChange={(e) => setTitle(e.target.value)}
              />
            </label>
            <label className="mt-3 block text-xs font-medium text-en-muted">
              説明（一覧に表示）
              <input
                className="input-en mt-1.5 w-full"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </label>
            <label className="mt-3 block text-xs font-medium text-en-muted">
              補足1行
              <input className="input-en mt-1.5 w-full" value={detail} onChange={(e) => setDetail(e.target.value)} />
            </label>

            <div className="mt-4 space-y-3 rounded-xl border border-en-border bg-en-deep/20 p-3">
              <label className="flex cursor-pointer items-start gap-3 text-sm">
                <input
                  type="checkbox"
                  checked={copyFromB}
                  disabled={showAdvanced}
                  onChange={(e) => setCopyFromB(e.target.checked)}
                  className="mt-1"
                />
                <span className="text-en-muted">
                  ルールひな形に<strong className="text-en-text">研修B標準</strong>をコピー（内容・YAML・禁止事項）
                </span>
              </label>
              <label className="flex cursor-pointer items-start gap-3 text-sm">
                <input
                  type="checkbox"
                  checked={enablePdf}
                  onChange={(e) => setEnablePdf(e.target.checked)}
                  className="mt-1"
                />
                <span className="text-en-muted">
                  <strong className="text-en-text">見積PDFで作成</strong>も使う（B形式エンジン・研修と同じ生成）
                </span>
              </label>
            </div>

            <button
              type="button"
              className="mt-3 text-xs text-en-primary-bright hover:underline"
              onClick={() => setShowAdvanced((o) => !o)}
            >
              {showAdvanced ? "詳細入力を閉じる" : "ルールを最初から自分で入力（上級）"}
            </button>

            {showAdvanced && (
              <div className="mt-3 space-y-2">
                <textarea
                  className="input-en min-h-[80px] w-full font-mono text-[10px]"
                  placeholder="内容の修正ブロック"
                  value={contentPolicy}
                  onChange={(e) => setContentPolicy(e.target.value)}
                />
                <textarea
                  className="input-en min-h-[80px] w-full font-mono text-[10px]"
                  placeholder="design_system YAML"
                  value={designYaml}
                  onChange={(e) => setDesignYaml(e.target.value)}
                />
                <textarea
                  className="input-en min-h-[80px] w-full font-mono text-[10px]"
                  placeholder="ルール（非AI・イラスト等）"
                  value={behaviorRules}
                  onChange={(e) => setBehaviorRules(e.target.value)}
                />
              </div>
            )}

            <div className="mt-6 flex flex-wrap gap-3">
              <Button disabled={busy} onClick={() => void handleSubmit()}>
                {busy ? "追加中…" : "追加する"}
              </Button>
              <Button variant="secondary" disabled={busy} onClick={onClose}>
                キャンセル
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
