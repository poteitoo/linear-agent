import z from "zod";

export const linearIssueSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  status: z.string(),
  priority: z.number().nullable(),
  slackLink: z.string().nullable(),
});
export type LinearIssueSchemaType = z.infer<typeof linearIssueSchema>;
