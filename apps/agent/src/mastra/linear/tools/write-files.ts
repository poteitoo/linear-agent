import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { createTool } from "@mastra/core/tools";
import {
  writeFileInputSchema,
  writeFileOutputSchema,
} from "../../prompts/write-files";

export const writeFilesTool = createTool({
  id: "write-files",
  description: "指定されたディレクトリにファイルのコンテンツを書き込む",
  inputSchema: writeFileInputSchema,
  outputSchema: writeFileOutputSchema,
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
