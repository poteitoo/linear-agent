import { z } from "zod";

export const linearToolInputSchema = z.object({
  team: z.string().describe("チーム名 (例: Engineering)"),
  count: z
    .number()
    .optional()
    .describe("取得するイシューの件数（デフォルト: 20）"),
});

export const linearToolOutputSchema = z.array(
  z.object({
    id: z.string(),
    title: z.string(),
    description: z.string().nullish(),
    status: z.string(),
    priority: z.number().nullish(),
    slackUrl: z.string().url().nullish(),
  }),
);

export const addLabelToIssueInputSchema = z.object({
  issueId: z.string().describe("ラベルを追加するLinearイシューのID"),
  labelType: z
    .enum(["agent_questioned", "agent_proposed_solution"])
    .describe("追加するラベルの種類"),
});

export const addLabelToIssueOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  issueId: z.string(),
  labelId: z.string().optional(),
});

export const removeLabelFromIssueInputSchema = z.object({
  issueId: z.string().describe("ラベルを削除するLinearイシューのID"),
  labelName: z.string().describe("削除するラベル名"),
});

export const removeLabelFromIssueOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  issueId: z.string(),
});
