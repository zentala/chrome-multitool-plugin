import fs from 'fs/promises';
import path from 'path';

export function registerListContextTypesTool(server, contextDataPath) {
    server.tool(
      "list_context_types",
      "Lists the available types of context data (directories).",
      {},
      async () => {
        try {
          await fs.access(contextDataPath); // Check if base directory exists
          const entries = await fs.readdir(contextDataPath, { withFileTypes: true });
          const directories = entries.filter(d => d.isDirectory() && !d.name.startsWith('_')).map(d => d.name); // Exclude dirs starting with _
          if (directories.length === 0) return { content: [{ type: "text", text: "No context types (directories) found." }] };
          return { content: [{ type: "text", text: `Available context types:\n- ${directories.join('\n- ')}` }] };
        } catch (error) {
          if (error.code === 'ENOENT') return { content: [{ type: "text", text: "Context data directory does not exist." }] };
          console.error("Error listing context types:", error);
          return { content: [{ type: "text", text: `Error: ${error.message}` }] };
        }
      }
    );
} 