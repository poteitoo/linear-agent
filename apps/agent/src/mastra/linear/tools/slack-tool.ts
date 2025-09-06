import { WebClient } from '@slack/web-api';
import { env } from 'node:process';
import { createTool } from "@mastra/core/tools";
import { z } from "zod";

const slackClient = new WebClient(env.SLACK_TOKEN);

export const slackTool = createTool({
  id: "send-slack-message",
  description: "Send a message to a Slack channel",
  inputSchema: z.object({
    channel: z.string().describe("Slack channel ID"),
    message: z.string().describe("Message to send"),
  }),
  outputSchema: z.object({
    ok: z.boolean(),
    channel: z.string(),
    ts: z.string(),
  }),
  execute: async ({ context }) => {
    const { channel, message } = context;
    const response = await sendSlackMessage(channel, message);
    return response;
  },
});

async function sendSlackMessage(channel: string, message: string) {
  const response = await slackClient.chat.postMessage({
    channel,
    text: message,
  });
  return {
    ok: response.ok || false,
    channel: response.channel || channel,
    ts: response.ts || '',
  };
}
