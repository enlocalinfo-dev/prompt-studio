const SLIDE_SECTION_START = "【各スライドの確定内容（■固稿）】";
const SLIDE_SECTION_END_MARKERS = ["【最終自己チェック】", "【デザイン制約（YAML）】"];

export function slideHeadingsOutline(master: string): string {
  const lines = master.split("\n");
  const inText = lines.some((l) => l.includes("```text"));
  const headings = lines.filter((l) => l.startsWith("■"));
  return headings.join("\n");
}

export function extractSlideBriefSection(master: string): string {
  const start = master.indexOf(SLIDE_SECTION_START);
  if (start === -1) return "";
  let end = master.length;
  for (const marker of SLIDE_SECTION_END_MARKERS) {
    const i = master.indexOf(marker, start + 1);
    if (i !== -1 && i < end) end = i;
  }
  return master.slice(start, end).trim();
}

/** Replace ■固稿 section in master template with LLM-generated briefs */
export function mergeSlideBriefs(master: string, newBriefs: string): string {
  const trimmed = newBriefs.trim();
  if (!trimmed.includes("■")) return master;

  const start = master.indexOf(SLIDE_SECTION_START);
  if (start === -1) return master;

  let end = master.length;
  for (const marker of SLIDE_SECTION_END_MARKERS) {
    const i = master.indexOf(marker, start + 1);
    if (i !== -1 && i < end) end = i;
  }

  const before = master.slice(0, start);
  const after = master.slice(end);
  const section = `${SLIDE_SECTION_START}\n━━━━━━━━━━━━━━━━━━━━━━━━━\n\n${trimmed}\n\n`;
  return before + section + after;
}

export function parseJsonFromLlm(text: string): unknown {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const raw = fenced ? fenced[1].trim() : trimmed;
  try {
    return JSON.parse(raw);
  } catch {
    const s = raw.indexOf("{");
    const e = raw.lastIndexOf("}");
    if (s >= 0 && e > s) {
      return JSON.parse(raw.slice(s, e + 1));
    }
    throw new Error("LLM returned invalid JSON");
  }
}
