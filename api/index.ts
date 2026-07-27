import type { VercelRequest, VercelResponse } from "@vercel/node";
import type { TuningB } from "@prompt-studio/core";
import type { ReferenceBundle } from "../service/reference-context.js";
import { fetchUrlAsText } from "../service/url-fetch.js";
import { runGenerate, runHealth } from "../service/generate-service.js";
import { loadMasterTemplate, templatesMeta } from "../service/templates.js";

function routePath(req: VercelRequest): string[] {
  const q = req.query.__path;
  if (typeof q === "string" && q.length) {
    return q.split("/").filter(Boolean);
  }
  const raw = req.url ?? "/";
  const pathname = raw.startsWith("http") ? new URL(raw).pathname : raw.split("?")[0];
  const parts = pathname.replace(/^\/api\/?/, "").split("/").filter(Boolean);
  return parts;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const parts = routePath(req);
  const head = parts[0] ?? "";

  try {
    if (head === "health") {
      res.setHeader("Cache-Control", "no-store");
      res.status(200).json(runHealth());
      return;
    }

    if (head === "fetch-url") {
      if (req.method !== "POST") {
        res.status(405).json({ error: "method not allowed" });
        return;
      }
      const { url } = req.body as { url?: string };
      if (!url || typeof url !== "string") {
        res.status(400).json({ error: "url required" });
        return;
      }
      const result = await fetchUrlAsText(url);
      res.status(200).json(result);
      return;
    }

    if (head === "blob-upload") {
      if (req.method !== "POST") {
        res.status(405).json({ error: "method not allowed" });
        return;
      }
      const { runBlobUploadRoute } = await import("../service/blob-upload-route.js");
      const response = await runBlobUploadRoute(req);
      const data = await response.json().catch(() => ({}));
      res.status(response.status).json(data);
      return;
    }

    if (head === "expand-brief") {
      if (req.method !== "POST") {
        res.status(405).json({ error: "method not allowed" });
        return;
      }
      const { fileName, extractedText, pdfBase64, pdfBlobUrl } = req.body as {
        fileName?: string;
        extractedText?: string;
        pdfBase64?: string;
        pdfBlobUrl?: string;
      };
      if (!fileName) {
        res.status(400).json({ error: "fileName required" });
        return;
      }
      const { sanitizeExpandBriefBody } = await import("../service/pdf-upload-limits.js");
      const safe = sanitizeExpandBriefBody({
        fileName,
        extractedText,
        pdfBase64,
        pdfBlobUrl,
      });
      const { expandBriefFromEstimatePdf } = await import("../service/expand-brief-from-pdf.js");
      const result = await expandBriefFromEstimatePdf(safe);
      res.status(200).json(result);
      return;
    }

    if (head === "revise-prompt") {
      if (req.method !== "POST") {
        res.status(405).json({ error: "method not allowed" });
        return;
      }
      const { gensparkText, markdown, instruction, tuning, focusLabel } = req.body as {
        gensparkText?: string;
        markdown?: string;
        instruction?: string;
        tuning?: TuningB;
        focusLabel?: string;
      };
      if (!gensparkText?.trim() || !instruction?.trim() || !tuning?.documentDate) {
        res.status(400).json({ error: "gensparkText, instruction, tuning required" });
        return;
      }
      const { runRevisePrompt } = await import("../service/revise-prompt.js");
      const result = await runRevisePrompt({
        gensparkText,
        markdown: markdown ?? gensparkText,
        instruction,
        tuning,
        focusLabel,
      });
      res.status(200).json(result);
      return;
    }

    if (head === "generate") {
      if (req.method !== "POST") {
        res.status(405).json({ error: "method not allowed" });
        return;
      }
      const { formatId, transcript, tuning, references, ruleOverrides } = req.body as {
        formatId: string;
        transcript: string;
        tuning: TuningB;
        references?: ReferenceBundle;
        ruleOverrides?: import("@prompt-studio/core").PromptRuleOverridesB;
      };
      if (formatId !== "B") {
        res.status(400).json({
          error: "invalid formatId",
          detail: "研修デリバリー（B）のみ対応。一般提案（A）は Cursor で作成してください。",
        });
        return;
      }
      if (!tuning?.documentDate) {
        res.status(400).json({ error: "tuning.documentDate required" });
        return;
      }
      const result = await runGenerate({ formatId: "B", transcript, tuning, references, ruleOverrides });
      res.status(200).json(result);
      return;
    }

    if (head === "templates" && parts[1]) {
      const formatId = parts[1];
      if (formatId !== "B") {
        res.status(400).json({ error: "invalid formatId", detail: "B のみ" });
        return;
      }
      const devLive = process.env.VERCEL !== "1" && process.env.TEMPLATES_LIVE !== "false";
      res.status(200).json({
        formatId: "B",
        content: loadMasterTemplate("B", devLive),
        meta: templatesMeta(devLive),
      });
      return;
    }

    res.status(404).json({ error: "not found", path: parts.join("/") });
  } catch (e) {
    console.error(e);
    const err = e instanceof Error ? e : new Error(String(e));
    if (head === "generate") {
      res.status(500).json({ error: "generate failed", detail: err.message });
      return;
    }
    res.status(500).json({ error: err.message });
  }
}
