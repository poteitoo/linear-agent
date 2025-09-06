import { createStep, createWorkflow } from "@mastra/core/workflows";
import prettier from "prettier";
import { ZActionProposal } from "../../prompts/create-next-action";
import { ClusteringOutputSchema } from "../../prompts/create-cluster";
import {
  exportTempFileStepInputSchema,
  exportTempFileStepOutputSchema,
  exportTempFileStepResumeSchema,
  fetchTriageStepInputSchema,
  fetchTriageStepOutputSchema,
  linearTriageWorkflowInputSchema,
  linearTriageWorkflowOutputSchema,
  sendSlackQuestionStepInputSchema,
  sendSlackQuestionStepOutputSchema,
  suggestNextActionsStepInputSchema,
  suggestNextActionsStepOutputSchema,
  waitForHumanApproveStepInputSchema,
  waitForHumanApproveStepOutputSchema,
  waitForHumanApproveStepResumeSchema,
  clusterHighConfidenceActionsStepInputSchema,
  clusterHighConfidenceActionsStepOutputSchema,
} from "../../schema/workflow-steps";
import { linearTool } from "../tools/linear-tool";
import { slackTool } from "../tools/slack-tool";
import { writeFilesTool } from "../tools/write-files";

const fetchTriageStep = createStep({
  id: "fetch-triage-from-linear",
  description: "Linearからトリアージチケットを取得する",
  inputSchema: fetchTriageStepInputSchema,
  outputSchema: fetchTriageStepOutputSchema,
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
  inputSchema: suggestNextActionsStepInputSchema,
  outputSchema: suggestNextActionsStepOutputSchema,
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
  inputSchema: exportTempFileStepInputSchema,
  resumeSchema: exportTempFileStepResumeSchema,
  outputSchema: exportTempFileStepOutputSchema,
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
  inputSchema: waitForHumanApproveStepInputSchema,
  resumeSchema: waitForHumanApproveStepResumeSchema,
  outputSchema: waitForHumanApproveStepOutputSchema,
  execute: async ({ inputData, resumeData, suspend }) => {
    const { nextActions, writtenFiles } = inputData;
    const { review } = resumeData ?? {};

    if (writtenFiles.writtenFiles.length === 0) {
      throw new Error("出力されたファイルはありません");
    }
    const writtenFile = writtenFiles.writtenFiles[0];

    if (!review) {
      return await suspend({});
    }

    return { nextActions, writtenFile };
  },
});

const sendSlackQuestionStep = createStep({
  id: "send-slack-question",
  description: "必要に応じてSlackで質問を送信する",
  inputSchema: sendSlackQuestionStepInputSchema,
  outputSchema: sendSlackQuestionStepOutputSchema,
  execute: async ({ inputData, runtimeContext, tracingContext }) => {
    const { nextActions } = inputData;
    const actionsWithQuestions = nextActions.filter(
      (action) => action.questions && action.questions.length > 0,
    );
    if (actionsWithQuestions.length === 0) {
      return {
        oks: [],
        slackUrls: [],
        nextActions,
      };
    }

    const questionsWithActions = actionsWithQuestions.flatMap(
      (action) =>
        action.questions?.map((question) => ({
          question,
          slackUrl: action.slackUrl,
        })) || [],
    );

    const responses = await Promise.all(
      questionsWithActions
        .filter(
          ({ question }) => question?.necessity && question?.necessity > 3,
        )
        .map(({ question, slackUrl }) => {
          const message = `質問があります: ${question?.content}
宛先: ${question?.toRole}${question?.toName ? ` (${question?.toName})` : ""}
必要度: ${question?.necessity}/5
`;
          // TEST HARDCODE TO AVOID SPAM
          slackUrl =
            "https://medimo-pleap.slack.com/archives/C06DEFWUSNM/p1757140310736399";

          if (slackUrl) {
            return slackTool.execute({
              context: { slackUrl, message },
              runtimeContext,
              tracingContext,
            });
          }
          return {
            ok: false,
            slackUrl: "",
            ts: "",
          };
        }),
    );

    return {
      oks: responses.map((res) => res.ok),
      slackUrls: responses.map((res) => res.slackUrl),
      nextActions,
    };
  },
});

const clusterHighConfidenceActionsStep = createStep({
  id: "cluster-high-confidence-actions",
  description: "自信度の高いアクションをクラスタリングする",
  inputSchema: clusterHighConfidenceActionsStepInputSchema,
  outputSchema: clusterHighConfidenceActionsStepOutputSchema,
  execute: async ({ inputData, mastra }) => {
    const { nextActions } = inputData;
    const highConfidenceActions = nextActions.filter(
      (action) => action.confidence > 4,
    );

    // Cluster by calling the LLM and grouping similar actions together
    const agent = mastra.getAgent("clusterAgent");
    const clustering = await agent.generate(JSON.stringify(highConfidenceActions), {
      output: ClusteringOutputSchema,
    });

    return {
      nextActions,
      clustering: clustering.object,
    };
  }
});

export const linearTriageWorkflow = createWorkflow({
  id: "linear-triage-workflow",
  description:
    "指定されたチームのLinearトリアージチケットを取得し、次のアクションを提案する",
  inputSchema: linearTriageWorkflowInputSchema,
  outputSchema: linearTriageWorkflowOutputSchema,
})
  .then(fetchTriageStep)
  .then(suggesNextActionsStep)
  .then(exportTempFileForHumanReviewStep)
  .then(waitForHumanApproveOrFixStep)
  .then(sendSlackQuestionStep)
  .then(clusterHighConfidenceActionsStep)
  .commit();
