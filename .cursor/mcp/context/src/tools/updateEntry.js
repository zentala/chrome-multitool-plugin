import { z } from "zod";
import fs from 'fs/promises';
import path from 'path';
import { parseFrontMatter, formatWithFrontMatter, getValidatedFilePath } from '../utils/fileUtils.js';

export function registerUpdateEntryTool(server, contextDataPath) {
    server.tool(
      "update_entry",
      "Updates an existing entry. Provide content and/or metadata fields to change.",
      {
        type: z.string().min(1).describe("Context type (directory name)."),
        id: z.string().min(1).describe("ID (filename without .md extension) of the entry to update."),
        content: z.string().optional().describe("New main Markdown content. If omitted, content remains unchanged."),
        metadata: z.record(z.any()).optional().describe("Object with metadata fields to update/add. Fields not provided are unchanged."),
      },
      async ({ type, id, content, metadata: metadataUpdates }) => {
        try {
          const filePath = await getValidatedFilePath(contextDataPath, type, id); // Validates existence
          const rawContent = await fs.readFile(filePath, 'utf8');
          const { metadata: existingMetadata, mainContent: existingContent } = parseFrontMatter(rawContent, filePath);

          if (existingMetadata.parseError) {
               throw new Error(`Cannot update entry with invalid YAML front matter: ${existingMetadata.parseError}`);
          }

          // Prepare updated data
          const finalContent = content !== undefined ? content : existingContent;
          const updatedMetadata = { 
              ...existingMetadata,
              ...(metadataUpdates || {}), // Merge updates, overwriting existing keys if provided
              updatedAt: new Date().toISOString(), // Always update this timestamp
           };
           // Ensure createdAt is preserved if it existed
           if (existingMetadata.createdAt && !updatedMetadata.createdAt) {
               updatedMetadata.createdAt = existingMetadata.createdAt;
           }
           // Remove potential parseError from metadata object if it exists from a previous failed parse
           delete updatedMetadata.parseError; 

          // Format and write back
          const fileContent = formatWithFrontMatter(updatedMetadata, finalContent);
          await fs.writeFile(filePath, fileContent, 'utf8'); // Overwrite existing file

          console.error(`Updated entry: ${filePath}`);
          return { 
              content: [{ 
                  type: "text", 
                  text: `Successfully updated entry '${type}/${id}'.` 
              }] 
          };

        } catch (error) {
          console.error(`Error updating entry '${type}/${id}':`, error);
          return { content: [{ type: "text", text: `Error updating entry: ${error.message}` }] };
        }
      }
    );
} 