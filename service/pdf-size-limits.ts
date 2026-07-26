/** 見積PDFのサイズ上限（サーバー側） */

export const MAX_ESTIMATE_PDF_BYTES = 32 * 1024 * 1024;

export const MAX_ESTIMATE_PDF_MB = Math.round(MAX_ESTIMATE_PDF_BYTES / 1024 / 1024);
