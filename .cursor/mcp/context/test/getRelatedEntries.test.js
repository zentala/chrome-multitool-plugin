import { describe, it, expect, vi, beforeEach } from 'vitest';
import path from 'path';
import fs from 'fs/promises';
import { registerGetRelatedEntriesTool } from '../src/tools/getRelatedEntries.js';
import * as fileUtils from '../src/utils/fileUtils.js'; // To mock getValidatedFilePath

// Mock dependencies
vi.mock('fs/promises');
vi.mock('../src/utils/fileUtils.js', async (importOriginal) => {
    const actual = await importOriginal();
    return {
        ...actual, // Keep original parseFrontMatter etc.
        getValidatedFilePath: vi.fn(), // Mock getValidatedFilePath
    };
});

// Mock MCP Server instance
const mockServer = {
    tool: vi.fn(),
};

const getToolHandler = () => {
    if (mockServer.tool.mock.calls.length === 0) throw new Error('server.tool was not called');
    // Assumes get_related_entries is the last registered tool for simplicity in testing
    return mockServer.tool.mock.calls[mockServer.tool.mock.calls.length - 1][3];
};

describe('getRelatedEntries Tool', () => {
    const MOCK_CONTEXT_PATH = '/mock/workspace/.cursor/context';
    const toolName = 'get_related_entries';
    const type = 'notes';
    const id = 'main-note';
    const mockFilePath = path.join(MOCK_CONTEXT_PATH, type, `${id}.md`);

    beforeEach(() => {
        vi.resetAllMocks();
        registerGetRelatedEntriesTool(mockServer, MOCK_CONTEXT_PATH);
        // Default mocks for success cases
        fileUtils.getValidatedFilePath.mockResolvedValue(mockFilePath);
    });

    it('should register the tool with the correct name', () => {
        expect(mockServer.tool).toHaveBeenCalled();
        const lastCallArgs = mockServer.tool.mock.calls[mockServer.tool.mock.calls.length - 1];
        expect(lastCallArgs[0]).toBe(toolName);
    });

    it('should return related entry IDs from the metadata', async () => {
        const handler = getToolHandler();
        const related = ['tasks/task-1', 'ideas/new-concept'];
        const fileContent = `---
related:
  - ${related[0]}
  - ${related[1]}
---

Content of the note.`;
        fs.readFile.mockResolvedValue(fileContent);

        const result = await handler({ type, id });

        expect(fileUtils.getValidatedFilePath).toHaveBeenCalledWith(MOCK_CONTEXT_PATH, type, id);
        expect(fs.readFile).toHaveBeenCalledWith(mockFilePath, 'utf8');
        expect(result.content[0].text).toContain(`Related entries for '${type}/${id}':`);
        expect(result.content[0].text).toContain(`- ${related[0]}`);
        expect(result.content[0].text).toContain(`- ${related[1]}`);
    });

    it('should return message if \'related\' field is missing', async () => {
        const handler = getToolHandler();
        const fileContent = `---
title: Note without related field
---

Some content.`;
        fs.readFile.mockResolvedValue(fileContent);

        const result = await handler({ type, id });
        expect(result.content[0].text).toBe(`Entry '${type}/${id}' has no 'related' field in its metadata.`);
    });

    it('should return message if \'related\' field is not an array', async () => {
        const handler = getToolHandler();
        const fileContent = `---
related: tasks/task-1
---

Content.`;
        fs.readFile.mockResolvedValue(fileContent);

        const result = await handler({ type, id });
        expect(result.content[0].text).toBe(`Entry '${type}/${id}' has a 'related' field, but it is not an array.`);
    });

    it('should return message if \'related\' array is empty or invalid', async () => {
        const handler = getToolHandler();
        const fileContent = `---
related: []
---

Content.`;
        fs.readFile.mockResolvedValue(fileContent);

        const result = await handler({ type, id });
        expect(result.content[0].text).toBe(`Entry '${type}/${id}' has an empty or invalid 'related' array.`);
        
        // Test with invalid entries
         const fileContentInvalid = `---
related: [null, 123, ""]
---

Content.`;
        fs.readFile.mockResolvedValue(fileContentInvalid);
        const resultInvalid = await handler({ type, id });
         expect(resultInvalid.content[0].text).toBe(`Entry '${type}/${id}' has an empty or invalid 'related' array.`);
    });

    it('should return warning if source entry has invalid YAML', async () => {
        const handler = getToolHandler();
        const invalidContent = `---
related: [tasks/task-1
---
Content`;
        fs.readFile.mockResolvedValue(invalidContent);

        const result = await handler({ type, id });
        expect(result.content[0].text).toContain(`Warning: Entry '${type}/${id}' has invalid YAML front matter.`);
    });

    it('should return error if getValidatedFilePath fails', async () => {
        const handler = getToolHandler();
        const error = new Error(`Entry '${id}' not found in context type '${type}'.`);
        fileUtils.getValidatedFilePath.mockRejectedValue(error);

        const result = await handler({ type, id });
        expect(fs.readFile).not.toHaveBeenCalled();
        expect(result.content[0].text).toBe(`Error getting related entries: ${error.message}`);
    });

    it('should return error if readFile fails', async () => {
        const handler = getToolHandler();
        const error = new Error('Permission denied');
        fs.readFile.mockRejectedValue(error);

        const result = await handler({ type, id });
        expect(result.content[0].text).toBe(`Error getting related entries: ${error.message}`);
    });

    it('should return only existing related entries when some are invalid or do not exist', async () => {
        const handler = getToolHandler();
        const existingRelated1 = 'tasks/task-1';
        const nonExistingRelated = 'ideas/non-existent';
        const existingRelated2 = 'notes/another-note';
        const invalidFormatRelated = 'justid'; // Missing type/id separator
        const related = [existingRelated1, nonExistingRelated, existingRelated2, invalidFormatRelated];
        const fileContent = `---
related:
  - ${related[0]}
  - ${related[1]}
  - ${related[2]}
  - ${related[3]}
---

Content of the note.`;
        fs.readFile.mockResolvedValue(fileContent);

        // Mock getValidatedFilePath: succeed for existing, fail for non-existing
        // For the main file path check
        fileUtils.getValidatedFilePath.mockResolvedValueOnce(mockFilePath);
        // For the related entries checks
        fileUtils.getValidatedFilePath
            .mockResolvedValueOnce(path.join(MOCK_CONTEXT_PATH, 'tasks', 'task-1.md')) // tasks/task-1 exists
            .mockRejectedValueOnce(new Error(`Entry 'non-existent' not found in context type 'ideas'.`)) // ideas/non-existent doesn't exist
            .mockResolvedValueOnce(path.join(MOCK_CONTEXT_PATH, 'notes', 'another-note.md')); // notes/another-note exists
            // The invalid format 'justid' won't even reach getValidatedFilePath due to split failure

        const result = await handler({ type, id });

        // Check validation calls for related entries
        expect(fileUtils.getValidatedFilePath).toHaveBeenCalledTimes(4); // Main entry + 3 potentially valid related entries
        expect(fileUtils.getValidatedFilePath).toHaveBeenCalledWith(MOCK_CONTEXT_PATH, type, id);
        expect(fileUtils.getValidatedFilePath).toHaveBeenCalledWith(MOCK_CONTEXT_PATH, 'tasks', 'task-1');
        expect(fileUtils.getValidatedFilePath).toHaveBeenCalledWith(MOCK_CONTEXT_PATH, 'ideas', 'non-existent');
        expect(fileUtils.getValidatedFilePath).toHaveBeenCalledWith(MOCK_CONTEXT_PATH, 'notes', 'another-note');

        expect(result.content[0].text).toContain(`Related entries for '${type}/${id}':`);
        expect(result.content[0].text).toContain(`- ${existingRelated1}`);
        expect(result.content[0].text).toContain(`- ${existingRelated2}`);
        expect(result.content[0].text).not.toContain(`- ${nonExistingRelated}`);
        expect(result.content[0].text).not.toContain(invalidFormatRelated); // Should be skipped due to invalid format
        // We might want to check for logged warnings, but that requires more complex spy setup on console.warn
    });

    it('should return a specific message when \'related\' field exists but none of the entries could be validated', async () => {
        const handler = getToolHandler();
        const nonExistingRelated1 = 'tasks/task-nope';
        const nonExistingRelated2 = 'ideas/idea-gone';
        const related = [nonExistingRelated1, nonExistingRelated2];
        const fileContent = `---
related:
  - ${related[0]}
  - ${related[1]}
---

Content.`;
        fs.readFile.mockResolvedValue(fileContent);

        // Mock getValidatedFilePath: fail for all related entries
        fileUtils.getValidatedFilePath.mockResolvedValueOnce(mockFilePath); // Main entry validation
        fileUtils.getValidatedFilePath.mockRejectedValue(new Error('Entry not found')); // Simulate failure for both related

        const result = await handler({ type, id });

        expect(fileUtils.getValidatedFilePath).toHaveBeenCalledTimes(3); // Main entry + 2 related
        expect(fileUtils.getValidatedFilePath).toHaveBeenCalledWith(MOCK_CONTEXT_PATH, 'tasks', 'task-nope');
        expect(fileUtils.getValidatedFilePath).toHaveBeenCalledWith(MOCK_CONTEXT_PATH, 'ideas', 'idea-gone');
        expect(result.content[0].text).toBe(`Entry '${type}/${id}' has a 'related' field, but none of the specified entries could be found or validated.`);
    });

    it('should handle related entries with leading/trailing whitespace', async () => {
        const handler = getToolHandler();
        const relatedWithSpace = ' tasks/spaced-task ';
        const fileContent = `---
related:
  - ${relatedWithSpace}
---

Content.`;
        fs.readFile.mockResolvedValue(fileContent);
        const expectedValidatedPath = path.join(MOCK_CONTEXT_PATH, 'tasks', `spaced-task.md`);

        // Mock getValidatedFilePath
        fileUtils.getValidatedFilePath.mockResolvedValueOnce(mockFilePath); // Main file
        fileUtils.getValidatedFilePath.mockResolvedValueOnce(expectedValidatedPath); // Related file

        const result = await handler({ type, id });

        // Verify getValidatedFilePath was called with trimmed values
        expect(fileUtils.getValidatedFilePath).toHaveBeenCalledWith(MOCK_CONTEXT_PATH, 'tasks', 'spaced-task');
        expect(result.content[0].text).toContain(`- ${relatedWithSpace.trim()}`); // Output should also likely be trimmed
    });
}); 