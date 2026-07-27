import { parseGensparkPrompt } from "@prompt-studio/core";
import type { HistoryEntry, SessionPayload } from "./storage";
import { loadSession } from "./storage";

function enrichSessionResult(session: SessionPayload): SessionPayload {
  const r = session.result;
  if (!r) return session;
  const markdown = r.markdown ?? "";
  const segments =
    r.segments?.length && r.segments.length > 0 ? r.segments : parseGensparkPrompt(markdown);
  return {
    ...session,
    result: { ...r, segments },
  };
}

function historyMatchesSession(entry: HistoryEntry, session: SessionPayload): boolean {
  if (session.formatId !== "B") return false;
  const t = session.tuning;
  if (t.clientName.trim() !== entry.clientName.trim()) return false;
  if (t.documentDate.trim() !== entry.documentDate.trim()) return false;
  const a = (t.projectTitle || "").trim();
  const b = (entry.projectTitle || "").trim();
  if (a && b && a !== b) return false;
  return Boolean(session.result?.markdown || session.result?.gensparkText);
}

/** 履歴行からプロンプト詳細（YAML・8枚一覧）用セッションを復元 */
export function resolveSessionForHistory(entry: HistoryEntry): SessionPayload | null {
  const fromStored = sessionFromHistory(entry);
  if (fromStored) return enrichSessionResult(fromStored);

  const live = loadSession();
  if (live && historyMatchesSession(entry, live)) {
    return enrichSessionResult(live);
  }
  return null;
}

export function historyEntryHasPromptDetail(entry: HistoryEntry): boolean {
  return resolveSessionForHistory(entry) !== null;
}

export function sessionFromHistory(entry: HistoryEntry): SessionPayload | null {
  if (!entry.result?.markdown && !entry.result?.gensparkText) return null;
  const markdown = entry.result.markdown ?? "";
  const segments =
    entry.result.segments?.length && entry.result.segments.length > 0
      ? entry.result.segments
      : parseGensparkPrompt(markdown);
  return {
    formatId: "B",
    transcript: "",
    tuning: entry.tuning,
    references: undefined,
    result: {
      markdown,
      gensparkText: entry.result.gensparkText,
      folderNameSuggestion: entry.result.folderNameSuggestion,
      usedLlm: entry.result.usedLlm,
      segments,
    },
  };
}
