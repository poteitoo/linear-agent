import { Mastra } from "@mastra/core/mastra";
import { LibSQLStore } from "@mastra/libsql";
import { PinoLogger } from "@mastra/loggers";
import { solutionAgent } from "./linear/agents/solution-agent";
import { headsUpWorkflow } from "./linear/workflows/linear-workflow";

export const mastra = new Mastra({
  workflows: { headsUpWorkflow },
  agents: { solutionAgent },
  storage: new LibSQLStore({
    url: ":memory:",
  }),
  logger: new PinoLogger({
    name: "Mastra",
    level: "info",
  }),
});
