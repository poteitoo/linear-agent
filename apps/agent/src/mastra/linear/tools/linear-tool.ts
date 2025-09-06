import { env } from "node:process";
import { LinearClient } from "@linear/sdk";
import { createTool } from "@mastra/core/tools";
import {
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
      slackLink: issue.attachments ? (await issue.attachments()).nodes
    .filter((att) => att.url.includes("slack.com")) // only Slack links
    .map((att) => att.url)[0] || null : null,
    })),
  );

  return issuesWithAssignees;
}
