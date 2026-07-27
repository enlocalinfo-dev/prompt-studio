import type { NavigateFunction } from "react-router-dom";
import { parseGensparkPrompt } from "@prompt-studio/core";
import { loadSession, saveSession, type SessionPayload } from "./storage";

export function hasPromptSession(): boolean {
  const s = loadSession();
  return Boolean(s?.result?.markdown || s?.result?.gensparkText);
}

/** YAML・スライド一覧などを見る「プロンプト詳細」ページへ */
export function navigateToPromptDetail(nav: NavigateFunction, session?: SessionPayload | null): void {
  const s = session ?? loadSession();
  if (!s?.result?.markdown && !s?.result?.gensparkText) {
    nav("/prompt");
    return;
  }
  const segments =
    s.result.segments?.length && s.result.segments.length > 0
      ? s.result.segments
      : parseGensparkPrompt(s.result.markdown);
  const enriched: SessionPayload = {
    ...s,
    result: { ...s.result, segments },
  };
  saveSession(enriched);
  nav("/prompt", { state: { session: enriched } });
}
