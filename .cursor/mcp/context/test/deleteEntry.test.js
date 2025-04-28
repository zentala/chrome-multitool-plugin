import { describe, it, expect, vi, beforeEach } from 'vitest';
import path from 'path';
import fs from 'fs/promises';
import { registerDeleteEntryTool } from '../src/tools/deleteEntry.js';
import * as fileUtils from '../src/utils/fileUtils.js';

// Mock dependencies
vi.mock('fs/promises');
vi.mock('../src/utils/fileUtils.js', async (importOriginal) => {
    const actual = await importOriginal();
    return {
        ...actual,
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

describe('deleteEntry Tool', () => {
    const MOCK_CONTEXT_PATH = '/mock/workspace/.cursor/context';
    const toolName = 'delete_entry';
    const type = 'logs';
    const id = 'old-log';
    const mockFilePath = path.join(MOCK_CONTEXT_PATH, type, `${id}.md`);

    beforeEach(() => {
        vi.resetAllMocks();
        registerDeleteEntryTool(mockServer, MOCK_CONTEXT_PATH);
        // Default mock: assume file exists initially
        fileUtils.getValidatedFilePath.mockResolvedValue(mockFilePath);
        fs.unlink.mockResolvedValue(undefined); // Assume unlink succeeds
    });

    it('should register the tool with the correct name', () => {
        expect(mockServer.tool).toHaveBeenCalled();
        const lastCallArgs = mockServer.tool.mock.calls[mockServer.tool.mock.calls.length - 1];
        expect(lastCallArgs[0]).toBe(toolName);
    });

    it('should delete the entry if it exists', async () => {
        const handler = getToolHandler();

        const result = await handler({ type, id });

        expect(fileUtils.getValidatedFilePath).toHaveBeenCalledWith(MOCK_CONTEXT_PATH, type, id);
        expect(fs.unlink).toHaveBeenCalledWith(mockFilePath);
        expect(result.content[0].type).toBe('text');
        expect(result.content[0].text).toContain('Successfully deleted');
        expect(result.content[0].text).toContain(`${type}/${id}`);
    });

    it('should return error if entry file does not exist', async () => {
        const handler = getToolHandler();
        const error = new Error(`Entry '${id}' not found in context type '${type}'.`);
        fileUtils.getValidatedFilePath.mockRejectedValue(error); // Mock file not found

        const result = await handler({ type, id });

        expect(fs.unlink).not.toHaveBeenCalled();
        expect(result.content[0].type).toBe('text');
        expect(result.content[0].text).toBe(`Error deleting entry: ${error.message}`);
    });

    it('should return error if unlink fails', async () => {
        const handler = getToolHandler();
        const error = new Error('Permission denied');
        fs.unlink.mockRejectedValue(error); // Mock unlink failure

        const result = await handler({ type, id });

        expect(fileUtils.getValidatedFilePath).toHaveBeenCalledWith(MOCK_CONTEXT_PATH, type, id);
        expect(fs.unlink).toHaveBeenCalledWith(mockFilePath);
        expect(result.content[0].type).toBe('text');
        expect(result.content[0].text).toBe(`Error deleting entry: ${error.message}`);
    });
}); 