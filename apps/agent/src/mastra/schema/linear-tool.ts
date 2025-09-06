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
