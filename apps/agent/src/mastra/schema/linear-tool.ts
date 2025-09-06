import { z } from "zod";

export const linearToolInputSchema = z.object({
  team: z.string().describe("Team name (e.g., Engineering)"),
});

export const linearToolOutputSchema = z.array(
  z.object({
    id: z.string(),
    title: z.string(),
    description: z.string().nullable(),
    status: z.string(),
    priority: z.number().nullable(),
    slackLink: z.string().nullable(),
    // assignee: z.string().nullable(),
  }),
);
