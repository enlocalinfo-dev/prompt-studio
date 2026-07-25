import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { DELIVERY_B_FORMAT } from "@prompt-studio/core";
import { DeliveryProposalGuide } from "../components/DeliveryProposalGuide";
import { Button } from "../components/ui/Button";

const ease = [0.22, 1, 0.36, 1] as const;

export function HomePage() {
  const nav = useNavigate();

  return (
    <div>
      <motion.section
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease }}
        className="relative mb-6"
      >
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-en-accent/90">
          EN Logical · 研修デリバリー B
        </p>
        <h1 className="mt-4 max-w-3xl text-[1.75rem] font-semibold leading-[1.25] tracking-tight md:text-4xl md:leading-[1.2]">
          研修提案サマリーを、
          <span className="text-gradient-en"> Genspark プロンプト</span>
          に。
        </h1>
        <p className="mt-5 max-w-2xl text-sm leading-relaxed text-en-muted md:text-[15px]">
          {DELIVERY_B_FORMAT.description}
          まず見積PDFを読み込み、骨子を自動入力したうえで B 標準テンプレ（全{DELIVERY_B_FORMAT.slideCount}枚）の{" "}
          <code className="rounded bg-white/5 px-1.5 py-0.5 text-en-text">genspark_prompt.md</code>{" "}
          を生成します。一般提案（Format A）はこのアプリでは扱いません（Cursor で作成）。
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button className="!px-6 !py-3" onClick={() => nav("/create")}>
            見積PDFから作成
          </Button>
          <span className="self-center text-[11px] text-en-muted">8枚固定</span>
        </div>
      </motion.section>

      <DeliveryProposalGuide />
    </div>
  );
}
