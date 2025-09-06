import { env } from "node:process";
import { LinearClient } from "@linear/sdk";
import { createTool } from "@mastra/core/tools";
import { z } from "zod";

const linearClient = new LinearClient({
  apiKey: env.LINEAR_API_KEY,
});

export const linearTool = createTool({
  id: "get-linear-triage",
  description: "Get the triage tickets from Linear",
  inputSchema: z.object({
    team: z.string().describe("Team name (e.g., Engineering)"),
  }),
  outputSchema: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      description: z.string().nullable(),
      status: z.string(),
      priority: z.number().nullable(),
      // assignee: z.string().nullable(),
    }),
  ),
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
    first: 10, // pagination size
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
