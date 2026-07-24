const MAX_BYTES = 800_000;
const MAX_TEXT = 18_000;
const TIMEOUT_MS = 12_000;

const BLOCKED_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "[::1]",
  "metadata.google.internal",
]);

function isPrivateIpv4(host: string): boolean {
  const m = host.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if (!m) return false;
  const a = Number(m[1]);
  const b = Number(m[2]);
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 192 && b === 168) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  return false;
}

export function assertSafeUrl(raw: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(raw.trim());
  } catch {
    throw new Error("URLの形式が正しくありません");
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("http または https のURLのみ対応しています");
  }
  const host = parsed.hostname.toLowerCase();
  if (BLOCKED_HOSTS.has(host) || host.endsWith(".local")) {
    throw new Error("このURLは取得できません");
  }
  if (isPrivateIpv4(host)) {
    throw new Error("このURLは取得できません");
  }
  return parsed;
}

function htmlToText(html: string): string {
  let s = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ");
  s = s.replace(/<br\s*\/?>/gi, "\n");
  s = s.replace(/<\/p>/gi, "\n\n");
  s = s.replace(/<[^>]+>/g, " ");
  s = s
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"');
  return s.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").replace(/[ \t]{2,}/g, " ").trim();
}

function titleFromHtml(html: string): string | undefined {
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (!m) return undefined;
  return m[1].replace(/<[^>]+>/g, "").trim().slice(0, 200) || undefined;
}

export async function fetchUrlAsText(rawUrl: string): Promise<{
  url: string;
  title?: string;
  text: string;
}> {
  const parsed = assertSafeUrl(rawUrl);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(parsed.toString(), {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        Accept: "text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.8",
        "User-Agent": "PromptStudio/1.0 (EN Logical; reference fetch)",
      },
    });

    if (!res.ok) {
      throw new Error(`取得失敗 HTTP ${res.status}`);
    }

    const ctype = res.headers.get("content-type") ?? "";
    const buf = await res.arrayBuffer();
    if (buf.byteLength > MAX_BYTES) {
      throw new Error("ページが大きすぎます（上限約800KB）");
    }

    const raw = new TextDecoder("utf-8", { fatal: false }).decode(buf);

    if (ctype.includes("text/plain") || (!ctype.includes("html") && !raw.includes("<html"))) {
      const text = raw.trim().slice(0, MAX_TEXT);
      return { url: parsed.toString(), title: parsed.hostname, text };
    }

    const title = titleFromHtml(raw);
    let text = htmlToText(raw);
    if (text.length > MAX_TEXT) {
      text = `${text.slice(0, MAX_TEXT)}\n…（省略）`;
    }
    if (!text) {
      throw new Error("ページからテキストを抽出できませんでした");
    }

    return { url: parsed.toString(), title, text };
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") {
      throw new Error("取得がタイムアウトしました");
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }
}
