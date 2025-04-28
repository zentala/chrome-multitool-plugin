import { z } from "zod";
import fs from 'fs/promises';
import path from 'path';
import { parseFrontMatter } from '../utils/fileUtils.js';

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

          // Process each file
          for (const file of mdFiles) {
            const entryId = file.name.replace(/\.md$/, '');
            const entryResult = { id: entryId };

            if (includeMetadata) {
              const filePath = path.join(typePath, file.name);
              try {
                const rawContent = await fs.readFile(filePath, 'utf8');
                const { metadata } = parseFrontMatter(rawContent, filePath); 

                if (metadata && metadata.parseError) { 
                    entryResult.metadataError = `Failed to parse YAML front matter: ${metadata.parseError}`; 
                } else {
                    entryResult.metadata = metadata; // Add the parsed metadata object
                }
              } catch (readError) {
                 // Handle read errors specifically for metadata fetching
                 if (readError.code !== 'ENOENT') { // Ignore if deleted during listing
                     console.error(`Error reading ${filePath} for metadata:`, readError);
                     entryResult.metadataError = `Error reading file for metadata: ${readError.message}`;
                 } else {
                     // File might have been deleted between readdir and readFile
                     entryResult.metadataError = "File disappeared during metadata read.";
                 }
              }
            }
            results.push(entryResult);
          }

          // Return the array of results as JSON
          return { content: [{ type: "json", json: results }] };

        } catch (error) {
          // Handle general errors during directory processing
          console.error(`Error listing entries in type '${type}':`, error);
          // Return structured error
          return { content: [{ type: "json", json: { error: `Error listing entries: ${error.message}` } }] };
        }
      }
    );
} 