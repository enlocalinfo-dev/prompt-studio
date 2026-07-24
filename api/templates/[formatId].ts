import type { VercelRequest, VercelResponse } from "@vercel/node";
import type { FormatId } from "@prompt-studio/core";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const formatId = req.query.formatId as FormatId;
  if (formatId !== "A" && formatId !== "B") {
    res.status(400).json({ error: "invalid formatId" });
    return;
  }
  try {
    const { loadMasterTemplate, templatesMeta } = await import("../lib/templates.js");
    const devLive = process.env.VERCEL !== "1" && process.env.TEMPLATES_LIVE !== "false";
    res.status(200).json({
      formatId,
      content: loadMasterTemplate(formatId, devLive),
      meta: templatesMeta(devLive),
    });
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    res.status(500).json({ error: err.message });
  }
}
