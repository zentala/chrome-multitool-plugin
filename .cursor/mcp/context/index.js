// MCP Context Server v0.2.0 - Full Replacement
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import fs from 'fs/promises'; // For file system operations
import path from 'path'; // For handling paths
import { fileURLToPath } from 'url'; // To get __dirname in ES modules
import yaml from 'js-yaml'; // Import js-yaml

// Helper to get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename); 

// Define the base path for context data relative to the workspace root
// User moved data to .cursor/context
const contextDataPath = path.resolve(process.cwd(), '.cursor', 'context'); 

// --- MCP Server Setup ---
const server = new McpServer({
  name: "@context", 
  version: "0.2.0", // Incremented version after significant changes
  description: "Manages contextual data (todos, decisions, etc.) using files with YAML front matter.",
});

// --- Utility Functions ---

// Function to parse front matter and content from raw text
const parseFrontMatter = (rawContent, filePathForErrorLogging) => {
    let metadata = {};
    let mainContent = rawContent;
    const frontMatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n?([\s\S]*)$/;
    const match = rawContent.match(frontMatterRegex);

    if (match && match[1]) {
      try {
        metadata = yaml.load(match[1]) || {};
        mainContent = match[2] || '';
      } catch (yamlError) {
        console.error(`YAML parse error in ${filePathForErrorLogging}:`, yamlError.message);
        metadata = { parseError: `Failed to parse YAML: ${yamlError.message}` };
        // Keep mainContent as rawContent if YAML fails
      }
    } else {
      // No front matter
      metadata = {}; // Represent lack of metadata cleanly
    }
    return { metadata, mainContent };
};

// Function to format content with YAML Front Matter
const formatWithFrontMatter = (metadata, content) => {
     const yamlString = yaml.dump(metadata, { indent: 2, skipInvalid: true }); // Skip invalid data
     return `---
${yamlString}---

${content}`;
};

// Function to get the full path and validate it
const getValidatedFilePath = async (type, id) => {
    const typePath = path.join(contextDataPath, type);
    const filePath = path.join(typePath, `${id}.md`);

    // Validate type directory exists
    try {
        const typeStats = await fs.stat(typePath);
        if (!typeStats.isDirectory()) {
            throw new Error(`Context path for type '${type}' is not a valid directory.`);
        }
    } catch (err) {
        if (err.code === 'ENOENT') {
             throw new Error(`Context type directory '${type}' not found.`);
        } 
        throw err; // Re-throw other stat errors
    }

    // Validate file exists
    try {
         await fs.access(filePath, fs.constants.R_OK); // Check read access
    } catch (err) {
         if (err.code === 'ENOENT') {
              throw new Error(`Entry '${id}' not found in context type '${type}'.`);
         }
         throw err; // Re-throw other access errors
    }
    
    return filePath;
};

// --- Tool Definitions ---

// Tool to list available context types (directories)
server.tool(
  "list_context_types",
  "Lists the available types of context data (directories).",
  {},
  async () => {
    try {
      await fs.access(contextDataPath); // Check if base directory exists
      const entries = await fs.readdir(contextDataPath, { withFileTypes: true });
      const directories = entries.filter(d => d.isDirectory()).map(d => d.name);
      if (directories.length === 0) return { content: [{ type: "text", text: "No context types (directories) found." }] };
      return { content: [{ type: "text", text: `Available context types:\n- ${directories.join('\n- ')}` }] };
    } catch (error) {
      if (error.code === 'ENOENT') return { content: [{ type: "text", text: "Context data directory does not exist." }] };
      console.error("Error listing context types:", error);
      return { content: [{ type: "text", text: `Error: ${error.message}` }] };
    }
  }
);

// Tool to create a new context entry
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

// Tool to list entries within a context type
server.tool(
  "list_entries",
  "Lists entries within a type. Optionally includes basic metadata.",
  {
    type: z.string().min(1).describe("Context type (directory name)." ),
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

// Tool to read a specific context entry
server.tool(
  "read_entry",
  "Reads the content and metadata (YAML Front Matter) of a specific entry.",
  {
    type: z.string().min(1).describe("Context type (directory name)."),
    id: z.string().min(1).describe("ID (filename without .md extension)." ),
  },
  async ({ type, id }) => {
    try {
      const filePath = await getValidatedFilePath(type, id); // Use helper for validation
      const rawContent = await fs.readFile(filePath, 'utf8');
      const { metadata, mainContent } = parseFrontMatter(rawContent, filePath);
      const metadataString = yaml.dump(metadata); 

      return {
        content: [
          {
            type: "text",
            text: `--- METADATA ---
${metadataString}
--- CONTENT ---
${mainContent.trim()}`,
          },
        ],
      };
    } catch (error) {
      console.error(`Error reading entry '${type}/${id}':`, error);
      return { content: [{ type: "text", text: `Error reading entry: ${error.message}` }] }; // Simplified error
    }
  }
);

// Tool to search within context entries
server.tool(
  "search_entries",
  "Searches within context entries, optionally filtering by metadata (tags, status).",
  {
    query: z.string().min(1).describe("Text to search for in content (case-insensitive)." ),
    type: z.string().optional().describe("Optional context type to limit search."),
    filterTags: z.string().optional().describe("Comma-separated tags; entry must have ALL."),
    filterStatus: z.string().optional().describe("Filter by specific status."),
  },
  async ({ query, type, filterTags, filterStatus }) => {
    const results = [];
    const queryLower = query.toLowerCase();
    const requiredTags = filterTags ? filterTags.split(',').map(t => t.trim().toLowerCase()).filter(t => t) : [];
    const requiredStatus = filterStatus ? filterStatus.trim().toLowerCase() : null;
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
           searchDirs = allEntries.filter(d => d.isDirectory()).map(d => ({ name: d.name, path: path.join(contextDataPath, d.name) }));
         } catch (accessError) {
           if (accessError.code === 'ENOENT') return { content: [{ type: "text", text: "Context data directory does not exist." }] };
           throw accessError;
         }
      }
      if (searchDirs.length === 0) return { content: [{ type: "text", text: "No context types found to search in." }] };

      // Iterate, parse, filter, search
      for (const dir of searchDirs) {
        try {
          const files = await fs.readdir(dir.path, { withFileTypes: true });
          for (const file of files) {
            if (file.isFile() && file.name.endsWith('.md')) {
              const filePath = path.join(dir.path, file.name);
              try {
                const rawContent = await fs.readFile(filePath, 'utf8');
                const { metadata, mainContent } = parseFrontMatter(rawContent, filePath);

                // Apply metadata filters
                let metadataMatch = true;
                if (metadata.parseError && (requiredTags.length > 0 || requiredStatus)) {
                    metadataMatch = false; // Cannot match if parse failed
                } else if (!metadata.parseError) {
                    if (requiredStatus && (!metadata.status || String(metadata.status).toLowerCase() !== requiredStatus)) {
                        metadataMatch = false;
                    }
                    if (metadataMatch && requiredTags.length > 0) {
                         const entryTags = Array.isArray(metadata.tags) ? metadata.tags.map(t => String(t).toLowerCase()) : [];
                         if (!requiredTags.every(reqTag => entryTags.includes(reqTag))) {
                             metadataMatch = false;
                         }
                    }
                }

                // Apply text query if metadata matches
                if (metadataMatch && mainContent.toLowerCase().includes(queryLower)) {
                  results.push(`${dir.name}/${file.name.replace(/\.md$/, '')}`);
                }
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
      return { content: [{ type: "text", text: `Found ${results.length} entr${results.length === 1 ? 'y' : 'ies'} ${searchCriteriaDescription}:\n- ${results.join('\n- ')}` }] };

    } catch (error) {
      console.error(`Error during search for "${query}":`, error);
      return { content: [{ type: "text", text: `Error during search: ${error.message}` }] };
    }
  }
);

// Tool to update an existing context entry
server.tool(
  "update_entry",
  "Updates an existing entry. Provide content and/or metadata fields to change.",
  {
    type: z.string().min(1).describe("Context type (directory name)."),
    id: z.string().min(1).describe("ID (filename without .md extension) of the entry to update."),
    content: z.string().optional().describe("New main Markdown content. If omitted, content remains unchanged."),
    metadata: z.record(z.any()).optional().describe("Object with metadata fields to update/add. Fields not provided are unchanged."),
  },
  async ({ type, id, content, metadata: metadataUpdates }) => {
    try {
      const filePath = await getValidatedFilePath(type, id); // Validates existence
      const rawContent = await fs.readFile(filePath, 'utf8');
      const { metadata: existingMetadata, mainContent: existingContent } = parseFrontMatter(rawContent, filePath);

      if (existingMetadata.parseError) {
           throw new Error(`Cannot update entry with invalid YAML front matter: ${existingMetadata.parseError}`);
      }

      // Prepare updated data
      const finalContent = content !== undefined ? content : existingContent;
      const updatedMetadata = { 
          ...existingMetadata,
          ...(metadataUpdates || {}), // Merge updates, overwriting existing keys if provided
          updatedAt: new Date().toISOString(), // Always update this timestamp
       };
       // Ensure createdAt is preserved if it existed
       if (existingMetadata.createdAt && !updatedMetadata.createdAt) {
           updatedMetadata.createdAt = existingMetadata.createdAt;
       }

      // Format and write back
      const fileContent = formatWithFrontMatter(updatedMetadata, finalContent);
      await fs.writeFile(filePath, fileContent, 'utf8'); // Overwrite existing file

      console.error(`Updated entry: ${filePath}`);
      return { 
          content: [{ 
              type: "text", 
              text: `Successfully updated entry '${type}/${id}'.` 
          }] 
      };

    } catch (error) {
      console.error(`Error updating entry '${type}/${id}':`, error);
      return { content: [{ type: "text", text: `Error updating entry: ${error.message}` }] };
    }
  }
);

// Tool to delete an existing context entry
server.tool(
  "delete_entry",
  "Deletes a specific context entry (file).",
  {
    type: z.string().min(1).describe("Context type (directory name)."),
    id: z.string().min(1).describe("ID (filename without .md extension) of the entry to delete."),
  },
  async ({ type, id }) => {
    try {
      const filePath = await getValidatedFilePath(type, id); // Validates existence before attempting delete
      
      await fs.unlink(filePath); // Delete the file

      console.error(`Deleted entry: ${filePath}`);
      return { 
          content: [{ 
              type: "text", 
              text: `Successfully deleted entry '${type}/${id}'.` 
          }] 
      };

    } catch (error) {
       // getValidatedFilePath handles file not found errors already
      console.error(`Error deleting entry '${type}/${id}':`, error);
      return { content: [{ type: "text", text: `Error deleting entry: ${error.message}` }] };
    }
  }
);

// Tool to get related entries mentioned in an entry's metadata
server.tool(
  "get_related_entries",
  "Retrieves a list of entries mentioned in the 'related' field of a specific entry's metadata.",
  {
    type: z.string().min(1).describe("Context type of the source entry."),
    id: z.string().min(1).describe("ID of the source entry whose related entries to find."),
  },
  async ({ type, id }) => {
    try {
      const filePath = await getValidatedFilePath(type, id); // Validate source entry exists
      const rawContent = await fs.readFile(filePath, 'utf8');
      const { metadata } = parseFrontMatter(rawContent, filePath);

      if (metadata.parseError) {
          throw new Error(`Source entry has invalid YAML front matter: ${metadata.parseError}`);
      }

      if (!metadata.related || !Array.isArray(metadata.related) || metadata.related.length === 0) {
         return { content: [{ type: "text", text: `Entry '${type}/${id}' has no 'related' entries specified in its metadata.` }] };
      }

      const relatedLinks = metadata.related;
      const foundRelated = [];
      const notFound = [];
      const invalidFormat = [];
      const linkRegex = /^([a-zA-Z0-9_-]+)\/([a-zA-Z0-9_-]+(?:\.md)?)$/; // type/id or type/id.md

      for (const link of relatedLinks) {
          if (typeof link !== 'string') {
              invalidFormat.push(String(link));
              continue;
          }
          
          const match = link.match(linkRegex);
          if (!match) {
              invalidFormat.push(link);
              continue;
          }

          const relatedType = match[1];
          const relatedId = match[2].replace(/\.md$/, ''); // Remove .md if present

          try {
              // Check if the related file actually exists
              await getValidatedFilePath(relatedType, relatedId); 
              foundRelated.push(`${relatedType}/${relatedId}`);
          } catch (error) {
              // If getValidatedFilePath throws (likely ENOENT), the related file doesn't exist
              if (error.message.includes('not found')) { // Check error message for robustness
                   notFound.push(link);
              } else {
                   console.error(`Unexpected error validating related link '${link}':`, error); 
                   notFound.push(`${link} (validation error)`); // Mark as not found with error note
              }
          }
      }
      
      let responseText = `Related entries for '${type}/${id}':\n`;
      if (foundRelated.length > 0) {
           responseText += foundRelated.map(f => `- ${f}`).join('\n');
      } else {
           responseText += "(None found or valid)";
      }
      
      if (notFound.length > 0) {
           responseText += `\n\nCould not find:\n- ${notFound.join('\n- ')}`;
      }
       if (invalidFormat.length > 0) {
           responseText += `\n\nInvalid format links skipped:\n- ${invalidFormat.join('\n- ')}`;
      }

      return { content: [{ type: "text", text: responseText }] };

    } catch (error) {
      console.error(`Error getting related entries for '${type}/${id}':`, error);
      return { content: [{ type: "text", text: `Error getting related entries: ${error.message}` }] };
    }
  }
);

// Tool to create an entry from a template
server.tool(
  "create_from_template",
  "Creates a new context entry from a template file, filling placeholders.",
  {
    templateName: z.string().min(1).describe("Name of the template file in _templates/ (without .md extension)." ),
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
// --- Server Startup ---
async function main() {
  try {
    await fs.mkdir(contextDataPath, { recursive: true }); 
    console.error(`Context data directory target: ${contextDataPath}`);
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error(`MCP Server "@context" v${server.version} running on stdio.`);
    console.error("Waiting for requests from Cursor...");
  } catch (error) {
    console.error("Fatal error starting @context MCP server:", error);
    process.exit(1);
  }
}

main();
