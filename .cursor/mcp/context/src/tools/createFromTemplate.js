import { z } from "zod";
import fs from 'fs/promises';
import path from 'path';
import { parseFrontMatter, formatWithFrontMatter } from '../utils/fileUtils.js';
import { contextToolRoot } from '../config.js';

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
          let usedFallback = false;
          try {
            templateContent = await fs.readFile(templatePath, 'utf8');
          } catch (err) {
            if (err.code === 'ENOENT') {
                // Try reading from the application's default templates location as a fallback
                const fallbackTemplateDir = path.join(contextToolRoot, 'example', 'templates');
                const fallbackTemplatePath = path.join(fallbackTemplateDir, `${templateName}.md`);
                try {
                    templateContent = await fs.readFile(fallbackTemplatePath, 'utf8');
                    console.warn(`Template found in fallback location: ${fallbackTemplatePath}`);
                    usedFallback = true;
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
            // Stop execution if the template itself has invalid YAML
            return { content: [{ type: "text", text: `Error processing template '${templateName}': ${templateMetadata.parseError}` }] };
          }

          // 4. Substitute variables in main content AND metadata
          let processedContent = templateMainContent;
          let processedMetadata = { ...templateMetadata }; // Create a mutable copy

          // Function to recursively process metadata object/array values
          const processMetadataValue = (value) => {
              if (typeof value === 'string') {
                  let processedValue = value;
                  if (variables) {
                      for (const key in variables) {
                          const regex = new RegExp(`{{${key}}}`, 'g'); 
                          processedValue = processedValue.replace(regex, variables[key]);
                      }
                  }
                  // Remove ONLY the explicitly matched variables, leave others
                  return processedValue;
              } else if (Array.isArray(value)) {
                  return value.map(processMetadataValue); // Recursively process array elements
              } else if (typeof value === 'object' && value !== null) {
                  const newValue = {};
                  for (const key in value) {
                      newValue[key] = processMetadataValue(value[key]); // Recursively process object values
                  }
                  return newValue;
              }
              return value; // Return non-string/array/object values as is
          };

          // Process metadata
          for (const metaKey in processedMetadata) {
              processedMetadata[metaKey] = processMetadataValue(processedMetadata[metaKey]);
          }

          // Process main content
          if (variables) {
              for (const key in variables) {
                  const regex = new RegExp(`{{${key}}}`, 'g'); 
                  processedContent = processedContent.replace(regex, variables[key]);
              }
          }
           // Remove ONLY the explicitly matched variables, leave others
           processedContent = processedContent;

          // 5. Determine final filename
          let finalFilename = filename 
              ? filename.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_-]/g, '') + ".md" 
              : `${new Date().toISOString().replace(/[:.]/g, '-')}.md`;
          const filePath = path.join(targetTypePath, finalFilename);

           // 6. Prepare final metadata 
           const nowISO = new Date().toISOString();
           const finalMetadata = {
               ...processedMetadata, // Use processed metadata (template metadata after variable substitution)
               createdAt: nowISO,    
               updatedAt: nowISO,
           };
           delete finalMetadata.parseError; // Ensure no parseError field from template remains

          // 7. Format and write the new file (check for existence)
          const fileContent = formatWithFrontMatter(finalMetadata, processedContent);
          await fs.writeFile(filePath, fileContent, { flag: 'wx' }); // Fail if exists

          console.error(`Created entry from template: ${filePath}`);

          // Return success message
          const fallbackIndicator = usedFallback ? ' (using fallback)' : '';
          return { content: [{ type: "text", text: `Successfully created '${type}/${finalFilename.replace(/\.md$/, '')}' from template '${templateName}'${fallbackIndicator}.` }] };

        } catch (error) {
          // Handle EEXIST specifically, as it occurs after filename calculation
          if (error.code === 'EEXIST') {
               // Determine filename used for error message (could be custom or timestamp-based)
               // finalFilename should be defined at this point
               const filenameForError = filename || finalFilename.replace(/\.md$/, ''); 
               return { content: [{ type: "text", text: `Error creating entry '${type}/${filenameForError}' from template '${templateName}': File already exists.` }] };
           }
           
          // For other errors (likely template read/parse errors), finalFilename might not be defined
          console.error(`Error creating entry from template '${templateName}':`, error);
          // Return a generic error related to template processing
          return { content: [{ type: "text", text: `Error creating from template '${templateName}': ${error.message}` }] };
        }
      }
    );
} 