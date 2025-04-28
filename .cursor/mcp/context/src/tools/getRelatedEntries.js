import { z } from "zod";
import fs from 'fs/promises';
import path from 'path';
import { parseFrontMatter, getValidatedFilePath } from '../utils/fileUtils.js';

export function registerGetRelatedEntriesTool(server, contextDataPath) {
    server.tool(
      "get_related_entries",
      "Retrieves a JSON array of validated related entry IDs (format: type/id) mentioned in the 'related' field of a specific entry's front matter.",
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
            // Return structured warning/error
            return { content: [{ type: "json", json: { warning: `Entry '${type}/${id}' has invalid YAML front matter. Cannot reliably get related entries.` } }] };
          }

          // 4. Extract and return related entries
          const relatedEntries = metadata.related;

          if (!relatedEntries) {
            // Return empty array if no 'related' field
            return { content: [{ type: "json", json: [] }] }; 
          } 

          if (!Array.isArray(relatedEntries)) {
            // Return structured error
            return { content: [{ type: "json", json: { error: `Entry '${type}/${id}' has a 'related' field, but it is not an array.` } }] };
          }
          
          // Filter for non-empty strings
          const relatedIds = relatedEntries.filter(rel => typeof rel === 'string' && rel.trim() !== '');

          // Return empty array if 'related' was empty or contained only invalid entries initially
          if (relatedIds.length === 0) {
            return { content: [{ type: "json", json: [] }] }; 
          }

          // Validate existence of related entries
          const validatedRelatedIds = []; // Renamed for clarity
          const validationWarnings = []; // Collect warnings for non-existent entries

          for (const relatedIdString of relatedIds) {
              try {
                  const [relatedType, relatedId] = relatedIdString.split('/');
                  if (!relatedType || !relatedId) {
                      const warning = `Invalid related entry format: \"${relatedIdString}\" in ${type}/${id}. Skipping.`;
                      console.warn(warning);
                      validationWarnings.push(warning);
                      continue;
                  }
                  // Validate and add the original string if valid
                  await getValidatedFilePath(contextDataPath, relatedType.trim(), relatedId.trim());
                  validatedRelatedIds.push(relatedIdString);
              } catch (error) {
                  const warning = `Related entry \"${relatedIdString}\" mentioned in ${type}/${id} not found or invalid: ${error.message}`;
                  console.warn(warning);
                  validationWarnings.push(warning);
              }
          }

          // Return the array of validated IDs as JSON
          // Optionally include warnings if needed by the caller
          const responseJson = { relatedIds: validatedRelatedIds };
          if (validationWarnings.length > 0) {
              responseJson.warnings = validationWarnings;
          }
          return { 
              content: [{
                  type: "json",
                  json: responseJson
              }]
          };

        } catch (error) {
          // Handle general errors
          console.error(`Error getting related entries for '${type}/${id}':`, error);
          // Return structured error
          return { content: [{ type: "json", json: { error: `Error getting related entries: ${error.message}` } }] };
        }
      }
    );
} 