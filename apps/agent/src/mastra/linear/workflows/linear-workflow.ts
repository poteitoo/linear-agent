import { createStep, createWorkflow } from "@mastra/core/workflows";
import prettier from "prettier";
import { z } from "zod";
import { ZActionProposal } from "../../prompts/create-next-action";
import { writeFileOutputSchema } from "../../prompts/write-files";
import { linearIssueSchema } from "../../schema/linear-issue";
import { linearTool } from "../tools/linear-tool";
import { writeFilesTool } from "../tools/write-files";

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

const suggesNextActionsStep = createStep({
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

const exportTempFileForHumanReviewStep = createStep({
  id: "export-tempfile-for-human-review",
  description: "ユーザーの確認があるまで一時停止する",
  inputSchema: z.object({ nextActions: z.array(ZActionProposal) }),
  resumeSchema: z.object({
    review: z.enum(["approved", "fixed"]),
  }),
  outputSchema: z.object({
    nextActions: z.array(ZActionProposal),
    writtenFiles: writeFileOutputSchema,
  }),
  execute: async ({ inputData, runtimeContext, tracingContext }) => {
    const nextActions = inputData.nextActions;
    const writtenFiles = await writeFilesTool.execute({
      context: {
        baseDirectory: "../../",
        createDirectories: true,
        files: [
          {
            path: "wait-for-human-review.json",
            content: await prettier.format(JSON.stringify(inputData), {
              parser: "json-stringify",
            }),
          },
        ],
      },
      runtimeContext,
      tracingContext,
    });

    return { nextActions, writtenFiles };
  },
});

const waitForHumanApproveOrFixStep = createStep({
  id: "wait-for-human-approve-or-fix-step",
  description: "ユーザーの確認があるまで一時停止する",
  inputSchema: z.object({
    nextActions: z.array(ZActionProposal),
    writtenFiles: writeFileOutputSchema,
  }),
  resumeSchema: z.object({
    review: z.enum(["approved", "fixed"]),
  }),
  outputSchema: z.object({ nextActions: z.array(ZActionProposal) }),
  execute: async ({ inputData, resumeData, suspend }) => {
    const nextActions = inputData.nextActions;
    const { review } = resumeData ?? {};

    if (!review) {
      return await suspend({});
    }

    return { nextActions };
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
  .then(suggesNextActionsStep)
  .then(exportTempFileForHumanReviewStep)
  .then(waitForHumanApproveOrFixStep)
  .commit();
