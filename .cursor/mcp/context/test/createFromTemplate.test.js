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

const getToolHandler = () => {
    if (mockServer.tool.mock.calls.length === 0) throw new Error('server.tool was not called');
    // Assumes create_from_template is the last registered tool
    return mockServer.tool.mock.calls[mockServer.tool.mock.calls.length - 1][3]; 
};

describe('createFromTemplate Tool', () => {
    const MOCK_CONTEXT_PATH = '/mock/workspace/.cursor/context';
    const MOCK_FALLBACK_TEMPLATE_PATH = path.resolve(process.cwd(), '.cursor', 'TEMPLATES');
    const toolName = 'create_from_template';
    const templateName = 'test-template';
    const type = 'notes';
    const mockTemplatePath = path.join(MOCK_CONTEXT_PATH, '_templates', `${templateName}.md`);
    const mockTargetPath = path.join(MOCK_CONTEXT_PATH, type);
    
    beforeEach(() => {
        vi.resetAllMocks();
        registerCreateFromTemplateTool(mockServer, MOCK_CONTEXT_PATH);
        // Default mocks 
        fs.mkdir.mockResolvedValue(undefined); // Assume mkdir succeeds
        fs.writeFile.mockResolvedValue(undefined); // Assume write succeeds by default
        vi.useFakeTimers(); // Use fake timers for predictable filenames/timestamps
    });

    afterEach(() => {
        vi.useRealTimers(); 
    });

    it('should create an entry from a template with variable substitution in content and metadata', async () => {
        const handler = getToolHandler();
        const mockDate = new Date();
        vi.setSystemTime(mockDate);
        const expectedFilenameTimestamp = mockDate.toISOString().replace(/[:.]/g, '-');
        const expectedFilePath = path.join(mockTargetPath, `${expectedFilenameTimestamp}.md`);

        const templateContent = `---
title: Template for {{project_name}}
status: {{initial_status}}
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
        expect(writtenContent).toContain(`status: ${variables.initial_status}`);
        expect(writtenContent).toContain(`- project-${variables.project_name}`); // Check array substitution
        expect(writtenContent).toContain(`value: Pre-${variables.nested_val}-Post`); // Check nested substitution

        // Check content substitution
        expect(writtenContent).toContain(`# Project: ${variables.project_name}`);
        expect(writtenContent).toContain(`Description: ${variables.description}`);
        expect(writtenContent).toContain(`Status is ${variables.initial_status}.`);
        expect(writtenContent).toContain(`Nested: ${variables.nested_val}`);

        // Check placeholder removal
        expect(writtenContent).not.toContain('{{unused_placeholder}}');
        expect(writtenContent).not.toContain('{{ project_name }}'); // Ensure placeholders are gone
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

    // TODO: Add more tests:
    // - Custom filename provided
    // - Template not found (in both locations)
    // - Template has invalid YAML
    // - Variable substitution in arrays/nested objects (covered partially above, maybe more edge cases)
    // - No variables provided
    // - writeFile error (e.g., EEXIST)
    // - Fallback template location usage
}); 