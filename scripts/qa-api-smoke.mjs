/** API 中心の QA（DB なしアプリ向け） */
const API = process.env.QA_API_URL || "http://localhost:8787";

const results = [];

function record(no, screen, test, result, severity, evidence, issue = "") {
  results.push({ no, screen, test, result, severity, evidence, issue });
}

async function main() {
  const health = await fetch(`${API}/api/health`).then((r) => r.json());
  record(1, "API /health", "200 + ok", health.ok ? "PASS" : "FAIL", "Critical", JSON.stringify(health));

  const noDate = await fetch(`${API}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      formatId: "B",
      transcript: "t",
      tuning: { clientName: "A", projectTitle: "B", documentDate: "", proposerName: "EN" },
    }),
  });
  record(
    2,
    "API generate",
    "documentDate 未入力 → 400",
    noDate.status === 400 ? "PASS" : "FAIL",
    "High",
    `status=${noDate.status}`,
  );

  const badFmt = await fetch(`${API}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ formatId: "A", transcript: "t", tuning: { documentDate: "2026年1月1日" } }),
  });
  record(3, "API generate", "formatId A 拒否", badFmt.status === 400 ? "PASS" : "FAIL", "Medium", `status=${badFmt.status}`);

  const t0 = Date.now();
  const ok = await fetch(`${API}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      formatId: "B",
      transcript:
        "【研修対象者】QA営業10名\n【研修開始時期】2026年10月\n【主な効果】工数削減\n【研修費】100万円",
      tuning: {
        clientName: "QA株式会社様",
        projectTitle: "QA研修",
        documentDate: "2026年7月25日",
        proposerName: "ENロジカル",
      },
    }),
  });
  const body = await ok.json().catch(() => ({}));
  const ms = Date.now() - t0;
  record(
    4,
    "API generate",
    "正常系 markdown + gensparkText",
    ok.ok && body.markdown?.length > 500 && body.gensparkText?.length > 100 ? "PASS" : "FAIL",
    "Critical",
    `status=${ok.status} md=${body.markdown?.length ?? 0} gs=${body.gensparkText?.length ?? 0} ${ms}ms mode=${body.generationMode}`,
    ok.ok ? "" : body.detail?.slice?.(0, 120) ?? "",
  );

  const expand = await fetch(`${API}/api/expand-brief`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fileName: "test.pdf" }),
  });
  record(5, "API expand-brief", "fileName のみ → 200/heuristic", expand.ok ? "PASS" : "FAIL", "High", `status=${expand.status}`);

  console.log(JSON.stringify({ api: API, results }, null, 2));
}

main();
