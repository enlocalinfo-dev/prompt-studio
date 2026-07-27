import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import type { PromptRuleDefaultsB, TuningB } from "@prompt-studio/core";
import { Button } from "../components/ui/Button";
import { useToast } from "../components/Toast";
import {
  DELIVERY_B_SLIDES,
  effectiveBSlideCount,
  fetchPromptRuleDefaults,
  PROMPT_RULE_LOGIC_SUMMARY,
} from "../lib/promptRulesApi";
import {
  clearPromptRuleOverrides,
  diffOverridesFromDefaults,
  loadPromptRuleOverrides,
  mergeOverridesWithDefaults,
  rememberDefaultsFingerprint,
  savePromptRuleOverrides,
} from "../lib/promptRuleStorage";
import { loadTuningB, saveTuningB } from "../lib/storage";

type TabId = "content" | "yaml" | "rules";

const TABS: { id: TabId; label: string; hint: string }[] = [
  {
    id: "content",
    label: "1. 内容の修正",
    hint: "案件要約・文案ロック（■固稿を削らない等）。LLMは■固稿のみ差し替え、ここは全案件共通の方針です。",
  },
  {
    id: "yaml",
    label: "2. デザインYAML",
    hint: "トンマナ・カラー・generation_constraints。Genspark の見た目と枚数指定に直結します。",
  },
  {
    id: "rules",
    label: "3. ルールの修正",
    hint: "絵文字禁止・イラスト量・ビジネストーン・最優先ルール（8枚固定など）。",
  },
];

export function PromptRulesPage() {
  const nav = useNavigate();
  const { pushSuccess, pushError } = useToast();
  const [tab, setTab] = useState<TabId>("content");
  const [defaults, setDefaults] = useState<PromptRuleDefaultsB | null>(null);
  const [draft, setDraft] = useState<Required<PromptRuleDefaultsB> | null>(null);
  const [tuning, setTuning] = useState<TuningB>(() => loadTuningB());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const d = await fetchPromptRuleDefaults();
        if (cancelled) return;
        setDefaults(d);
        rememberDefaultsFingerprint(d);
        const merged = mergeOverridesWithDefaults(d, loadPromptRuleOverrides());
        setDraft(merged);
      } catch (e) {
        pushError(e instanceof Error ? e.message : "読み込みに失敗しました");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pushError]);

  const slideCount = useMemo(() => effectiveBSlideCount(tuning), [tuning]);

  const patchTuning = useCallback((partial: Partial<TuningB>) => {
    setTuning((prev) => {
      const next = { ...prev, ...partial };
      saveTuningB(next);
      return next;
    });
  }, []);

  const save = useCallback(() => {
    if (!defaults || !draft) return;
    const overrides = diffOverridesFromDefaults(draft, defaults);
    savePromptRuleOverrides(overrides);
    pushSuccess("プロンプトルールを保存しました。次回の作成から反映されます。");
  }, [defaults, draft, pushSuccess]);

  const resetAll = useCallback(() => {
    if (!defaults) return;
    clearPromptRuleOverrides();
    setDraft({
      contentPolicy: defaults.contentPolicy,
      designYaml: defaults.designYaml,
      behaviorRules: defaults.behaviorRules,
    });
    pushSuccess("B標準のデフォルトに戻しました");
  }, [defaults, pushSuccess]);

  if (loading) {
    return <p className="text-sm text-en-muted">B標準テンプレからルールを読み込んでいます…</p>;
  }

  if (!defaults || !draft) {
    return (
      <div className="glass-panel rounded-2xl p-8 text-center text-sm text-en-muted">
        テンプレを読み込めませんでした。
        <div className="mt-4">
          <Button onClick={() => window.location.reload()}>再読み込み</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <Button variant="ghost" className="!px-0 !py-1" onClick={() => nav("/")}>
          ← トップ
        </Button>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight md:text-3xl">プロンプトルール</h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-en-muted">
          提案プロンプト作成の<strong className="font-medium text-en-text">共通ロジック</strong>
          を確認し、内容・デザインYAML・出力ルールの3区分で編集できます。案件ごとの■固稿は見積PDF作成時にLLMが差し替えます。
        </p>
      </div>

      <section className="glass-panel rounded-2xl p-5 md:p-6">
        <h2 className="text-sm font-semibold text-en-text">この機能の動き方</h2>
        <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-en-muted">
          {PROMPT_RULE_LOGIC_SUMMARY.pipeline.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-en-border bg-en-deep/25 p-4">
            <p className="text-xs font-semibold text-en-accent">いまの出力枚数（見込み）</p>
            <p className="mt-2 text-3xl font-bold text-en-text">
              {slideCount}
              <span className="ml-2 text-base font-normal text-en-muted">枚</span>
            </p>
            <p className="mt-2 text-xs leading-relaxed text-en-muted">{PROMPT_RULE_LOGIC_SUMMARY.slideCountNote}</p>
          </div>
          <div className="rounded-xl border border-en-border bg-en-deep/25 p-4">
            <p className="text-xs font-semibold text-en-accent">図解・イラスト</p>
            <p className="mt-2 text-sm text-en-text">
              {tuning.illustrationEmphasis ? "多め（40%以上・シーンイラスト可）" : "控えめ（20〜30%・図表中心）"}
            </p>
            <p className="mt-2 text-xs leading-relaxed text-en-muted">{PROMPT_RULE_LOGIC_SUMMARY.illustrationNote}</p>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <ToggleRow
            label="実質負担のスライド（7枚目）を含める"
            checked={tuning.netCostSlide}
            onChange={(v) => patchTuning({ netCostSlide: v })}
          />
          <ToggleRow
            label="図解・イラストを多めに指示"
            checked={tuning.illustrationEmphasis}
            onChange={(v) => patchTuning({ illustrationEmphasis: v })}
          />
        </div>
      </section>

      <section className="glass-panel rounded-2xl p-5 md:p-6">
        <h2 className="text-sm font-semibold text-en-text">8枚の役割（B標準）</h2>
        <ul className="mt-3 space-y-2 text-xs text-en-muted">
          {DELIVERY_B_SLIDES.map((s) => (
            <li key={s.order} className="flex gap-2 border-b border-en-border/50 pb-2 last:border-0">
              <span className="shrink-0 font-mono text-en-primary-bright">{String(s.order).padStart(2, "0")}</span>
              <span>
                <span className="font-medium text-en-text">{s.slideLabel}</span>
                {s.element ? `（${s.element}）` : ""} — {s.summary}
                {!tuning.netCostSlide && s.order === 7 && (
                  <span className="text-en-accent"> · 現在OFFのため出力から除外</span>
                )}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="glass-panel rounded-2xl p-5 md:p-6">
        <div className="flex flex-wrap gap-2 border-b border-en-border pb-4">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`rounded-lg px-3 py-2 text-xs font-medium transition-colors md:text-sm ${
                tab === t.id
                  ? "bg-en-primary/20 text-en-text ring-1 ring-en-primary/40"
                  : "text-en-muted hover:bg-white/[0.04] hover:text-en-text"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <p className="mt-3 text-xs text-en-muted">{TABS.find((t) => t.id === tab)?.hint}</p>

        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4"
        >
          <textarea
            className="input-en min-h-[320px] w-full font-mono text-[11px] leading-relaxed md:min-h-[420px] md:text-xs"
            value={
              tab === "content" ? draft.contentPolicy : tab === "yaml" ? draft.designYaml : draft.behaviorRules
            }
            onChange={(e) => {
              const v = e.target.value;
              setDraft((prev) =>
                prev
                  ? {
                      ...prev,
                      ...(tab === "content"
                        ? { contentPolicy: v }
                        : tab === "yaml"
                          ? { designYaml: v }
                          : { behaviorRules: v }),
                    }
                  : prev,
              );
            }}
            spellCheck={false}
          />
        </motion.div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Button onClick={save}>ルールを保存</Button>
          <Button variant="secondary" onClick={resetAll}>
            B標準にリセット
          </Button>
          <Link
            to="/create/b"
            className="inline-flex items-center justify-center rounded-xl border border-en-border px-4 py-2.5 text-sm text-en-text hover:border-en-primary/40"
          >
            見積PDFで作成へ
          </Link>
        </div>
      </section>
    </div>
  );
}

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex flex-1 cursor-pointer items-center justify-between gap-3 rounded-xl border border-en-border px-4 py-3 text-sm">
      <span className="text-en-muted">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${checked ? "bg-gradient-to-r from-en-primary to-en-secondary" : "bg-white/10"}`}
      >
        <span
          className={`absolute top-0.5 size-6 rounded-full bg-white shadow-md transition-all ${checked ? "left-[22px]" : "left-0.5"}`}
        />
      </button>
    </label>
  );
}
