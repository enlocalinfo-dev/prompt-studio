/** 議事録から AI が提案する「作るべき資料」の骨子 */

export type MeetingSuggestedEngine = "b" | "none";

export interface MeetingDocumentProposal {
  /** ユーザー向けの提案文（例：「経営層向けの研修導入サマリー8枚を作りましょう」） */
  pitch: string;
  /** 資料の正式タイトル案 */
  documentTitle: string;
  /** なぜこの形式か（2〜4文） */
  rationale: string;
  /** 想定読者 */
  audience: string;
  /** 作成を推奨する資料種別（表示用） */
  formatLabel: string;
  /** いま接続できる作成エンジン（b＝研修デリバリー8枚） */
  suggestedEngine: MeetingSuggestedEngine;
  /** 章・スライドの見出し案 */
  outline: { heading: string; purpose: string }[];
  /** B形式向けの下書き（議事録から抽出。未記載は空文字可） */
  briefDraft: {
    targetParticipants: string;
    trainingStartPeriod: string;
    mainEffects: string;
    trainingFeeExTax: string;
    subsidyAndNet: string;
  };
  /** メタ情報の下書き */
  tuningDraft: {
    clientName: string;
    proposerName: string;
    projectTitle: string;
  };
  /** 生成時に transcript に足す補足（決定事項・未決事項など） */
  contextForGeneration: string;
}

export function emptyMeetingProposal(): MeetingDocumentProposal {
  return {
    pitch: "",
    documentTitle: "",
    rationale: "",
    audience: "",
    formatLabel: "研修の提案書（8枚サマリー）",
    suggestedEngine: "b",
    outline: [],
    briefDraft: {
      targetParticipants: "",
      trainingStartPeriod: "",
      mainEffects: "",
      trainingFeeExTax: "",
      subsidyAndNet: "",
    },
    tuningDraft: {
      clientName: "",
      proposerName: "株式会社ENロジカル",
      projectTitle: "",
    },
    contextForGeneration: "",
  };
}
