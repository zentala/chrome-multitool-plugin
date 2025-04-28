import { z } from "zod";
import fs from 'fs/promises';
import path from 'path';

/**
 * Registers the init tool with the MCP server.
 * This tool ensures the main context data directory exists.
 * Specific type directories within the context path will be created by other tools as needed.
 */
export function registerInitTool(server, contextDataPath) {
    server.tool(
      "init",
      "Ensures the main context data directory exists.",
      {}, // No input schema needed for init
      async () => {
        const messages = [];
        const errors = [];

        try {
          // Ensure the main context data directory exists
          await fs.mkdir(contextDataPath, { recursive: true });
          messages.push(`Ensured context data directory exists: ${contextDataPath}`);

          // Construct result message
          let resultText = "Context directory check complete.\n" + messages.join('\n');
          if (errors.length > 0) { // Although no errors are currently pushed, keep structure for future
              resultText += "\n\nErrors encountered:\n" + errors.join('\n');
          }

          return { content: [{ type: "text", text: resultText }] };

        } catch (error) {
          // Catch errors during directory creation
          const errorMsg = `Failed to ensure context data directory: ${error.message}`;
          console.error(errorMsg, error);
          return { content: [{ type: "text", text: errorMsg }] };
        }
      }
    );
} 