# @context MCP Server

This is a Model Context Protocol (MCP) server designed to run within the Cursor IDE environment.
It provides tools for managing and accessing contextual information stored in a local directory (typically `.cursor/context` within your workspace).

This allows AI features within Cursor to interact with project-specific notes, decisions, tasks, knowledge base entries, etc., stored in a structured markdown format.

## Features

*   **Context Storage:** Manages markdown files within a specified directory, organized by "context type" subdirectories.
*   **MCP Interface:** Exposes context management operations via the Model Context Protocol.
*   **Tools:** Provides various tools for AI interaction:
    *   `listContextTypes`: Lists available context types (subdirectories).
    *   `createEntry`: Creates a new markdown entry in a specified type.
    *   `listEntries`: Lists entries within a type, optionally including metadata.
    *   `readEntry`: Reads the content and metadata of a specific entry.
    *   `updateEntry`: Updates the content and/or metadata of an entry.
    *   `deleteEntry`: Deletes an entry.
    *   `searchEntries`: Searches content and metadata across entries, with filtering options.
    *   `getRelatedEntries`: Finds entries linked via the `related` field in front matter.
    *   `createFromTemplate`: Creates a new entry based on a template file.

## Installation & Setup

(To be detailed - likely involves placement within the `.cursor/mcp/` directory structure)

## Usage

This server is typically launched automatically by Cursor when needed.

It can also be run manually for development or testing:

```bash
node src/index.js [--context-data-path path/to/your/context/dir]
```

*   `--context-data-path`: (Optional) Specifies the directory containing the context data. If omitted, it defaults to `./.cursor/context` relative to the location of *this* project (the `@context` server itself).

## Development

*   Install dependencies: `pnpm install`
*   Run tests: `pnpm test`
*   Run tests with coverage: `pnpm run test:coverage` (Note: coverage output is ignored by git) 