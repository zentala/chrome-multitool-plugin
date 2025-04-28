import { z } from "zod";
import fs from 'fs/promises';
import path from 'path';
import { parseFrontMatter } from '../utils/fileUtils.js';

/**
 * Processes a single entry file for search.
 * Reads the file, parses front matter, applies filters, and searches content.
 * @param {string} filePath - Full path to the markdown file.
 * @param {string} entryId - The constructed ID (e.g., type/name).
 * @param {object} searchParams - Object containing search parameters:
 *   {string|null} queryLower, {RegExp|null} regexQuery, {boolean} isRegex,
 *   {string|null} requiredStatus, {string[]} requiredTags, {number} CONTEXT_LINES
 * @returns {Promise<{result?: object, error?: object, skipped?: boolean}>} - Outcome of processing.
 */
async function processEntryForSearch(filePath, entryId, searchParams) {
    const { queryLower, regexQuery, isRegex, requiredStatus, requiredTags, CONTEXT_LINES } = searchParams;
    try {
        const rawContent = await fs.readFile(filePath, 'utf8');
        const { metadata, mainContent } = parseFrontMatter(rawContent, filePath);

        // Check for parseError within the metadata object
        if (metadata && metadata.parseError) {
            console.warn(`Skipping entry '${entryId}' due to YAML parse error: ${metadata.parseError}`);
            return { error: { id: entryId, error: `YAML parse error: ${metadata.parseError}` } };
        }

        // Apply metadata filters
        let metadataMatch = true;
        if (requiredStatus && (!metadata.status || String(metadata.status).toLowerCase() !== requiredStatus)) {
            metadataMatch = false;
        }
        if (metadataMatch && requiredTags.length > 0) {
            const entryTags = Array.isArray(metadata.tags) ? metadata.tags.map(t => String(t).toLowerCase()) : [];
            if (!requiredTags.every(reqTag => entryTags.includes(reqTag))) {
                metadataMatch = false;
            }
        }
        if (!metadataMatch) return { skipped: true };

        // --- Metadata filters passed, now search content ---
        const snippets = [];
        const lines = mainContent.split('\n');
        let contentMatchFound = false;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const lineMatches = isRegex ? regexQuery.test(line) : line.toLowerCase().includes(queryLower);

            if (lineMatches) {
                contentMatchFound = true;
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

        if (contentMatchFound) {
            return {
                result: {
                    id: entryId,
                    title: metadata.title || entryId.split('/').pop(),
                    metadata: metadata,
                    snippets: snippets
                }
            };
        } else {
            return { skipped: true }; // Content didn't match
        }

    } catch (readFileError) {
        // Handle errors during file reading
        if (readFileError.code !== 'ENOENT') {
            console.error(`Error reading file '${entryId}':`, readFileError);
            return { error: { id: entryId, error: `Read error: ${readFileError.message}` } };
        } else {
            console.warn(`File '${entryId}' disappeared during search.`);
            return { error: { id: entryId, error: `File disappeared during search.` } };
        }
    }
}

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
        const processingErrors = [];
        let searchDirs = []; // Declare here to be accessible in catch block if needed
        let regexQuery = null;

        // Compile regex if needed, handle error early
        if (isRegex) {
            try {
                regexQuery = new RegExp(query, 'i'); 
            } catch (e) {
                // Return structured error for invalid regex
                return { content: [{ type: "json", json: { error: `Invalid regular expression: ${e.message}` } }] };
            }
        }

        const queryLower = isRegex ? null : query.toLowerCase();
        const requiredTags = filterTags ? filterTags.split(',').map(t => t.trim().toLowerCase()).filter(t => t) : [];
        const requiredStatus = filterStatus ? filterStatus.trim().toLowerCase() : null;
        const CONTEXT_LINES = 2;
        
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

          // Process directories one by one, but files within each directory concurrently
          for (const dir of searchDirs) {
            let filesInDir = [];
            try {
                filesInDir = await fs.readdir(dir.path, { withFileTypes: true });
            } catch (readDirError) {
                console.error(`Error reading directory '${dir.name}':`, readDirError);
                processingErrors.push({ id: dir.name, error: `Error reading directory: ${readDirError.message}` });
                continue; // Skip to next directory
            }

            const mdFiles = filesInDir.filter(file => file.isFile() && file.name.endsWith('.md'));
            const searchParams = { queryLower, regexQuery, isRegex, requiredStatus, requiredTags, CONTEXT_LINES };

            const promises = mdFiles.map(file => {
                const filePath = path.join(dir.path, file.name);
                const entryId = `${dir.name}/${file.name.replace(/\.md$/, '')}`;
                return processEntryForSearch(filePath, entryId, searchParams);
            });

            const settledResults = await Promise.allSettled(promises);

            settledResults.forEach(outcome => {
                if (outcome.status === 'fulfilled') {
                    const { result, error, skipped } = outcome.value;
                    if (result) {
                        results.push(result);
                    } else if (error) {
                        processingErrors.push(error);
                    }
                    // Ignore skipped entries
                } else {
                    // Handle unexpected errors from processEntryForSearch itself (rejected promise)
                    console.error("Unexpected error during entry processing:", outcome.reason);
                    processingErrors.push({ id: "unknown", error: `Internal processing error: ${outcome.reason?.message || outcome.reason}` });
                }
            });
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