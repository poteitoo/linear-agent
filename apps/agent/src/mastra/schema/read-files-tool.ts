import { z } from "zod";

export const readFilesToolInputSchema = z.object({
  directoryPath: z.string().describe("ファイルを読み込むディレクトリのパス"),
  fileExtensions: z
    .array(z.string())
    .optional()
    .describe("フィルタリングする拡張子の配列（例: ['.ts', '.js']）"),
  maxFiles: z
    .number()
    .optional()
    .default(10)
    .describe("読み込むファイルの最大数（デフォルト: 10）"),
});

export const readFilesToolOutputSchema = z.object({
  files: z.array(
    z.object({
      path: z.string(),
      name: z.string(),
      content: z.string(),
      size: z.number(),
    }),
  ),
  totalFiles: z.number(),
});
