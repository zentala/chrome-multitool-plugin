import { z } from "zod";
import fs from 'fs/promises';
import path from 'path';
import yaml from 'js-yaml';
import { parseFrontMatter, getValidatedFilePath } from '../utils/fileUtils.js';

export function registerReadEntryTool(server, contextDataPath) {
    server.tool(
      "read_entry",
      "Reads the content and metadata (YAML Front Matter) of a specific entry.",
      {
        type: z.string().min(1).describe("Context type (directory name)."),
        id: z.string().min(1).describe("ID (filename without .md extension)."),
      },
      async ({ type, id }) => {
        try {
          const filePath = await getValidatedFilePath(contextDataPath, type, id); // Use helper for validation
          const rawContent = await fs.readFile(filePath, 'utf8');
          const { metadata, mainContent } = parseFrontMatter(rawContent, filePath);
          const metadataString = yaml.dump(metadata); 

          return {
            content: [
              {
                type: "text",
                text: `--- METADATA ---\n${metadataString}\n--- CONTENT ---\n${mainContent.trim()}`,
              },
            ],
          };
        } catch (error) {
          console.error(`Error reading entry '${type}/${id}':`, error);
          return { content: [{ type: "text", text: `Error reading entry: ${error.message}` }] }; // Simplified error
        }
      }
    );
} 