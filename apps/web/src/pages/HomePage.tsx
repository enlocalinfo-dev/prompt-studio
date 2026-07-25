import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useState } from "react";
import { DeliveryProposalGuide } from "../components/DeliveryProposalGuide";
import { RecentCasesList } from "../components/RecentCasesList";
import { Button } from "../components/ui/Button";
import { loadHistory } from "../lib/storage";

const ease = [0.22, 1, 0.36, 1] as const;

export function HomePage() {
  const nav = useNavigate();
  const [guideOpen, setGuideOpen] = useState(false);
  const history = loadHistory();

  return (
    <div>
      <motion.section
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease }}
        className="relative mb-6"
      >
        <h1 className="max-w-3xl text-[1.75rem] font-semibold leading-[1.25] tracking-tight md:text-4xl md:leading-[1.2]">
          見積PDFから、
          <span className="text-gradient-en"> 提案スライド用の指示文</span>
          を作成
        </h1>
        <p className="mt-5 max-w-2xl text-sm leading-relaxed text-en-muted md:text-base">
          見積1枚をアップロードするだけで、経営者向けサマリー（全8枚）を Genspark で生成するための文章を自動作成します。
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button className="!px-8 !py-3.5 text-base" onClick={() => nav("/create")}>
            見積PDFを選んで開始
          </Button>
        </div>
      </motion.section>

      <RecentCasesList items={history} />

      <section className="mt-10">
        <button
          type="button"
          onClick={() => setGuideOpen((o) => !o)}
          className="flex w-full items-center justify-between rounded-xl border border-en-border bg-white/[0.02] px-4 py-3 text-left"
        >
          <span className="text-sm font-medium text-en-text">8枚の構成と入力項目の説明</span>
          <span className="text-xs text-en-muted">{guideOpen ? "閉じる" : "開く"}</span>
        </button>
        {guideOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4">
            <DeliveryProposalGuide />
          </motion.div>
        )}
      </section>
    </div>
  );
}
