import z from "zod";

export const writeFileInputSchema = z.object({
  files: z
    .array(
      z.object({
        path: z
          .string()
          .describe("完全なファイルパスまたはベースディレクトリからの相対パス"),
        content: z.string().describe("ファイルに書き込むコンテンツ"),
      }),
    )
    .describe("書き込むファイルの配列"),
  baseDirectory: z
    .string()
    .optional()
    .describe(
      "ベースディレクトリのパス（オプション、指定されない場合はfile.pathの絶対パスを使用）",
    ),
  createDirectories: z
    .boolean()
    .optional()
    .default(true)
    .describe(
      "ディレクトリが存在しない場合に作成するかどうか（デフォルト: true）",
    ),
});

export const writeFileOutputSchema = z.object({
  writtenFiles: z.array(
    z.object({
      path: z.string(),
      success: z.boolean(),
      error: z.string().optional(),
    }),
  ),
  totalFiles: z.number(),
  successCount: z.number(),
  errorCount: z.number(),
});
