import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import type { VercelRequest } from "@vercel/node";
import { isBlobUploadConfigured } from "./blob-config.js";

/** 見積PDFのクライアント直接アップロード上限（Vercel Blob） */
export const MAX_BLOB_PDF_BYTES = 20 * 1024 * 1024;

function requestFromVercel(req: VercelRequest): Request {
  const host =
    (typeof req.headers["x-forwarded-host"] === "string" && req.headers["x-forwarded-host"]) ||
    (typeof req.headers.host === "string" && req.headers.host) ||
    "localhost";
  const proto =
    (typeof req.headers["x-forwarded-proto"] === "string" && req.headers["x-forwarded-proto"]) ||
    "https";
  const path = (req.url ?? "/api/blob-upload").split("?")[0]!;
  return new Request(`${proto}://${host}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(req.body),
  });
}

export async function runBlobUploadRoute(req: VercelRequest): Promise<Response> {
  if (!isBlobUploadConfigured()) {
    return Response.json(
      {
        error:
          "Blob が未設定です。Vercel Dashboard → Storage → Blob を作成し、prompt-studio プロジェクトに接続してください。",
      },
      { status: 503 },
    );
  }

  const body = req.body as HandleUploadBody;
  const request = requestFromVercel(req);

  const result = await handleUpload({
    body,
    request,
    onBeforeGenerateToken: async () => ({
      allowedContentTypes: ["application/pdf"],
      maximumSizeInBytes: MAX_BLOB_PDF_BYTES,
      addRandomSuffix: true,
    }),
  });

  return Response.json(result);
}
