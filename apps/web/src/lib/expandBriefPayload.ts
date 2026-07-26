/** expand-brief 用：413 を避けるため、テキストが取れれば PDF 本体は送らない */

import { upload } from "@vercel/blob/client";
import {
  formatMaxPdfSizeLabel,
  MAX_ESTIMATE_PDF_BYTES,
} from "./pdfSizeLimits";

export const MIN_EXTRACTED_TEXT_CHARS = 80;
/** JSON + base64 で Vercel 4.5MB 以内に収める生 PDF 上限 */
export const MAX_RAW_PDF_BYTES_FOR_UPLOAD = 2_800_000;
export const MAX_BLOB_PDF_BYTES = MAX_ESTIMATE_PDF_BYTES;
const MAX_EXTRACTED_TEXT_CHARS = 50_000;

export type ExpandBriefRequestBody = {
  fileName: string;
  extractedText?: string;
  pdfBase64?: string;
  pdfBlobUrl?: string;
};

export async function fileToBase64(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  let binary = "";
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]!);
  return btoa(binary);
}

export class PdfTooLargeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PdfTooLargeError";
  }
}

function safePdfPathname(fileName: string): string {
  const base = fileName.replace(/[^\w.\-ぁ-んァ-ヶ一-龥]/g, "_").slice(0, 80);
  return `estimate-pdfs/${Date.now()}-${base || "estimate.pdf"}`;
}

async function uploadPdfViaBlob(file: File): Promise<string> {
  const blob = await upload(safePdfPathname(file.name), file, {
    access: "public",
    handleUploadUrl: "/api/blob-upload",
    contentType: "application/pdf",
    multipart: file.size > 4 * 1024 * 1024,
  });
  return blob.url;
}

export async function buildExpandBriefRequest(
  file: File,
  extractedText: string,
): Promise<ExpandBriefRequestBody> {
  const text = extractedText.trim().slice(0, MAX_EXTRACTED_TEXT_CHARS);
  const fileName = file.name;

  if (text.length >= MIN_EXTRACTED_TEXT_CHARS) {
    return { fileName, extractedText: text };
  }

  if (file.size > MAX_BLOB_PDF_BYTES) {
    throw new PdfTooLargeError(
      `PDFが大きすぎます（${formatMaxPdfSizeLabel()}にしてください）。スキャンPDFは解像度を下げると読み取りやすくなります。`,
    );
  }

  if (file.size > MAX_RAW_PDF_BYTES_FOR_UPLOAD) {
    try {
      const pdfBlobUrl = await uploadPdfViaBlob(file);
      return { fileName, extractedText: text || undefined, pdfBlobUrl };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("503") || msg.toLowerCase().includes("blob")) {
        throw new PdfTooLargeError(
          "大きいPDFを送るには Vercel の Blob ストレージ設定（BLOB_READ_WRITE_TOKEN）が必要です。約2.8MB以下に圧縮するか、文字が選べるPDFで保存し直してください。",
        );
      }
      throw new PdfTooLargeError(
        `PDFのアップロードに失敗しました。ファイルサイズを小さくするか、しばらくして再試行してください。（${msg.slice(0, 120)}）`,
      );
    }
  }

  const pdfBase64 = await fileToBase64(file);
  return { fileName, extractedText: text || undefined, pdfBase64 };
}

export function trimReferencePdfText(text: string, max = 12_000): string {
  const t = text.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max)}\n…（見積テキストは上限で省略）`;
}
