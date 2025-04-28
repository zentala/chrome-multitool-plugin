import { z } from "zod";
import fs from 'fs/promises';
import path from 'path';
import yaml from 'js-yaml';
import { parseFrontMatter } from '../utils/fileUtils.js';

export function registerSearchEntriesTool(server, contextDataPath) {
    server.tool(
      "search_entries",
      "Searches within context entries, optionally filtering by metadata (tags, status).",
      {
        query: z.string().min(1).describe("Text to search for in content (case-insensitive or regex)."),
        type: z.string().optional().describe("Optional context type to limit search."),
        filterTags: z.string().optional().describe("Comma-separated tags; entry must have ALL."),
        filterStatus: z.string().optional().describe("Filter by specific status."),
        isRegex: z.boolean().optional().default(false).describe("Treat the query as a regular expression."),
      },
      async ({ query, type, filterTags, filterStatus, isRegex }) => {
        const results = [];
        const queryLower = isRegex ? null : query.toLowerCase();
        let regexQuery = null;
        if (isRegex) {
            try {
                // Attempt to create the regex, assuming case-insensitive for now
                regexQuery = new RegExp(query, 'i'); 
            } catch (e) {
                 return { content: [{ type: "text", text: `Invalid regular expression provided: ${e.message}` }] };
            }
        }
        const requiredTags = filterTags ? filterTags.split(',').map(t => t.trim().toLowerCase()).filter(t => t) : [];
        const requiredStatus = filterStatus ? filterStatus.trim().toLowerCase() : null;
        const CONTEXT_LINES = 2; // Increase context lines
        let searchDirs = [];
        let searchCriteriaDescription = isRegex ? `matching regex /${query}/i` : `matching "${query}"`;
        if (requiredTags.length > 0) searchCriteriaDescription += ` with tags [${requiredTags.join(', ')}]`;
        if (requiredStatus) searchCriteriaDescription += ` with status "${requiredStatus}"`;
        if (type) searchCriteriaDescription += ` in type '${type}'`;

        try {
          // Determine directories to search
          if (type) {
            const typePath = path.join(contextDataPath, type);
            try {
               const stats = await fs.stat(typePath); 
               if (!stats.isDirectory()) throw new Error(`'${type}' is not a directory.`);
               searchDirs.push({ name: type, path: typePath });
            } catch (err) {
               if (err.code === 'ENOENT') throw new Error(`Context type '${type}' not found.`);
               throw err;
            }
          } else {
             try {
               await fs.access(contextDataPath);
               const allEntries = await fs.readdir(contextDataPath, { withFileTypes: true });
               searchDirs = allEntries.filter(d => d.isDirectory() && !d.name.startsWith('_')).map(d => ({ name: d.name, path: path.join(contextDataPath, d.name) }));
             } catch (accessError) {
               if (accessError.code === 'ENOENT') return { content: [{ type: "text", text: "Context data directory does not exist." }] };
               throw accessError;
             }
          }
          if (searchDirs.length === 0 && !type) return { content: [{ type: "text", text: "No context types found to search in." }] };
          if (searchDirs.length === 0 && type) return { content: [{ type: "text", text: `Context type '${type}' found, but no searchable content.`}] }; // Should be caught earlier, but safety.

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

                    // Apply metadata filters FIRST
                    let metadataMatch = true;
                    if (metadata.parseError && (requiredTags.length > 0 || requiredStatus)) {
                        metadataMatch = false; // Cannot match filters if parse failed
                    } else if (!metadata.parseError) {
                        // Check status filter
                        if (requiredStatus && (!metadata.status || String(metadata.status).toLowerCase() !== requiredStatus)) {
                            metadataMatch = false;
                        }
                        // Check tags filter (only if status filter passed or wasn't required)
                        if (metadataMatch && requiredTags.length > 0) {
                             const entryTags = Array.isArray(metadata.tags) ? metadata.tags.map(t => String(t).toLowerCase()) : [];
                             // Check if ALL required tags are present
                             if (!requiredTags.every(reqTag => entryTags.includes(reqTag))) {
                                 metadataMatch = false;
                             }
                        }
                    }

                    // If metadata filters don't match, skip this file entirely
                    if (!metadataMatch) continue; 

                    // Metadata filters passed, now search content
                    let contentMatchFound = false;
                    const snippets = [];
                    // Check if content matches the query (either regex or simple text)
                    const contentMatches = isRegex ? regexQuery.test(mainContent) : mainContent.toLowerCase().includes(queryLower);

                    if (contentMatches) { 
                       contentMatchFound = true;
                       const lines = mainContent.split('\n');
                       for (let i = 0; i < lines.length; i++) {
                            const line = lines[i];
                            // Check if the current line matches the query
                            const lineMatches = isRegex ? regexQuery.test(line) : line.toLowerCase().includes(queryLower);

                            if (lineMatches) {
                                const start = Math.max(0, i - CONTEXT_LINES);
                                const end = Math.min(lines.length, i + CONTEXT_LINES + 1);
                                // Add line numbers and highlight matching line
                                let snippetLines = [];
                                for (let j = start; j < end; j++) {
                                    // Ensure line numbers are correct and highlight the matching line
                                    const lineNum = j + 1; // Line numbers are 1-based
                                    const isMatchingLine = (j === i);
                                    const linePrefix = isMatchingLine ? " >>" : "   "; // Indicate matching line
                                    snippetLines.push(`${linePrefix}${lineNum}: ${lines[j]}`); 
                                }
                                snippets.push({
                                    line: i,
                                    snippet: snippetLines.join('\n')
                                });
                            }
                       }
                    }

                    if (contentMatchFound) {
                        results.push({
                            id: entryId,
                            title: metadata.title || file.name.replace(/\.md$/, ''),
                            content: snippets,
                            metadata: metadata
                        });
                    }
                  } catch (parseError) {
                    results.push({
                        id: entryId,
                        title: metadata.title || file.name.replace(/\.md$/, ''),
                        content: [{ type: "text", text: `Error parsing file: ${parseError.message}` }],
                        metadata: metadata
                    });
                  }
                }
              }
            } catch (readError) {
              results.push({
                  id: dir.name,
                  title: dir.name,
                  content: [{ type: "text", text: `Error reading directory: ${readError.message}` }],
                  metadata: {}
              });
            }
          }
        } catch (searchError) {
          results.push({
              id: "search_error",
              title: "Search Error",
              content: [{ type: "text", text: `Error searching: ${searchError.message}` }],
              metadata: {}
          });
        }

        return { content: results };
      }
    );
}