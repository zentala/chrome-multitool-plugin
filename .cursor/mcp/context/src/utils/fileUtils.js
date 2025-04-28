import fs from 'fs/promises';
import path from 'path';
import yaml from 'js-yaml';
import matter from 'gray-matter'; // Import gray-matter

// Custom YAML type for Dates to ensure ISO string format without quotes
// Still needed for stringify if we want specific date format
const dateYamlType = new yaml.Type('!date', {
  kind: 'scalar',
  instanceOf: Date,
  resolve: function (data) { return !isNaN(new Date(data).getTime()); },
  construct: function (data) { return new Date(data); },
  represent: function (date) { return date.toISOString(); }
});

const CUSTOM_SCHEMA = yaml.DEFAULT_SCHEMA.extend([dateYamlType]);

/**
 * Parses YAML front matter and content from a raw string using gray-matter.
 *
 * @param {string} rawContent - The raw string content, potentially containing front matter.
 * @param {string} [filePathForErrorLogging='unknown file'] - The path of the file being parsed, used for logging errors.
 * @returns {{metadata: object, mainContent: string}} An object containing the parsed metadata (or an empty object/
 *                                                     parseError object) and the main content string (trimmed of leading newline).
 */
export const parseFrontMatter = (rawContent, filePathForErrorLogging = 'unknown file') => {
    try {
        // gray-matter handles parsing YAML and separating content
        const parsed = matter(rawContent, {
            // Use js-yaml engine explicitly, though it's default
            engines: {
              yaml: {
                parse: (str) => yaml.load(str, { schema: CUSTOM_SCHEMA }), // Ensure our schema is used if needed for parsing specific types
                // Stringify definition is not needed here for parsing
              }
            }
        });

        // Trim leading newline from content, as gray-matter might leave it
        const mainContent = parsed.content.startsWith('\n') ? parsed.content.slice(1) : parsed.content;

        // Return structure consistent with previous implementation
        return {
            metadata: parsed.data || {}, // Parsed front matter data, default to empty object if none
            mainContent: mainContent // Trimmed content after front matter
        };
    } catch (error) {
        // Handle potential parsing errors (e.g., invalid YAML)
        console.error(`YAML parse error in ${filePathForErrorLogging} using gray-matter:`, error.message);
        // Return structure consistent with previous error handling
        return {
            metadata: { parseError: `Failed to parse YAML: ${error.message}` },
            mainContent: rawContent // On error, return original content
        };
    }
};

/**
 * Formats metadata and content into a string with YAML front matter.
 *
 * Uses js-yaml directly for precise control over formatting and custom types (like Date).
 *
 * @param {object | null | undefined} metadata - The metadata object to format as YAML.
 * @param {string} content - The main content string.
 * @returns {string} The combined string with YAML front matter and content, formatted according to expectations
 *                   (e.g., two newlines between front matter and content if content exists).
 */
export const formatWithFrontMatter = (metadata, content) => {
     // If metadata is null or empty, return just the content (consistent with old behavior)
     if (!metadata || Object.keys(metadata).length === 0) {
        return content;
     }

     // Use js-yaml directly to dump metadata with custom schema
     const yamlString = yaml.dump(metadata, {
         schema: CUSTOM_SCHEMA,
         indent: 2,
         skipInvalid: true,
         noCompatMode: true // Attempt to force plain scalar for date
     });

     // Manually construct the final string to have full control over spacing
     // Test expects TWO newlines if content exists
     const separator = content && content.length > 0 ? '\n\n' : ''; // Add TWO newlines only if content exists
     return `---
${yamlString.trim()}
---${separator}${content}`;
 };

/**
 * Gets the full path to a context entry file and validates its existence and read access.
 *
 * @param {string} contextDataPath - The base path to the context data directory.
 * @param {string} type - The context type (subdirectory name).
 * @param {string} id - The entry ID (filename without extension).
 * @returns {Promise<string>} A promise that resolves with the validated full file path.
 * @throws {Error} Throws an error if the type directory or entry file doesn't exist, 
 *                 is not accessible, or if the type path is not a directory.
 */
export const getValidatedFilePath = async (contextDataPath, type, id) => {
    const typePath = path.join(contextDataPath, type);
    const filePath = path.join(typePath, `${id}.md`);

    // Validate type directory exists
    try {
        const typeStats = await fs.stat(typePath);
        if (!typeStats.isDirectory()) {
            throw new Error(`Context path for type '${type}' is not a valid directory.`);
        }
    } catch (err) {
        if (err.code === 'ENOENT') {
             throw new Error(`Context type directory '${type}' not found.`);
        }
        throw err; // Re-throw other stat errors
    }

    // Validate file exists and is readable
    try {
         await fs.access(filePath, fs.constants.R_OK); // Check read access
    } catch (err) {
         if (err.code === 'ENOENT') {
              throw new Error(`Entry '${id}' not found in context type '${type}'.`);
         }
         throw err; // Re-throw other access errors
    }

    return filePath;
}; 