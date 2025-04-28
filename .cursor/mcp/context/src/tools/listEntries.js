import { z } from "zod";
import fs from 'fs/promises';
import path from 'path';
import { parseFrontMatter } from '../utils/fileUtils.js';

/**
 * Helper function to fetch and parse metadata for a single entry.
 * @param {string} filePath - The full path to the entry file.
 * @returns {Promise<{metadata?: object, metadataError?: string}>} - Object containing metadata or an error message.
 */
async function fetchMetadataForEntry(filePath) {
    try {
        const rawContent = await fs.readFile(filePath, 'utf8');
        const { metadata } = parseFrontMatter(rawContent, filePath);

        if (metadata && metadata.parseError) {
            return { metadataError: `Failed to parse YAML front matter: ${metadata.parseError}` };
        } else {
            return { metadata: metadata };
        }
    } catch (readError) {
        if (readError.code !== 'ENOENT') {
            console.error(`Error reading ${filePath} for metadata:`, readError);
            return { metadataError: `Error reading file for metadata: ${readError.message}` };
        } else {
            return { metadataError: "File disappeared during metadata read." };
        }
    }
}

export function registerListEntriesTool(server, contextDataPath) {
    server.tool(
      "list_entries",
      "Lists entries within a type. Returns a JSON array of objects, optionally including metadata.",
      {
        type: z.string().min(1).describe("Context type (directory name)."),
        includeMetadata: z.boolean().optional().default(false).describe("If true, include parsed metadata object for each entry."),
      },
      async ({ type, includeMetadata }) => {
        const typePath = path.join(contextDataPath, type);
        const results = []; // Array to hold result objects

        try {
          // Validate type directory
          try {
             const stats = await fs.stat(typePath); 
             if (!stats.isDirectory()) throw new Error(`'${type}' is not a directory.`);
          } catch (err) {
             if (err.code === 'ENOENT') {
                // Return structured error for consistency
                return { content: [{ type: "json", json: { error: `Context type '${type}' not found.` } }] }; 
             }
             throw err;
          }
          
          const entries = await fs.readdir(typePath, { withFileTypes: true });
          const mdFiles = entries.filter(d => d.isFile() && d.name.endsWith('.md'));

          // Return empty array if no entries found
          if (mdFiles.length === 0) {
             return { content: [{ type: "json", json: [] }] }; 
          }

          // Process each file using Promise.all for potentially better performance
          const processedEntries = await Promise.all(mdFiles.map(async (file) => {
            const entryId = file.name.replace(/\.md$/, '');
            const entryResult = { id: entryId };

            if (includeMetadata) {
              const filePath = path.join(typePath, file.name);
              const { metadata, metadataError } = await fetchMetadataForEntry(filePath);
              if (metadataError) {
                entryResult.metadataError = metadataError;
              } else {
                entryResult.metadata = metadata;
              }
            }
            return entryResult;
          }));

          // Return the array of results as JSON
          return { content: [{ type: "json", json: processedEntries }] };

        } catch (error) {
          // Handle general errors during directory processing
          console.error(`Error listing entries in type '${type}':`, error);
          // Return structured error
          return { content: [{ type: "json", json: { error: `Error listing entries: ${error.message}` } }] };
        }
      }
    );
} 