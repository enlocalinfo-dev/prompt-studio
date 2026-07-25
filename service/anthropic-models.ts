/** Anthropic Messages API — 利用可能なモデルを優先順に試行 */
export const ANTHROPIC_MODEL_CANDIDATES = [
  "claude-sonnet-4-6",
  "claude-sonnet-4-5-20250929",
  "claude-haiku-4-5-20251001",
] as const;

export const ANTHROPIC_MODEL_PRIMARY = ANTHROPIC_MODEL_CANDIDATES[0];
