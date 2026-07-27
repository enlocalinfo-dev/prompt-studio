import type { HistoryEntry, SessionPayload } from "./storage";

export function sessionFromHistory(entry: HistoryEntry): SessionPayload | null {
  if (!entry.result?.markdown) return null;
  return {
    formatId: "B",
    transcript: "",
    tuning: entry.tuning,
    references: undefined,
    result: {
      markdown: entry.result.markdown,
      gensparkText: entry.result.gensparkText,
      folderNameSuggestion: entry.result.folderNameSuggestion,
      usedLlm: entry.result.usedLlm,
      segments: entry.result.segments,
    },
  };
}
