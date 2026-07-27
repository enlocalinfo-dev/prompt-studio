import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { useState } from "react";
import { DeliveryProposalGuide } from "../components/DeliveryProposalGuide";
import { ProposalFormatCards } from "../components/ProposalFormatCards";
import { RecentCasesList } from "../components/RecentCasesList";
import { loadHistory } from "../lib/storage";

const ease = [0.22, 1, 0.36, 1] as const;

export function HomePage() {
  const [guideOpen, setGuideOpen] = useState(false);
  const history = loadHistory();

  return (
    <div>
      <motion.section
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease }}
        className="relative mb-8"
      >
        <h1 className="max-w-3xl text-[1.75rem] font-semibold leading-[1.25] tracking-tight md:text-4xl md:leading-[1.2]">
          決まった形式の
          <span className="text-gradient-en"> 提案プロンプト</span>
          を作成
        </h1>
        <p className="mt-5 max-w-2xl text-sm leading-relaxed text-en-muted md:text-base">
          見積PDFから作成するか、議事録を起点に資料案を立てるか、どちらからでも Genspark 用の指示文を作成できます。
        </p>
      </motion.section>

      <section className="mb-10">
        <Link
          to="/meeting"
          className="group block rounded-2xl border border-en-secondary/35 bg-gradient-to-br from-en-secondary/12 to-en-primary/8 p-5 transition-colors hover:border-en-secondary/55 md:p-6"
        >
          <p className="text-xs font-semibold text-en-accent">議事録モード</p>
          <h2 className="mt-1 text-lg font-semibold text-en-text group-hover:text-en-primary-bright">
            議事録から提案資料の方針を作成
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-en-muted">
            議事録を貼り付けると「こういう資料を作りましょう」と AI が提案します。内容を確認したうえで、プロンプトを生成できます。
          </p>
          <span className="mt-4 inline-block text-sm font-medium text-en-primary-bright">はじめる →</span>
        </Link>
      </section>

      <section>
        <h2 className="mb-1 text-sm font-semibold text-en-text">見積PDFから作成</h2>
        <p className="mb-4 text-xs text-en-muted">資料の種類を選んでから見積PDFを読み込みます。</p>
        <ProposalFormatCards />
      </section>

      <section className="mt-10">
        <Link
          to="/rules"
          className="block rounded-2xl border border-en-primary/30 bg-en-primary/8 p-5 transition-colors hover:border-en-primary/50 hover:bg-en-primary/12 md:p-6"
        >
          <p className="text-xs font-semibold text-en-accent">共通設定</p>
          <h2 className="mt-1 text-lg font-semibold text-en-text">プロンプトルール（資料の種類ごと）</h2>
          <p className="mt-2 text-sm text-en-muted">
            「研修の提案書」など種類を選んで、内容・デザインYAML・出力ルールを編集できます。
          </p>
        </Link>
      </section>

      <RecentCasesList items={history} className="mt-10" />

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
