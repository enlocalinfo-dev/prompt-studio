/** expand-brief：Blob URL から PDF を取得して base64 化 */

import { MAX_ESTIMATE_PDF_BYTES, MAX_ESTIMATE_PDF_MB } from "./pdf-size-limits.js";

const ALLOWED_BLOB_HOST_SUFFIX = ".blob.vercel-storage.com";
const MAX_FETCH_BYTES = MAX_ESTIMATE_PDF_BYTES + 2 * 1024 * 1024;

export function isAllowedPdfBlobUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === "https:" && u.hostname.endsWith(ALLOWED_BLOB_HOST_SUFFIX);
  } catch {
    return false;
  }
}

export async function fetchPdfBase64FromBlobUrl(pdfBlobUrl: string): Promise<string> {
  if (!isAllowedPdfBlobUrl(pdfBlobUrl)) {
    throw new Error("許可されていない PDF の保存先です");
  }

  const res = await fetch(pdfBlobUrl);
  if (!res.ok) {
    throw new Error(`PDFの取得に失敗しました（HTTP ${res.status}）`);
  }

  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length > MAX_FETCH_BYTES) {
    throw new Error(`PDFが大きすぎて解析できません（${MAX_ESTIMATE_PDF_MB}MB以下にしてください）`);
  }

  return buf.toString("base64");
}
