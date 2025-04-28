import { describe, it, expect, vi, beforeEach } from 'vitest';
import path from 'path';
import fs from 'fs/promises';
import yaml from 'js-yaml'; // Needed to check metadata output
import { registerListEntriesTool } from '../src/tools/listEntries.js';
import * as fileUtils from '../src/utils/fileUtils.js'; // To potentially mock parseFrontMatter if needed, though direct mocking of fs is simpler here

// Mock fs/promises module
vi.mock('fs/promises');
// Keep original fileUtils, we mock fs directly
vi.mock('../src/utils/fileUtils.js', async (importOriginal) => {
    return await importOriginal(); 
});


// Mock MCP Server instance
const mockServer = {
    tool: vi.fn(),
};

const getToolHandler = () => {
    if (mockServer.tool.mock.calls.length === 0) throw new Error('server.tool was not called');
    return mockServer.tool.mock.calls[mockServer.tool.mock.calls.length - 1][3];
};

describe('listEntries Tool', () => {
    const MOCK_CONTEXT_PATH = '/mock/workspace/.cursor/context';
    const toolName = 'list_entries';
    const type = 'todos';
    const typePath = path.join(MOCK_CONTEXT_PATH, type);

    beforeEach(() => {
        vi.resetAllMocks();
        registerListEntriesTool(mockServer, MOCK_CONTEXT_PATH);
    });

    it('should register the tool with the correct name', () => {
        expect(mockServer.tool).toHaveBeenCalled();
        const lastCallArgs = mockServer.tool.mock.calls[mockServer.tool.mock.calls.length - 1];
        expect(lastCallArgs[0]).toBe(toolName);
    });

    it('should list entry IDs when includeMetadata is false or omitted', async () => {
        const handler = getToolHandler();
        const mockDirents = [
            { name: 'task1.md', isFile: () => true },
            { name: 'another-task.md', isFile: () => true },
            { name: 'subfolder', isFile: () => false, isDirectory: () => true },
            { name: 'config.yaml', isFile: () => true }, // Should be ignored
        ];
        fs.stat.mockResolvedValue({ isDirectory: () => true }); // Mock type directory exists
        fs.readdir.mockResolvedValue(mockDirents);

        const result = await handler({ type }); // includeMetadata omitted (defaults to false)

        expect(fs.stat).toHaveBeenCalledWith(typePath);
        expect(fs.readdir).toHaveBeenCalledWith(typePath, { withFileTypes: true });
        expect(fs.readFile).not.toHaveBeenCalled(); // No need to read files
        expect(result.content[0].type).toBe('text');
        expect(result.content[0].text).toContain('Entries in \'todos\':');
        expect(result.content[0].text).toContain('- task1');
        expect(result.content[0].text).toContain('- another-task');
        expect(result.content[0].text).not.toContain('subfolder');
        expect(result.content[0].text).not.toContain('config.yaml');
    });

    it('should list entry IDs with basic metadata when includeMetadata is true', async () => {
        const handler = getToolHandler();
        const mockDirents = [
            { name: 'task1.md', isFile: () => true },
            { name: 'task2_no_meta.md', isFile: () => true },
            { name: 'task3_invalid_meta.md', isFile: () => true },
        ];
        const task1Metadata = { createdAt: '2024-01-01T10:00:00Z', status: 'open', tags: ['urgent'] };
        const task1Content = `---
${yaml.dump(task1Metadata)}---

Details for task 1`;
        const task2Content = `Just content, no metadata`;
        const task3Content = `---
invalid: yaml:
---

Content for task 3`;
        
        fs.stat.mockResolvedValue({ isDirectory: () => true });
        fs.readdir.mockResolvedValue(mockDirents);
        // Mock readFile calls for each file
        fs.readFile
            .mockResolvedValueOnce(task1Content)      // task1.md
            .mockResolvedValueOnce(task2Content)      // task2_no_meta.md
            .mockResolvedValueOnce(task3Content);     // task3_invalid_meta.md

        const result = await handler({ type, includeMetadata: true });

        expect(fs.readFile).toHaveBeenCalledTimes(3);
        expect(result.content[0].type).toBe('text');
        expect(result.content[0].text).toContain('Entries in \'todos\' (with metadata):');
        // Check task1 output (adjust date format based on implementation)
        expect(result.content[0].text).toMatch(/- task1 \| Created:.*?\d{1,2}\.\d{1,2}\.\d{4}.*?, Status: open, Tags: \[urgent\]/); 
        // Check task2 output
        expect(result.content[0].text).toContain('- task2_no_meta | (no metadata)');
        // Check task3 output
        expect(result.content[0].text).toContain('- task3_invalid_meta | (invalid metadata)');
    });

    it('should return message if no entries found', async () => {
        const handler = getToolHandler();
        fs.stat.mockResolvedValue({ isDirectory: () => true });
        fs.readdir.mockResolvedValue([]); // Empty directory

        const result = await handler({ type });

        expect(fs.readFile).not.toHaveBeenCalled();
        expect(result.content[0].text).toBe(`No entries found in type '${type}'.`);
    });

    it('should return message if context type directory not found', async () => {
        const handler = getToolHandler();
        const error = new Error('ENOENT');
        error.code = 'ENOENT';
        fs.stat.mockRejectedValue(error);

        const result = await handler({ type });

        expect(fs.readdir).not.toHaveBeenCalled();
        expect(result.content[0].text).toBe(`Context type '${type}' not found.`);
    });

     it('should handle readFile errors gracefully when including metadata', async () => {
        const handler = getToolHandler();
        const mockDirents = [
            { name: 'task1.md', isFile: () => true },
        ];
        const readError = new Error('Permission denied');
        
        fs.stat.mockResolvedValue({ isDirectory: () => true });
        fs.readdir.mockResolvedValue(mockDirents);
        fs.readFile.mockRejectedValue(readError);

        const result = await handler({ type, includeMetadata: true });

        expect(fs.readFile).toHaveBeenCalledTimes(1);
        expect(result.content[0].text).toContain('- task1 | (read error)');
    });
}); 