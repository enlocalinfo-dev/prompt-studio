import * as pdfjs from "pdfjs-dist";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const MAX_CHARS = 25_000;

export async function extractTextFromPdf(file: File): Promise<string> {
  if (file.size > MAX_FILE_BYTES) {
    throw new Error("PDFは10MBまでです");
  }
  if (!file.name.toLowerCase().endsWith(".pdf") && file.type !== "application/pdf") {
    throw new Error("PDFファイルを選んでください");
  }

  const data = new Uint8Array(await file.arrayBuffer());
  const doc = await pdfjs.getDocument({ data }).promise;
  const parts: string[] = [];

  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const line = content.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ");
    parts.push(line);
    if (parts.join("\n").length > MAX_CHARS) break;
  }

  let text = parts.join("\n").replace(/\s+\n/g, "\n").trim();
  if (text.length > MAX_CHARS) {
    text = `${text.slice(0, MAX_CHARS)}\n…（PDFは文字数上限で省略）`;
  }
  if (!text) {
    return "";
  }
  return text;
}
