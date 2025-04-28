// Tool to list available context types (directories)
server.tool(
  "list_context_types",
  // ... existing code ...
);

// Tool to create a new context entry
server.tool(
  "create_entry",
  "Creates a new context entry (file) of a specified type.",
  {
    type: z.string().min(1).describe("The type of context (e.g., 'todos', 'decisions'). Must match an existing directory name."),
    content: z.string().describe("The content of the entry to be saved."),
    filename: z.string().optional().describe("Optional filename (without extension, e.g., 'my_decision'). If not provided, a timestamp-based name will be generated."),
  },
  async ({ type, content, filename }) => {
    const typePath = path.join(contextDataPath, type);
    try {
      // 1. Validate type (check if directory exists)
      const stats = await fs.stat(typePath);
      if (!stats.isDirectory()) {
        throw new Error(`Context type '${type}' is not a valid directory.`);
      }

      // 2. Determine filename
      let finalFilename = "";
      if (filename) {
        // Basic sanitization (replace spaces, remove invalid chars - simplistic example)
        finalFilename = filename.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_-]/g, '') + ".md";
      } else {
        const now = new Date();
        const timestamp = now.toISOString().replace(/[:.]/g, '-'); // YYYY-MM-DDTHH-MM-SS-mmmZ
        finalFilename = `${timestamp}.md`;
      }
      const filePath = path.join(typePath, finalFilename);

      // 3. Write file
      await fs.writeFile(filePath, content, 'utf8');

      console.error(`Created entry: ${filePath}`); // Log to stderr for debugging

      // 4. Return success message
      return {
        content: [
          {
            type: "text",
            text: `Successfully created entry '${finalFilename}' in context type '${type}'.`,
          },
        ],
      };
    } catch (error) {
      console.error(`Error creating entry in type '${type}':`, error);
      // Return an error message in the MCP format
      return {
        content: [{
          type: "text",
          text: `Error creating entry: ${error.message}`
        }]
      };
    }
  }
);

// Tool to list entries within a context type
server.tool(
  "list_entries",
  "Lists all entries (filenames without extension) within a specified context type.",
  {
    type: z.string().min(1).describe("The type of context (directory name) to list entries from."),
  },
  async ({ type }) => {
    const typePath = path.join(contextDataPath, type);
    try {
      // 1. Validate type (check if directory exists)
      const stats = await fs.stat(typePath);
      if (!stats.isDirectory()) {
        throw new Error(`Context type '${type}' is not a valid directory.`);
      }

      // 2. Read directory contents
      const entries = await fs.readdir(typePath, { withFileTypes: true });
      const files = entries
        .filter(dirent => dirent.isFile() && dirent.name.endsWith('.md')) // Filter for .md files
        .map(dirent => dirent.name.replace(/\.md$/, '')); // Remove .md extension

      // 3. Return the list
      if (files.length === 0) {
         return {
            content: [
                { type: "text", text: `No entries found in context type '${type}'.` }
            ]
         };
      }

      return {
        content: [
          {
            type: "text",
            text: `Entries in '${type}':\n- ${files.join('\n- ')}`,
          },
        ],
      };
    } catch (error) {
      console.error(`Error listing entries in type '${type}':`, error);
      return {
        content: [{
          type: "text",
          text: `Error listing entries: ${error.message}`
        }]
      };
    }
  }
);

// Tool to read a specific context entry
server.tool(
  "read_entry",
  "Reads the content of a specific entry (file) within a context type.",
  {
    type: z.string().min(1).describe("The type of context (directory name)." ),
    id: z.string().min(1).describe("The ID (filename without .md extension) of the entry to read."),
  },
  async ({ type, id }) => {
    const typePath = path.join(contextDataPath, type);
    const filePath = path.join(typePath, `${id}.md`); // Append .md extension

    try {
      // 1. Validate type directory exists (optional, but good practice)
      try {
          const typeStats = await fs.stat(typePath);
          if (!typeStats.isDirectory()) {
              throw new Error(`Context type '${type}' is not a valid directory.`);
          }
      } catch (err) {
           // If stat fails, directory likely doesn't exist
           if (err.code === 'ENOENT') {
                throw new Error(`Context type directory '${type}' not found.`);
           } 
           throw err; // Re-throw other stat errors
      }

      // 2. Read the file content
      const content = await fs.readFile(filePath, 'utf8');

      // 3. Return the content
      return {
        content: [
          {
            type: "text",
            text: content,
          },
        ],
      };
    } catch (error) {
      console.error(`Error reading entry '${id}' in type '${type}':`, error);
      // Handle specific file not found error
      if (error.code === 'ENOENT') {
        return {
            content: [{ type: "text", text: `Error: Entry '${id}' not found in context type '${type}'.` }]
        };
      }
      // Return generic error message for other errors
      return {
        content: [{
          type: "text",
          text: `Error reading entry: ${error.message}`
        }]
      };
    }
  }
);

// Tool to search within context entries
server.tool(
  "search_entries",
  "Searches for text within context entries. Can search across all types or a specific type.",
  {
    query: z.string().min(1).describe("The text to search for (case-insensitive)." ),
    type: z.string().optional().describe("Optional context type (directory name) to limit the search to."),
  },
  async ({ query, type }) => {
    const results = [];
    const queryLower = query.toLowerCase();
    let searchDirs = [];

    try {
      // 1. Determine directories to search
      if (type) {
        const typePath = path.join(contextDataPath, type);
        try {
            const stats = await fs.stat(typePath);
            if (!stats.isDirectory()) {
               throw new Error(`Specified context type '${type}' is not a valid directory.`);
            }
            searchDirs.push({ name: type, path: typePath });
        } catch (err) {
             if (err.code === 'ENOENT') {
                throw new Error(`Specified context type directory '${type}' not found.`);
             } 
             throw err;
        }
      } else {
        // Search all directories in contextDataPath
        const allEntries = await fs.readdir(contextDataPath, { withFileTypes: true });
        searchDirs = allEntries
          .filter(dirent => dirent.isDirectory())
          .map(dirent => ({ name: dirent.name, path: path.join(contextDataPath, dirent.name) }));
      }

      if (searchDirs.length === 0) {
        return { content: [{ type: "text", text: "No context types found to search in." }] };
      }

      // 2. Iterate through directories and files
      for (const dir of searchDirs) {
        try {
            const files = await fs.readdir(dir.path, { withFileTypes: true });
            for (const file of files) {
              if (file.isFile() && file.name.endsWith('.md')) {
                const filePath = path.join(dir.path, file.name);
                try {
                  const content = await fs.readFile(filePath, 'utf8');
                  if (content.toLowerCase().includes(queryLower)) {
                    const id = file.name.replace(/\.md$/, '');
                    results.push(`${dir.name}/${id}`);
                  }
                } catch (readError) {
                  console.error(`Error reading file ${filePath} during search:`, readError);
                  // Optionally skip this file or add an error marker to results
                }
              }
            }
        } catch (dirReadError) {
             console.error(`Error reading directory ${dir.path} during search:`, dirReadError);
             // Optionally skip this directory
        }
      }

      // 3. Format and return results
      if (results.length === 0) {
        return {
          content: [{
            type: "text",
            text: `No entries found matching "${query}"${type ? ` in type '${type}'` : ''}.`,
          }],
        };
      }

      return {
        content: [
          {
            type: "text",
            text: `Found ${results.length} entr${results.length === 1 ? 'y' : 'ies'} matching "${query}":\n- ${results.join('\n- ')}`,
          },
        ],
      };

    } catch (error) {
      console.error(`Error during search for "${query}":`, error);
      return {
        content: [{
          type: "text",
          text: `Error during search: ${error.message}`
        }]
      };
    }
  }
);

// --- TODO: Add more tools ---

// --- Server Startup ---
async function main() {
  try {
    // Ensure the base context data directory exists
    await fs.mkdir(contextDataPath, { recursive: true });
    console.error(`Context data directory: ${contextDataPath}`);

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