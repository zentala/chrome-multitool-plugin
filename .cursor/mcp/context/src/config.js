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
 * The default directory name for context data, relative to the current working directory.
 * @type {string}
 */
const defaultContextDirName = '.cursor/context';

/**
 * The final resolved absolute path to the context data directory.
 * Resolved relative to the current working directory (CWD).
 * @type {string}
 */
let contextDataPath;

/**
 * A description of how the contextDataPath was determined (default or provided).
 * @type {string}
 */
let usingPathSource;

// Determine the root directory of this context tool itself (used for finding example templates).
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
/**
 * The root directory of the @context MCP tool itself.
 * Used primarily for locating fallback resources like example templates.
 * @type {string}
 */
const contextToolRoot = path.resolve(__dirname, '..'); // Keep this for fallback templates

// --- Resolve contextDataPath ---
// Both default and provided paths are resolved relative to the Current Working Directory (CWD)
// This allows the server to operate on the project from which it was launched,
// unless a specific absolute path is provided via the argument.
if (providedContextPath) {
  contextDataPath = path.resolve(process.cwd(), providedContextPath);
  usingPathSource = `provided via --context-data-path ('${providedContextPath}' relative to CWD: ${process.cwd()})`;
} else {
  contextDataPath = path.resolve(process.cwd(), defaultContextDirName);
  usingPathSource = `default ('${defaultContextDirName}' relative to CWD: ${process.cwd()})`;
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
  contextToolRoot // Keep exporting this for fallback template path calculation
}; 