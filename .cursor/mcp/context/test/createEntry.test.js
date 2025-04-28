import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import path from 'path';
import fs from 'fs/promises';
import { registerCreateEntryTool } from '../src/tools/createEntry.js';

// Mock fs/promises module
vi.mock('fs/promises');

// Mock MCP Server instance
const mockServer = {
    tool: vi.fn(),
};

// Helper to get the handler function registered by the tool
const getToolHandler = () => {
    if (mockServer.tool.mock.calls.length === 0) {
        throw new Error('server.tool was not called');
    }
    // Assumes the handler is the 4th argument in the last call to server.tool
    return mockServer.tool.mock.calls[mockServer.tool.mock.calls.length - 1][3];
};

describe('createEntry Tool', () => {
    const MOCK_CONTEXT_PATH = '/mock/workspace/.cursor/context';
    const toolName = 'create_entry';

    beforeEach(() => {
        vi.resetAllMocks();
        // Register the tool before each test to get a fresh mock call list
        registerCreateEntryTool(mockServer, MOCK_CONTEXT_PATH);
    });

    afterEach(() => {
        vi.useRealTimers(); // Ensure real timers are restored after tests that mock time
    });

    it('should register the tool with the correct name', () => {
        expect(mockServer.tool).toHaveBeenCalled();
        const lastCallArgs = mockServer.tool.mock.calls[mockServer.tool.mock.calls.length - 1];
        expect(lastCallArgs[0]).toBe(toolName);
    });

    it('should create an entry with specified filename and metadata', async () => {
        const handler = getToolHandler();
        const type = 'decisions';
        const filename = 'new-strategy';
        const content = 'This is the decision content.';
        const metadata = { confidence: 'high', tags: ['planning'] };
        const expectedFilePath = path.join(MOCK_CONTEXT_PATH, type, `${filename}.md`);

        // Mock fs operations
        fs.mkdir.mockResolvedValue(undefined); // Assume mkdir succeeds
        fs.writeFile.mockResolvedValue(undefined); // Assume writeFile succeeds

        const result = await handler({ type, content, filename, metadata });

        expect(fs.mkdir).toHaveBeenCalledWith(path.join(MOCK_CONTEXT_PATH, type), { recursive: true });
        expect(fs.writeFile).toHaveBeenCalledOnce();
        const writeFileCall = fs.writeFile.mock.calls[0];
        expect(writeFileCall[0]).toBe(expectedFilePath);
        // Check content includes metadata and main content
        expect(writeFileCall[1]).toContain('confidence: high');
        expect(writeFileCall[1]).toContain('tags:\n  - planning');
        expect(writeFileCall[1]).toContain('createdAt:'); // Check for auto-added field
        expect(writeFileCall[1]).toContain('updatedAt:'); // Check for auto-added field
        expect(writeFileCall[1]).toContain(content);
        expect(writeFileCall[2]).toEqual({ flag: 'wx' }); // Check for existence flag

        expect(result.content[0].type).toBe('text');
        expect(result.content[0].text).toContain('Successfully created');
        expect(result.content[0].text).toContain(`${type}/${filename}`);
    });

    it('should create an entry with timestamp filename if none provided', async () => {
        const handler = getToolHandler();
        const type = 'todos';
        const content = 'A new task';
        // Mock date for predictable timestamp
        const mockDate = new Date(2024, 5, 15, 10, 30, 0); 
        vi.setSystemTime(mockDate);
        const expectedTimestamp = mockDate.toISOString().replace(/[:.]/g, '-'); 
        const expectedFilePath = path.join(MOCK_CONTEXT_PATH, type, `${expectedTimestamp}.md`);

        fs.mkdir.mockResolvedValue(undefined);
        fs.writeFile.mockResolvedValue(undefined);

        const result = await handler({ type, content });

        expect(fs.writeFile).toHaveBeenCalledWith(expectedFilePath, expect.any(String), { flag: 'wx' });
        expect(result.content[0].text).toContain(`${type}/${expectedTimestamp}`);

        // No need to restore timers here, afterEach does it.
    });

    it('should handle file already exists error (EEXIST)', async () => {
        const handler = getToolHandler();
        const type = 'notes';
        const filename = 'existing-note';
        const content = 'Some content';
        const expectedFilePath = path.join(MOCK_CONTEXT_PATH, type, `${filename}.md`);
        const error = new Error('EEXIST: file already exists');
        error.code = 'EEXIST';
        error.path = expectedFilePath; // Simulate error providing path

        fs.mkdir.mockResolvedValue(undefined);
        fs.writeFile.mockRejectedValue(error); // Simulate EEXIST error

        const result = await handler({ type, content, filename });

        expect(fs.writeFile).toHaveBeenCalledWith(expectedFilePath, expect.any(String), { flag: 'wx' });
        expect(result.content[0].type).toBe('text');
        expect(result.content[0].text).toContain('Error: File');
        expect(result.content[0].text).toContain('already exists');
        expect(result.content[0].text).toContain(expectedFilePath);
    });

    it('should handle other writeFile errors', async () => {
        const handler = getToolHandler();
        const type = 'logs';
        const filename = 'test-log';
        const content = 'Log data';
        const error = new Error('Disk full');

        fs.mkdir.mockResolvedValue(undefined);
        fs.writeFile.mockRejectedValue(error); 

        const result = await handler({ type, content, filename });

        expect(result.content[0].type).toBe('text');
        expect(result.content[0].text).toContain('Error creating entry: Disk full');
    });

    it('should handle mkdir errors', async () => {
        const handler = getToolHandler();
        const type = 'forbidden';
        const content = 'Secret';
        const error = new Error('Permission denied');

        fs.mkdir.mockRejectedValue(error);

        const result = await handler({ type, content });

        expect(fs.writeFile).not.toHaveBeenCalled();
        expect(result.content[0].type).toBe('text');
        expect(result.content[0].text).toContain('Error creating entry: Permission denied'); 
    });
}); 