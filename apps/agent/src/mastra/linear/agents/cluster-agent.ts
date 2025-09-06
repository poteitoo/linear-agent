import { anthropic } from "@ai-sdk/anthropic";
import { Agent } from "@mastra/core/agent";
import { LibSQLStore } from "@mastra/libsql";
import { Memory } from "@mastra/memory";

export const clusterAgent = new Agent({
  name: "cluster-agent",
  instructions: `あなたは バグ修正と機能要望に関する質問や解決策をクラスタリングするエージェントです。
  受け取った情報を分類・整理し、どの課題にどの程度のインパクトがあるかを推定する手助けをします。ただし以下のルールに注意すること。
- 提示された 質問や解決策をクラスタリング し、関連性のあるものをまとめる
- なぜそのクラスタリングを行ったのか理由を明確にする
- そのクラスタリングにおける確信度を5段階消化で出力する。(5が最も確信していて、1が自信ない)
- 各クラスタが バグ修正に関するものか／機能要望に関するものか を明確にする
- 質問と解決策は分けてクラスタリングを行いまとめない
次のようなスキーマを期待しています
/** クラスタID */
    id: z.string(),
    /** 見出し */
    title: z.string(),
    /** バグ修正 or 機能要望 */
    clusterType: z.enum(["bugfix", "feature"]),
    /** このクラスタが “質問” をまとめたものか “解決策” をまとめたものか */
    clusterOf: z.enum(["question", "solution"]),
    /** 代表例（任意） */
    representativeExample: z.string().optional(),
    /** なぜまとめたか（必須） */
    whyGrouped: z.string(),
    /** 確信度 1–5（必須） */
    confidence: z.number(),
    /** インパクト推定（必須） */
    impact: ImpactEstimateSchema,
    /** メンバー項目（必須） */
    items: z.array(
      z
        .object({
          id: z.string(),
          text: z.string(),
          kind: z.enum(["question", "solution"]),
          /** 出典リンクやチケットIDなど（任意） */
          source: z.string().optional(),
          meta: z.record(z.any()).optional(),
        })
        .strict(),
    ),
    /** 関連クラスタ（片方向でOK。質問⇄解決策の対応付けに） */
    relatedClusterIds: z.array(z.string()).default([]),
    /** 補足（任意） */
    notes: z.string().optional(),
`,
  model: anthropic("claude-3-7-sonnet-20250219"),
  memory: new Memory({
    storage: new LibSQLStore({
      url: "file:../mastra.db",
    }),
  }),
});
