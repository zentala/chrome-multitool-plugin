import { z } from "zod";
import fs from 'fs/promises';
import path from 'path';

/**
 * Registers the overview tool with the MCP server.
 * This tool provides a summary of the context structure (types and entry counts).
 */
export function registerOverviewTool(server, contextDataPath) {
    server.tool(
      "overview",
      "Provides an overview of the context data structure: lists types and entry counts.",
      {},
      async () => {
        const overview = {
            types: [],
            // TODO: Consider adding total entry count or unique tags in the future
        };
        const errors = [];

        try {
          const entries = await fs.readdir(contextDataPath, { withFileTypes: true });
          
          for (const entry of entries) {
            if (entry.isDirectory() && !entry.name.startsWith('_')) {
              const typeName = entry.name;
              const typePath = path.join(contextDataPath, typeName);
              let entryCount = 0;
              try {
                const files = await fs.readdir(typePath);
                // Count only markdown files, potential improvement: check if isFile()
                entryCount = files.filter(file => file.endsWith('.md')).length;
                overview.types.push({ name: typeName, entryCount });
              } catch (readDirError) {
                 errors.push(`Error reading directory for type '${typeName}': ${readDirError.message}`);
                 // Add type with count 0 or null to indicate listing issue?
                 overview.types.push({ name: typeName, entryCount: null, error: readDirError.message }); 
              }
            }
          }

          const response = { overview };
          if (errors.length > 0) {
            response.warnings = errors;
          }
          return { content: [{ type: "json", json: response }] };

        } catch (error) {
          if (error.code === 'ENOENT') {
              return { content: [{ type: "json", json: { error: `Context directory not found at ${contextDataPath}. Consider running 'init'.` } }] };
          }
          console.error("Error getting context overview:", error);
          return { content: [{ type: "json", json: { error: `Failed to get context overview: ${error.message}` } }] };
        }
      }
    );
} 