import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'fs/promises';
import { registerListContextTypesTool } from '../src/tools/listContextTypes.js';

// Mock fs/promises module
vi.mock('fs/promises');

// Mock MCP Server instance
const mockServer = {
    tool: vi.fn(),
};

const getToolHandler = () => {
    if (mockServer.tool.mock.calls.length === 0) throw new Error('server.tool was not called');
    return mockServer.tool.mock.calls[mockServer.tool.mock.calls.length - 1][3]; // Handler is the 3rd arg (index 2) or 4th (index 3)? Let's recheck MCP spec - it's the 4th.
};

describe('listContextTypes Tool', () => {
    const MOCK_CONTEXT_PATH = '/mock/workspace/.cursor/context';
    const toolName = 'list_context_types';

    beforeEach(() => {
        vi.resetAllMocks();
        registerListContextTypesTool(mockServer, MOCK_CONTEXT_PATH);
    });

    it('should register the tool with the correct name', () => {
        expect(mockServer.tool).toHaveBeenCalled();
        const lastCallArgs = mockServer.tool.mock.calls[mockServer.tool.mock.calls.length - 1];
        expect(lastCallArgs[0]).toBe(toolName);
    });

    it('should list directories excluding those starting with _', async () => {
        const handler = getToolHandler();
        const mockDirents = [
            { name: 'todos', isDirectory: () => true },
            { name: 'decisions', isDirectory: () => true },
            { name: '_templates', isDirectory: () => true }, // Should be excluded
            { name: 'some_file.txt', isDirectory: () => false }, // Should be excluded
            { name: 'knowhow', isDirectory: () => true },
        ];
        fs.access.mockResolvedValue(undefined); // Mock base directory exists
        fs.readdir.mockResolvedValue(mockDirents);

        const result = await handler({}); // No arguments for this tool

        expect(fs.access).toHaveBeenCalledWith(MOCK_CONTEXT_PATH);
        expect(fs.readdir).toHaveBeenCalledWith(MOCK_CONTEXT_PATH, { withFileTypes: true });
        expect(result.content[0].type).toBe('text');
        expect(result.content[0].text).toContain('todos');
        expect(result.content[0].text).toContain('decisions');
        expect(result.content[0].text).toContain('knowhow');
        expect(result.content[0].text).not.toContain('_templates');
        expect(result.content[0].text).not.toContain('some_file.txt');
    });

    it('should return message if no context types found', async () => {
        const handler = getToolHandler();
        const mockDirents = [
            { name: '_templates', isDirectory: () => true },
            { name: 'readme.md', isDirectory: () => false },
        ];
        fs.access.mockResolvedValue(undefined);
        fs.readdir.mockResolvedValue(mockDirents);

        const result = await handler({});

        expect(result.content[0].text).toBe('No context types (directories) found.');
    });

    it('should return message if context directory does not exist', async () => {
        const handler = getToolHandler();
        const error = new Error('ENOENT');
        error.code = 'ENOENT';
        fs.access.mockRejectedValue(error); // Mock base directory does not exist

        const result = await handler({});

        expect(fs.readdir).not.toHaveBeenCalled();
        expect(result.content[0].text).toBe('Context data directory does not exist.');
    });

    it('should return error message on other fs errors', async () => {
        const handler = getToolHandler();
        const error = new Error('Permission denied');
        fs.access.mockResolvedValue(undefined); // Access might succeed
        fs.readdir.mockRejectedValue(error); // But readdir fails

        const result = await handler({});

        expect(result.content[0].type).toBe('text');
        expect(result.content[0].text).toBe(`Error: ${error.message}`);
    });
}); 