import { motion, AnimatePresence } from "framer-motion";
import { Button } from "./ui/Button";

export function StickyCopyBar({
  visible,
  onCopy,
  onDownload,
  busy,
}: {
  visible: boolean;
  onCopy: () => void;
  onDownload: () => void;
  busy?: boolean;
}) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          className="fixed bottom-0 left-0 right-0 z-[80] border-t border-en-border bg-en-panel/95 px-4 py-3 backdrop-blur-xl md:py-4"
        >
          <div className="mx-auto flex max-w-6xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-en-muted sm:text-sm">
              次の操作：コピーして Genspark に貼り付け、スライドを生成
            </p>
            <div className="flex gap-2">
              <Button variant="secondary" className="flex-1 sm:flex-none" disabled={busy} onClick={onDownload}>
                ファイルを保存
              </Button>
              <Button className="flex-1 !py-3 sm:min-w-[220px] sm:flex-none" disabled={busy} onClick={onCopy}>
                貼り付け用の文をコピー
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
