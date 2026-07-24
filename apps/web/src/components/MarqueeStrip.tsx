import { motion } from "framer-motion";

const items = [
  "予算の壁",
  "採用の壁",
  "教育の壁",
  "生産性の壁",
  "創造性の壁",
  "Genspark",
  "提案書",
  "研修デリバリー",
];

export function MarqueeStrip() {
  const row = [...items, ...items];
  return (
    <div className="relative overflow-hidden border-y border-en-border/60 py-3">
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-en-deep to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-en-deep to-transparent" />
      <motion.div
        className="flex w-max gap-8 whitespace-nowrap text-xs font-medium tracking-wide text-en-muted/80"
        animate={{ x: ["0%", "-50%"] }}
        transition={{ duration: 28, ease: "linear", repeat: Infinity }}
      >
        {row.map((label, i) => (
          <span key={`${label}-${i}`} className="flex items-center gap-8">
            <span>{label}</span>
            <span className="size-1 rounded-full bg-en-primary/50" aria-hidden />
          </span>
        ))}
      </motion.div>
    </div>
  );
}
