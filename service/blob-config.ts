/** Blob 利用可否（@vercel/blob を import しない — API 全体の起動を軽くする） */

export function isBlobUploadConfigured(): boolean {
  if (process.env.BLOB_READ_WRITE_TOKEN) return true;
  if (process.env.BLOB_STORE_ID && process.env.VERCEL === "1") return true;
  return false;
}
