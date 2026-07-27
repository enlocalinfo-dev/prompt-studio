import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import type { PromptRuleDefaultsB, TuningB } from "@prompt-studio/core";
import { defaultBSlideRoleOrder, normalizeBSlideRoleOrder } from "@prompt-studio/core";
import { ProposalFormatCards } from "../components/ProposalFormatCards";
import { PromptRulesAiEditPanel } from "../components/PromptRulesAiEditPanel";
import { PromptRulesYamlPreview } from "../components/PromptRulesYamlPreview";
import { SlideRoleDndList } from "../components/SlideRoleDndList";
import { Button } from "../components/ui/Button";
import { useToast } from "../components/Toast";
import { fetchPromptRuleDefaultsForFormat } from "../lib/promptRulesApi";
import {
  formatCreatePath,
  formatStorageId,
  getFormatByRulesSlug,
  type ProposalFormatDef,
} from "../lib/proposalFormats";
import {
  clearPromptRuleOverrides,
  loadPromptRuleOverrides,
  mergeOverridesWithDefaults,
  rememberDefaultsFingerprint,
} from "../lib/promptRuleStorage";
import { commitPromptRulesSave, initialSlideRoleOrder, type RulesDraft } from "../lib/promptRulesSave";
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
  const { formatSlug } = useParams<{ formatSlug?: string }>();

  if (!formatSlug) {
    return <PromptRulesFormatPicker />;
  }

  const format = getFormatByRulesSlug(formatSlug);
  if (!format) {
    return <PromptRulesFormatPicker invalidSlug={formatSlug} />;
  }

  if (format.rulesAvailable) {
    return <PromptRulesEditor format={format} />;
  }

  return <PromptRulesComingSoon format={format} />;
}

function PromptRulesFormatPicker({ invalidSlug }: { invalidSlug?: string }) {
  const nav = useNavigate();

  return (
    <div className="space-y-8">
      <div>
        <Button variant="ghost" className="!px-0 !py-1" onClick={() => nav("/")}>
          ← トップ
        </Button>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight md:text-3xl">プロンプトルール</h1>
        <p className="mt-2 max-w-2xl text-sm text-en-muted">
          <strong className="font-medium text-en-text">作成する資料の種類</strong>
          を選ぶと、その形式専用のルール（内容・YAML・禁止事項）を編集できます。種類ごとに別保存されます。
        </p>
        {invalidSlug && (
          <p className="mt-2 text-xs text-en-accent">「{invalidSlug}」に該当するルールはありません。下から選び直してください。</p>
        )}
      </div>
      <ProposalFormatCards mode="rules" />
    </div>
  );
}

function PromptRulesComingSoon({ format }: { format: ProposalFormatDef }) {
  const nav = useNavigate();
  return (
    <div className="glass-panel rounded-2xl p-8 text-center">
      <h1 className="text-xl font-semibold text-en-text">{format.title}</h1>
      <p className="mt-2 text-sm text-en-muted">プロンプトルールの編集は準備中です。</p>
      <div className="mt-6 flex justify-center gap-3">
        <Button variant="secondary" onClick={() => nav("/rules")}>
          資料の種類を選び直す
        </Button>
      </div>
    </div>
  );
}

function PromptRulesEditor({ format }: { format: ProposalFormatDef }) {
  const nav = useNavigate();
  const { pushSuccess, pushError } = useToast();
  const [tab, setTab] = useState<TabId>("content");
  const [defaults, setDefaults] = useState<PromptRuleDefaultsB | null>(null);
  const [draft, setDraft] = useState<RulesDraft | null>(null);
  const [slideRoleOrder, setSlideRoleOrder] = useState<number[]>(() => defaultBSlideRoleOrder());
  const [tuning, setTuning] = useState<TuningB>(() => loadTuningB());
  const [loading, setLoading] = useState(true);
  const storageId = formatStorageId(format);
  const isTrainingB = format.id === "training-delivery";

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const freshFormat = getFormatByRulesSlug(format.rulesSlug) ?? format;
        const d = await fetchPromptRuleDefaultsForFormat(freshFormat);
        if (cancelled) return;
        const tuningNow = loadTuningB();
        setTuning(tuningNow);
        setDefaults(d);
        rememberDefaultsFingerprint(d, storageId);
        const stored = loadPromptRuleOverrides(storageId);
        const merged = mergeOverridesWithDefaults(d, stored);
        setDraft(merged);
        setSlideRoleOrder(initialSlideRoleOrder(stored, tuningNow));
      } catch (e) {
        pushError(e instanceof Error ? e.message : "読み込みに失敗しました");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [format.rulesSlug, storageId, format, pushError]);

  const patchTuning = useCallback((partial: Partial<TuningB>) => {
    setTuning((prev) => {
      const next = { ...prev, ...partial };
      saveTuningB(next);
      if (partial.netCostSlide !== undefined) {
        setSlideRoleOrder((ord) => normalizeBSlideRoleOrder(ord, next));
      }
      return next;
    });
  }, []);

  const save = useCallback(() => {
    if (!defaults || !draft) return;
    const result = commitPromptRulesSave({
      defaults,
      draft,
      slideRoleOrder,
      tuning,
      storageId,
      syncSlideOrder: isTrainingB,
    });
    setDraft(result.draft);
    setSlideRoleOrder(result.slideRoleOrder);
    pushSuccess(`「${format.title}」のプロンプトルールを保存しました。`);
  }, [defaults, draft, slideRoleOrder, tuning, storageId, format.title, pushSuccess, isTrainingB]);

  const resetAll = useCallback(() => {
    if (!defaults) return;
    clearPromptRuleOverrides(storageId);
    setDraft({
      contentPolicy: defaults.contentPolicy,
      designYaml: defaults.designYaml,
      behaviorRules: defaults.behaviorRules,
    });
    setSlideRoleOrder(defaultBSlideRoleOrder());
    pushSuccess("ひな形のデフォルトに戻しました");
  }, [defaults, storageId, pushSuccess]);

  if (loading) {
    return <p className="text-sm text-en-muted">{format.title}のテンプレからルールを読み込んでいます…</p>;
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
        <Button variant="ghost" className="!px-0 !py-1" onClick={() => nav("/rules")}>
          ← 資料の種類を選び直す
        </Button>
        <div className="mt-2 flex flex-wrap items-baseline gap-2">
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">プロンプトルール</h1>
          <span className="rounded-md bg-en-primary/15 px-2 py-0.5 text-xs font-semibold text-en-primary-bright">
            {format.title}
          </span>
        </div>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-en-muted">
          この資料種別専用の共通ロジックです。保存内容は<strong className="font-medium text-en-text">「{format.title}」で作成するとき</strong>
          に反映されます。
        </p>
      </div>

      {isTrainingB && (
        <section className="glass-panel rounded-2xl p-5 md:p-6">
          <h2 className="text-sm font-semibold text-en-text">スライドの役割と出力順</h2>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <ToggleRow
              label="実質負担のスライドを含める"
              checked={tuning.netCostSlide}
              onChange={(v) => patchTuning({ netCostSlide: v })}
            />
            <ToggleRow
              label="図解・イラストを多めに指示"
              checked={tuning.illustrationEmphasis}
              onChange={(v) => patchTuning({ illustrationEmphasis: v })}
            />
          </div>
          <div className="mt-4">
            <SlideRoleDndList order={slideRoleOrder} tuning={tuning} onChange={setSlideRoleOrder} />
          </div>
        </section>
      )}

      <section className="glass-panel rounded-2xl p-5 md:p-6">
        <h2 className="text-sm font-semibold text-en-text">ルール本文（3区分）</h2>
        <div className="mt-4 grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(280px,360px)]">
          <div className="min-w-0">
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

            <motion.div key={tab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="mt-4">
              <textarea
                className="input-en min-h-[280px] w-full font-mono text-[11px] leading-relaxed md:min-h-[360px] md:text-xs"
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
          </div>

          <div className="flex flex-col gap-4 xl:sticky xl:top-24 xl:self-start">
            <div className="flex flex-col gap-2 rounded-xl border border-en-border bg-en-deep/25 p-4">
              <Button className="w-full !py-3" onClick={save}>
                ルールを保存
              </Button>
              <Button variant="secondary" className="w-full" onClick={resetAll}>
                ひな形にリセット
              </Button>
              {format.available && (
                <Link
                  to={formatCreatePath(format.createSlug)}
                  className="inline-flex items-center justify-center rounded-xl border border-en-border px-4 py-2.5 text-center text-sm text-en-text hover:border-en-primary/40"
                >
                  見積PDFで作成へ
                </Link>
              )}
            </div>

            <div className="min-h-[320px] xl:max-h-[calc(100vh-11rem)] xl:overflow-y-auto">
              <p className="mb-2 text-xs font-semibold text-en-text">YAML 見た目予測</p>
              <PromptRulesYamlPreview
                designYaml={draft.designYaml}
                behaviorRules={draft.behaviorRules}
                slideRoleOrder={slideRoleOrder}
                tuning={tuning}
              />
            </div>
          </div>
        </div>
      </section>

      <PromptRulesAiEditPanel
        draft={draft}
        onRevised={(rules) => setDraft((prev) => (prev ? { ...prev, ...rules } : prev))}
      />
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
