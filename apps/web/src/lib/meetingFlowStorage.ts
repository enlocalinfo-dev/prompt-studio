import type { MeetingDocumentProposal } from "@prompt-studio/core";

const KEY = "prompt-studio-meeting-flow-v1";

export type MeetingFlowStep = "input" | "proposal";

export interface MeetingFlowState {
  step: MeetingFlowStep;
  minutes: string;
  proposal: MeetingDocumentProposal | null;
  usedLlm: boolean;
  updatedAt: number;
}

export function loadMeetingFlow(): MeetingFlowState | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw) as MeetingFlowState;
  } catch {
    return null;
  }
}

export function saveMeetingFlow(state: MeetingFlowState): void {
  sessionStorage.setItem(KEY, JSON.stringify({ ...state, updatedAt: Date.now() }));
}

export function clearMeetingFlow(): void {
  sessionStorage.removeItem(KEY);
}

export function buildTranscriptFromMeeting(
  minutes: string,
  proposal: MeetingDocumentProposal,
): string {
  const blocks = [
    "【議事録起点・提案資料生成】",
    "以下の議事録と、合意した資料方針に基づきB標準の■固稿を具体化してください。",
    "",
    "■ 資料方針（ユーザー確認済み）",
    proposal.pitch,
    `資料タイトル：${proposal.documentTitle}`,
    `想定読者：${proposal.audience}`,
    `形式：${proposal.formatLabel}`,
    proposal.rationale,
    "",
    "■ 章立て案",
    ...proposal.outline.map((o, i) => `${i + 1}. ${o.heading} — ${o.purpose}`),
    "",
    proposal.contextForGeneration.trim(),
    "",
    "■ 原文議事録",
    minutes.trim(),
  ];
  return blocks.join("\n");
}
