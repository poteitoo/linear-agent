import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { createTool } from "@mastra/core/tools";
import { z } from "zod";

export const writeFilesTool = createTool({
  id: "write-files",
  description: "指定されたディレクトリにファイルのコンテンツを書き込む",
  inputSchema: z.object({
    files: z
      .array(
        z.object({
          path: z
            .string()
            .describe(
              "完全なファイルパスまたはベースディレクトリからの相対パス",
            ),
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
  }),
  outputSchema: z.object({
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
  }),
  execute: async ({ context }) => {
    const { files, baseDirectory, createDirectories = true } = context;

    const results = [];
    let successCount = 0;
    let errorCount = 0;

    for (const file of files) {
      const fullPath = baseDirectory
        ? join(baseDirectory, file.path)
        : file.path;

      try {
        // Create directory if it doesn't exist and createDirectories is true
        if (createDirectories) {
          const dir = dirname(fullPath);
          await mkdir(dir, { recursive: true });
        }

        // Write file content
        await writeFile(fullPath, file.content, "utf-8");

        results.push({
          path: fullPath,
          success: true,
        });
        successCount++;
      } catch (error) {
        results.push({
          path: fullPath,
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
        errorCount++;
      }
    }

    return {
      writtenFiles: results,
      totalFiles: files.length,
      successCount,
      errorCount,
    };
  },
});
