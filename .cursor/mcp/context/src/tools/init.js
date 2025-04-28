import { z } from "zod";
import fs from 'fs/promises';
import path from 'path';
import { contextToolRoot } from '../config.js'; // Needed to find default templates

/**
 * Registers the init tool with the MCP server.
 * This tool initializes the context directory by creating the base folders
 * and default type directories based on templates found in example/templates.
 */
export function registerInitTool(server, contextDataPath) {
    server.tool(
      "init",
      "Initializes the context directory structure, creating default type folders if they don't exist.",
      {},
      async () => {
        const messages = [];
        const errors = [];
        const defaultTemplateDir = path.join(contextToolRoot, 'example', 'templates');
        const templatesDir = path.join(contextDataPath, '_templates');

        try {
          // 1. Ensure base context path and _templates exist
          try {
            await fs.mkdir(contextDataPath, { recursive: true });
            messages.push(`Ensured context directory exists: ${contextDataPath}`);
            await fs.mkdir(templatesDir, { recursive: true });
            messages.push(`Ensured _templates directory exists: ${templatesDir}`);
          } catch (mkdirError) {
            // If base directories cannot be created, it's a fatal error for init
            console.error("Fatal error ensuring base directories:", mkdirError);
            return { content: [{ type: "text", text: `Failed to initialize base directories: ${mkdirError.message}` }] };
          }

          // 2. Read default template names
          let templateFiles = [];
          try {
             templateFiles = await fs.readdir(defaultTemplateDir);
          } catch (readTemplatesError) {
             // If we can't read the default templates, we can still proceed but warn
             const errorMsg = `Could not read default templates from ${defaultTemplateDir}: ${readTemplatesError.message}. Default type directories will not be created.`;
             console.error(errorMsg);
             errors.push(errorMsg);
             // Continue without creating type dirs based on templates
          }
          
          // 3. Create type directories based on template names
          const createdTypeDirs = [];
          const existedTypeDirs = [];

          for (const templateFile of templateFiles) {
            if (templateFile.endsWith('.md')) {
              const typeName = templateFile.replace(/\.md$/i, '').toLowerCase(); // Use lowercase name for dir
              const typePath = path.join(contextDataPath, typeName);
              try {
                await fs.mkdir(typePath); // Fails if exists
                createdTypeDirs.push(typeName);
              } catch (typeMkdirError) {
                if (typeMkdirError.code === 'EEXIST') {
                  existedTypeDirs.push(typeName);
                  // It already exists, which is fine for init
                } else {
                  // Other error creating directory
                  const errorMsg = `Failed to create directory for type '${typeName}': ${typeMkdirError.message}`;
                  console.error(errorMsg);
                  errors.push(errorMsg);
                }
              }
            }
          }
          
          if (createdTypeDirs.length > 0) {
             messages.push(`Created default type directories: ${createdTypeDirs.join(', ')}.`);
          }
          if (existedTypeDirs.length > 0) {
             messages.push(`Default type directories already existed: ${existedTypeDirs.join(', ')}.`);
          }

          let resultText = "Context initialization complete.\n" + messages.join('\n');
          if (errors.length > 0) {
              resultText += "\n\nWarnings encountered:\n" + errors.join('\n');
          }
          
          return { content: [{ type: "text", text: resultText }] };

        } catch (error) {
          // Catch unexpected errors during the process
          console.error("Unexpected error during context initialization:", error);
          return { content: [{ type: "text", text: `Failed to initialize context: ${error.message}` }] };
        }
      }
    );
} 