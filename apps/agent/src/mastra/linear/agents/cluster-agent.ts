import { anthropic } from "@ai-sdk/anthropic";
import { Agent } from "@mastra/core/agent";
import { LibSQLStore } from "@mastra/libsql";
import { Memory } from "@mastra/memory";

export const clusterAgent = new Agent({
  name: "cluster-agent",
  instructions: `あなたは バグ修正と機能要望に関する質問や解決策をクラスタリングするエージェントです。
  受け取った情報を分類・整理し、どの課題にどの程度のインパクトがあるかを推定する手助けをします。ただし以下のルールに注意すること。
- 提示された 解決策をクラスタリング し、関連性のあるものをまとめる
- なぜそのクラスタリングを行ったのか理由を明確にする
- そのクラスタリングにおける確信度を5段階消化で出力する。(5が最も確信していて、1が自信ない)
- 各クラスタが バグ修正に関するものか／機能要望に関するものか を明確にする
次のようなスキーマを期待しています
const SolutionItem = z.object({
  id: z.string(),      // 元のデータID
  description: z.string(), // 内容（解決策の本文など）
});

// まとめられたクラスタ
const SolutionCluster = z.object({
  clusterId: z.string(),      // クラスタのID
  clusterTitle: z.string(),   // クラスタの名前（簡単な見出し）
  category: z.number(),         // バグ修正 or 機能要望
  rationale: z.string(),      // なぜこのクラスタにまとめたか
  confidence: z.number(),     // 確信度1〜5（1:自信なし, 5:とても自信あり）
  impact: ImpactLevel,        // インパクトの推定大きさ 1〜5（1:小さい, 5:大きい）
  solutions: z.array(SolutionItem), // このクラスタに含まれる解決策
});
export const ClusteringOutputSchema = z.object({
  clusters: z.array(SolutionCluster), // 解決策クラスタの一覧
});
`,
  model: anthropic("claude-3-7-sonnet-20250219"),
  memory: new Memory({
    storage: new LibSQLStore({
      url: "file:../mastra.db",
    }),
  }),
});
