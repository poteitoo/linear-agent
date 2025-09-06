import { createTool } from "@mastra/core/tools";
import { z } from "zod";

export const jsonToMarkdownTool = createTool({
  id: "json-to-markdown",
  description: "Convert JSON data to Markdown format",
  inputSchema: z.object({
    json: z.string().describe("JSON string to convert to Markdown"),
    title: z.string().optional().describe("Optional title for the Markdown document"),
  }),
  outputSchema: z.object({
    markdown: z.string(),
  }),
  execute: async ({ context }) => {
    const { json, title } = context;
    
    try {
      const data = JSON.parse(json);
      const markdown = convertToMarkdown(data, title);
      return { markdown };
    } catch (error) {
      throw new Error(`Invalid JSON provided: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },
});

function convertToMarkdown(data: unknown, title?: string): string {
  let markdown = "";
  
  // Add title if provided
  if (title) {
    markdown += `# ${title}\n\n`;
  }
  
  markdown += convertValue(data, 0);
  
  return markdown.trim();
}

function convertValue(value: unknown, depth: number): string {
  if (value === null) {
    return "null\n\n";
  }
  
  if (typeof value === "boolean" || typeof value === "number") {
    return `${value}\n\n`;
  }
  
  if (typeof value === "string") {
    return `${value}\n\n`;
  }
  
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return "*(empty array)*\n\n";
    }
    
    let result = "";
    for (let i = 0; i < value.length; i++) {
      const itemValue = convertValue(value[i], depth + 1);
      result += itemValue;
    }
    return result;
  }
  
  if (typeof value === "object" && value !== null) {
    const keys = Object.keys(value);
    if (keys.length === 0) {
      return "*(empty object)*\n\n";
    }
    
    let result = "";
    for (const key of keys) {
      const headerLevel = Math.min(depth + 2, 6); // Max heading level is 6
      const header = "#".repeat(headerLevel);
      
      if (depth === 0) {
        result += `${header} ${key}\n\n`;
      } else if (key === "title") {
        result += `## ${(value as Record<string, unknown>)[key]}\n\n`;
      } else {
        result += `**${key}:**\n`;
      }
      
      const childValue = convertValue((value as Record<string, unknown>)[key], depth + 1);
      
      if (depth === 0) {
        result += `${childValue}\n`;
      } else {
        result += childValue;
      }
    }
    return result;
  }
  
  return `${value}\n`;
}