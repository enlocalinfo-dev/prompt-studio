import * as pdfjs from "pdfjs-dist";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

export type EstimatePageImage = {
  mimeType: "image/jpeg";
  data: string;
};

const MAX_PAGES = 8;
const MAX_WIDTH = 1280;
const JPEG_QUALITY = 0.72;
/** 1枚あたりの base64 上限（約 450KB） */
const MAX_IMAGE_B64_CHARS = 600_000;
const MAX_TOTAL_B64_CHARS = 2_800_000;

/** 文字層が無いPDFを、画面と同じ見た目のJPEGにして送る */
export async function renderPdfPagesToJpeg(file: File): Promise<EstimatePageImage[]> {
  const data = new Uint8Array(await file.arrayBuffer());
  const doc = await pdfjs.getDocument({ data }).promise;
  const pageCount = Math.min(doc.numPages, MAX_PAGES);
  const images: EstimatePageImage[] = [];
  let total = 0;

  for (let i = 1; i <= pageCount; i++) {
    const page = await doc.getPage(i);
    const base = page.getViewport({ scale: 1 });
    const scale = Math.min(2, MAX_WIDTH / Math.max(base.width, 1));
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.floor(viewport.width));
    canvas.height = Math.max(1, Math.floor(viewport.height));
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) break;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvasContext: ctx, viewport }).promise;
    const dataUrl = canvas.toDataURL("image/jpeg", JPEG_QUALITY);
    const b64 = dataUrl.replace(/^data:image\/jpeg;base64,/i, "");
    if (!b64 || b64.length > MAX_IMAGE_B64_CHARS) continue;
    if (total + b64.length > MAX_TOTAL_B64_CHARS) break;
    images.push({ mimeType: "image/jpeg", data: b64 });
    total += b64.length;
    canvas.width = 0;
    canvas.height = 0;
  }

  return images;
}
