import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { FORMATS, type FormatId } from "@prompt-studio/core";

const ease = [0.22, 1, 0.36, 1] as const;

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
};

const item = {
  hidden: { opacity: 0, y: 22 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease } },
};

export function HomePage() {
  const nav = useNavigate();

  return (
    <div>
      <motion.section
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease }}
        className="relative mb-14"
      >
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-en-accent/90">
          EN Logical · Internal
        </p>
        <h1 className="mt-4 max-w-3xl text-[1.75rem] font-semibold leading-[1.25] tracking-tight md:text-4xl md:leading-[1.2]">
          音声と要望を、
          <span className="text-gradient-en"> Genspark プロンプト</span>
          に。
        </h1>
        <p className="mt-5 max-w-xl text-sm leading-relaxed text-en-muted md:text-[15px]">
          <a
            href="https://en-logical.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-en-primary-bright underline-offset-2 hover:underline"
          >
            株式会社ENロジカル
          </a>
          の提案・研修デリバリー向けフォーマットに沿って、社内合意に使える{" "}
          <code className="rounded bg-white/5 px-1.5 py-0.5 text-en-text">genspark_prompt.md</code>{" "}
          を生成します。
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          {["音声入力", "ファインチューニング", "コピー用 text", "Vercel 公開"].map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-en-border bg-white/[0.03] px-3 py-1 text-[11px] font-medium text-en-muted"
            >
              {tag}
            </span>
          ))}
        </div>
      </motion.section>

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid gap-5 md:grid-cols-2"
      >
        {(["A", "B"] as FormatId[]).map((id) => {
          const f = FORMATS[id];
          return (
            <motion.button
              key={id}
              type="button"
              variants={item}
              whileHover={{ y: -6 }}
              whileTap={{ scale: 0.99 }}
              transition={{ type: "spring", stiffness: 420, damping: 28 }}
              onClick={() => nav(`/create/${id}`)}
              className="glass-panel glass-panel-hover group relative overflow-hidden rounded-2xl p-6 text-left md:p-7"
            >
              <div className="absolute -right-12 -top-12 size-40 rounded-full bg-en-primary/10 blur-2xl transition-opacity group-hover:opacity-100" />
              <div className="relative flex items-start justify-between gap-4">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-en-accent">
                    Format {id}
                  </span>
                  <h2 className="mt-2 text-xl font-semibold text-en-text transition-colors group-hover:text-en-primary-bright md:text-2xl">
                    {f.label}
                  </h2>
                </div>
                <span className="rounded-lg bg-white/5 px-2 py-1 text-[10px] font-medium text-en-muted ring-1 ring-white/5">
                  {f.slideCountHint}
                </span>
              </div>
              <p className="relative mt-3 text-sm leading-relaxed text-en-muted">{f.description}</p>
              <div className="relative mt-8">
                <span className="text-xs font-medium text-en-primary-bright opacity-0 transition-opacity group-hover:opacity-100">
                  作成を開始 →
                </span>
              </div>
            </motion.button>
          );
        })}
      </motion.div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-10 text-center text-[11px] text-en-muted/80"
      >
        一般提案（A）と研修デリバリー（B）は混在させません — ワークスペース標準に準拠
      </motion.p>
    </div>
  );
}
