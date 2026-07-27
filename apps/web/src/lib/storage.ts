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
const EXTRA_NOTES_KEY = "prompt-studio-extra-notes-B";

export function loadExtraNotes(): string {
  try {
    return localStorage.getItem(EXTRA_NOTES_KEY) ?? "";
  } catch {
    return "";
  }
}

export function saveExtraNotes(notes: string): void {
  localStorage.setItem(EXTRA_NOTES_KEY, notes);
}

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

const HISTORY_KEY = "prompt-studio-history-v1";
const HISTORY_MAX = 5;

export interface HistoryPromptSnapshot {
  markdown: string;
  gensparkText: string;
  folderNameSuggestion: string;
  usedLlm: boolean;
  segments?: import("@prompt-studio/core").PromptSegment[];
}

export interface HistoryEntry {
  id: string;
  savedAt: string;
  clientName: string;
  projectTitle: string;
  documentDate: string;
  brief: TrainingDeliveryBrief;
  tuning: TuningB;
  gensparkPreview?: string;
  /** 作成済みプロンプト（最近の案件から直接プレビューへ） */
  result?: HistoryPromptSnapshot;
}

export function loadHistory(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as HistoryEntry[];
    return Array.isArray(arr) ? arr.slice(0, HISTORY_MAX) : [];
  } catch {
    return [];
  }
}

export function pushHistory(entry: Omit<HistoryEntry, "id" | "savedAt">): HistoryEntry {
  const full: HistoryEntry = {
    ...entry,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    savedAt: new Date().toISOString(),
  };
  const prev = loadHistory().filter(
    (h) => !(h.clientName === full.clientName && h.projectTitle === full.projectTitle && h.documentDate === full.documentDate),
  );
  const next = [full, ...prev].slice(0, HISTORY_MAX);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
  return full;
}

export function findHistory(id: string): HistoryEntry | null {
  return loadHistory().find((h) => h.id === id) ?? null;
}
