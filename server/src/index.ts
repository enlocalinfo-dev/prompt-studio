import "dotenv/config";
import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import type { FormatId, ReferenceBundle, TuningB } from "@prompt-studio/core";
import { fetchUrlAsText } from "../../service/url-fetch.js";
import { runGenerate, runHealth } from "./generate-service.js";
import { loadMasterTemplate, templatesMeta } from "./templates.js";

const PORT = Number(process.env.PORT) || 8787;
const DEV_LIVE = process.env.TEMPLATES_LIVE !== "false";

const app = express();
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://127.0.0.1:5173",
      /\.vercel\.app$/,
    ],
  }),
);
app.use(express.json({ limit: "8mb" }));
app.use(
  rateLimit({
    windowMs: 60_000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
  }),
);

app.get("/api/health", (_req, res) => {
  res.json(runHealth());
});

app.get("/api/templates/:formatId", (req, res) => {
  const formatId = req.params.formatId as FormatId;
  if (formatId !== "B") {
    res.status(400).json({ error: "invalid formatId", detail: "B のみ" });
    return;
  }
  const content = loadMasterTemplate(formatId, DEV_LIVE);
  res.json({
    formatId,
    content,
    meta: templatesMeta(DEV_LIVE),
  });
});

app.post("/api/fetch-url", async (req, res) => {
  try {
    const { url } = req.body as { url?: string };
    if (!url || typeof url !== "string") {
      res.status(400).json({ error: "url required" });
      return;
    }
    const result = await fetchUrlAsText(url);
    res.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : "fetch failed";
    res.status(400).json({ error: message });
  }
});

app.post("/api/expand-brief", async (req, res) => {
  try {
    const { fileName, extractedText, pdfBase64 } = req.body as {
      fileName?: string;
      extractedText?: string;
      pdfBase64?: string;
    };
    if (!fileName) {
      res.status(400).json({ error: "fileName required" });
      return;
    }
    const { expandBriefFromEstimatePdf } = await import("../../service/expand-brief-from-pdf.js");
    const result = await expandBriefFromEstimatePdf({ fileName, extractedText, pdfBase64 });
    res.json(result);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "expand-brief failed" });
  }
});

app.post("/api/generate", async (req, res) => {
  try {
    const { formatId, transcript, tuning, references } = req.body as {
      formatId: FormatId;
      transcript: string;
      tuning: TuningB;
      references?: ReferenceBundle;
    };
    if (formatId !== "B") {
      res.status(400).json({
        error: "invalid formatId",
        detail: "研修デリバリー（B）のみ対応",
      });
      return;
    }
    if (!tuning?.documentDate?.trim()) {
      res.status(400).json({ error: "tuning.documentDate required" });
      return;
    }
    const result = await runGenerate({ formatId: "B", transcript, tuning, references });
    res.json(result);
  } catch (e) {
    console.error(e);
    const err = e instanceof Error ? e : new Error(String(e));
    res.status(500).json({ error: "generate failed", detail: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Prompt Studio API http://localhost:${PORT}`);
  console.log(`LLM: ${process.env.ANTHROPIC_API_KEY ? "enabled" : "mock"}`);
  console.log(`Templates live read: ${DEV_LIVE}`);
});
