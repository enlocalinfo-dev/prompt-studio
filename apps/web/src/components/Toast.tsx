import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";
import { AnimatePresence, motion } from "framer-motion";

type ToastKind = "default" | "error" | "success";

type ToastItem = { message: string; kind: ToastKind };

type ToastContextValue = {
  push: (message: string) => void;
  pushError: (message: string) => void;
  pushSuccess: (message: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return ctx;
}

const kindStyles: Record<ToastKind, string> = {
  default:
    "bg-gradient-to-r from-en-primary to-en-secondary text-en-on-primary shadow-en-primary/30",
  success:
    "bg-gradient-to-r from-en-primary to-en-secondary text-en-on-primary shadow-en-primary/30",
  error: "bg-en-accent-strong text-white shadow-en-accent-strong/40 ring-en-accent-strong/50",
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastItem | null>(null);

  const show = useCallback((message: string, kind: ToastKind) => {
    setToast({ message, kind });
    const ms = kind === "error" ? 8000 : 3200;
    window.setTimeout(() => setToast(null), ms);
  }, []);

  const push = useCallback((msg: string) => show(msg, "default"), [show]);
  const pushError = useCallback((msg: string) => show(msg, "error"), [show]);
  const pushSuccess = useCallback((msg: string) => show(msg, "success"), [show]);

  return (
    <ToastContext.Provider value={{ push, pushError, pushSuccess }}>
      {children}
      <AnimatePresence>
        {toast ? (
          <motion.div
            key={toast.message}
            role={toast.kind === "error" ? "alert" : "status"}
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 420, damping: 32 }}
            className="pointer-events-none fixed bottom-6 left-1/2 z-[100] max-w-[min(92vw,28rem)] -translate-x-1/2"
          >
            <div
              className={`rounded-xl px-4 py-3 text-sm font-semibold shadow-lg ring-1 ring-white/10 ${kindStyles[toast.kind]}`}
            >
              {toast.message}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </ToastContext.Provider>
  );
}
