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
    thread_ts: z.string().describe("Thread timestamp for replies"),
    message: z.string().describe("Message to send"),
  }),
  outputSchema: z.object({
    ok: z.boolean(),
    channel: z.string(),
    ts: z.string(),
  }),
  execute: async ({ context }) => {
    const { channel, thread_ts, message } = context;
    const channelName = await getChannelIdByName(channel);
    if (!channelName) {
      throw new Error("Channel not found");
    }
    const response = await sendSlackMessage(channelName, thread_ts || "", message);
    return response;
  },
});

async function getChannelIdByName(name: string): Promise<string | null> {
  let cursor;
  do {
    const res = await slackClient.conversations.list({
      exclude_archived: true,
      limit: 200,
      cursor,
    });

    const channel = res.channels?.find(c => c.name === name);
    if (channel) {
      return channel.id || null;
    }

    cursor = res.response_metadata?.next_cursor;
  } while (cursor);

  return null;
}

async function sendSlackMessage(channel: string, thread_ts: string, message: string) {
  const response = await slackClient.chat.postMessage({
    channel,
    thread_ts,
    text: message,
  });
  return {
    ok: response.ok || false,
    channel: response.channel || channel,
    ts: response.ts || '',
  };
}
