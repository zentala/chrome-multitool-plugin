import { describe, it, expect, vi, beforeEach } from 'vitest';
import path from 'path';
import fs from 'fs/promises';
import yaml from 'js-yaml';
import { registerReadEntryTool } from '../src/tools/readEntry.js';
import * as fileUtils from '../src/utils/fileUtils.js'; // Import all utils to mock one

// Mock the specific utility function we rely on, and fs/promises
vi.mock('fs/promises');
vi.mock('../src/utils/fileUtils.js', async (importOriginal) => {
    const actual = await importOriginal();
    return {
        ...actual, // Keep original parseFrontMatter and others if needed
        getValidatedFilePath: vi.fn(), // Mock only getValidatedFilePath
    };
});

// Mock MCP Server instance
const mockServer = {
    tool: vi.fn(),
};

const getToolHandler = () => {
    if (mockServer.tool.mock.calls.length === 0) throw new Error('server.tool was not called');
    return mockServer.tool.mock.calls[mockServer.tool.mock.calls.length - 1][3];
};

describe('readEntry Tool', () => {
    const MOCK_CONTEXT_PATH = '/mock/workspace/.cursor/context'; // Not used directly by handler, but by mocked util
    const toolName = 'read_entry';
    const type = 'knowhow';
    const id = 'mcp-basics';
    const mockFilePath = path.join(MOCK_CONTEXT_PATH, type, `${id}.md`);

    beforeEach(() => {
        vi.resetAllMocks();
        registerReadEntryTool(mockServer, MOCK_CONTEXT_PATH); // Path passed but not directly used here
        // Setup default mock behavior for helpers
        fileUtils.getValidatedFilePath.mockResolvedValue(mockFilePath); // Assume file path validation succeeds
    });

    it('should register the tool with the correct name', () => {
        expect(mockServer.tool).toHaveBeenCalled();
        const lastCallArgs = mockServer.tool.mock.calls[mockServer.tool.mock.calls.length - 1];
        expect(lastCallArgs[0]).toBe(toolName);
    });

    it('should read and parse an entry with valid front matter', async () => {
        const handler = getToolHandler();
        const mockMetadata = { title: 'MCP Basics', tags: ['mcp', 'cursor'] };
        const mockMainContent = 'This is the main content about MCP.';
        const rawContent = `---
${yaml.dump(mockMetadata)}---

${mockMainContent}`;
        const expectedMetadataString = yaml.dump(mockMetadata);

        fs.readFile.mockResolvedValue(rawContent);

        const result = await handler({ type, id });

        expect(fileUtils.getValidatedFilePath).toHaveBeenCalledWith(MOCK_CONTEXT_PATH, type, id);
        expect(fs.readFile).toHaveBeenCalledWith(mockFilePath, 'utf8');
        expect(result.content[0].type).toBe('text');
        expect(result.content[0].text).toContain('--- METADATA ---');
        expect(result.content[0].text).toContain(expectedMetadataString);
        expect(result.content[0].text).toContain('--- CONTENT ---');
        expect(result.content[0].text).toContain(mockMainContent);
    });

    it('should handle entry with no front matter', async () => {
        const handler = getToolHandler();
        const mockMainContent = 'Just plain text content.';
        const expectedMetadata = {};
        const expectedMetadataString = yaml.dump(expectedMetadata);

        fs.readFile.mockResolvedValue(mockMainContent);

        const result = await handler({ type, id });

        expect(fs.readFile).toHaveBeenCalledWith(mockFilePath, 'utf8');
        expect(result.content[0].type).toBe('text');
        expect(result.content[0].text).toContain('--- METADATA ---');
        expect(result.content[0].text).toContain(expectedMetadataString);
        expect(result.content[0].text).not.toContain('note: No YAML front matter');
        expect(result.content[0].text).toContain('--- CONTENT ---');
        expect(result.content[0].text).toContain(mockMainContent);
    });

    it('should handle entry with invalid front matter', async () => {
        const handler = getToolHandler();
        const invalidYamlContent = `---
tags: [invalid
---

Content below invalid YAML.`;
        const expectedErrorMessage = 'Failed to parse YAML'; // Part of the error message

        fs.readFile.mockResolvedValue(invalidYamlContent);

        const result = await handler({ type, id });

        expect(fs.readFile).toHaveBeenCalledWith(mockFilePath, 'utf8');
        expect(result.content[0].type).toBe('text');
        expect(result.content[0].text).toContain('--- METADATA ---');
        // Check that the metadata contains the parse error message
        expect(result.content[0].text).toContain('parseError:');
        expect(result.content[0].text).toContain(expectedErrorMessage);
        expect(result.content[0].text).toContain('--- CONTENT ---');
        // Content part might still contain the raw invalid YAML depending on parseFrontMatter logic
        expect(result.content[0].text).toContain('Content below invalid YAML.'); 
    });

    it('should return error if getValidatedFilePath throws', async () => {
        const handler = getToolHandler();
        const error = new Error(`Entry '${id}' not found in context type '${type}'.`);
        fileUtils.getValidatedFilePath.mockRejectedValue(error);

        const result = await handler({ type, id });

        expect(fs.readFile).not.toHaveBeenCalled();
        expect(result.content[0].type).toBe('text');
        expect(result.content[0].text).toBe(`Error reading entry: ${error.message}`);
    });

    it('should return error if fs.readFile throws', async () => {
        const handler = getToolHandler();
        const error = new Error('Read permission denied');
        fs.readFile.mockRejectedValue(error);

        const result = await handler({ type, id });

        expect(fileUtils.getValidatedFilePath).toHaveBeenCalledWith(MOCK_CONTEXT_PATH, type, id);
        expect(fs.readFile).toHaveBeenCalledWith(mockFilePath, 'utf8');
        expect(result.content[0].type).toBe('text');
        expect(result.content[0].text).toBe(`Error reading entry: ${error.message}`);
    });
}); 