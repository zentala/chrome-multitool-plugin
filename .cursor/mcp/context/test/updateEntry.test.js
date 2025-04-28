import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import path from 'path';
import fs from 'fs/promises';
import yaml from 'js-yaml';
import { registerUpdateEntryTool } from '../src/tools/updateEntry.js';
import * as fileUtils from '../src/utils/fileUtils.js'; 

// Mock dependencies
vi.mock('fs/promises');
vi.mock('../src/utils/fileUtils.js', async (importOriginal) => {
    const actual = await importOriginal();
    return {
        ...actual, // Keep original parseFrontMatter, formatWithFrontMatter
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

describe('updateEntry Tool', () => {
    const MOCK_CONTEXT_PATH = '/mock/workspace/.cursor/context';
    const toolName = 'update_entry';
    const type = 'projects';
    const id = 'alpha';
    const mockFilePath = path.join(MOCK_CONTEXT_PATH, type, `${id}.md`);

    const originalMetadata = { 
        createdAt: '2024-01-01T00:00:00Z', 
        updatedAt: '2024-01-01T00:00:00Z', 
        status: 'planning', 
        owner: 'Alice' 
    };
    const originalContent = 'Initial project description.';
    const originalRawContent = `---
${yaml.dump(originalMetadata)}---

${originalContent}`;

    beforeEach(() => {
        vi.resetAllMocks();
        registerUpdateEntryTool(mockServer, MOCK_CONTEXT_PATH);
        // Default mocks for successful read
        fileUtils.getValidatedFilePath.mockResolvedValue(mockFilePath);
        fs.readFile.mockResolvedValue(originalRawContent);
        fs.writeFile.mockResolvedValue(undefined); // Assume write succeeds by default
    });

     afterEach(() => {
        vi.useRealTimers(); 
    });

    it('should register the tool with the correct name', () => {
        expect(mockServer.tool).toHaveBeenCalled();
        const lastCallArgs = mockServer.tool.mock.calls[mockServer.tool.mock.calls.length - 1];
        expect(lastCallArgs[0]).toBe(toolName);
    });

    it('should update only content when only content is provided', async () => {
        const handler = getToolHandler();
        const newContent = 'Updated project description.';
        const mockDate = new Date(); // For updatedAt timestamp
        vi.setSystemTime(mockDate); 

        const result = await handler({ type, id, content: newContent });

        expect(fs.readFile).toHaveBeenCalledWith(mockFilePath, 'utf8');
        expect(fs.writeFile).toHaveBeenCalledOnce();
        const writeFileCall = fs.writeFile.mock.calls[0];
        expect(writeFileCall[0]).toBe(mockFilePath);
        // Check updated content and metadata
        expect(writeFileCall[1]).toContain(newContent);
        expect(writeFileCall[1]).toContain(`status: ${originalMetadata.status}`); // Original status preserved
        expect(writeFileCall[1]).toContain(`owner: ${originalMetadata.owner}`); // Original owner preserved
        expect(writeFileCall[1]).toContain(`createdAt: ${originalMetadata.createdAt}`); // Original createdAt preserved
        expect(writeFileCall[1]).toContain(`updatedAt: ${mockDate.toISOString()}`); // Updated timestamp
        expect(writeFileCall[2]).toBe('utf8');

        expect(result.content[0].text).toContain('Successfully updated');
    });

    it('should update only metadata when only metadata is provided', async () => {
        const handler = getToolHandler();
        const metadataUpdates = { status: 'active', priority: 'high' };
        const mockDate = new Date();
        vi.setSystemTime(mockDate);

        const result = await handler({ type, id, metadata: metadataUpdates });

        expect(fs.writeFile).toHaveBeenCalledOnce();
        const writeFileCall = fs.writeFile.mock.calls[0];
        expect(writeFileCall[1]).toContain(originalContent); // Original content preserved
        expect(writeFileCall[1]).toContain(`status: ${metadataUpdates.status}`); // Updated status
        expect(writeFileCall[1]).toContain(`priority: ${metadataUpdates.priority}`); // Added priority
        expect(writeFileCall[1]).toContain(`owner: ${originalMetadata.owner}`); // Original owner preserved
        expect(writeFileCall[1]).toContain(`createdAt: ${originalMetadata.createdAt}`);
        expect(writeFileCall[1]).toContain(`updatedAt: ${mockDate.toISOString()}`);

        expect(result.content[0].text).toContain('Successfully updated');
    });

    it('should update both content and metadata', async () => {
        const handler = getToolHandler();
        const newContent = 'Final description.';
        const metadataUpdates = { status: 'completed', owner: 'Bob' };
         const mockDate = new Date();
        vi.setSystemTime(mockDate);

        const result = await handler({ type, id, content: newContent, metadata: metadataUpdates });

        expect(fs.writeFile).toHaveBeenCalledOnce();
        const writeFileCall = fs.writeFile.mock.calls[0];
        expect(writeFileCall[1]).toContain(newContent); // New content
        expect(writeFileCall[1]).toContain(`status: ${metadataUpdates.status}`); // Updated status
        expect(writeFileCall[1]).toContain(`owner: ${metadataUpdates.owner}`); // Updated owner
        expect(writeFileCall[1]).toContain(`createdAt: ${originalMetadata.createdAt}`);
        expect(writeFileCall[1]).toContain(`updatedAt: ${mockDate.toISOString()}`);

        expect(result.content[0].text).toContain('Successfully updated');
    });

    it('should return error if entry file does not exist', async () => {
        const handler = getToolHandler();
        const error = new Error(`Entry '${id}' not found in context type '${type}'.`);
        fileUtils.getValidatedFilePath.mockRejectedValue(error);

        const result = await handler({ type, id, content: 'new content' });

        expect(fs.readFile).not.toHaveBeenCalled();
        expect(fs.writeFile).not.toHaveBeenCalled();
        expect(result.content[0].text).toBe(`Error updating entry: ${error.message}`);
    });

    it('should return error if file has invalid YAML front matter', async () => {
        const handler = getToolHandler();
        const invalidRawContent = `---
invalid: yaml:
---

Content`;
        fs.readFile.mockResolvedValue(invalidRawContent);

        const result = await handler({ type, id, content: 'new content' });

        expect(fs.writeFile).not.toHaveBeenCalled();
        expect(result.content[0].text).toContain('Error updating entry: Cannot update entry with invalid YAML');
    });

    it('should return error if writeFile fails', async () => {
        const handler = getToolHandler();
        const error = new Error('Write permission denied');
        fs.writeFile.mockRejectedValue(error);

        const result = await handler({ type, id, content: 'new content' });

        expect(fs.writeFile).toHaveBeenCalled(); // Attempted write
        expect(result.content[0].text).toBe(`Error updating entry: ${error.message}`);
    });
}); 