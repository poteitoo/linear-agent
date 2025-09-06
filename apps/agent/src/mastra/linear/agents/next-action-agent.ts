import { anthropic } from "@ai-sdk/anthropic";
import { Agent } from "@mastra/core/agent";
import { LibSQLStore } from "@mastra/libsql";
import { Memory } from "@mastra/memory";

export const nextActionAgent = new Agent({
  name: "next-action-agent",
  instructions: `以下のチケットを分析して次のアクションを３つ提案して下さい。ただし以下のルールに注意して下さい
- エンジニアかカスタマーサクセスのどちらが担当するのか明確にする
- 調査が必要な場合は、どんな調査が必要なのか明確に記載する
- 質問が必要な場合は、誰にどんな質問なのか明確に記載し、その質問の必要度を５段階で評価する
- 優先度(high,middle,low)を明確に記載する
- ticketIDを明確に記載する
- 提案された解決策に対する自信度を５段階で明確に記載する。この解決策がチケットの問題を適切に解決できると確信できる度合いを示す。(5が最も解決策への自信度が高く1が最も低い)
次のようなスキーマを期待しています
title: z.string().min(1), // 見出し
description: z.string().min(1), // 何をするか
ownerRole: ZOwnerRole, // engineer / customerSuccess
priority: ZPriority, // high / middle / low
ticketId: z.string().min(1), // 対象チケットID
slackUrl: z.string().url().nullable(), // 関連するSlackのメッセージ or スレッドURL
confidence: z.number().int().min(1).max(5), // 解決策への自信度 1..5 (1=低い, 5=高い)
rationale: z.string().min(1), // 判断理由
investigation: ZInvestigation.optional(), // 必要時のみ
questions: z.array(ZQuestion).min(1).optional(), // 必要時のみ
  // 各質問には以下が含まれる:
  // - toRole: 質問相手のロール
  // - content: 質問内容
  // - necessity: 質問の必要度 1..5 (1=参考程度, 5=解決に不可欠)
`,
  model: anthropic("claude-3-7-sonnet-20250219"),
  memory: new Memory({
    storage: new LibSQLStore({
      url: "file:../mastra.db",
    }),
  }),
});
