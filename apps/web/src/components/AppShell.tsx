import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { fetchHealth } from "../lib/api";
import { MarqueeStrip } from "./MarqueeStrip";

export function AppShell({ children }: { children: React.ReactNode }) {
  const loc = useLocation();
  const [llm, setLlm] = useState<boolean | null>(null);

  useEffect(() => {
    fetchHealth()
      .then((h) => setLlm(h.llm))
      .catch(() => setLlm(null));
  }, []);

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
                Prompt Studio
              </span>
              <span className="block truncate text-[11px] text-en-muted">
                「わからない」から任せられる伴走ツール
              </span>
            </div>
          </Link>

          <div className="flex shrink-0 items-center gap-3">
            {llm !== null && (
              <motion.span
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                className={`hidden rounded-full px-2.5 py-1 text-[10px] font-medium sm:inline ${llm ? "bg-en-primary/15 text-en-accent ring-1 ring-en-primary/30" : "bg-white/5 text-en-muted"}`}
              >
                {llm ? "Claude API" : "オフライン合成"}
              </motion.span>
            )}
            <Link
              to="/"
              className={`relative rounded-xl px-3 py-2 text-sm ${loc.pathname === "/" ? "text-en-text" : "text-en-muted hover:text-en-text"}`}
            >
              {loc.pathname === "/" && (
                <motion.span
                  layoutId="nav-active"
                  className="absolute inset-0 rounded-xl bg-white/8 ring-1 ring-white/5"
                  transition={{ type: "spring", stiffness: 380, damping: 32 }}
                />
              )}
              <span className="relative">ホーム</span>
            </Link>
          </div>
        </div>
        <MarqueeStrip />
      </header>

      <main className="relative mx-auto max-w-6xl px-4 py-10 md:px-6 md:py-14">{children}</main>

      <footer className="relative border-t border-en-border py-10">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 md:flex-row md:items-center md:justify-between md:px-6">
          <div>
            <p className="text-sm font-medium text-en-text">AIで、経営の壁を越える。</p>
            <p className="mt-1 text-xs text-en-muted">Genspark 用プロンプトを、型と伴走で速く。</p>
          </div>
          <a
            href="https://en-logical.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-medium text-en-primary-bright transition-colors hover:text-en-accent"
          >
            株式会社ENロジカル — en-logical.com
          </a>
        </div>
      </footer>
    </div>
  );
}
