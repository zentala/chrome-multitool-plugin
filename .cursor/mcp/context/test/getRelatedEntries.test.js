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
        // Assume related entries also exist by default unless overridden in a test
        vi.spyOn(fileUtils, 'getValidatedFilePath').mockImplementation(async (contextPath, entryType, entryId) => {
            // Default success for the main entry
            if (entryType === type && entryId === id) return mockFilePath;
            // Default success for related entries (can be overridden per test)
            return path.join(contextPath, entryType, `${entryId}.md`); 
        });
    });

    it('should register the tool with the correct name', () => {
        expect(mockServer.tool).toHaveBeenCalled();
        const lastCallArgs = mockServer.tool.mock.calls[mockServer.tool.mock.calls.length - 1];
        expect(lastCallArgs[0]).toBe(toolName);
    });

    it('should return related entry IDs from the metadata as JSON', async () => {
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
        
        expect(result.content[0].type).toBe('json');
        const jsonResult = result.content[0].json;
        expect(jsonResult.relatedIds).toEqual(related);
        expect(jsonResult.warnings).toBeUndefined(); // No warnings expected
    });

    it('should return an empty array if \'related\' field is missing', async () => {
        const handler = getToolHandler();
        const fileContent = `---
title: Note without related field
---

Some content.`;
        fs.readFile.mockResolvedValue(fileContent);

        const result = await handler({ type, id });
        expect(result.content[0].type).toBe('json');
        expect(result.content[0].json).toEqual([]); // Expect empty array
    });

    it('should return a structured error if \'related\' field is not an array', async () => {
        const handler = getToolHandler();
        const fileContent = `---
related: tasks/task-1
---

Content.`;
        fs.readFile.mockResolvedValue(fileContent);

        const result = await handler({ type, id });
        expect(result.content[0].type).toBe('json');
        expect(result.content[0].json.error).toMatch(/related\' field, but it is not an array/);
    });

    it('should return an empty array if \'related\' array is empty or contains only invalid entries', async () => {
        const handler = getToolHandler();
        const fileContentEmpty = `---
related: []
---

Content.`;
        fs.readFile.mockResolvedValue(fileContentEmpty);
        const resultEmpty = await handler({ type, id });
        expect(resultEmpty.content[0].type).toBe('json');
        expect(resultEmpty.content[0].json).toEqual([]); // Expect empty array for empty 'related'
        
        const fileContentInvalid = `---
related: [null, 123, ""]
---

Content.`;
        fs.readFile.mockResolvedValue(fileContentInvalid);
        const resultInvalid = await handler({ type, id });
        expect(resultInvalid.content[0].type).toBe('json');
        expect(resultInvalid.content[0].json).toEqual([]); // Expect empty array for invalid entries
    });

    it('should return a structured warning if source entry has invalid YAML', async () => {
        const handler = getToolHandler();
        const invalidContent = `---
related: [tasks/task-1
---
Content`;
        fs.readFile.mockResolvedValue(invalidContent);

        const result = await handler({ type, id });
        expect(result.content[0].type).toBe('json');
        expect(result.content[0].json.warning).toMatch(/invalid YAML front matter/);
    });

    it('should return a structured error if getValidatedFilePath fails for the main entry', async () => {
        const handler = getToolHandler();
        const error = new Error(`Entry '${id}' not found in context type '${type}'.`);
        // Reset the mock specifically for this test
        vi.mocked(fileUtils.getValidatedFilePath).mockRejectedValue(error);

        const result = await handler({ type, id });
        expect(fs.readFile).not.toHaveBeenCalled();
        expect(result.content[0].type).toBe('json');
        expect(result.content[0].json.error).toBe(`Error getting related entries: ${error.message}`);
    });

    it('should return a structured error if readFile fails', async () => {
        const handler = getToolHandler();
        const error = new Error('Permission denied');
        // Reset file system mocks for this specific case
        fileUtils.getValidatedFilePath.mockResolvedValue(mockFilePath);
        fs.readFile.mockRejectedValue(error);

        const result = await handler({ type, id });
        expect(result.content[0].type).toBe('json');
        expect(result.content[0].json.error).toBe(`Error getting related entries: ${error.message}`);
    });

    it('should return only validated related entry IDs and include warnings for invalid/non-existent ones', async () => {
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

        // Setup mock for getValidatedFilePath to handle different cases
        vi.mocked(fileUtils.getValidatedFilePath).mockImplementation(async (contextPath, entryType, entryId) => {
            if (entryType === type && entryId === id) return mockFilePath; // Main entry
            if (entryType === 'tasks' && entryId === 'task-1') return path.join(contextPath, entryType, `${entryId}.md`);
            if (entryType === 'notes' && entryId === 'another-note') return path.join(contextPath, entryType, `${entryId}.md`);
            if (entryType === 'ideas' && entryId === 'non-existent') throw new Error('ENOENT'); // Simulate not found
            // Default throw for any other unexpected calls
            throw new Error(`Unexpected validation call for ${entryType}/${entryId}`);
        });

        const result = await handler({ type, id });

        expect(result.content[0].type).toBe('json');
        const jsonResult = result.content[0].json;

        // Check validated IDs
        expect(jsonResult.relatedIds).toEqual([existingRelated1, existingRelated2]);

        // Check warnings
        expect(jsonResult.warnings).toBeInstanceOf(Array);
        expect(jsonResult.warnings.length).toBe(2); // One for non-existent, one for invalid format
        expect(jsonResult.warnings).toEqual(expect.arrayContaining([
            expect.stringMatching(/Invalid related entry format: "justid"/), // Check invalid format warning
            expect.stringMatching(/Related entry "ideas\/non-existent" .* not found or invalid: ENOENT/) // Check not found warning
        ]));
    });

    it('should return empty relatedIds and include warnings when related field exists but none validate', async () => {
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
        vi.mocked(fileUtils.getValidatedFilePath).mockImplementation(async (contextPath, entryType, entryId) => {
             if (entryType === type && entryId === id) return mockFilePath; // Main entry
             throw new Error('ENOENT'); // Simulate failure for related
        });

        const result = await handler({ type, id });

        expect(result.content[0].type).toBe('json');
        const jsonResult = result.content[0].json;
        expect(jsonResult.relatedIds).toEqual([]); // Expect empty array of validated IDs
        expect(jsonResult.warnings).toBeInstanceOf(Array);
        expect(jsonResult.warnings.length).toBe(2);
        expect(jsonResult.warnings).toEqual(expect.arrayContaining([
            expect.stringMatching(/Related entry "tasks\/task-nope".*ENOENT/),
            expect.stringMatching(/Related entry "ideas\/idea-gone".*ENOENT/)
        ]));
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

        // Mock getValidatedFilePath - assume the spaced one exists
        vi.mocked(fileUtils.getValidatedFilePath).mockImplementation(async (contextPath, entryType, entryId) => {
             if (entryType === type && entryId === id) return mockFilePath; // Main entry
             if (entryType === 'tasks' && entryId === 'spaced-task') return expectedValidatedPath;
             throw new Error(`Unexpected validation call for ${entryType}/${entryId}`);
        });

        const result = await handler({ type, id });

        // Verify getValidatedFilePath was called with trimmed values
        expect(fileUtils.getValidatedFilePath).toHaveBeenCalledWith(MOCK_CONTEXT_PATH, 'tasks', 'spaced-task');
        
        expect(result.content[0].type).toBe('json');
        const jsonResult = result.content[0].json;
        // The returned ID should be the original string from the file
        expect(jsonResult.relatedIds).toEqual([relatedWithSpace]); 
        expect(jsonResult.warnings).toBeUndefined();
    });
}); 