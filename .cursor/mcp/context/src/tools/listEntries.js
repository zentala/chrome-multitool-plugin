import { z } from "zod";
import fs from 'fs/promises';
import path from 'path';
import yaml from 'js-yaml'; // Needed for metadata parsing
import { parseFrontMatter } from '../utils/fileUtils.js';

export function registerListEntriesTool(server, contextDataPath) {
    server.tool(
      "list_entries",
      "Lists entries within a type. Optionally includes basic metadata.",
      {
        type: z.string().min(1).describe("Context type (directory name)."),
        includeMetadata: z.boolean().optional().default(false).describe("If true, include metadata."),
      },
      async ({ type, includeMetadata }) => {
        const typePath = path.join(contextDataPath, type);
        try {
          // Validate type directory
          try {
             const stats = await fs.stat(typePath); 
             if (!stats.isDirectory()) throw new Error(`'${type}' is not a directory.`);
          } catch (err) {
             if (err.code === 'ENOENT') return { content: [{ type: "text", text: `Context type '${type}' not found.` }] };
             throw err;
          }
          
          const entries = await fs.readdir(typePath, { withFileTypes: true });
          const mdFiles = entries.filter(d => d.isFile() && d.name.endsWith('.md'));
          if (mdFiles.length === 0) return { content: [{ type: "text", text: `No entries found in type '${type}'.` }] };

          let outputLines = [`Entries in '${type}'${includeMetadata ? ' (with metadata)' : ''}:`];
          if (includeMetadata) {
            for (const file of mdFiles) {
              const filePath = path.join(typePath, file.name);
              const id = file.name.replace(/\.md$/, '');
              let metadataInfo = "(no metadata)";
              try {
                const rawContent = await fs.readFile(filePath, 'utf8');
                const { metadata } = parseFrontMatter(rawContent, filePath);
                if (metadata && !metadata.parseError && Object.keys(metadata).length > 0) {
                    const createdAt = metadata.createdAt ? new Date(metadata.createdAt).toLocaleDateString() : 'N/A';
                    const status = metadata.status || 'N/A';
                    const tags = Array.isArray(metadata.tags) ? metadata.tags.join(', ') : 'N/A';
                    metadataInfo = `Created: ${createdAt}, Status: ${status}, Tags: [${tags}]`;
                } else if (metadata.parseError) {
                     metadataInfo = "(invalid metadata)";
                }
              } catch (readError) {
                 if (readError.code !== 'ENOENT') { // Ignore if deleted during listing
                     console.error(`Error reading ${filePath} for metadata:`, readError);
                     metadataInfo = "(read error)";
                 }
              }
              outputLines.push(`- ${id} | ${metadataInfo}`);
            }
          } else {
            outputLines.push(...mdFiles.map(f => `- ${f.name.replace(/\.md$/, '')}`));
          }
          return { content: [{ type: "text", text: outputLines.join('\n') }] };
        } catch (error) {
          console.error(`Error listing entries in type '${type}':`, error);
          return { content: [{ type: "text", text: `Error listing entries: ${error.message}` }] };
        }
      }
    );
} 