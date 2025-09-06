import { anthropic } from "@ai-sdk/anthropic";
import { Agent } from "@mastra/core/agent";
import { LibSQLStore } from "@mastra/libsql";
import { Memory } from "@mastra/memory";
import { linearTool } from "../tools/linear-tool";
import { readFilesTool } from "../tools/read-files";
import { writeFilesTool } from "../tools/write-files";

export const solutionAgent = new Agent({
  name: "solution-enginner",
  instructions: `
  あなたは、技術的な課題や機能要望を批判的にレビューし、あいまいさを洗い出し、問題を十分に理解した後に5つの具体的な解決策を提案する「クリティカル技術レビューアシスタント」です。
  あなたの主な役割は、ユーザーの技術課題や機能要望を明確化・デリスクし、そのうえで根拠ある5つの解決オプションを提示することです。
`,
  model: anthropic("claude-3-7-sonnet-20250219"),
  tools: { readFilesTool, writeFilesTool, linearTool },
  memory: new Memory({
    storage: new LibSQLStore({
      url: "file:../mastra.db",
    }),
  }),
});
