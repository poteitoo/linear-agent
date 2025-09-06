import { z } from "zod";

/** 担当ロール */
export const ZOwnerRole = z.enum(["engineer", "customerSuccess"]);

/** 優先度 */
export const ZPriority = z.enum(["high", "middle", "low"]);

/** 質問（誰に / 何を） */
export const ZQuestion = z
  .object({
    toRole: z.enum([
      "reporter", // 起票者
      "pm", // プロダクトマネージャ
      "engineer",
      "customerSuccess",
      "designer",
      "sales",
      "user", // 実ユーザー/顧客
      "other",
    ]),
    toName: z.string().nullish(), // 宛先名（任意）
    content: z.string(), // 具体的な質問
    necessity: z.number(), // 質問の必要度 1..5 (1=低い, 5=高い)
  })
  .strict();

/** 調査（どんな調査が必要か） */
export const ZInvestigation = z
  .object({
    isNeeded: z.literal(true), // 調査が必要な場合のみオブジェクトを返す
    what: z.string(), // 調査内容
    method: z.string().nullish(), // 手段/アプローチ
    expectedOutcome: z.string().nullish(), // 期待するアウトカム
  })
  .strict();

/** アクション提案（1件分） */
export const ZActionProposal = z.object({
  title: z.string(), // 見出し
  description: z.string(), // 何をするか
  ownerRole: ZOwnerRole, // engineer / customerSuccess
  priority: ZPriority, // high / middle / low
  ticketId: z.string(), // 対象チケットID
  slackUrl: z.string().nullish(), // 関連するSlackのメッセージ or スレッドURL
  confidence: z.number(), // 解決策への自信度 1..5 (この解決策が問題を適切に解決できる確信レベル)
  rationale: z.string(), // 判断理由
  investigation: ZInvestigation.nullish(), // 必要時のみ
  questions: z.array(ZQuestion).nullish(), // 必要時のみ
});

/** トップレベル：単一アクションを返す */
export const ZActionResult = z
  .object({
    schemaVersion: z.literal("1.0.0"),
    // 任意でこの提案の位置づけを入れたい場合（例：全3案のうちの何番目か）
    index: z.number().nullish(),
    totalPlanned: z.number().nullish(),
    // 実体は 1件のアクション
    action: ZActionProposal,
  })
  .strict();

export type ActionResult = z.infer<typeof ZActionResult>;
