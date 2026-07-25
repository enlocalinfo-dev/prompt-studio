import type { FormatId, ReferenceBundle, TrainingDeliveryBrief, TuningB } from "@prompt-studio/core";
import { defaultTuning, defaultTrainingBrief, normalizeTrainingBrief } from "@prompt-studio/core";

const KEY_B = "prompt-studio-tuning-B";

export function todayJa(): string {
  const d = new Date();
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}

export function loadTuningB(): TuningB {
  try {
    const raw = localStorage.getItem(KEY_B);
    if (raw) return JSON.parse(raw) as TuningB;
  } catch {
    /* ignore */
  }
  return defaultTuning("B", todayJa()) as TuningB;
}

/** @deprecated B専用アプリ — loadTuningB を使用 */
export function loadTuning(_formatId: FormatId): TuningB {
  return loadTuningB();
}

export function saveTuningB(tuning: TuningB): void {
  localStorage.setItem(KEY_B, JSON.stringify(tuning));
}

/** @deprecated saveTuningB を使用 */
export function saveTuning(_formatId: FormatId, tuning: TuningB): void {
  saveTuningB(tuning);
}

export interface SessionPayload {
  formatId: "B";
  transcript: string;
  tuning: TuningB;
  references?: ReferenceBundle;
  result?: {
    markdown: string;
    gensparkText: string;
    folderNameSuggestion: string;
    usedLlm: boolean;
    segments?: import("@prompt-studio/core").PromptSegment[];
    structured?: import("@prompt-studio/core").Extracted;
  };
}

const SESSION = "prompt-studio-session";

export function loadSession(): SessionPayload | null {
  try {
    const raw = sessionStorage.getItem(SESSION);
    if (raw) {
      const parsed = JSON.parse(raw) as SessionPayload;
      if (parsed.formatId === "B") return parsed;
    }
  } catch {
    /* ignore */
  }
  return null;
}

export function saveSession(payload: SessionPayload): void {
  sessionStorage.setItem(SESSION, JSON.stringify(payload));
}

const BRIEF_KEY = "prompt-studio-brief-B";

export function loadTrainingBrief(): TrainingDeliveryBrief {
  try {
    const raw = localStorage.getItem(BRIEF_KEY);
    if (raw) return normalizeTrainingBrief(JSON.parse(raw));
  } catch {
    /* ignore */
  }
  return defaultTrainingBrief();
}

export function saveTrainingBrief(brief: TrainingDeliveryBrief): void {
  localStorage.setItem(BRIEF_KEY, JSON.stringify(brief));
}
