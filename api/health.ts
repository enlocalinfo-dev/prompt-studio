import type { VercelRequest, VercelResponse } from "@vercel/node";

export default function handler(_req: VercelRequest, res: VercelResponse) {
  res.setHeader("Cache-Control", "no-store");
  res.status(200).json({
    ok: true,
    llm: Boolean(process.env.ANTHROPIC_API_KEY),
    templatesLive: false,
  });
}
