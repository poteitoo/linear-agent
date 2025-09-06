import { Mastra } from "@mastra/core/mastra";
import { LibSQLStore } from "@mastra/libsql";
import { PinoLogger } from "@mastra/loggers";
import { nextActionAgent } from "./linear/agents/next-action-agent";
import { solutionAgent } from "./linear/agents/solution-agent";
import { linearTriageWorkflow } from "./linear/workflows/linear-workflow";

export const mastra = new Mastra({
  workflows: { linearTriageWorkflow },
  agents: { nextActionAgent, solutionAgent },
  storage: new LibSQLStore({
    url: ":memory:",
  }),
  logger: new PinoLogger({
    name: "Mastra",
    level: "info",
  }),
});
