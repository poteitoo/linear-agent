import { env } from "node:process";
import { LinearClient } from "@linear/sdk";
import { createTool } from "@mastra/core/tools";
import {
  addLabelToIssueInputSchema,
  addLabelToIssueOutputSchema,
  linearToolInputSchema,
  linearToolOutputSchema,
  removeLabelFromIssueInputSchema,
  removeLabelFromIssueOutputSchema,
} from "../../schema/linear-tool";

const linearClient = new LinearClient({
  apiKey: env.LINEAR_API_KEY,
});

export const linearTool = createTool({
  id: "get-linear-triage",
  description: "Linearからトリアージチケットを取得する",
  inputSchema: linearToolInputSchema,
  outputSchema: linearToolOutputSchema,
  execute: async ({ context }) => {
    return await getTriageIssues(context.team);
  },
});

async function getTriageIssues(teamKey: string) {
  const teams = await linearClient.teams();
  const team = teams.nodes.find(
    (t) =>
      t.key.toLowerCase() === teamKey.toLowerCase() ||
      t.name.toLowerCase() === teamKey.toLowerCase(),
  );
  if (!team) throw new Error(`Team with key '${teamKey}' not found`);
  const states = await team.states();
  const triageState = states.nodes.find((s) => s.name === "Triage");
  if (!triageState) throw new Error("Triage state not found");

  const issues = await linearClient.issues({
    filter: {
      state: { id: { eq: triageState.id } },
      team: { id: { eq: team.id } },
    },
    first: 3, // pagination size
  });

  const allIssues = issues.nodes;
  // let page = issues;
  // while (page.pageInfo.hasNextPage) {
  //   page = await page.fetchNext();
  //   allIssues.push(...page.nodes);
  // }

  const issuesWithAssignees = await Promise.all(
    allIssues.map(async (issue) => ({
      id: issue.id,
      title: issue.title,
      description: issue.description || null,
      status: "Triage",
      priority: issue.priority || null,
      slackUrl: issue.attachments
        ? (await issue.attachments()).nodes
            .filter((att) => att.url.includes("slack.com")) // only Slack links
            .map((att) => att.url)[0] || null
        : null,
    })),
  );

  return issuesWithAssignees;
}

export const addLabelToIssueTool = createTool({
  id: "add-label-to-issue",
  description: "Linearイシューにエージェント操作状況を示すラベルを追加する",
  inputSchema: addLabelToIssueInputSchema,
  outputSchema: addLabelToIssueOutputSchema,
  execute: async ({ context }) => {
    const { issueId, labelType } = context;
    return await addLabelToIssue(issueId, labelType);
  },
});

async function addLabelToIssue(
  issueId: string,
  labelType: "agent_questioned" | "agent_proposed_solution",
) {
  try {
    const issue = await linearClient.issue(issueId);
    if (!issue) {
      throw new Error(`Issue with ID '${issueId}' not found`);
    }

    const team = await issue.team;
    if (!team) {
      throw new Error(`Team not found for issue '${issueId}'`);
    }

    const labelNames = {
      agent_questioned: "Agent Questioned",
      agent_proposed_solution: "Agent Proposed Solution",
    };
    const labels = await team.labels({
      filter: {
        or: Object.values(labelNames).map((labelName) => ({
          name: { eq: labelName },
        })),
      },
    });
    const targetLabelName = labelNames[labelType];
    let targetLabel = labels.nodes.find(
      (label) => label.name === targetLabelName,
    );

    if (!targetLabel) {
      const createdLabel = await linearClient.createIssueLabel({
        teamId: team.id,
        name: targetLabelName,
        description:
          labelType === "agent_questioned"
            ? "Agent has asked questions about this issue"
            : "Agent has proposed a solution for this issue",
        color: labelType === "agent_questioned" ? "#FF6B35" : "#4CAF50",
      });

      if (!createdLabel.success || !createdLabel.issueLabel) {
        throw new Error(`Failed to create label '${targetLabelName}'`);
      }
      targetLabel = await createdLabel.issueLabel;
    }

    const result = await linearClient.issueAddLabel(issueId, targetLabel?.id);

    if (result.success) {
      return {
        success: true,
        message: `Successfully added label '${targetLabelName}' to issue`,
        issueId,
        labelId: targetLabel.id,
      };
    } else {
      throw new Error("Failed to add label to issue");
    }
  } catch (error) {
    return {
      success: false,
      message: `Failed to add label: ${error instanceof Error ? error.message : "Unknown error"}`,
      issueId,
    };
  }
}

export const removeLabelFromIssueTool = createTool({
  id: "remove-label-from-issue",
  description: "Linearイシューからラベルを削除する",
  inputSchema: removeLabelFromIssueInputSchema,
  outputSchema: removeLabelFromIssueOutputSchema,
  execute: async ({ context }) => {
    const { issueId, labelName } = context;
    return await removeLabelFromIssue(issueId, labelName);
  },
});

async function removeLabelFromIssue(issueId: string, labelName: string) {
  try {
    const issue = await linearClient.issue(issueId);
    if (!issue) {
      throw new Error(`Issue with ID '${issueId}' not found`);
    }

    const issueLabels = await issue.labels();
    const labelToRemove = issueLabels.nodes.find(
      (label) => label.name === labelName,
    );

    if (!labelToRemove) {
      return {
        success: false,
        message: `Label '${labelName}' not found on issue`,
        issueId,
      };
    }

    const result = await linearClient.issueRemoveLabel(
      issueId,
      labelToRemove.id,
    );

    if (result.success) {
      return {
        success: true,
        message: `Successfully removed label '${labelName}' from issue`,
        issueId,
      };
    } else {
      throw new Error("Failed to remove label from issue");
    }
  } catch (error) {
    return {
      success: false,
      message: `Failed to remove label: ${error instanceof Error ? error.message : "Unknown error"}`,
      issueId,
    };
  }
}
