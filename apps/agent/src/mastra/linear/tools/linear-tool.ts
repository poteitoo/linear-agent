import { env } from "node:process";
import { LinearClient } from "@linear/sdk";
import { createTool } from "@mastra/core/tools";
import {
  addLabelToIssueInputSchema,
  addLabelToIssueOutputSchema,
  linearToolInputSchema,
  linearToolOutputSchema,
} from "../../schema/linear-tool";

const linearClient = new LinearClient({
  apiKey: env.LINEAR_API_KEY,
});

export const linearTool = createTool({
  id: "get-linear-triage",
  description: "Get the triage tickets from Linear",
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
      // assignee: issue.assignee ? (await issue.assignee).displayName || null : null,
    })),
  );

  return issuesWithAssignees;
}

export const addLabelToIssueTool = createTool({
  id: "add-label-to-issue",
  description:
    "Add a label to a Linear issue to indicate agent interaction status",
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
