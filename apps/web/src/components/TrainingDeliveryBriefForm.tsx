import type { ReactNode } from "react";
import type { TrainingDeliveryBrief, TuningB } from "@prompt-studio/core";
import { motion } from "framer-motion";
import { saveTrainingBrief } from "../lib/storage";

interface Props {
  brief: TrainingDeliveryBrief;
  tuning: TuningB;
  onBriefChange: (b: TrainingDeliveryBrief) => void;
  extraNotes: string;
  onExtraNotesChange: (v: string) => void;
}

function Field({
  label,
  hint,
  value,
  onChange,
  rows = 2,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
}) {
  const multiline = rows > 1;
  return (
    <label className="block text-xs font-medium text-en-muted">
      {label}
      {hint && <span className="mt-0.5 block font-normal text-[11px] text-en-muted/80">{hint}</span>}
      {multiline ? (
        <textarea
          className="input-en mt-1.5 min-h-[72px] resize-y leading-relaxed"
          rows={rows}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <input className="input-en mt-1.5" value={value} onChange={(e) => onChange(e.target.value)} />
      )}
    </label>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="border-t border-en-border pt-5 first:border-t-0 first:pt-0">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-en-accent">{title}</p>
      <div className="mt-3 space-y-4">{children}</div>
    </div>
  );
}

export function TrainingDeliveryBriefForm({
  brief,
  tuning,
  onBriefChange,
  extraNotes,
  onExtraNotesChange,
}: Props) {
  const patch = (partial: Partial<TrainingDeliveryBrief>) => {
    const next = { ...brief, ...partial };
    onBriefChange(next);
    saveTrainingBrief(next);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="space-y-5"
    >
      <div>
        <h2 className="text-sm font-semibold text-en-text">研修デリバリー提案（B標準・骨子）</h2>
        <p className="mt-1 text-xs leading-relaxed text-en-muted">
          Genspark Bテンプレの **①〜⑤＋実質負担** に対応する入力です。提案先・研修名・版日は右の
          ファインチューニングと連動します。
        </p>
        <p className="mt-2 rounded-lg bg-en-deep/50 px-3 py-2 text-[11px] text-en-muted">
          提案先：<span className="text-en-text">{tuning.clientName}</span>
          {" · "}
          研修名：<span className="text-en-text">{tuning.projectTitle || "（未入力）"}</span>
        </p>
      </div>

      <Section title="読み手">
        <Field label="想定読者" value={brief.readers} onChange={(v) => patch({ readers: v })} />
      </Section>

      <Section title="① 対象者（スライド2）">
        <Field
          label="ターゲット（主対象）"
          hint="人数・事業部・役割"
          value={brief.targetMain}
          onChange={(v) => patch({ targetMain: v })}
        />
        <Field label="副対象・横展開" value={brief.targetSub} onChange={(v) => patch({ targetSub: v })} />
        <Field label="前提・スキル" value={brief.targetPrerequisites} onChange={(v) => patch({ targetPrerequisites: v })} />
        <Field label="対象外" value={brief.targetExcluded} onChange={(v) => patch({ targetExcluded: v })} />
      </Section>

      <Section title="② 受ける研修の内容（スライド3）">
        <Field
          label="形式・回数"
          value={brief.trainingFormatNotes}
          onChange={(v) => patch({ trainingFormatNotes: v })}
        />
        <Field
          label="各回のテーマと成果物"
          hint="1行1回（第1回：…）"
          rows={5}
          value={brief.trainingSessions}
          onChange={(v) => patch({ trainingSessions: v })}
        />
      </Section>

      <Section title="③ Before / After（スライド4）">
        <Field
          label="5ステップの変化"
          hint="Before/After を箇条または短文で"
          rows={5}
          value={brief.beforeAfter}
          onChange={(v) => patch({ beforeAfter: v })}
        />
      </Section>

      <Section title="④ スケジュール（スライド5）">
        <Field
          label="社内決裁期限"
          value={brief.internalDecisionDeadline}
          onChange={(v) => patch({ internalDecisionDeadline: v })}
        />
        <Field
          label="助成申請締切"
          value={brief.subsidyApplicationDeadline}
          onChange={(v) => patch({ subsidyApplicationDeadline: v })}
        />
        <Field
          label="研修開始月"
          value={brief.trainingStartMonth}
          onChange={(v) => patch({ trainingStartMonth: v })}
        />
        <Field label="その他日程" value={brief.scheduleOther} onChange={(v) => patch({ scheduleOther: v })} />
      </Section>

      <Section title="⑤ ROI（スライド6）">
        <Field label="投資・コスト前提" value={brief.roiInvestment} onChange={(v) => patch({ roiInvestment: v })} />
        <Field
          label="時間削減・試算"
          rows={3}
          value={brief.roiTimeSavings}
          onChange={(v) => patch({ roiTimeSavings: v })}
        />
        <Field label="定性効果" value={brief.roiQualitative} onChange={(v) => patch({ roiQualitative: v })} />
      </Section>

      <Section title="⑦ 研修の価格・実質負担（スライド7）">
        <Field
          label="研修費（税抜）"
          hint="開始する研修の提示価格"
          value={brief.trainingFeeExTax}
          onChange={(v) => patch({ trainingFeeExTax: v })}
        />
        <Field label="助成見込み" value={brief.subsidyEstimate} onChange={(v) => patch({ subsidyEstimate: v })} />
        <Field
          label="差引後の会社負担"
          value={brief.netCostAfterSubsidy}
          onChange={(v) => patch({ netCostAfterSubsidy: v })}
        />
        <Field label="1人あたり" value={brief.costPerPerson} onChange={(v) => patch({ costPerPerson: v })} />
        <Field
          label="価格・助成の注記"
          rows={2}
          value={brief.pricingNotes}
          onChange={(v) => patch({ pricingNotes: v })}
        />
      </Section>

      <Section title="追加メモ・音声入力">
        <Field
          label="上記以外の要望"
          hint="音声入力もここに追記されます"
          rows={4}
          value={extraNotes}
          onChange={onExtraNotesChange}
        />
      </Section>
    </motion.div>
  );
}
