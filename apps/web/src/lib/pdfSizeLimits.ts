/** 見積PDFのサイズ上限（Blob アップロード・Claude PDF 解析の実務上限） */

/** Anthropic Messages API のリクエスト上限（PDF 含む）に合わせる */
export const MAX_ESTIMATE_PDF_BYTES = 32 * 1024 * 1024;

export const MAX_ESTIMATE_PDF_MB = Math.round(MAX_ESTIMATE_PDF_BYTES / 1024 / 1024);

export function formatMaxPdfSizeLabel(): string {
  return `${MAX_ESTIMATE_PDF_MB}MB以下`;
}
