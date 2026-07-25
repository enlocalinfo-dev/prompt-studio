/** Vercel Serverless のリクエストボディ上限（約4.5MB）を踏まえた PDF 送信ルール */

/** この文字数以上あれば PDF バイナリは送らない（テキストのみで LLM） */
export const MIN_EXTRACTED_TEXT_CHARS = 80;

/** base64 付き送信を許可する生 PDF の最大サイズ（約2.8MB → base64 約3.7MB + JSON 余裕） */
export const MAX_RAW_PDF_BYTES_FOR_UPLOAD = 2_800_000;

export const MAX_EXTRACTED_TEXT_CHARS = 50_000;

export function shouldAttachPdfBinary(extractedText: string | undefined): boolean {
  return (extractedText?.trim().length ?? 0) < MIN_EXTRACTED_TEXT_CHARS;
}

export function sanitizeExpandBriefBody(body: {
  fileName: string;
  extractedText?: string;
  pdfBase64?: string;
}): { fileName: string; extractedText?: string; pdfBase64?: string } {
  const extractedText = body.extractedText?.trim().slice(0, MAX_EXTRACTED_TEXT_CHARS);
  let pdfBase64 = body.pdfBase64;

  if (!shouldAttachPdfBinary(extractedText)) {
    pdfBase64 = undefined;
  } else if (pdfBase64 && pdfBase64.length > 3_600_000) {
    pdfBase64 = undefined;
  }

  return {
    fileName: body.fileName,
    extractedText: extractedText || undefined,
    pdfBase64,
  };
}
