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
        query: z.string().min(1).describe("Text to search for in content (case-insensitive)."),
        type: z.string().optional().describe("Optional context type to limit search."),
        filterTags: z.string().optional().describe("Comma-separated tags; entry must have ALL."),
        filterStatus: z.string().optional().describe("Filter by specific status."),
      },
      async ({ query, type, filterTags, filterStatus }) => {
        const results = [];
        const queryLower = query.toLowerCase();
        const requiredTags = filterTags ? filterTags.split(',').map(t => t.trim().toLowerCase()).filter(t => t) : [];
        const requiredStatus = filterStatus ? filterStatus.trim().toLowerCase() : null;
        const CONTEXT_LINES = 1; // Number of lines before/after match
        let searchDirs = [];
        let searchCriteriaDescription = `matching "${query}"`;
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

                    // Metadata filters passed, now search content and rawContent (for metadata match fallback)
                    let contentMatchFound = false;
                    const snippets = [];
                    if (mainContent.toLowerCase().includes(queryLower)) { 
                       contentMatchFound = true;
                       const lines = mainContent.split('\n');
                       for (let i = 0; i < lines.length; i++) {
                            if (lines[i].toLowerCase().includes(queryLower)) {
                                const start = Math.max(0, i - CONTEXT_LINES);
                                const end = Math.min(lines.length, i + CONTEXT_LINES + 1);
                                const context = lines.slice(start, end).join('\n');
                                const prefix = start > 0 ? '...\n' : '';
                                const suffix = end < lines.length ? '\n...' : '';
                                snippets.push(prefix + context + suffix);
                                i = end - 1; // Avoid overlapping contexts
                            }
                       }
                    }

                    // If content matched, add with snippets
                    if (contentMatchFound && snippets.length > 0) {
                        results.push({ id: entryId, snippets });
                    } 
                    // If no content match BUT rawContent matches (metadata filters already passed)
                    else if (!contentMatchFound && rawContent.toLowerCase().includes(queryLower)) {
                        results.push({ id: entryId, snippets: ["(Match found in metadata)"] });
                    }
                    // Otherwise, no match found in this file respecting filters (already handled by initial metadata check)

                  } catch (readError) {
                     if (readError.code !== 'ENOENT') console.error(`Error reading ${filePath} during search:`, readError);
                  }
                }
              }
            } catch (dirReadError) {
              if (dirReadError.code !== 'ENOENT') console.error(`Error reading dir ${dir.path} during search:`, dirReadError);
            }
          }

          // Format results
          if (results.length === 0) return { content: [{ type: "text", text: `No entries found ${searchCriteriaDescription}.` }] };
          
          let resultText = `Found ${results.length} entr${results.length === 1 ? 'y' : 'ies'} ${searchCriteriaDescription}:\n\n`;
          results.forEach(res => {
              resultText += `**${res.id}**\n`;
              res.snippets.forEach(snippet => {
                  // Indent snippets for readability
                  const indentedSnippet = snippet.split('\n').map(line => `  ${line}`).join('\n');
                  resultText += `${indentedSnippet}\n---\n`;
              });
              resultText += '\n'; // Add space between entries
          });

          return { content: [{ type: "text", text: resultText.trim() }] };

        } catch (error) {
          console.error(`Error during search for "${query}":`, error);
          return { content: [{ type: "text", text: `Error during search: ${error.message}` }] };
        }
      }
    );
} 