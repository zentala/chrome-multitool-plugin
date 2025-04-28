import fs from 'fs/promises';
import path from 'path';
import yaml from 'js-yaml';

// Custom YAML type for Dates to ensure ISO string format without quotes
const dateYamlType = new yaml.Type('!date', {
  kind: 'scalar',
  instanceOf: Date,
  resolve: function (data) {
    // Check if data is a valid date string before considering it a match
    return !isNaN(new Date(data).getTime());
  },
  construct: function (data) {
    return new Date(data);
  },
  represent: function (date) {
    return date.toISOString(); // Convert Date object to ISO string
  }
});

const CUSTOM_SCHEMA = yaml.DEFAULT_SCHEMA.extend([dateYamlType]);

// Function to parse front matter and content from raw text
export const parseFrontMatter = (rawContent, filePathForErrorLogging) => {
    let metadata = {};
    let mainContent = rawContent;
    const frontMatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n?([\s\S]*)$/;
    const match = rawContent.match(frontMatterRegex);

    if (match && match[1]) {
      try {
        // Use CUSTOM_SCHEMA for loading if dates need special handling on load
        // For now, default load is likely sufficient
        metadata = yaml.load(match[1]) || {}; 
        mainContent = match[2] || '';
      } catch (yamlError) {
        console.error(`YAML parse error in ${filePathForErrorLogging}:`, yamlError.message);
        metadata = { parseError: `Failed to parse YAML: ${yamlError.message}` };
        // Keep mainContent as rawContent if YAML fails
      }
    } else if (rawContent.startsWith('---\n---')) {
      // Handle case where front matter is just delimiters
      metadata = {};
      mainContent = rawContent.substring(8).trimStart(); // Get content after the second ---
    } else {
      // No front matter delimiters found at all
      // metadata = { note: "No YAML front matter found in this file." }; // Option 1: Note
      metadata = {}; // Option 2: Empty object (current behavior)
    }
    return { metadata, mainContent };
};

// Function to format content with YAML Front Matter
export const formatWithFrontMatter = (metadata, content) => {
     // Use the custom schema to dump YAML
     const yamlString = yaml.dump(metadata, { 
         schema: CUSTOM_SCHEMA, 
         indent: 2, 
         skipInvalid: true 
        }); 
     return `---
${yamlString}---

${content}`;
};

// ... rest of the file ... 