import { z } from "zod";
import { ZActionProposal } from "../prompts/create-next-action";
import {
  writeFileOutputSchema,
  writtenFileShcema,
} from "../prompts/write-files";
import { linearIssueSchema } from "./linear-issue";

// Workflow step input schemas
export const fetchTriageStepInputSchema = z.object({
  team: z.string().describe("トリアージを取得するチーム名"),
});

export const fetchTriageStepOutputSchema = z.object({
  issues: z.array(linearIssueSchema),
});

export const suggestNextActionsStepInputSchema = z.object({
  issues: z.array(linearIssueSchema),
});

export const suggestNextActionsStepOutputSchema = z.object({
  nextActions: z.array(ZActionProposal),
});

export const exportTempFileStepInputSchema = z.object({
  nextActions: z.array(ZActionProposal),
});

export const exportTempFileStepResumeSchema = z.object({
  review: z.enum(["approved", "fixed"]),
});

export const exportTempFileStepOutputSchema = z.object({
  nextActions: z.array(ZActionProposal),
  writtenFiles: writeFileOutputSchema,
});

export const waitForHumanApproveStepInputSchema = z.object({
  nextActions: z.array(ZActionProposal),
  writtenFiles: writeFileOutputSchema,
});

export const waitForHumanApproveStepResumeSchema = z.object({
  review: z.enum(["approved", "fixed"]),
});

export const waitForHumanApproveStepOutputSchema = z.object({
  nextActions: z.array(ZActionProposal),
  writtenFile: writtenFileShcema,
});

// Main workflow schemas
export const linearTriageWorkflowInputSchema = z.object({
  team: z.string().describe("トリアージを取得するチーム名"),
});

export const linearTriageWorkflowOutputSchema = z.object({
  suggestions: z
    .array(
      z.object({
        action: z.string().describe("提案するアクション"),
        reasoning: z.string().describe("このアクションを提案する理由"),
        priority: z
          .enum(["high", "medium", "low"])
          .describe("アクションの優先度"),
        ticketId: z.string().describe("関連するチケットID"),
      }),
    )
    .length(3),
  summary: z.string().describe("全体的な状況の要約"),
});
