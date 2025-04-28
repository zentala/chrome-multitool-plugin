import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'fs/promises';
import { registerListContextTypesTool as registerListEntryTypesTool } from '../src/tools/listContextTypes.js';

// Mock dependencies
vi.mock('fs/promises');

// Mock MCP Server instance
const mockServer = {
    tool: vi.fn(),
};

// Helper to get the registered handler
const getToolHandler = () => {
    if (mockServer.tool.mock.calls.length === 0) throw new Error('server.tool was not called');
    // The handler is typically the 4th argument (index 3)
    return mockServer.tool.mock.calls[mockServer.tool.mock.calls.length - 1][3];
};

describe('listEntryTypes Tool', () => {
    const MOCK_CONTEXT_PATH = '/mock/workspace/.cursor/context'; // Example path
    // Use the actual tool name being registered
    const toolName = 'list_context_types'; 

    beforeEach(() => {
        vi.resetAllMocks();
        // Register the tool before each test
        registerListEntryTypesTool(mockServer, MOCK_CONTEXT_PATH); // Keep using the alias for the registration function
    });

    it('should register the tool with the correct name', () => {
        expect(mockServer.tool).toHaveBeenCalled();
        const lastCallArgs = mockServer.tool.mock.calls[mockServer.tool.mock.calls.length - 1];
        expect(lastCallArgs[0]).toBe(toolName); // Assert against the correct tool name
        // Check schema registration if necessary, assuming simple registration for now
    });

    it('should list all directories (entry types) in the context path', async () => {
        const handler = getToolHandler();
        const mockDirents = [
            { name: 'projects', isDirectory: () => true },
            { name: 'notes', isDirectory: () => true },
            { name: 'config.json', isDirectory: () => false }, // Should be ignored
            { name: '_templates', isDirectory: () => true }, // Might be ignored by the tool logic
            { name: 'logs', isDirectory: () => true },
        ];
        fs.readdir.mockResolvedValue(mockDirents);
        const result = await handler({});

        expect(fs.readdir).toHaveBeenCalledWith(MOCK_CONTEXT_PATH, { withFileTypes: true });
        expect(result.content[0].type).toBe('text');
        // Adjust expected message to match listContextTypes.js output
        expect(result.content[0].text).toContain('Available context types:'); 
        expect(result.content[0].text).toContain('- projects');
        expect(result.content[0].text).toContain('- notes');
        expect(result.content[0].text).toContain('- logs');
        // Assuming listContextTypes *does* filter out dirs starting with _ based on its own test file
        expect(result.content[0].text).not.toContain('_templates'); 
        expect(result.content[0].text).not.toContain('config.json');
    });

    it('should return a message if no entry types (directories) are found', async () => {
        const handler = getToolHandler();
        const mockDirents = [
            { name: 'readme.md', isDirectory: () => false },
            { name: '.gitkeep', isDirectory: () => false },
        ];
        fs.readdir.mockResolvedValue(mockDirents);
        const result = await handler({});

        expect(fs.readdir).toHaveBeenCalledWith(MOCK_CONTEXT_PATH, { withFileTypes: true });
        expect(result.content[0].type).toBe('text');
        // Adjust expected message to match listContextTypes.js output
        expect(result.content[0].text).toBe('No context types (directories) found.'); 
    });

    it('should handle errors during directory reading', async () => {
        const handler = getToolHandler();
        const error = new Error('Permission denied');
        fs.readdir.mockRejectedValue(error);
        const result = await handler({});

        expect(fs.readdir).toHaveBeenCalledWith(MOCK_CONTEXT_PATH, { withFileTypes: true });
        expect(result.content[0].type).toBe('text');
        // Adjust expected message to match listContextTypes.js output (which seems simpler)
        expect(result.content[0].text).toBe(`Error: ${error.message}`); 
    });
}); 