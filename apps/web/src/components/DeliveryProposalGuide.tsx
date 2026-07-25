import { motion } from "framer-motion";
import {
  DELIVERY_B_INPUT_SECTIONS,
  DELIVERY_B_OUTPUT_NOTE,
  DELIVERY_B_SLIDES,
} from "@prompt-studio/core";

export function DeliveryProposalGuide() {
  return (
    <div className="mt-10 grid gap-6 lg:grid-cols-2">
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08 }}
        className="glass-panel rounded-2xl p-5 md:p-6"
      >
        <h2 className="text-sm font-semibold text-en-text">できること（出力）</h2>
        <p className="mt-2 text-xs leading-relaxed text-en-muted">{DELIVERY_B_OUTPUT_NOTE}</p>
        <ol className="mt-4 space-y-2.5">
          {DELIVERY_B_SLIDES.map((s) => (
            <li key={s.order} className="flex gap-3 text-[11px] leading-relaxed md:text-xs">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-en-primary/15 text-[10px] font-bold text-en-accent">
                {s.order}
              </span>
              <div>
                <p className="font-medium text-en-text">
                  {s.element ? `${s.element} ` : ""}
                  {s.slideLabel}
                </p>
                <p className="text-en-muted">{s.summary}</p>
                <p className="mt-0.5 text-[10px] text-en-muted/80">図解：{s.visualization}</p>
              </div>
            </li>
          ))}
        </ol>
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.12 }}
        className="glass-panel rounded-2xl p-5 md:p-6"
      >
        <h2 className="text-sm font-semibold text-en-text">必要なインプット</h2>
        <p className="mt-2 text-xs leading-relaxed text-en-muted">
          次画面のフォーム項目です。B標準テンプレの■固稿に沿って Genspark 用プロンプトを組み立てます。
        </p>
        <ul className="mt-4 space-y-4">
          {DELIVERY_B_INPUT_SECTIONS.map((sec) => (
            <li key={sec.id} className="border-t border-en-border pt-4 first:border-t-0 first:pt-0">
              <p className="text-xs font-semibold text-en-text">{sec.title}</p>
              <p className="mt-0.5 text-[10px] text-en-accent">→ {sec.mapsToSlide}</p>
              <ul className="mt-2 list-inside list-disc text-[11px] text-en-muted">
                {sec.fields.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
              <p className="mt-1.5 text-[10px] text-en-muted/85">{sec.hint}</p>
            </li>
          ))}
        </ul>
      </motion.section>
    </div>
  );
}
