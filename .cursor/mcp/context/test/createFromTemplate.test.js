import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import path from 'path';
import fs from 'fs/promises';
import { registerCreateFromTemplateTool } from '../src/tools/createFromTemplate.js';
import * as fileUtils from '../src/utils/fileUtils.js';

// Mock dependencies
vi.mock('fs/promises');
// Mock only specific fileUtils functions if needed, keep original parse/format
vi.mock('../src/utils/fileUtils.js', async (importOriginal) => {
    const actual = await importOriginal();
    return {
        ...actual, 
        // If getValidatedFilePath is used internally by createFromTemplate, mock it here too
        // getValidatedFilePath: vi.fn(), 
    };
});


// Mock MCP Server instance
const mockServer = {
    tool: vi.fn(),
};

// Dynamically import config *after* mocks are set up
let contextToolRoot;

const getToolHandler = async () => {
    // Ensure config is imported only once and after mocks
    if (!contextToolRoot) {
      try {
        // Simulate the top-level await behavior for config import in tests
        const configModule = await import('../src/config.js');
        contextToolRoot = configModule.contextToolRoot;
      } catch (e) {
        console.error("Error importing config in test setup:", e);
        contextToolRoot = '/mock/tool/root'; // Provide a fallback for tests if import fails
      }
    }
    if (mockServer.tool.mock.calls.length === 0) throw new Error('server.tool was not called');
    return mockServer.tool.mock.calls[mockServer.tool.mock.calls.length - 1][3];
};

describe('createFromTemplate Tool', () => {
    const MOCK_CONTEXT_PATH = '/mock/workspace/.cursor/context';
    const toolName = 'create_from_template';
    const templateName = 'test-template';
    const type = 'notes';
    const mockTemplatePath = path.join(MOCK_CONTEXT_PATH, '_templates', `${templateName}.md`);
    const mockTargetPath = path.join(MOCK_CONTEXT_PATH, type);
    let expectedFallbackPath; // Will be set in beforeEach

    beforeEach(async () => { // Make beforeEach async
        vi.resetAllMocks();
        registerCreateFromTemplateTool(mockServer, MOCK_CONTEXT_PATH);
        // Default mocks 
        fs.mkdir.mockResolvedValue(undefined);
        fs.writeFile.mockResolvedValue(undefined);
        vi.useFakeTimers();

        // Get the handler to ensure config is loaded and set expectedFallbackPath
        await getToolHandler(); // Ensure contextToolRoot is loaded
        if (!contextToolRoot) throw new Error('contextToolRoot not loaded in beforeEach');
        expectedFallbackPath = path.join(contextToolRoot, 'example', 'templates', `${templateName}.md`);
    });

    afterEach(() => {
        vi.useRealTimers(); 
    });

    it('should create an entry from a template with variable substitution in content and metadata', async () => {
        const handler = await getToolHandler();
        const mockDate = new Date();
        vi.setSystemTime(mockDate);
        const expectedFilenameTimestamp = mockDate.toISOString().replace(/[:.]/g, '-');
        const expectedFilePath = path.join(mockTargetPath, `${expectedFilenameTimestamp}.md`);

        const templateContent = `---
title: Template for {{project_name}}
status: "{{initial_status}}"
tags: 
  - template
  - project-{{project_name}}
nested:
  value: Pre-{{nested_val}}-Post
---

# Project: {{project_name}}

Description: {{description}}

Status is {{initial_status}}.
Nested: {{nested_val}}
Unused: {{unused_placeholder}}`;

        const variables = {
            project_name: 'Omega Task',
            initial_status: 'pending',
            description: 'A critical task.',
            nested_val: 'ABC'
        };
        
        fs.readFile.mockResolvedValue(templateContent); // Mock reading the template

        const result = await handler({ templateName, type, variables });

        // Check interactions
        expect(fs.readFile).toHaveBeenCalledWith(mockTemplatePath, 'utf8');
        expect(fs.mkdir).toHaveBeenCalledWith(mockTargetPath, { recursive: true });
        expect(fs.writeFile).toHaveBeenCalledOnce();

        // Check written content
        const writeFileCall = fs.writeFile.mock.calls[0];
        expect(writeFileCall[0]).toBe(expectedFilePath); // Check correct file path
        expect(writeFileCall[2]).toEqual({ flag: 'wx' }); // Check write flag

        const writtenContent = writeFileCall[1];

        // Check metadata substitution
        expect(writtenContent).toContain(`title: Template for ${variables.project_name}`);
        expect(writtenContent).toMatch(/^status:\s*pending$/m);
        expect(writtenContent).toContain(`- project-${variables.project_name}`); // Check array substitution
        expect(writtenContent).toContain(`value: Pre-${variables.nested_val}-Post`); // Check nested substitution

        // Check content substitution
        expect(writtenContent).toContain(`# Project: ${variables.project_name}`);
        expect(writtenContent).toContain(`Description: ${variables.description}`);
        expect(writtenContent).toContain(`Status is ${variables.initial_status}.`);
        expect(writtenContent).toContain(`Nested: ${variables.nested_val}`);

        // Check placeholder removal / retention
        expect(writtenContent).toContain('{{unused_placeholder}}'); // This one SHOULD remain
        expect(writtenContent).not.toContain('{{project_name}}'); // Ensure substituted placeholders are gone
        expect(writtenContent).not.toContain('{{initial_status}}'); 
        expect(writtenContent).not.toContain('{{description}}'); 
        expect(writtenContent).not.toContain('{{nested_val}}'); 

        // Check generated metadata
        const isoTimestamp = mockDate.toISOString();
        expect(writtenContent).toContain(`createdAt: '${isoTimestamp}'`);
        expect(writtenContent).toContain(`updatedAt: '${isoTimestamp}'`);

        // Check success message
        expect(result.content[0].text).toContain(`Successfully created '${type}/${expectedFilenameTimestamp}' from template '${templateName}'.`);
    });

    it('should use the provided filename instead of a timestamp', async () => {
        const handler = await getToolHandler();
        const customFilename = 'my-custom-note';
        const expectedFilePath = path.join(mockTargetPath, `${customFilename}.md`);
        const templateContent = `---
title: Simple Template
---

Content.`;
        fs.readFile.mockResolvedValue(templateContent);

        const result = await handler({ templateName, type, filename: customFilename });

        expect(fs.readFile).toHaveBeenCalledWith(mockTemplatePath, 'utf8');
        expect(fs.mkdir).toHaveBeenCalledWith(mockTargetPath, { recursive: true });
        expect(fs.writeFile).toHaveBeenCalledWith(expectedFilePath, expect.any(String), { flag: 'wx' });
        expect(result.content[0].text).toContain(`Successfully created '${type}/${customFilename}' from template '${templateName}'.`);
    });

    it('should return an error if the template is not found in context or fallback location', async () => {
        const handler = await getToolHandler();
        const error = new Error('Template not found');
        error.code = 'ENOENT';
        fs.readFile.mockRejectedValue(error);

        const result = await handler({ templateName, type });

        // Check that it tried both locations with the *correct* fallback path
        expect(fs.readFile).toHaveBeenCalledWith(mockTemplatePath, 'utf8');
        expect(fs.readFile).toHaveBeenCalledWith(expectedFallbackPath, 'utf8'); // Use corrected path
        expect(fs.writeFile).not.toHaveBeenCalled();
        expect(result.content[0].text).toBe(`Error creating from template '${templateName}': Template '${templateName}.md' not found in _templates or TEMPLATES directory.`);
    });

    it('should return an error if the template has invalid YAML front matter', async () => {
        const handler = await getToolHandler();
        const invalidTemplateContent = `---
title: Invalid YAML
tag: [one, two
--- 
Content`; // Missing closing bracket
        fs.readFile.mockResolvedValue(invalidTemplateContent);

        const result = await handler({ templateName, type });

        expect(fs.readFile).toHaveBeenCalledWith(mockTemplatePath, 'utf8');
        expect(fs.writeFile).not.toHaveBeenCalled();
        expect(result.content[0].text).toContain(`Error processing template '${templateName}': Failed to parse YAML: unexpected end of the stream`);
    });

    it('should create an entry with placeholders remaining if no variables are provided', async () => {
        const handler = await getToolHandler();
        const mockDate = new Date();
        vi.setSystemTime(mockDate);
        const expectedFilenameTimestamp = mockDate.toISOString().replace(/[:.]/g, '-');
        const expectedFilePath = path.join(mockTargetPath, `${expectedFilenameTimestamp}.md`);

        const templateContent = `---
title: Template for {{project_name}}
---

Content with {{placeholder}}.`;
        fs.readFile.mockResolvedValue(templateContent);

        const result = await handler({ templateName, type }); // No variables passed

        expect(fs.readFile).toHaveBeenCalledWith(mockTemplatePath, 'utf8');
        expect(fs.writeFile).toHaveBeenCalledOnce();

        const writtenContent = fs.writeFile.mock.calls[0][1];
        expect(writtenContent).toContain('title: Template for {{project_name}}');
        expect(writtenContent).toContain('Content with {{placeholder}}.');
        // Check generated metadata is still added
        const isoTimestamp = mockDate.toISOString();
        expect(writtenContent).toContain(`createdAt: '${isoTimestamp}'`);
        expect(writtenContent).toContain(`updatedAt: '${isoTimestamp}'`);

        expect(result.content[0].text).toContain(`Successfully created '${type}/${expectedFilenameTimestamp}' from template '${templateName}'.`);
    });

    it('should return an error if writeFile fails (e.g., file exists)', async () => {
        const handler = await getToolHandler();
        const customFilename = 'existing-file';
        const expectedFilePath = path.join(mockTargetPath, `${customFilename}.md`);
        const templateContent = `Content`;
        fs.readFile.mockResolvedValue(templateContent);

        const writeError = new Error(`File already exists: ${expectedFilePath}`);
        writeError.code = 'EEXIST';
        fs.writeFile.mockRejectedValue(writeError);

        const result = await handler({ templateName, type, filename: customFilename });

        expect(fs.readFile).toHaveBeenCalledWith(mockTemplatePath, 'utf8');
        expect(fs.mkdir).toHaveBeenCalledWith(mockTargetPath, { recursive: true });
        expect(fs.writeFile).toHaveBeenCalledWith(expectedFilePath, expect.any(String), { flag: 'wx' });
        expect(result.content[0].text).toBe(`Error creating entry '${type}/${customFilename}' from template '${templateName}': File already exists.`);
    });

    it('should use the fallback template location if not found in context', async () => {
        const handler = await getToolHandler();
        const mockDate = new Date();
        vi.setSystemTime(mockDate);
        const expectedFilenameTimestamp = mockDate.toISOString().replace(/[:.]/g, '-');
        const expectedFilePath = path.join(mockTargetPath, `${expectedFilenameTimestamp}.md`);
        const fallbackTemplateContent = `Fallback Content`;

        // Mock readFile: fail for context location, succeed for fallback
        const contextError = new Error('Not found in context');
        contextError.code = 'ENOENT';
        fs.readFile
            .mockRejectedValueOnce(contextError) // Fails for context path
            .mockResolvedValueOnce(fallbackTemplateContent); // Succeeds for fallback path

        const result = await handler({ templateName, type });

        expect(fs.readFile).toHaveBeenCalledWith(mockTemplatePath, 'utf8');
        expect(fs.readFile).toHaveBeenCalledWith(expectedFallbackPath, 'utf8'); // Use corrected path
        expect(fs.writeFile).toHaveBeenCalledWith(expectedFilePath, expect.stringContaining(fallbackTemplateContent), { flag: 'wx' });
        expect(result.content[0].text).toContain(`Successfully created '${type}/${expectedFilenameTimestamp}' from template '${templateName}' (using fallback).`);
    });

    // TODO: Add more tests:
    // - Variable substitution in arrays/nested objects (covered partially above, maybe more edge cases)
    // - No variables provided
    // - writeFile error (e.g., EEXIST)
    // - Fallback template location usage
}); 