import { z } from "zod";
import fs from 'fs/promises';
import path from 'path';
import { formatWithFrontMatter } from '../utils/fileUtils.js';

export function registerCreateEntryTool(server, contextDataPath) {
    server.tool(
      "create_entry",
      "Creates a new context entry (file) with YAML front matter. Fails if file exists.",
      {
        type: z.string().min(1).describe("Context type (directory name). Will be created if it doesn't exist."),
        content: z.string().describe("Main Markdown content."),
        filename: z.string().optional().describe("Optional filename (no ext). Timestamp used if omitted."),
        metadata: z.record(z.any()).optional().describe("Optional metadata object (tags, status, etc.)."),
      },
      async ({ type, content, filename, metadata }) => {
        const typePath = path.join(contextDataPath, type);
        try {
          await fs.mkdir(typePath, { recursive: true }); // Ensure type directory exists

          let finalFilename = filename 
              ? filename.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_-]/g, '') + ".md" 
              : `${new Date().toISOString().replace(/[:.]/g, '-')}.md`;
          
          const filePath = path.join(typePath, finalFilename);

          // Check if file already exists using writeFile with 'wx' flag
          const nowISO = new Date().toISOString();
          const finalMetadata = { createdAt: nowISO, updatedAt: nowISO, ...(metadata || {}) };
          const fileContent = formatWithFrontMatter(finalMetadata, content);

          await fs.writeFile(filePath, fileContent, { flag: 'wx' }); // 'wx' flag fails if path exists

          console.error(`Created entry: ${filePath}`);
          return { content: [{ type: "text", text: `Successfully created '${type}/${finalFilename.replace(/\.md$/, '')}'.` }] };

        } catch (error) {
           if (error.code === 'EEXIST') {
              return { content: [{ type: "text", text: `Error: File '${error.path}' already exists. Use update_entry or a different name.` }] };
           }
          console.error(`Error creating entry in type '${type}':`, error);
          return { content: [{ type: "text", text: `Error creating entry: ${error.message}` }] };
        }
      }
    );
} 