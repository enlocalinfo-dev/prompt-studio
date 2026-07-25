import { Link } from "react-router-dom";
import type { HistoryEntry } from "../lib/storage";

export function RecentCasesList({ items }: { items: HistoryEntry[] }) {
  if (items.length === 0) return null;

  return (
    <section className="mt-8">
      <h2 className="text-sm font-semibold text-en-text">最近の案件</h2>
      <p className="mt-1 text-xs text-en-muted">この端末に保存された直近5件です。</p>
      <ul className="mt-3 space-y-2">
        {items.map((h) => (
          <li key={h.id}>
            <Link
              to="/create"
              state={{ restoreHistoryId: h.id }}
              className="block rounded-xl border border-en-border bg-white/[0.03] px-4 py-3 transition-colors hover:border-en-primary/35 hover:bg-en-primary/5"
            >
              <p className="text-sm font-medium text-en-text">{h.clientName}</p>
              <p className="mt-0.5 truncate text-xs text-en-muted">
                {h.projectTitle || "（研修名未設定）"} · {h.documentDate}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
