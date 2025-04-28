import { describe, it, expect, vi, beforeEach } from 'vitest';
import path from 'path';
import fs from 'fs/promises';
import { registerListEntriesTool } from '../src/tools/listEntries.js';
// import * as fileUtils from '../src/utils/fileUtils.js'; // Not needed if we mock fs

// Mock fs/promises module
vi.mock('fs/promises');
// Mock fileUtils if necessary for specific tests, but usually mocking fs is enough
vi.mock('../src/utils/fileUtils.js', async (importOriginal) => {
    const actual = await importOriginal();
    return {
        ...actual, // Keep other functions
        // If parseFrontMatter needs mocking, do it here:
        // parseFrontMatter: vi.fn().mockImplementation((content, filePath) => { ... })
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
        fs.stat.mockResolvedValue({ isDirectory: () => true }); 
        fs.readdir.mockResolvedValue(mockDirents);

        const result = await handler({ type }); // includeMetadata omitted

        expect(fs.stat).toHaveBeenCalledWith(typePath);
        expect(fs.readdir).toHaveBeenCalledWith(typePath, { withFileTypes: true });
        expect(fs.readFile).not.toHaveBeenCalled(); 

        // Expect JSON response with an array of objects containing only id
        expect(result.content[0].type).toBe('json');
        expect(result.content[0].json).toEqual([
            { id: 'task1' },
            { id: 'another-task' }
        ]);
    });

    it('should list entry IDs with metadata when includeMetadata is true', async () => {
        const handler = getToolHandler();
        const mockDirents = [
            { name: 'task1.md', isFile: () => true },
            { name: 'task2_no_meta.md', isFile: () => true },
            { name: 'task3_invalid_meta.md', isFile: () => true },
        ];
        const task1Metadata = { createdAt: '2024-01-01T10:00:00Z', status: 'open', tags: ['urgent'] };
        // Use parseFrontMatter directly in the mock for consistency if not mocking it separately
        const task1Content = `---
${JSON.stringify(task1Metadata)}---

Details for task 1`; 
        const task2Content = `Just content, no metadata`;
        const task3Content = `---
invalid: yaml:
---

Content for task 3`;
        
        fs.stat.mockResolvedValue({ isDirectory: () => true });
        fs.readdir.mockResolvedValue(mockDirents);
        fs.readFile
            .mockResolvedValueOnce(task1Content)      
            .mockResolvedValueOnce(task2Content)      
            .mockResolvedValueOnce(task3Content);     

        const result = await handler({ type, includeMetadata: true });

        expect(fs.readFile).toHaveBeenCalledTimes(3);
        expect(result.content[0].type).toBe('json');
        
        // Check the structure and content of the JSON array
        const jsonResult = result.content[0].json;
        expect(jsonResult).toBeInstanceOf(Array);
        expect(jsonResult.length).toBe(3);

        // Find specific entries for clearer assertions
        const task1Result = jsonResult.find(item => item.id === 'task1');
        const task2Result = jsonResult.find(item => item.id === 'task2_no_meta');
        const task3Result = jsonResult.find(item => item.id === 'task3_invalid_meta');

        expect(task1Result).toBeDefined();
        expect(task1Result.metadata).toEqual(task1Metadata); // Check parsed metadata
        expect(task1Result.metadataError).toBeUndefined();

        expect(task2Result).toBeDefined();
        expect(task2Result.metadata).toEqual({}); // Expect empty object if no front matter
        expect(task2Result.metadataError).toBeUndefined();

        expect(task3Result).toBeDefined();
        expect(task3Result.metadata).toBeUndefined(); // Metadata should be undefined on error
        expect(task3Result.metadataError).toMatch(/Failed to parse YAML/); // Check for error message
    });

    it('should return an empty array if no entries found', async () => {
        const handler = getToolHandler();
        fs.stat.mockResolvedValue({ isDirectory: () => true });
        fs.readdir.mockResolvedValue([]); // Empty directory

        const result = await handler({ type });

        expect(fs.readFile).not.toHaveBeenCalled();
        expect(result.content[0].type).toBe('json');
        expect(result.content[0].json).toEqual([]); // Expect empty array
    });

    it('should return a structured error if context type directory not found', async () => {
        const handler = getToolHandler();
        const error = new Error('ENOENT');
        error.code = 'ENOENT';
        fs.stat.mockRejectedValue(error);

        const result = await handler({ type });

        expect(fs.readdir).not.toHaveBeenCalled();
        expect(result.content[0].type).toBe('json');
        expect(result.content[0].json).toEqual({ error: `Context type '${type}' not found.` });
    });

     it('should handle readFile errors gracefully when including metadata', async () => {
        const handler = getToolHandler();
        const mockDirents = [
            { name: 'task1.md', isFile: () => true },
        ];
        const readError = new Error('Permission denied');
        readError.code = 'EACCES'; // Use a code other than ENOENT
        
        fs.stat.mockResolvedValue({ isDirectory: () => true });
        fs.readdir.mockResolvedValue(mockDirents);
        fs.readFile.mockRejectedValue(readError);

        const result = await handler({ type, includeMetadata: true });

        expect(fs.readFile).toHaveBeenCalledTimes(1);
        expect(result.content[0].type).toBe('json');
        const jsonResult = result.content[0].json;
        expect(jsonResult).toBeInstanceOf(Array);
        expect(jsonResult.length).toBe(1);
        expect(jsonResult[0].id).toBe('task1');
        expect(jsonResult[0].metadata).toBeUndefined();
        expect(jsonResult[0].metadataError).toContain('Error reading file for metadata: Permission denied');
    });
}); 