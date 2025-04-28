// Main entry point for the @context MCP server
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import path from 'path';
import fs from 'fs/promises';

// Import configuration
import { contextDataPath, usingPathSource, serverVersion } from './config.js';

// Import tool registration functions from the central index file
import {
  registerListContextTypesTool,
  registerCreateEntryTool,
  registerListEntriesTool,
  registerReadEntryTool,
  registerSearchEntriesTool,
  registerUpdateEntryTool,
  registerDeleteEntryTool,
  registerGetRelatedEntriesTool,
  registerCreateFromTemplateTool,
  registerCreateTypeWithTemplateTool,
  registerOverviewTool,
  registerInitTool
} from './tools/index.js';

// --- MCP Server Setup ---
const server = new McpServer({
  name: "@context",
  version: serverVersion,
  description: `Manages context data (${usingPathSource}). Version ${serverVersion}.`,
});

// --- Register All Tools ---
registerListContextTypesTool(server, contextDataPath);
registerCreateEntryTool(server, contextDataPath);
registerListEntriesTool(server, contextDataPath);
registerReadEntryTool(server, contextDataPath);
registerSearchEntriesTool(server, contextDataPath);
registerUpdateEntryTool(server, contextDataPath);
registerDeleteEntryTool(server, contextDataPath);
registerGetRelatedEntriesTool(server, contextDataPath);
registerCreateFromTemplateTool(server, contextDataPath);
registerCreateTypeWithTemplateTool(server, contextDataPath);
registerOverviewTool(server, contextDataPath);
registerInitTool(server, contextDataPath);

// --- Server Startup ---
async function main() {
  try {
    // Ensure the base context data directory exists at startup
    console.error(`Attempting to use context data path: ${contextDataPath} (${usingPathSource})`);
    await fs.mkdir(contextDataPath, { recursive: true });
    // Ensure the _templates subdirectory exists within the context data path
    await fs.mkdir(path.join(contextDataPath, '_templates'), { recursive: true });

    console.error(`Context data directory target: ${contextDataPath}`);

    const transport = new StdioServerTransport();
    await server.connect(transport);

    console.error(`MCP Server "@context" v${server.version} running on stdio.`);
    // Use internal property instead of potentially problematic getter
    console.error("Registered tools:", Object.keys(server._registeredTools).join(', '));
    console.error("Waiting for requests from Cursor...");
  } catch (error) {
    console.error(`Fatal error starting @context MCP server (using path: ${contextDataPath})`, error);
    process.exit(1);
  }
}

main(); 