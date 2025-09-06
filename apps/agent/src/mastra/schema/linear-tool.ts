import { z } from "zod";

export const linearToolInputSchema = z.object({
  team: z.string().describe("Team name (e.g., Engineering)"),
});

export const linearToolOutputSchema = z.array(
  z.object({
    id: z.string(),
    title: z.string(),
    description: z.string().nullish(),
    status: z.string(),
    priority: z.number().nullish(),
    slackLink: z.string().nullish(),
    // assignee: z.string().nullish(),
  }),
);

export const addLabelToIssueInputSchema = z.object({
  issueId: z.string().describe("Linear issue ID to add label to"),
  labelType: z
    .enum(["agent_questioned", "agent_proposed_solution"])
    .describe("Type of label to add"),
});

export const addLabelToIssueOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  issueId: z.string(),
  labelId: z.string().optional(),
});
