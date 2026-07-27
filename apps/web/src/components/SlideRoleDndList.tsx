import { useEffect, useMemo, useState } from "react";
import { motion, Reorder } from "framer-motion";
import type { DeliverySlideRole, TuningB } from "@prompt-studio/core";
import {
  DELIVERY_B_SLIDES,
  defaultBSlideRoleOrder,
  normalizeBSlideRoleOrder,
  slideRoleOrderSummary,
} from "@prompt-studio/core";

type Props = {
  order: number[];
  tuning: TuningB;
  onChange: (order: number[]) => void;
};

export function SlideRoleDndList({ order, tuning, onChange }: Props) {
  const rolesById = useMemo(() => new Map(DELIVERY_B_SLIDES.map((r) => [r.order, r])), []);

  const visibleOrder = normalizeBSlideRoleOrder(order, tuning);
  const [items, setItems] = useState(visibleOrder);

  useEffect(() => {
    setItems(visibleOrder);
  }, [visibleOrder.join(",")]);

  return (
    <div>
      <p className="text-xs text-en-muted">
        ドラッグで並べ替え → 保存すると■固稿の出力順とプロンプト内の順序指示が変わります。
        <span className="mt-1 block font-mono text-[10px] text-en-primary-bright">
          {slideRoleOrderSummary(order, tuning)}
        </span>
      </p>
      <Reorder.Group
        axis="y"
        values={items}
        onReorder={(next) => {
          setItems(next);
          onChange(next);
        }}
        className="mt-4 space-y-2"
      >
        {items.map((roleId) => {
          const role = rolesById.get(roleId);
          if (!role) return null;
          return (
            <Reorder.Item key={roleId} value={roleId} className="cursor-grab active:cursor-grabbing">
              <SlideRoleRow role={role} index={items.indexOf(roleId) + 1} tuning={tuning} />
            </Reorder.Item>
          );
        })}
      </Reorder.Group>
      <button
        type="button"
        className="mt-3 text-xs text-en-muted underline hover:text-en-text"
        onClick={() => {
          const def = normalizeBSlideRoleOrder(defaultBSlideRoleOrder(), tuning);
          setItems(def);
          onChange(def);
        }}
      >
        B標準の順序に戻す
      </button>
    </div>
  );
}

function SlideRoleRow({
  role,
  index,
  tuning,
}: {
  role: DeliverySlideRole;
  index: number;
  tuning: TuningB;
}) {
  const excluded = !tuning.netCostSlide && role.order === 7;

  return (
    <motion.div
      layout
      className="flex gap-3 rounded-xl border border-en-border bg-en-deep/30 px-3 py-3 md:px-4"
    >
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-en-primary/15 font-mono text-xs font-semibold text-en-primary-bright">
        {String(index).padStart(2, "0")}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-en-text">
          {role.slideLabel}
          {role.element ? (
            <span className="ml-1 text-xs font-normal text-en-muted">（{role.element}）</span>
          ) : null}
        </p>
        <p className="mt-0.5 text-xs text-en-muted">{role.summary}</p>
        {excluded && <p className="mt-1 text-[10px] text-en-accent">実質負担OFFのため生成から除外</p>}
      </div>
      <span className="self-center text-en-muted" aria-hidden>
        ⋮⋮
      </span>
    </motion.div>
  );
}
