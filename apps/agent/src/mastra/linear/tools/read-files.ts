import { readdir, readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { createTool } from "@mastra/core/tools";
import {
  readFilesToolInputSchema,
  readFilesToolOutputSchema,
} from "../../schema/read-files-tool";

export const readFilesTool = createTool({
  id: "read-files",
  description: "指定されたディレクトリからファイルを読み込む",
  inputSchema: readFilesToolInputSchema,
  outputSchema: readFilesToolOutputSchema,
  execute: async ({ context }) => {
    const { directoryPath, fileExtensions, maxFiles = 10 } = context;

    try {
      // Read directory contents
      const entries = await readdir(directoryPath, { withFileTypes: true });

      // Filter for files only
      let files = entries
        .filter((entry) => entry.isFile())
        .map((entry) => entry.name);

      // Filter by file extensions if provided
      if (fileExtensions && fileExtensions.length > 0) {
        files = files.filter((file) =>
          fileExtensions.some((ext) => file.endsWith(ext)),
        );
      }

      // Limit number of files
      const filesToRead = files.slice(0, maxFiles);

      // Read file contents
      const fileContents = await Promise.all(
        filesToRead.map(async (fileName) => {
          const filePath = join(directoryPath, fileName);
          try {
            const content = await readFile(filePath, "utf-8");
            const stats = await stat(filePath);

            return {
              path: filePath,
              name: fileName,
              content,
              size: stats.size,
            };
          } catch (error) {
            return {
              path: filePath,
              name: fileName,
              content: `Error reading file: ${error instanceof Error ? error.message : "Unknown error"}`,
              size: 0,
            };
          }
        }),
      );

      return {
        files: fileContents,
        totalFiles: files.length,
      };
    } catch (error) {
      throw new Error(
        `Failed to read directory ${directoryPath}: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  },
});
