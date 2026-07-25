/** expand-brief 用：413 を避けるため、テキストが取れれば PDF 本体は送らない */

export const MIN_EXTRACTED_TEXT_CHARS = 80;
export const MAX_RAW_PDF_BYTES_FOR_UPLOAD = 2_800_000;
const MAX_EXTRACTED_TEXT_CHARS = 50_000;

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

export async function buildExpandBriefRequest(
  file: File,
  extractedText: string,
): Promise<{ fileName: string; extractedText?: string; pdfBase64?: string }> {
  const text = extractedText.trim().slice(0, MAX_EXTRACTED_TEXT_CHARS);
  const fileName = file.name;

  if (text.length >= MIN_EXTRACTED_TEXT_CHARS) {
    return { fileName, extractedText: text };
  }

  if (file.size > MAX_RAW_PDF_BYTES_FOR_UPLOAD) {
    throw new PdfTooLargeError(
      "PDFが大きすぎてアップロードできません（約2.8MB以下に圧縮するか、文字が選べるPDFで再出力してください）。スキャンPDFは容量を小さくすると読み取りやすくなります。",
    );
  }

  const pdfBase64 = await fileToBase64(file);
  return { fileName, extractedText: text || undefined, pdfBase64 };
}

export function trimReferencePdfText(text: string, max = 12_000): string {
  const t = text.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max)}\n…（見積テキストは上限で省略）`;
}
