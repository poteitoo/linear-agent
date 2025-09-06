import { z } from "zod";

/** 入力アイテム（前処理や未クラスタ項目保持に使う想定） */
export const ItemSchema = z
  .object({
    id: z.string(),
    /** 原文 */
    text: z.string(),
    /** アイテムの種類：質問 or 解決策 */
    kind: z.enum(["question", "solution"]),
    /** 追加メタ：起票者/チケット/タグ等（任意） */
    meta: z.record(z.any()).optional(),
  })
  .strict();

export type Item = z.infer<typeof ItemSchema>;

/** 影響領域（任意だがあると優先度議論が楽） */
export const ImpactAreaSchema = z
  .array(
    z.enum([
      "usability",
      "reliability",
      "performance",
      "security",
      "compliance",
      "scalability",
      "cost",
      "devex",
    ]),
  )
  .default([]);

/** インパクト推定（必須） */
export const ImpactEstimateSchema = z
  .object({
    /** 1–5（5が最大インパクト） */
    score: z.number(),
    /** なぜその評価か（必須） */
    rationale: z.string(),
    /** 影響領域のタグ（任意・複数可） */
    areas: ImpactAreaSchema.optional(),
  })
  .strict();

/** クラスタ（質問用/解決策用で共通） */
export const ClusterSchema = z
  .object({
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
  })
  .strict()
  .superRefine((cluster, ctx) => {
    // 1) クラスタ内の kind が cluster.clusterOf と一致していることを強制
    const bad = cluster.items.find((it) => it.kind !== cluster.clusterOf);
    if (bad) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["items"],
        message: `items[].kind はクラスタの clusterOf="${cluster.clusterOf}" と一致している必要があります（混在禁止）。`,
      });
    }
  });

export type Cluster = z.infer<typeof ClusterSchema>;

/** 出力のトップレベル：質問クラスタと解決策クラスタを明確に分離 */
export const ClusteringOutputSchema = z
  .object({
    /** 任意のコンテキスト（解析対象の概要や時刻など） */
    context: z
      .object({
        generatedAt: z.string().datetime().optional(),
        inputSummary: z.string().optional(),
        totalItems: z.number().int().nonnegative().optional(),
      })
      .default({}),
    /** 質問クラスタ（clusterOf=question のみ許可） */
    questionClusters: z
      .array(ClusterSchema)
      .refine((arr) => arr.every((c) => c.clusterOf === "question"), {
        message:
          'questionClusters には clusterOf="question" のみを入れてください。',
      }),
    /** 解決策クラスタ（clusterOf=solution のみ許可） */
    solutionClusters: z
      .array(ClusterSchema)
      .refine((arr) => arr.every((c) => c.clusterOf === "solution"), {
        message:
          'solutionClusters には clusterOf="solution" のみを入れてください。',
      }),
    /** 未クラスタ項目（任意・あとで手動振り分け用） */
    unclustered: z.array(ItemSchema).default([]),
  })
  .strict();

export type ClusteringOutput = z.infer<typeof ClusteringOutputSchema>;
