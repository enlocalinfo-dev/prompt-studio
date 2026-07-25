import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";

export function AppShell({ children }: { children: React.ReactNode }) {
  const loc = useLocation();

  return (
    <div className="relative min-h-screen overflow-x-hidden en-mesh">
      <div
        aria-hidden
        className="orb pointer-events-none absolute -left-32 top-20 size-96 rounded-full bg-en-primary/15 blur-3xl"
      />
      <div
        aria-hidden
        className="orb orb-delay pointer-events-none absolute -right-24 top-1/3 size-80 rounded-full bg-en-secondary/12 blur-3xl"
      />

      <header className="sticky top-0 z-40 border-b border-en-border/80 glass-panel !rounded-none !shadow-none">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3.5 md:px-6">
          <Link to="/" className="group flex min-w-0 items-center gap-3">
            <motion.div
              whileHover={{ rotate: -3, scale: 1.04 }}
              transition={{ type: "spring", stiffness: 400, damping: 22 }}
              className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-en-primary via-en-primary-bright to-en-secondary text-sm font-bold tracking-tight text-en-on-primary shadow-lg shadow-en-primary/35"
            >
              EN
            </motion.div>
            <div className="min-w-0">
              <span className="block truncate text-[15px] font-semibold tracking-tight text-en-text">
                提案プロンプト作成
              </span>
              <span className="block truncate text-xs text-en-muted">見積PDF → Genspark 用の指示文</span>
            </div>
          </Link>

          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
            <Link
              to="/"
              className={`relative rounded-xl px-3 py-2 text-sm ${loc.pathname === "/" ? "text-en-text" : "text-en-muted hover:text-en-text"}`}
            >
              {loc.pathname === "/" && (
                <motion.span
                  layoutId="nav-overview"
                  className="absolute inset-0 rounded-xl bg-white/8 ring-1 ring-white/5"
                  transition={{ type: "spring", stiffness: 380, damping: 32 }}
                />
              )}
              <span className="relative">トップ</span>
            </Link>
            <Link
              to="/create"
              className={`relative rounded-xl px-3 py-2 text-sm ${loc.pathname.startsWith("/create") ? "text-en-text" : "text-en-muted hover:text-en-text"}`}
            >
              {loc.pathname.startsWith("/create") && (
                <motion.span
                  layoutId="nav-create"
                  className="absolute inset-0 rounded-xl bg-white/8 ring-1 ring-white/5"
                  transition={{ type: "spring", stiffness: 380, damping: 32 }}
                />
              )}
              <span className="relative">作成</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="relative mx-auto max-w-6xl px-4 py-10 md:px-6 md:py-14">{children}</main>

      <footer className="relative border-t border-en-border py-8">
        <div className="mx-auto max-w-6xl px-4 md:px-6">
          <p className="text-xs text-en-muted">株式会社ENロジカル · 社内提案資料ワークフロー</p>
        </div>
      </footer>
    </div>
  );
}
