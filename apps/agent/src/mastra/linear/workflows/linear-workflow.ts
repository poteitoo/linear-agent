import { createStep, createWorkflow } from "@mastra/core/workflows";
import { z } from "zod";
import { ZActionProposal } from "../../prompts/create-next-action";
import { linearIssueSchema } from "../../schema/linear-issue";
import { linearTool } from "../tools/linear-tool";
import { jsonToMarkdownTool } from "../tools/markdown-tool";

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
  outputSchema: z.object({ nextActions: z.array(ZActionProposal) }),
  execute: async ({ inputData, mastra }) => {
    const triageTickets = inputData.issues;

    const nextActions = await Promise.allSettled(
      triageTickets.map((triageTicket) => {
        const agent = mastra.getAgent("nextActionAgent");
        return agent.generate(JSON.stringify(triageTicket), {
          output: ZActionProposal,
        });
      }),
    );

    const successNextActions = [];
    for (const nextAction of nextActions) {
      if (nextAction.status === "fulfilled") {
        successNextActions.push(nextAction.value.object);
      }
      if (nextAction.status === "rejected") {
        console.error("rejected", nextAction.reason);
      }
    }
    return { nextActions: successNextActions };
  },
});

const exportMarkdownStep = createStep({
  id: "export-markdown",
  description: "提案されたアクションをMarkdown形式に変換する",
  inputSchema: z.object({
    nextActions: z.array(ZActionProposal),
  }),
  outputSchema: z.object({
    markdown: z.string().describe("提案されたアクションのMarkdown形式"),
  }),
  execute: async ({ inputData, tracingContext, runtimeContext }) => {
    const { nextActions } = inputData;
    const json = JSON.stringify(nextActions, null, 2);
    
    const result = await jsonToMarkdownTool.execute({
      context: { json, title: "提案されたアクション" },
      runtimeContext,
      tracingContext,
    });
    
    return { markdown: result.markdown };
  }
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
  .then(exportMarkdownStep)
  .commit();
