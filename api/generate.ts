import type { VercelRequest, VercelResponse } from "@vercel/node";
import type { FormatId, Tuning } from "@prompt-studio/core";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "method not allowed" });
    return;
  }
  try {
    const { formatId, transcript, tuning, references } = req.body as {
      formatId: FormatId;
      transcript: string;
      tuning: Tuning;
      references?: import("@prompt-studio/core").ReferenceBundle;
    };
    if (formatId !== "B") {
      res.status(400).json({
        error: "invalid formatId",
        detail: "このアプリは研修デリバリー（B）のみ対応しています。一般提案（A）は Cursor で作成してください。",
      });
      return;
    }
    if (!tuning?.documentDate) {
      res.status(400).json({ error: "tuning.documentDate required" });
      return;
    }
    const { runGenerate } = await import("./lib/generate-service.js");
    const result = await runGenerate({ formatId, transcript, tuning, references });
    res.status(200).json(result);
  } catch (e) {
    console.error(e);
    const err = e instanceof Error ? e : new Error(String(e));
    res.status(500).json({
      error: "generate failed",
      detail: err.message,
    });
  }
}
