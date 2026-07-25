import type {
  Extracted,
  FormatId,
  PromptSegment,
  ReferenceBundle,
  TrainingDeliveryBrief,
  Tuning,
} from "@prompt-studio/core";
import { defaultTrainingBrief, defaultTuning } from "@prompt-studio/core";

const KEY = "prompt-studio-tuning";

export function todayJa(): string {
  const d = new Date();
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}

export function loadTuning(formatId: FormatId): Tuning {
  try {
    const raw = localStorage.getItem(`${KEY}-${formatId}`);
    if (raw) return JSON.parse(raw) as Tuning;
  } catch {
    /* ignore */
  }
  return defaultTuning(formatId, todayJa());
}

export function saveTuning(formatId: FormatId, tuning: Tuning): void {
  localStorage.setItem(`${KEY}-${formatId}`, JSON.stringify(tuning));
}

export interface SessionPayload {
  formatId: FormatId;
  transcript: string;
  tuning: Tuning;
  references?: ReferenceBundle;
  result?: {
    markdown: string;
    gensparkText: string;
    folderNameSuggestion: string;
    usedLlm: boolean;
    segments?: PromptSegment[];
    structured?: Extracted;
  };
}

const SESSION = "prompt-studio-session";

export function loadSession(): SessionPayload | null {
  try {
    const raw = sessionStorage.getItem(SESSION);
    if (raw) return JSON.parse(raw) as SessionPayload;
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
    if (raw) return JSON.parse(raw) as TrainingDeliveryBrief;
  } catch {
    /* ignore */
  }
  return defaultTrainingBrief();
}

export function saveTrainingBrief(brief: TrainingDeliveryBrief): void {
  localStorage.setItem(BRIEF_KEY, JSON.stringify(brief));
}
