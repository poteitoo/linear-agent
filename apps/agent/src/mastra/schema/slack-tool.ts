import { z } from "zod";

export const slackToolInputSchema = z.object({
  slackUrl: z.string().url(),
  message: z.string(),
});

export const slackToolOutputSchema = z.object({
  ok: z.boolean(),
  slackUrl: z.string().url(),
  ts: z.string(),
});
