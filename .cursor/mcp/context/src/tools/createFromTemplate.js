import { z } from "zod";
import fs from 'fs/promises';
import path from 'path';
import { parseFrontMatter, formatWithFrontMatter } from '../utils/fileUtils.js';

export function registerCreateFromTemplateTool(server, contextDataPath) {
    server.tool(
      "create_from_template",
      "Creates a new context entry from a template file, filling placeholders.",
      {
        templateName: z.string().min(1).describe("Name of the template file in _templates/ (without .md extension)."),
        type: z.string().min(1).describe("Context type (directory name) where the new entry will be created."),
        filename: z.string().optional().describe("Optional filename for the new entry (no ext). Timestamp used if omitted."),
        variables: z.record(z.string()).optional().describe("Optional object {placeholder: value} for template substitution."),
      },
      async ({ templateName, type, filename, variables }) => {
        const templateDir = path.join(contextDataPath, '_templates');
        const templatePath = path.join(templateDir, `${templateName}.md`);
        const targetTypePath = path.join(contextDataPath, type);

        try {
          // 1. Read the template file
          let templateContent;
          try {
            templateContent = await fs.readFile(templatePath, 'utf8');
          } catch (err) {
            if (err.code === 'ENOENT') {
                // Try reading from the older templates location as a fallback
                const fallbackTemplateDir = path.resolve(process.cwd(), '.cursor', 'TEMPLATES');
                const fallbackTemplatePath = path.join(fallbackTemplateDir, `${templateName}.md`);
                try {
                    templateContent = await fs.readFile(fallbackTemplatePath, 'utf8');
                    console.warn(`Template found in fallback location: ${fallbackTemplatePath}`);
                } catch (fallbackErr) {
                     if (fallbackErr.code === 'ENOENT') {
                         throw new Error(`Template '${templateName}.md' not found in _templates or TEMPLATES directory.`);
                     } 
                     throw fallbackErr;
                }
            } else {
                 throw err; // Re-throw other read errors
            }
          }
          
          // 2. Ensure target type directory exists
          await fs.mkdir(targetTypePath, { recursive: true });

          // 3. Parse template front matter and content
          const { metadata: templateMetadata, mainContent: templateMainContent } = 
              parseFrontMatter(templateContent, templatePath);

          if (templateMetadata.parseError) {
              console.warn(`Template '${templateName}.md' has invalid YAML front matter. Metadata might be incomplete.`);
              // Continue, but metadata from template might be missing/partial
          }

          // 4. Substitute variables in main content
          let processedContent = templateMainContent;
          if (variables) {
              for (const key in variables) {
                  const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g'); 
                  processedContent = processedContent.replace(regex, variables[key]);
              }
          }
           // Remove any remaining unsubstituted placeholders 
           processedContent = processedContent.replace(/{{\s*[^}]+\s*}}/g, '' ); // Simple removal

          // 5. Determine final filename
          let finalFilename = filename 
              ? filename.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_-]/g, '') + ".md" 
              : `${new Date().toISOString().replace(/[:.]/g, '-')}.md`;
          const filePath = path.join(targetTypePath, finalFilename);

           // 6. Prepare final metadata 
           const nowISO = new Date().toISOString();
           const finalMetadata = {
               ...templateMetadata,
               ...(variables || {}),
               createdAt: nowISO,    
               updatedAt: nowISO,
           };
           delete finalMetadata.parseError; 

          // 7. Format and write the new file (check for existence)
          const fileContent = formatWithFrontMatter(finalMetadata, processedContent);
          await fs.writeFile(filePath, fileContent, { flag: 'wx' }); // Fail if exists

          console.error(`Created entry from template: ${filePath}`);
          return { 
              content: [{ 
                  type: "text", 
                  text: `Successfully created '${type}/${finalFilename.replace(/\.md$/, '')}\' from template \'${templateName}\'.` 
              }] 
          };

        } catch (error) {
          if (error.code === 'EEXIST') {
              return { content: [{ type: "text", text: `Error: File '${error.path}\' already exists. Choose a different name.` }] };
           }
          console.error(`Error creating entry from template \'${templateName}\':`, error);
          return { content: [{ type: "text", text: `Error creating from template: ${error.message}` }] };
        }
      }
    );
} 