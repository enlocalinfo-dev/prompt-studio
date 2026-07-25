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
  rows = 3,
  placeholder,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  placeholder?: string;
}) {
  return (
    <label className="block text-xs font-medium text-en-muted">
      {label}
      {hint && <span className="mt-0.5 block font-normal text-[11px] text-en-muted/80">{hint}</span>}
      <textarea
        className="input-en mt-1.5 min-h-[88px] resize-y leading-relaxed"
        rows={rows}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
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
      className="space-y-6"
    >
      <div>
        <h2 className="text-sm font-semibold text-en-text">案件の骨子（3項目）</h2>
        <p className="mt-1 text-xs leading-relaxed text-en-muted">
          読み手は<strong className="font-medium text-en-text/90">経営者（社内決裁）</strong>
          固定です。提案先・研修名・版日は右の案件メタで設定します。
        </p>
        <p className="mt-2 rounded-lg bg-en-deep/50 px-3 py-2 text-[11px] text-en-muted">
          {tuning.clientName} · {tuning.projectTitle || "（研修名未入力）"}
        </p>
      </div>

      <Field
        label="研修対象者"
        hint="人数・部署・前提が分かるように（スライド2）"
        value={brief.targetParticipants}
        onChange={(v) => patch({ targetParticipants: v })}
        placeholder="例：営業15名＋企画2名。商談経験あり。"
      />

      <Field
        label="研修開始時期"
        hint="決裁・助成申請締切・開始月をこの1欄に（スライド5）"
        value={brief.trainingStartPeriod}
        onChange={(v) => patch({ trainingStartPeriod: v })}
        placeholder="例：9/10申請締切、10月第1回開始"
      />

      <Field
        label="主な効果"
        hint="時間ROI・定性効果の要約（スライド6。助成金は書かない）"
        value={brief.mainEffects}
        onChange={(v) => patch({ mainEffects: v })}
        rows={4}
        placeholder="例：月5h削減×人数×12か月の試算、属人化低減 等"
      />

      <div className="rounded-xl border border-en-border/80 bg-white/[0.02] p-4">
        <p className="text-xs font-semibold text-en-text">研修費（スライド7）</p>
        <p className="mt-1 text-[11px] text-en-muted">入力は2欄。ROIスライドとは別扱いのまま生成します。</p>
        <div className="mt-4 space-y-4">
          <label className="block text-xs font-medium text-en-muted">
            研修費（税抜）
            <input
              className="input-en mt-1.5"
              value={brief.trainingFeeExTax}
              placeholder="例：170万円（17名・4回）"
              onChange={(e) => patch({ trainingFeeExTax: e.target.value })}
            />
          </label>
          <label className="block text-xs font-medium text-en-muted">
            助成・差引後・1人あたり（任意・1行で可）
            <input
              className="input-en mt-1.5"
              value={brief.subsidyAndNet}
              placeholder="例：助成127.5万→差引42.5万・約2.5万/人"
              onChange={(e) => patch({ subsidyAndNet: e.target.value })}
            />
          </label>
        </div>
      </div>

      <Field
        label="追加メモ・音声入力"
        hint="議事録の補足。②③の詳細はB標準テンプレから自動で肉付け"
        value={extraNotes}
        onChange={onExtraNotesChange}
        rows={3}
      />
    </motion.div>
  );
}
