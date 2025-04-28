import { z } from "zod";
import fs from 'fs/promises';
import path from 'path';
import { getValidatedFilePath } from '../utils/fileUtils.js';

export function registerDeleteEntryTool(server, contextDataPath) {
    server.tool(
      "delete_entry",
      "Deletes a specific context entry (file).",
      {
        type: z.string().min(1).describe("Context type (directory name)."),
        id: z.string().min(1).describe("ID (filename without .md extension) of the entry to delete."),
      },
      async ({ type, id }) => {
        try {
          const filePath = await getValidatedFilePath(contextDataPath, type, id); // Validates existence before attempting delete
          
          await fs.unlink(filePath); // Delete the file

          console.error(`Deleted entry: ${filePath}`);
          return { 
              content: [{ 
                  type: "text", 
                  text: `Successfully deleted entry '${type}/${id}'.` 
              }] 
          };

        } catch (error) {
           // getValidatedFilePath handles file not found errors already
          console.error(`Error deleting entry '${type}/${id}':`, error);
          return { content: [{ type: "text", text: `Error deleting entry: ${error.message}` }] };
        }
      }
    );
} 