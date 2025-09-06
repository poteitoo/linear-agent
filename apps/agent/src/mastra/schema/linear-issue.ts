import z from "zod";

export const linearIssueSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().nullish(),
  status: z.string(),
  priority: z.number().nullish(),
  slackLink: z.string().nullish(),
});
export type LinearIssueSchemaType = z.infer<typeof linearIssueSchema>;
