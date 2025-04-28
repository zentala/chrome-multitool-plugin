// src/config.js
// Handles configuration loading and path resolution for the @context MCP server.

import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises'; // Needed for reading package.json

// --- Helper function to parse command line arguments ---
/**
 * Retrieves the value of a command line argument.
 * @param {string} argName The name of the argument (e.g., '--context-data-path').
 * @returns {string | null} The value of the argument or null if not found.
 */
function getArgValue(argName) {
  const argIndex = process.argv.indexOf(argName);
  if (argIndex !== -1 && process.argv.length > argIndex + 1) {
    return process.argv[argIndex + 1];
  }
  return null;
}

// --- Configuration Values ---

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
 * Assumes this script (`config.js`) is in the `src` subdirectory of the tool's root.
 * Example: If script is at `/path/to/project/.cursor/mcp/context/src/config.js`,
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
 * Reads the version from the package.json located in the tool's root directory.
 * Provides a fallback version if reading or parsing fails.
 * @returns {Promise<string>} The server version.
 */
async function readServerVersion() {
  const packageJsonPath = path.join(contextToolRoot, 'package.json');
  try {
    const packageJsonContent = await fs.readFile(packageJsonPath, 'utf-8');
    const packageJson = JSON.parse(packageJsonContent);
    if (packageJson.version) {
      return packageJson.version;
    } else {
      console.error(`Warning: package.json at ${packageJsonPath} found but missing "version" field. Using fallback.`);
      return '0.0.0-missing-version';
    }
  } catch (error) {
    console.error(`Warning: Could not read version from ${packageJsonPath}. Using fallback. Error: ${error.message}`);
    return '0.0.0-read-error'; // Fallback version on error
  }
}

/**
 * The version of the @context MCP server, read from package.json.
 * @type {string}
 */
const serverVersion = await readServerVersion();

export {
  contextDataPath,
  usingPathSource,
  serverVersion,
  contextToolRoot // Exporting this might be useful if other modules need the root path
}; 