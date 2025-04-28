import { z } from "zod";
import fs from 'fs/promises';
import path from 'path';
import { formatWithFrontMatter } from '../utils/fileUtils.js';

/**
 * Registers the createTypeWithTemplate tool with the MCP server.
 * This tool creates a new context type (directory) and a corresponding template file.
 */
export function registerCreateTypeWithTemplateTool(server, contextDataPath) {
    server.tool(
      "create_type_with_template",
      "Creates a new context type directory and a corresponding template file in _templates.",
      {
        typeName: z.string().min(1).regex(/^[a-zA-Z0-9_-]+$/, "Type name can only contain letters, numbers, underscores, and hyphens.").describe("Name for the new context type and its template (e.g., 'meeting-notes')."),
        templateContent: z.string().optional().default("\n").describe("Optional main content for the template file."),
        templateMetadata: z.record(z.any()).optional().default({}).describe("Optional JSON object for the template's front matter."),
      },
      async ({ typeName, templateContent, templateMetadata }) => {
        const typeDirPath = path.join(contextDataPath, typeName);
        const templatesDirPath = path.join(contextDataPath, '_templates');
        const templateFilePath = path.join(templatesDirPath, `${typeName}.md`);

        try {
          // 1. Ensure the main _templates directory exists
          await fs.mkdir(templatesDirPath, { recursive: true });

          // 2. Create the type directory (fails if it exists)
          await fs.mkdir(typeDirPath); // No { recursive: true } - we want it to fail if type exists

          // 3. Create the template file (fails if it exists)
          const nowISO = new Date().toISOString();
          const finalMetadata = {
            title: `Template for ${typeName}`,
            ...templateMetadata, // Allow overriding default title
            createdAt: nowISO,
            updatedAt: nowISO,
          };
          const fileContent = formatWithFrontMatter(finalMetadata, templateContent);
          await fs.writeFile(templateFilePath, fileContent, { flag: 'wx' }); // 'wx' fails if exists

          const message = `Successfully created type '${typeName}' and template '${typeName}.md' in _templates.`;
          console.error(message);
          return { content: [{ type: "text", text: message }] };

        } catch (error) {
          let errorMessage = `Error creating type or template '${typeName}': ${error.message}`;
          if (error.code === 'EEXIST') {
             // Check which operation failed (mkdir or writeFile)
             try {
                 // Check if type directory exists
                 await fs.access(typeDirPath);
                 // If type dir exists, the writeFile must have failed
                 errorMessage = `Error creating template '${typeName}.md': Template file already exists in _templates. Type directory might already exist.`;
             } catch (accessErr) {
                  // If type dir doesn't exist, the mkdir must have failed
                  errorMessage = `Error creating type '${typeName}': Directory already exists.`;
             }
          }
          console.error(errorMessage);
          return { content: [{ type: "text", text: errorMessage }] };
        }
      }
    );
} 