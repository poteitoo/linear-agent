import { z } from "zod";
import type { LinearIssueSchemaType } from "../schema/linear-issue";

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
    toName: z.string().min(1).optional(), // 宛先の氏名/ハンドル（分かれば）
    content: z.string().min(1), // 具体的な質問内容
  })
  .strict();

/** 調査（どんな調査が必要か） */
export const ZInvestigation = z
  .object({
    isNeeded: z.literal(true), // 調査が必要な場合だけこのオブジェクトを出す
    what: z.string().min(1), // どんな調査か（例: 「iOS 16 の録音権限の再現」）
    method: z.string().min(1).optional(), // 方法（例: 再現手順/ログ収集/DB照会/ユーザヒアリング 等）
    expectedOutcome: z.string().min(1).optional(), // 期待するアウトカム（判断基準）
  })
  .strict();

/** アクション提案（1件分） */
export const ZActionProposal = z
  .object({
    title: z.string().min(1), // アクションの見出し
    description: z.string().min(1), // 何をするかの説明（簡潔に具体的に）
    ownerRole: ZOwnerRole, // エンジニア or CS
    priority: ZPriority, // high / middle / low
    ticketId: z.string().min(1), // 対象チケットID（例: "LIN-1234"）
    confidence: z.number().int().min(1).max(5), // 確信度 1..5
    rationale: z.string().min(1), // そう判断した理由（短くOK）

    // 調査が必要な場合のみ含める（必須ではない）
    investigation: ZInvestigation.optional(),

    // 質問が必要な場合は1件以上
    questions: z.array(ZQuestion).min(1).optional(),
  })
  .strict();

/** 全体スキーマ：アクションは必ず3件 */
export const ZActionPlan = z
  .object({
    schemaVersion: z.literal("1.0.0"),
    summary: z.string().min(1).optional(), // 全体の要約（任意）
    actions: z.array(ZActionProposal).length(3), // 3件ちょうど
  })
  .strict();

export type ActionPlan = z.infer<typeof ZActionPlan>;

export const createPromptForGenerateNextActionFromIssue = (
  issue: LinearIssueSchemaType,
) => {
  return `以下のチケットを分析して次のアクションを３つ提案して下さい。ただし以下のルールに注意して下さい
- エンジニアかカスタマーサクセスのどちらが担当するのか明確にする
- 調査が必要な場合は、どんな調査が必要なのか明確に記載する
- 質問が必要な場合は、誰にどんな質問なのか明確に記載する
- 優先度(high,middle,low)を明確に記載する
- ticketIDを明確に記載する
- この考察に対する確信度を５段階で明確に記載する。(5が最も確信度が高く1が最も低い)
下記がissueの内容です
${JSON.stringify(issue)}`;
};
