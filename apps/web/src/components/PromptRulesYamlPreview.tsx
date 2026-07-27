import { useMemo } from "react";
import {
  DELIVERY_B_SLIDES,
  normalizeBSlideRoleOrder,
  parseDesignSystemYaml,
  type TuningB,
} from "@prompt-studio/core";
import { DesignSystemSlidePreview } from "./DesignSystemSlidePreview";
import { SlideMiniPreview } from "./SlideMiniPreview";

type Props = {
  designYaml: string;
  behaviorRules: string;
  slideRoleOrder: number[] | undefined;
  tuning: TuningB;
};

/** プロンプトルール編集時：YAML パレット＋スライド順の見た目予測 */
export function PromptRulesYamlPreview({
  designYaml,
  behaviorRules,
  slideRoleOrder,
  tuning,
}: Props) {
  const parsed = useMemo(() => parseDesignSystemYaml(designYaml), [designYaml]);
  const order = normalizeBSlideRoleOrder(slideRoleOrder, tuning);
  const rolesById = useMemo(() => new Map(DELIVERY_B_SLIDES.map((r) => [r.order, r])), []);

  const gensparkStub = useMemo(
    () => `${behaviorRules.slice(0, 800)}\n${designYaml}`,
    [behaviorRules, designYaml],
  );

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 overflow-y-auto rounded-xl border border-en-border bg-en-deep/20 p-4">
      <DesignSystemSlidePreview parsed={parsed} gensparkText={gensparkStub} yamlBody={designYaml} />

      <div>
        <p className="text-[10px] font-semibold text-en-text">出力順プレビュー（{order.length}枚）</p>
        <p className="mt-1 text-[10px] text-en-muted">並べ替えた順でサムネイルを並べています。</p>
        <div className="mt-3 grid grid-cols-2 gap-2 lg:grid-cols-3">
          {order.map((roleId, i) => {
            const role = rolesById.get(roleId);
            if (!role) return null;
            const isCover = role.order === 1;
            return (
              <SlideMiniPreview
                key={`${roleId}-${i}`}
                variant={isCover ? "cover" : "content"}
                colors={parsed.colors}
                title={role.slideLabel}
                sub={role.summary}
                meta={role.visualization}
                slideNumber={i + 1}
                highlighted={i === 0}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
