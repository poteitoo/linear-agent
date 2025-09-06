import { env } from "node:process";
import { createTool } from "@mastra/core/tools";
import { WebClient } from "@slack/web-api";
import {
  slackToolInputSchema,
  slackToolOutputSchema,
} from "../../schema/slack-tool";

const slackClient = new WebClient(env.SLACK_TOKEN);

function parseSlackUrl(url: string): {
  channelName: string;
  threadTs?: string;
} {
  // Slack URL format: https://workspace.slack.com/archives/CHANNEL_ID/pTIMESTAMP
  // or https://workspace.slack.com/archives/CHANNEL_NAME/pTIMESTAMP
  const match = url.match(/\/archives\/([^/]+)(?:\/p(\d+))?/);
  if (!match) {
    throw new Error(`Invalid Slack URL format: ${url}`);
  }

  const channelId = match[1];
  const timestamp = match[2];

  // Convert timestamp format: p1234567890123456 -> 1234567890.123456
  const threadTs = timestamp
    ? `${timestamp.slice(0, 10)}.${timestamp.slice(10)}`
    : undefined;

  return {
    channelName: channelId,
    threadTs,
  };
}

export const slackTool = createTool({
  id: "send-slack-message",
  description: "Send a message to a Slack channel",
  inputSchema: slackToolInputSchema,
  outputSchema: slackToolOutputSchema,
  execute: async ({ context }) => {
    const { slackUrl, message } = context;

    const { channelName, threadTs } = parseSlackUrl(slackUrl);

    const response = await sendSlackMessage(
      channelName,
      threadTs || "",
      message,
    );
    return {
      ok: response.ok,
      slackUrl,
      ts: response.ts || "",
    };
  },
});

async function sendSlackMessage(
  channel: string,
  thread_ts: string,
  message: string,
) {
  const response = await slackClient.chat.postMessage({
    channel,
    thread_ts,
    text: message,
  });
  return {
    ok: response.ok || false,
    channel: response.channel || channel,
    ts: response.ts || "",
  };
}
