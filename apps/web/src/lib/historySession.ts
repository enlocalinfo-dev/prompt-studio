import { parseGensparkPrompt } from "@prompt-studio/core";
import type { HistoryEntry, SessionPayload } from "./storage";

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
