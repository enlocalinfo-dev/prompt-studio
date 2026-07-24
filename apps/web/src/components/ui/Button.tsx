import { motion } from "framer-motion";
import type { ButtonHTMLAttributes, ReactNode } from "react";

const ease = [0.22, 1, 0.36, 1] as const;

type Variant = "primary" | "secondary" | "ghost";

export function Button({
  variant = "primary",
  className = "",
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  children: ReactNode;
}) {
  const base =
    "inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors disabled:opacity-50 disabled:pointer-events-none";
  const styles: Record<Variant, string> = {
    primary:
      "bg-gradient-to-r from-en-primary to-en-secondary text-en-on-primary shadow-lg shadow-en-primary/30 hover:shadow-en-secondary/35",
    secondary: "border border-en-border bg-white/5 text-en-text hover:bg-white/10",
    ghost: "text-en-muted hover:text-en-accent hover:bg-white/5",
  };

  return (
    <motion.button
      type="button"
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.2, ease }}
      className={`${base} ${styles[variant]} ${className}`}
      {...props}
    >
      {children}
    </motion.button>
  );
}
