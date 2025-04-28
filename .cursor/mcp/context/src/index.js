// Main entry point for the @context MCP server
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';

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

// --- Helper function to parse command line arguments ---
function getArgValue(argName) {
  const argIndex = process.argv.indexOf(argName);
  if (argIndex !== -1 && process.argv.length > argIndex + 1) {
    return process.argv[argIndex + 1];
  }
  return null;
}

// --- Configuration ---

/**
 * Path provided via the --context-data-path command line argument, if any.
 * @type {string | null}
 */
const providedContextPath = getArgValue('--context-data-path');

/**
 * The default directory name for context data, relative to the tool's root.
 * @type {string}
 */
const defaultContextDirName = '.cursor/context';

/**
 * The final resolved absolute path to the context data directory.
 * @type {string}
 */
let contextDataPath;

/**
 * A description of how the contextDataPath was determined (default or provided).
 * @type {string}
 */
let usingPathSource;

// Determine the root directory of this context tool based on the location of this script.
// This ensures paths are resolved correctly regardless of the current working directory (CWD).
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
/**
 * The root directory of the context tool.
 * Assumes the script (`index.js`) is in a `src` subdirectory of the tool's root.
 * Example: If script is at `/path/to/project/.cursor/mcp/context/src/index.js`,
 * `contextToolRoot` will be `/path/to/project/.cursor/mcp/context`.
 * @type {string}
 */
const contextToolRoot = path.resolve(__dirname, '..');

if (providedContextPath) {
  // Resolve the provided path relative to the context tool's root directory.
  // If the provided path is absolute, path.resolve will use it directly.
  contextDataPath = path.resolve(contextToolRoot, providedContextPath);
  usingPathSource = `provided via --context-data-path ('${providedContextPath}' relative to tool root: ${contextToolRoot})`;
} else {
  // Resolve the default path relative to the context tool's root directory.
  contextDataPath = path.resolve(contextToolRoot, defaultContextDirName);
  usingPathSource = `default ('${defaultContextDirName}' relative to tool root: ${contextToolRoot})`;
}

/**
 * The version of the @context MCP server.
 * @type {string}
 */
const serverVersion = "0.3.1";

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