import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import type { MeetingDocumentProposal, TrainingDeliveryBrief, TuningB } from "@prompt-studio/core";
import {
  buildTrainingBriefTranscript,
  defaultTrainingBrief,
  parseGensparkPrompt,
} from "@prompt-studio/core";
import { Button } from "../components/ui/Button";
import { GenerationProgressOverlay, type GenPhase } from "../components/GenerationProgressOverlay";
import { InlineAlert } from "../components/InlineAlert";
import { useToast } from "../components/Toast";
import { postGenerate, postProposeFromMeeting } from "../lib/api";
import {
  buildTranscriptFromMeeting,
  clearMeetingFlow,
  loadMeetingFlow,
  saveMeetingFlow,
} from "../lib/meetingFlowStorage";
import { navigateToPromptDetail } from "../lib/promptNavigation";
import { loadPromptRuleOverrides } from "../lib/promptRuleStorage";
import {
  loadTuningB,
  pushHistory,
  saveExtraNotes,
  saveSession,
  saveTrainingBrief,
  saveTuningB,
  todayJa,
} from "../lib/storage";

type Step = "input" | "proposal";

const MIN_CHARS = 80;

export function MeetingMinutesPage() {
  const nav = useNavigate();
  const { pushSuccess, pushError } = useToast();

  const restored = loadMeetingFlow();
  const [step, setStep] = useState<Step>(restored?.step ?? "input");
  const [minutes, setMinutes] = useState(restored?.minutes ?? "");
  const [proposal, setProposal] = useState<MeetingDocumentProposal | null>(restored?.proposal ?? null);
  const [usedLlm, setUsedLlm] = useState(restored?.usedLlm ?? false);
  const [analyzing, setAnalyzing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [bannerError, setBannerError] = useState<string | null>(null);

  const overlayPhase: GenPhase = analyzing ? "generating" : generating ? "generating" : null;

  useEffect(() => {
    if (step === "proposal" && proposal) {
      saveMeetingFlow({ step, minutes, proposal, usedLlm, updatedAt: Date.now() });
    } else if (step === "input") {
      saveMeetingFlow({ step, minutes, proposal: null, usedLlm: false, updatedAt: Date.now() });
    }
  }, [step, minutes, proposal, usedLlm]);

  const patchProposal = useCallback((patch: Partial<MeetingDocumentProposal>) => {
    setProposal((prev) => (prev ? { ...prev, ...patch } : prev));
  }, []);

  const patchTuningDraft = useCallback((field: keyof MeetingDocumentProposal["tuningDraft"], value: string) => {
    setProposal((prev) =>
      prev ? { ...prev, tuningDraft: { ...prev.tuningDraft, [field]: value } } : prev,
    );
  }, []);

  async function handleAnalyze() {
    setBannerError(null);
    const text = minutes.trim();
    if (text.length < MIN_CHARS) {
      setBannerError(`議事録は${MIN_CHARS}文字以上入力してください（現在 ${text.length} 文字）`);
      return;
    }
    setAnalyzing(true);
    try {
      const res = await postProposeFromMeeting({ minutes: text });
      if (res.error && !res.proposal.pitch) {
        pushError(res.error);
        return;
      }
      setProposal(res.proposal);
      setUsedLlm(res.usedLlm);
      setStep("proposal");
      if (res.error) pushError(`AI提案は簡易モードで表示しています（${res.error}）`);
      else pushSuccess(res.usedLlm ? "資料案を作成しました。内容を確認してください。" : "資料案を作成しました（API未設定時は簡易提案）");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "分析に失敗しました";
      setBannerError(msg);
      pushError(msg);
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleCreatePrompt() {
    if (!proposal) return;
    setBannerError(null);

    if (proposal.suggestedEngine !== "b") {
      setBannerError(
        "この議事録向けの形式は、まだ自動プロンプト生成に未接続です。研修の提案書向けの内容に調整するか、見積PDFフローをご利用ください。",
      );
      return;
    }

    const tuning: TuningB = {
      ...loadTuningB(),
      clientName: proposal.tuningDraft.clientName.trim() || loadTuningB().clientName,
      proposerName: proposal.tuningDraft.proposerName.trim() || loadTuningB().proposerName,
      projectTitle: proposal.tuningDraft.projectTitle.trim() || proposal.documentTitle,
      documentDate: loadTuningB().documentDate || todayJa(),
    };

    if (!tuning.clientName?.trim()) {
      setBannerError("提案先（クライアント名）を入力してください");
      return;
    }

    const brief: TrainingDeliveryBrief = {
      ...defaultTrainingBrief(),
      targetParticipants: proposal.briefDraft.targetParticipants || defaultTrainingBrief().targetParticipants,
      trainingStartPeriod: proposal.briefDraft.trainingStartPeriod || defaultTrainingBrief().trainingStartPeriod,
      mainEffects: proposal.briefDraft.mainEffects || defaultTrainingBrief().mainEffects,
      trainingFeeExTax: proposal.briefDraft.trainingFeeExTax || defaultTrainingBrief().trainingFeeExTax,
      subsidyAndNet: proposal.briefDraft.subsidyAndNet || defaultTrainingBrief().subsidyAndNet,
    };

    setGenerating(true);
    try {
      const meetingBlock = buildTranscriptFromMeeting(minutes, proposal);
      const transcript = buildTrainingBriefTranscript(brief, tuning, meetingBlock, "");

      saveTrainingBrief(brief);
      saveTuningB(tuning);
      saveExtraNotes(meetingBlock);

      const result = await postGenerate({
        formatId: "B",
        transcript,
        tuning,
        ruleOverrides: loadPromptRuleOverrides("training-delivery"),
      });

      const segments = parseGensparkPrompt(result.markdown);
      saveSession({
        formatId: "B",
        transcript,
        tuning,
        result: {
          markdown: result.markdown,
          gensparkText: result.gensparkText,
          folderNameSuggestion: result.folderNameSuggestion,
          usedLlm: result.usedLlm,
          segments,
          structured: result.structured,
        },
      });

      pushHistory({
        clientName: tuning.clientName,
        projectTitle: tuning.projectTitle,
        documentDate: tuning.documentDate,
        brief,
        tuning,
        gensparkPreview: result.gensparkText.slice(0, 120),
        result: {
          markdown: result.markdown,
          gensparkText: result.gensparkText,
          folderNameSuggestion: result.folderNameSuggestion,
          usedLlm: result.usedLlm,
          segments,
        },
      });

      clearMeetingFlow();
      pushSuccess("プロンプトを作成しました");
      navigateToPromptDetail(nav);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "作成に失敗しました";
      setBannerError(msg);
      pushError(msg);
    } finally {
      setGenerating(false);
    }
  }

  return (
    <>
      <GenerationProgressOverlay phase={overlayPhase} />
      <div className="space-y-8">
        <div>
          <Button variant="ghost" className="!px-0 !py-1" onClick={() => nav("/")}>
            ← トップ
          </Button>
          <p className="mt-3 text-xs font-semibold text-en-accent">議事録モード</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight md:text-3xl">議事録から提案資料を作成</h1>
          <p className="mt-2 max-w-2xl text-sm text-en-muted">
            議事録を貼り付けると、AIが「こういう資料を作りましょう」と方針を提案します。内容を確認してから Genspark 用プロンプトを生成します。
          </p>
        </div>

        <div className="flex gap-2 text-xs">
          <StepChip active={step === "input"} done={step === "proposal"} label="1. 議事録入力" />
          <StepChip active={step === "proposal"} label="2. 資料案の確認" />
        </div>

        {bannerError && (
          <InlineAlert tone="error" title={bannerError} onDismiss={() => setBannerError(null)} />
        )}

        <AnimatePresence mode="wait">
          {step === "input" ? (
            <motion.section
              key="input"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="glass-panel rounded-2xl p-5 md:p-6"
            >
              <label className="block text-sm font-medium text-en-text">議事録テキスト</label>
              <p className="mt-1 text-xs text-en-muted">
                tl;dv や Docs からコピーした全文をそのまま貼り付けてください（{MIN_CHARS}文字以上）。
              </p>
              <textarea
                className="input-en mt-4 min-h-[280px] w-full text-sm leading-relaxed"
                value={minutes}
                onChange={(e) => setMinutes(e.target.value)}
                placeholder="日時・参加者・決定事項・宿題・金額や日程の言及など"
                disabled={analyzing}
              />
              <p className="mt-2 text-xs text-en-muted">{minutes.trim().length} 文字</p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Button disabled={analyzing} onClick={() => void handleAnalyze()}>
                  {analyzing ? "分析中…" : "資料案を作成する"}
                </Button>
                <Link to="/create/b" className="text-sm text-en-muted hover:text-en-text self-center">
                  見積PDFから作成する場合はこちら
                </Link>
              </div>
            </motion.section>
          ) : (
            proposal && (
              <motion.section
                key="proposal"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="space-y-6"
              >
                <section className="glass-panel rounded-2xl border border-en-primary/25 p-5 md:p-6">
                  <p className="text-xs font-semibold text-en-accent">提案</p>
                  <p className="mt-3 text-lg font-medium leading-relaxed text-en-text">{proposal.pitch}</p>
                  <dl className="mt-5 grid gap-3 text-sm md:grid-cols-2">
                    <div>
                      <dt className="text-xs text-en-muted">推奨形式</dt>
                      <dd className="font-medium text-en-text">{proposal.formatLabel}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-en-muted">想定読者</dt>
                      <dd className="text-en-text">{proposal.audience}</dd>
                    </div>
                  </dl>
                  <p className="mt-4 text-sm leading-relaxed text-en-muted">{proposal.rationale}</p>
                  {!usedLlm && (
                    <p className="mt-3 text-xs text-en-accent">簡易提案モード（APIキー未設定または分析エラー時）</p>
                  )}
                </section>

                <section className="glass-panel rounded-2xl p-5 md:p-6">
                  <h2 className="text-sm font-semibold text-en-text">確認・修正</h2>
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <Field label="資料タイトル">
                      <input
                        className="input-en w-full text-sm"
                        value={proposal.documentTitle}
                        onChange={(e) => patchProposal({ documentTitle: e.target.value })}
                      />
                    </Field>
                    <Field label="提案先（クライアント）">
                      <input
                        className="input-en w-full text-sm"
                        value={proposal.tuningDraft.clientName}
                        onChange={(e) => patchTuningDraft("clientName", e.target.value)}
                        placeholder="必須"
                      />
                    </Field>
                    <Field label="研修・案件名">
                      <input
                        className="input-en w-full text-sm"
                        value={proposal.tuningDraft.projectTitle}
                        onChange={(e) => patchTuningDraft("projectTitle", e.target.value)}
                      />
                    </Field>
                    <Field label="提案元">
                      <input
                        className="input-en w-full text-sm"
                        value={proposal.tuningDraft.proposerName}
                        onChange={(e) => patchTuningDraft("proposerName", e.target.value)}
                      />
                    </Field>
                  </div>
                </section>

                <section className="glass-panel rounded-2xl p-5 md:p-6">
                  <h2 className="text-sm font-semibold text-en-text">章立て案</h2>
                  <ul className="mt-3 space-y-2 text-sm">
                    {proposal.outline.map((o) => (
                      <li key={o.heading} className="flex gap-2 border-b border-en-border/40 pb-2 last:border-0">
                        <span className="font-medium text-en-text">{o.heading}</span>
                        <span className="text-en-muted">— {o.purpose}</span>
                      </li>
                    ))}
                  </ul>
                </section>

                {proposal.suggestedEngine === "b" && (
                  <section className="glass-panel rounded-2xl p-5 md:p-6">
                    <h2 className="text-sm font-semibold text-en-text">研修サマリー向けメモ（任意）</h2>
                    <p className="mt-1 text-xs text-en-muted">議事録から拾えた項目だけ編集してください。空欄は標準ひな形で補います。</p>
                    <div className="mt-4 space-y-3">
                      <BriefField
                        label="研修対象者"
                        value={proposal.briefDraft.targetParticipants}
                        onChange={(v) =>
                          setProposal((p) =>
                            p ? { ...p, briefDraft: { ...p.briefDraft, targetParticipants: v } } : p,
                          )
                        }
                      />
                      <BriefField
                        label="開始時期・締切"
                        value={proposal.briefDraft.trainingStartPeriod}
                        onChange={(v) =>
                          setProposal((p) =>
                            p ? { ...p, briefDraft: { ...p.briefDraft, trainingStartPeriod: v } } : p,
                          )
                        }
                      />
                      <BriefField
                        label="主な効果"
                        value={proposal.briefDraft.mainEffects}
                        onChange={(v) =>
                          setProposal((p) => (p ? { ...p, briefDraft: { ...p.briefDraft, mainEffects: v } } : p))
                        }
                      />
                    </div>
                  </section>
                )}

                <div className="flex flex-wrap gap-3">
                  <Button variant="secondary" disabled={generating} onClick={() => setStep("input")}>
                    議事録を修正する
                  </Button>
                  <Button
                    disabled={generating || proposal.suggestedEngine !== "b"}
                    onClick={() => void handleCreatePrompt()}
                  >
                    {generating ? "プロンプト作成中…" : "この方針でプロンプトを作成"}
                  </Button>
                </div>

                {proposal.suggestedEngine !== "b" && (
                  <p className="text-sm text-en-muted">
                    協業・商品化など A 形式向けの自動生成は準備中です。
                    <Link to="/rules" className="ml-1 text-en-primary-bright hover:underline">
                      プロンプトルール
                    </Link>
                    でひな形を整え、今後の形式追加後に利用できます。
                  </p>
                )}
              </motion.section>
            )
          )}
        </AnimatePresence>
      </div>
    </>
  );
}

function StepChip({ active, done, label }: { active?: boolean; done?: boolean; label: string }) {
  return (
    <span
      className={`rounded-full px-3 py-1 ${
        active
          ? "bg-en-primary/20 text-en-text ring-1 ring-en-primary/40"
          : done
            ? "bg-white/5 text-en-muted"
            : "bg-white/[0.03] text-en-muted"
      }`}
    >
      {label}
    </span>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs text-en-muted">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

function BriefField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-xs text-en-muted">{label}</span>
      <textarea
        className="input-en mt-1 min-h-[72px] w-full text-sm"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}
