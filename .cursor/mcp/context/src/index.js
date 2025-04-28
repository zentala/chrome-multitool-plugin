// Main entry point for the @context MCP server
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import path from 'path';
import fs from 'fs/promises';

// Import tool registration functions
import { registerListContextTypesTool } from './tools/listContextTypes.js';
import { registerCreateEntryTool } from './tools/createEntry.js';
import { registerListEntriesTool } from './tools/listEntries.js';
import { registerReadEntryTool } from './tools/readEntry.js';
import { registerSearchEntriesTool } from './tools/searchEntries.js';
import { registerUpdateEntryTool } from './tools/updateEntry.js';
import { registerDeleteEntryTool } from './tools/deleteEntry.js';
import { registerGetRelatedEntriesTool } from './tools/getRelatedEntries.js';
import { registerCreateFromTemplateTool } from './tools/createFromTemplate.js';

// --- Configuration ---
// Define the base path for context data relative to the workspace root
const contextDataPath = path.resolve(process.cwd(), '.cursor', 'context'); 
const serverVersion = "0.3.0"; // Incremented version after refactor

// --- MCP Server Setup ---
const server = new McpServer({
  name: "@context", 
  version: serverVersion,
  description: `Manages context data (.cursor/context). Version ${serverVersion}.`, 
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

// --- Server Startup ---
async function main() {
  try {
    // Ensure the base context data directory exists at startup
    await fs.mkdir(contextDataPath, { recursive: true }); 
    // Ensure the _templates subdirectory exists
    await fs.mkdir(path.join(contextDataPath, '_templates'), { recursive: true });
    
    console.error(`Context data directory target: ${contextDataPath}`);
    
    const transport = new StdioServerTransport();
    await server.connect(transport);
    
    console.error(`MCP Server "@context" v${server.version} running on stdio.`);
    // Use internal property instead of potentially problematic getter
    console.error("Registered tools:", Object.keys(server._registeredTools).join(', ')); 
    console.error("Waiting for requests from Cursor...");
  } catch (error) {
    console.error("Fatal error starting @context MCP server:", error);
    process.exit(1);
  }
}

main(); 