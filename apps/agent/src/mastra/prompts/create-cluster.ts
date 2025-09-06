import { z } from "zod";

// バグ修正 or 機能要望
const Category = z.enum(["bugfix", "feature"]);

// 確信度 1〜5（1:自信なし, 5:とても自信あり）
const Confidence = z.number();

// インパクトの大きさ 1〜5（1:小さい, 5:大きい）
const ImpactLevel = z.number();

// 個別のアイテム（元の課題や解決策のテキスト）
const SolutionItem = z.object({
  id: z.string(), // 元のデータID
  description: z.string(), // 内容（解決策の本文など）
});

// まとめられたクラスタ
const SolutionCluster = z.object({
  clusterId: z.string(), // クラスタのID
  clusterTitle: z.string(), // クラスタの名前（簡単な見出し）
  category: Category, // バグ修正 or 機能要望
  rationale: z.string(), // なぜこのクラスタにまとめたか
  confidence: Confidence, // 確信度
  impact: ImpactLevel, // インパクト推定
  solutions: z.array(SolutionItem), // このクラスタに含まれる解決策
});

// エージェントの出力全体
export const ClusteringOutputSchema = z.object({
  clusters: z.array(SolutionCluster), // 解決策クラスタの一覧
});
export type ClusteringOutput = z.infer<typeof ClusteringOutputSchema>;
