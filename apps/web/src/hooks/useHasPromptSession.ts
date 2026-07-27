import { useMemo } from "react";
import { useLocation } from "react-router-dom";
import { hasPromptSession } from "../lib/promptNavigation";

/** ナビ表示用 — ルート変更のたびに sessionStorage を再評価 */
export function useHasPromptSession(): boolean {
  const loc = useLocation();
  return useMemo(() => hasPromptSession(), [loc.pathname, loc.key]);
}
