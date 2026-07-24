import type { VercelRequest, VercelResponse } from "@vercel/node";
import { fetchUrlAsText } from "./lib/url-fetch.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "method not allowed" });
    return;
  }
  try {
    const { url } = req.body as { url?: string };
    if (!url || typeof url !== "string") {
      res.status(400).json({ error: "url required" });
      return;
    }
    const result = await fetchUrlAsText(url);
    res.status(200).json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : "fetch failed";
    res.status(400).json({ error: message });
  }
}
