import { createStep, createWorkflow } from "@mastra/core/workflows";
import { z } from "zod";
import { ZActionPlan } from "../../prompts/create-next-action";
import { linearIssueSchema } from "../../schema/linear-issue";
import { linearTool } from "../tools/linear-tool";

const fetchTriageStep = createStep({
  id: "fetch-triage-from-linear",
  description: "Linearからトリアージチケットを取得する",
  inputSchema: z.object({
    team: z.string().describe("トリアージを取得するチーム名"),
  }),
  outputSchema: z.object({ issues: z.array(linearIssueSchema) }),
  execute: async ({ inputData, tracingContext, runtimeContext }) => {
    const { team } = inputData;
    const result = await linearTool.execute({
      context: { team },
      runtimeContext,
      tracingContext,
    });

    return { issues: result };
  },
});

const suggestActionsStep = createStep({
  id: "suggest-next-actions",
  description: "トリアージチケットから次のアクション3つを提案する",
  inputSchema: z.object({ issues: z.array(linearIssueSchema) }),
  outputSchema: z.object({
    suggestions: z
      .array(
        z.object({
          action: z.string().describe("提案するアクション"),
          reasoning: z.string().describe("このアクションを提案する理由"),
          priority: z
            .enum(["high", "medium", "low"])
            .describe("アクションの優先度"),
          ticketId: z.string().describe("関連するチケットID"),
        }),
      )
      .length(3),
    summary: z.string().describe("全体的な状況の要約"),
  }),
  execute: async ({ inputData, mastra }) => {
    const triageTickets = inputData.issues;

    const nextActions = await Promise.allSettled(
      triageTickets.map((triageTicket) => {
        const agent = mastra.getAgent("nextActionAgent");
        // const prompt = createPromptForGenerateNextActionFromIssue(triageTicket);
        return agent.generate(JSON.stringify(triageTicket), {
          output: ZActionPlan,
        });
      }),
    );

    for (const nextAction of nextActions) {
      console.info(nextAction);
    }

    return {
      suggestions: [
        {
          action: "高優先度チケットの詳細調査を実施",
          reasoning:
            "トリアージチケットの中で最も影響度の高い問題を特定し、迅速な解決を図る",
          priority: "high" as const,
          ticketId: triageTickets[0]?.id || "",
        },
        {
          action: "類似問題のグルーピングと統合検討",
          reasoning: "同種の問題を統合することで効率的な解決が可能",
          priority: "medium" as const,
          ticketId: triageTickets[1]?.id || "",
        },
        {
          action: "開発チームへの割り当て調整",
          reasoning:
            "適切なスキルセットを持つ開発者に割り当てることで解決速度を向上",
          priority: "low" as const,
          ticketId: triageTickets[2]?.id || "",
        },
      ],
      summary: "",
    };
  },
});

export const linearTriageWorkflow = createWorkflow({
  id: "linear-triage-workflow",
  description:
    "指定されたチームのLinearトリアージチケットを取得し、次のアクションを提案する",
  inputSchema: z.object({
    team: z.string().describe("トリアージを取得するチーム名"),
  }),
  outputSchema: z.object({
    suggestions: z
      .array(
        z.object({
          action: z.string().describe("提案するアクション"),
          reasoning: z.string().describe("このアクションを提案する理由"),
          priority: z
            .enum(["high", "medium", "low"])
            .describe("アクションの優先度"),
          ticketId: z.string().describe("関連するチケットID"),
        }),
      )
      .length(3),
    summary: z.string().describe("全体的な状況の要約"),
  }),
})
  .then(fetchTriageStep)
  .then(suggestActionsStep)
  .commit();
