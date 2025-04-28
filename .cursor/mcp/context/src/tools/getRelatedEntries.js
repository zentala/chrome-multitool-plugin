import { z } from "zod";
import fs from 'fs/promises';
import path from 'path';
import { parseFrontMatter, getValidatedFilePath } from '../utils/fileUtils.js';

export function registerGetRelatedEntriesTool(server, contextDataPath) {
    server.tool(
      "get_related_entries",
      "Retrieves a list of related entry IDs mentioned in the 'related' field of a specific entry's front matter.",
      {
        type: z.string().min(1).describe("The context type (directory) of the entry."),
        id: z.string().min(1).describe("The ID (filename without extension) of the entry."),
      },
      async ({ type, id }) => {
        try {
          // 1. Validate and get the file path
          const filePath = await getValidatedFilePath(contextDataPath, type, id);

          // 2. Read the file content
          const rawContent = await fs.readFile(filePath, 'utf8');

          // 3. Parse front matter
          const { metadata } = parseFrontMatter(rawContent, filePath);

          if (metadata.parseError) {
            return { content: [{ type: "text", text: `Warning: Entry '${type}/${id}' has invalid YAML front matter. Cannot reliably get related entries.` }] };
          }

          // 4. Extract and return related entries
          const relatedEntries = metadata.related;

          if (!relatedEntries) {
            return { content: [{ type: "text", text: `Entry '${type}/${id}' has no 'related' field in its metadata.` }] };
          } 

          if (!Array.isArray(relatedEntries)) {
               return { content: [{ type: "text", text: `Entry '${type}/${id}' has a 'related' field, but it is not an array.` }] };
          }
          
          const relatedIds = relatedEntries.filter(rel => typeof rel === 'string' && rel.trim() !== '');

          if (relatedIds.length === 0) {
               return { content: [{ type: "text", text: `Entry '${type}/${id}' has an empty or invalid 'related' array.` }] };
          }

          // Format the output nicely
          const relatedList = relatedIds.map(relId => `- ${relId}`).join('\n');
          return { 
              content: [{
                  type: "text",
                  text: `Related entries for '${type}/${id}':\n${relatedList}`
              }]
          };

        } catch (error) {
          console.error(`Error getting related entries for '${type}/${id}':`, error);
          return { content: [{ type: "text", text: `Error getting related entries: ${error.message}` }] };
        }
      }
    );
} 