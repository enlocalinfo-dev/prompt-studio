import { Link, useNavigate } from "react-router-dom";
import type { HistoryEntry } from "../lib/storage";
import { historyEntryHasPromptDetail, resolveSessionForHistory } from "../lib/historySession";
import { navigateToPromptDetail } from "../lib/promptNavigation";
import { Button } from "./ui/Button";

export function RecentCasesList({ items, className }: { items: HistoryEntry[]; className?: string }) {
  const nav = useNavigate();

  if (items.length === 0) return null;

  function resumeCase(entry: HistoryEntry) {
    const session = resolveSessionForHistory(entry);
    if (session) {
      navigateToPromptDetail(nav, session);
      return;
    }
    nav("/create/b", { state: { restoreHistoryId: entry.id } });
  }

  return (
    <section className={className ?? "mt-8"}>
      <h2 className="text-sm font-semibold text-en-text">最近の案件</h2>
      <p className="mt-1 text-xs text-en-muted">この端末に保存された直近5件です。</p>
      <ul className="mt-3 space-y-2">
        {items.map((h) => {
          const canOpenDetail = historyEntryHasPromptDetail(h);
          return (
            <li
              key={h.id}
              className="rounded-xl border border-en-border bg-white/[0.03] px-4 py-3 transition-colors hover:border-en-primary/35 hover:bg-en-primary/5"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-en-text">{h.clientName}</p>
                  <p className="mt-0.5 truncate text-xs text-en-muted">
                    {h.projectTitle || "（研修名未設定）"} · {h.documentDate}
                  </p>
                  {!canOpenDetail && h.gensparkPreview && (
                    <p className="mt-1 line-clamp-1 text-[10px] text-en-muted">
                      {h.gensparkPreview}
                      <span className="text-en-accent"> · PDFから再作成すると詳細画面を開けます</span>
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <Button type="button" className="!py-2 !text-xs" onClick={() => resumeCase(h)}>
                    作成を再開
                  </Button>
                  {canOpenDetail && (
                    <Link
                      to="/create/b"
                      state={{ restoreHistoryId: h.id }}
                      className="inline-flex items-center justify-center rounded-xl border border-en-border px-3 py-2 text-xs font-medium text-en-text transition-colors hover:border-en-primary/40 hover:bg-white/[0.04]"
                    >
                      入力だけ修正
                    </Link>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
