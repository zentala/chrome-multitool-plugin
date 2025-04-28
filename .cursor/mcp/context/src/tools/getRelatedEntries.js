import { z } from "zod";
import fs from 'fs/promises';
import path from 'path';
import { parseFrontMatter, getValidatedFilePath } from '../utils/fileUtils.js';

export function registerGetRelatedEntriesTool(server, contextDataPath) {
    server.tool(
      "get_related_entries",
      "Retrieves a list of entries mentioned in the 'related' field of a specific entry's metadata.",
      {
        type: z.string().min(1).describe("Context type of the source entry."),
        id: z.string().min(1).describe("ID of the source entry whose related entries to find."),
      },
      async ({ type, id }) => {
        try {
          const filePath = await getValidatedFilePath(contextDataPath, type, id); // Validate source entry exists
          const rawContent = await fs.readFile(filePath, 'utf8');
          const { metadata } = parseFrontMatter(rawContent, filePath);

          if (metadata.parseError) {
              throw new Error(`Source entry has invalid YAML front matter: ${metadata.parseError}`);
          }

          if (!metadata.related || !Array.isArray(metadata.related) || metadata.related.length === 0) {
             return { content: [{ type: "text", text: `Entry '${type}/${id}' has no 'related' entries specified in its metadata.` }] };
          }

          const relatedLinks = metadata.related;
          const foundRelated = [];
          const notFound = [];
          const invalidFormat = [];
          const linkRegex = /^([a-zA-Z0-9_-]+)\/([a-zA-Z0-9_-]+(?:\.md)?)$/; // type/id or type/id.md

          for (const link of relatedLinks) {
              if (typeof link !== 'string') {
                  invalidFormat.push(String(link));
                  continue;
              }
              
              const match = link.match(linkRegex);
              if (!match) {
                  invalidFormat.push(link);
                  continue;
              }

              const relatedType = match[1];
              const relatedId = match[2].replace(/\.md$/, ''); // Remove .md if present

              try {
                  // Check if the related file actually exists
                  await getValidatedFilePath(contextDataPath, relatedType, relatedId); 
                  foundRelated.push(`${relatedType}/${relatedId}`);
              } catch (error) {
                  // If getValidatedFilePath throws (likely ENOENT), the related file doesn't exist
                  if (error.message.includes('not found')) { // Check error message for robustness
                       notFound.push(link);
                  } else {
                       console.error(`Unexpected error validating related link '${link}':`, error); 
                       notFound.push(`${link} (validation error)`); // Mark as not found with error note
                  }
              }
          }
          
          let responseText = `Related entries for '${type}/${id}':\n`;
          if (foundRelated.length > 0) {
               responseText += foundRelated.map(f => `- ${f}`).join('\n');
          } else {
               responseText += "(None found or valid)";
          }
          
          if (notFound.length > 0) {
               responseText += `\n\nCould not find:\n- ${notFound.join('\n- ')}`;
          }
           if (invalidFormat.length > 0) {
               responseText += `\n\nInvalid format links skipped:\n- ${invalidFormat.join('\n- ')}`;
           }

          return { content: [{ type: "text", text: responseText }] };

        } catch (error) {
          console.error(`Error getting related entries for '${type}/${id}':`, error);
          return { content: [{ type: "text", text: `Error getting related entries: ${error.message}` }] };
        }
      }
    );
} 