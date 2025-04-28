import { z } from "zod";
import fs from 'fs/promises';
import path from 'path';
import { parseFrontMatter } from '../utils/fileUtils.js';

export function registerSearchEntriesTool(server, contextDataPath) {
    server.tool(
      "search_entries",
      "Searches entries. Returns JSON { results: [...], errors: [...] }, optionally filtering by metadata.",
      {
        query: z.string().min(1).describe("Text to search for in content (case-insensitive or regex)."),
        type: z.string().optional().describe("Optional context type to limit search."),
        filterTags: z.string().optional().describe("Comma-separated tags; entry must have ALL."),
        filterStatus: z.string().optional().describe("Filter by specific status."),
        isRegex: z.boolean().optional().default(false).describe("Treat the query as a regular expression."),
      },
      async ({ query, type, filterTags, filterStatus, isRegex }) => {
        const results = [];
        const processingErrors = []; // Array for processing errors

        let regexQuery = null;
        if (isRegex) {
            try {
                regexQuery = new RegExp(query, 'i'); 
            } catch (e) {
                 // Return structured error
                 return { content: [{ type: "json", json: { error: `Invalid regular expression: ${e.message}` } }] };
            }
        }
        const queryLower = isRegex ? null : query.toLowerCase(); // Define queryLower here
        
        const requiredTags = filterTags ? filterTags.split(',').map(t => t.trim().toLowerCase()).filter(t => t) : [];
        const requiredStatus = filterStatus ? filterStatus.trim().toLowerCase() : null;
        const CONTEXT_LINES = 2;
        let searchDirs = [];
        
        try {
          // Determine directories to search
          if (type) {
            const typePath = path.join(contextDataPath, type);
            try {
               const stats = await fs.stat(typePath); 
               if (!stats.isDirectory()) {
                   // Throw specific error if type exists but isn't a directory
                   throw new Error(`Specified type '${type}' exists but is not a directory.`);
               }
               searchDirs.push({ name: type, path: typePath });
            } catch (err) {
               if (err.code === 'ENOENT') {
                   // Return structured error if type doesn't exist
                   return { content: [{ type: "json", json: { error: `Context type '${type}' not found.` } }] };
               }
               throw err; // Re-throw other stat errors
            }
          } else {
             try {
               await fs.access(contextDataPath);
               const allEntries = await fs.readdir(contextDataPath, { withFileTypes: true });
               searchDirs = allEntries.filter(d => d.isDirectory() && !d.name.startsWith('_')).map(d => ({ name: d.name, path: path.join(contextDataPath, d.name) }));
             } catch (accessError) {
               if (accessError.code === 'ENOENT') {
                   // Return structured error if base context dir doesn't exist
                   return { content: [{ type: "json", json: { error: "Context data directory does not exist." } }] };
               }
               throw accessError; // Re-throw other access errors
             }
          }

          // Return empty result if no searchable directories found
          if (searchDirs.length === 0) {
             const message = type ? `Context type '${type}' is empty or invalid.` : "No context types found to search in.";
             return { content: [{ type: "json", json: { results: [], errors: [], message: message } }] };
          }

          // Iterate, parse, filter, search
          for (const dir of searchDirs) {
            try {
              const files = await fs.readdir(dir.path, { withFileTypes: true });
              for (const file of files) {
                if (file.isFile() && file.name.endsWith('.md')) {
                  const filePath = path.join(dir.path, file.name);
                  const entryId = `${dir.name}/${file.name.replace(/\.md$/, '')}`;
                  try {
                    const rawContent = await fs.readFile(filePath, 'utf8');
                    const { metadata, mainContent } = parseFrontMatter(rawContent, filePath);

                    // Check for parseError within the metadata object
                    if (metadata && metadata.parseError) {
                        // Log and report using the error message from metadata.parseError
                        console.warn(`Skipping entry '${entryId}' due to YAML parse error: ${metadata.parseError}`); 
                        processingErrors.push({ id: entryId, error: `YAML parse error: ${metadata.parseError}` });
                        continue; // Skip to the next file
                    }
                    
                    // Apply metadata filters 
                    let metadataMatch = true;
                    // Check status filter
                    if (requiredStatus && (!metadata.status || String(metadata.status).toLowerCase() !== requiredStatus)) {
                        metadataMatch = false;
                    }
                    // Check tags filter (only if status filter passed or wasn't required)
                    if (metadataMatch && requiredTags.length > 0) {
                         const entryTags = Array.isArray(metadata.tags) ? metadata.tags.map(t => String(t).toLowerCase()) : [];
                         if (!requiredTags.every(reqTag => entryTags.includes(reqTag))) {
                             metadataMatch = false;
                         }
                    }

                    // If metadata filters don't match, skip this file
                    if (!metadataMatch) continue; 

                    // --- Metadata filters passed, now search content ---
                    const snippets = [];
                    const lines = mainContent.split('\n');
                    let contentMatchFound = false; // Track if any line matched

                    for (let i = 0; i < lines.length; i++) {
                        const line = lines[i];
                        const lineMatches = isRegex ? regexQuery.test(line) : line.toLowerCase().includes(queryLower);

                        if (lineMatches) {
                            contentMatchFound = true; // Mark that we found at least one match
                            const start = Math.max(0, i - CONTEXT_LINES);
                            const end = Math.min(lines.length, i + CONTEXT_LINES + 1);
                            let snippetLines = [];
                            for (let j = start; j < end; j++) {
                                const lineNum = j + 1; 
                                const isMatchingLine = (j === i);
                                const linePrefix = isMatchingLine ? " >>" : "   ";
                                snippetLines.push(`${linePrefix}${lineNum}: ${lines[j]}`); 
                            }
                            snippets.push({
                                line: i,
                                snippet: snippetLines.join('\n')
                            });
                        }
                    }
                    // --- End content search ---

                    // Only add to results if content actually matched
                    if (contentMatchFound) {
                        results.push({
                            id: entryId,
                            // Use title from metadata if available, otherwise fallback to id
                            title: metadata.title || entryId.split('/').pop(), 
                            metadata: metadata, // Include full metadata for context
                            snippets: snippets // Use the key 'snippets' instead of 'content'
                        });
                    }
                  } catch (readFileError) {
                    // Handle errors during file reading (after readdir)
                     if (readFileError.code !== 'ENOENT') { // Ignore if deleted during search
                         console.error(`Error reading file '${entryId}':`, readFileError);
                         processingErrors.push({ id: entryId, error: `Read error: ${readFileError.message}` });
                     } else {
                          console.warn(`File '${entryId}' disappeared during search.`);
                          processingErrors.push({ id: entryId, error: `File disappeared during search.` });
                     }
                  }
                }
              }
            } catch (readDirError) {
              // Handle errors reading a directory's contents
              console.error(`Error reading directory '${dir.name}':`, readDirError);
              processingErrors.push({ id: dir.name, error: `Error reading directory: ${readDirError.message}` });
            }
          }
          
          // Return final structured response
          return { content: [{ type: "json", json: { results: results, errors: processingErrors } }] };

        } catch (searchError) {
          // Handle errors like invalid type path (not ENOENT)
          console.error(`Error during search setup:`, searchError);
          return { content: [{ type: "json", json: { error: `Search setup error: ${searchError.message}` } }] };
        }
      }
    );
}