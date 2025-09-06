import { z } from "zod";

export const slackToolInputSchema = z.object({
  channel: z.string().describe("Slack channel ID"),
  thread_ts: z.string().describe("Thread timestamp for replies"),
  message: z.string().describe("Message to send"),
});

export const slackToolOutputSchema = z.object({
  ok: z.boolean(),
  channel: z.string(),
  ts: z.string(),
});
