import { describe, it, expect, vi, beforeEach } from 'vitest';
import path from 'path';
import fs from 'fs/promises';
import yaml from 'js-yaml'; 
import { registerSearchEntriesTool } from '../src/tools/searchEntries.js';
// We don't need to mock fileUtils here as searchEntries implements its own parsing loop

// Mock fs/promises module
vi.mock('fs/promises');

// Mock MCP Server instance
const mockServer = {
    tool: vi.fn(),
};

const getToolHandler = () => {
    if (mockServer.tool.mock.calls.length === 0) throw new Error('server.tool was not called');
    return mockServer.tool.mock.calls[mockServer.tool.mock.calls.length - 1][3];
};

describe('searchEntries Tool', () => {
    const MOCK_CONTEXT_PATH = '/mock/workspace/.cursor/context';
    const toolName = 'search_entries';

    // Sample data for mocking readFile
    const entry1Content = `---
tags: [important, frontend]
status: open
---

Fix the main login button.`;
    const entry2Content = `---
tags: [backend, api]
status: done
---

Implement user endpoint.`;
    const entry3Content = `---
tags: [important, api]
status: open
---

Need to fix the API authentication flow. Login issue?`;
    const entry4Content = `Simple note without metadata. Button styling needed.`;

    beforeEach(() => {
        vi.resetAllMocks();
        registerSearchEntriesTool(mockServer, MOCK_CONTEXT_PATH);
        // Default mock for base directory access
        fs.access.mockResolvedValue(undefined); 
    });

    it('should register the tool with the correct name', () => {
        expect(mockServer.tool).toHaveBeenCalled();
        const lastCallArgs = mockServer.tool.mock.calls[mockServer.tool.mock.calls.length - 1];
        expect(lastCallArgs[0]).toBe(toolName);
    });

    it('should find entries matching query text across all types', async () => {
        const handler = getToolHandler();
        const mockDirs = [
            { name: 'todos', isDirectory: () => true }, 
            { name: 'notes', isDirectory: () => true }
        ];
        const todosDirents = [ { name: 'entry1.md', isFile: () => true } ];
        const notesDirents = [ { name: 'entry4.md', isFile: () => true } ];

        fs.readdir
            .mockResolvedValueOnce(mockDirs) // For contextDataPath
            .mockResolvedValueOnce(todosDirents) // For todos dir
            .mockResolvedValueOnce(notesDirents); // For notes dir
        fs.readFile
            .mockResolvedValueOnce(entry1Content) // entry1.md
            .mockResolvedValueOnce(entry4Content); // entry4.md

        const result = await handler({ query: 'button' });

        expect(fs.readdir).toHaveBeenCalledTimes(3);
        expect(fs.readFile).toHaveBeenCalledTimes(2);
        expect(result.content[0].text).toContain('Found 2 entries');
        expect(result.content[0].text).toContain('- todos/entry1');
        expect(result.content[0].text).toContain('- notes/entry4');
    });

    it('should find entries matching query text within a specific type', async () => {
        const handler = getToolHandler();
        const type = 'api_issues';
        const apiDirents = [
            { name: 'entry2.md', isFile: () => true }, 
            { name: 'entry3.md', isFile: () => true }
        ];
        const typePath = path.join(MOCK_CONTEXT_PATH, type);

        fs.stat.mockResolvedValue({ isDirectory: () => true }); // Mock type dir exists
        fs.readdir.mockResolvedValue(apiDirents);
        fs.readFile
            .mockResolvedValueOnce(entry2Content) // entry2.md
            .mockResolvedValueOnce(entry3Content); // entry3.md

        const result = await handler({ query: 'API', type: type });

        expect(fs.stat).toHaveBeenCalledWith(typePath);
        expect(fs.readdir).toHaveBeenCalledWith(typePath, { withFileTypes: true });
        expect(fs.readFile).toHaveBeenCalledTimes(2);
        expect(result.content[0].text).toContain('Found 2 entries');
        expect(result.content[0].text).toContain(`in type '${type}'`);
        expect(result.content[0].text).toContain('- api_issues/entry2');
        expect(result.content[0].text).toContain('- api_issues/entry3');
    });

    it('should filter entries by status', async () => {
        const handler = getToolHandler();
        const mockDirs = [ { name: 'todos', isDirectory: () => true } ];
        const todosDirents = [ 
            { name: 'entry1.md', isFile: () => true }, // status: open
            { name: 'entry3.md', isFile: () => true }  // status: open
        ];

        fs.readdir
            .mockResolvedValueOnce(mockDirs)
            .mockResolvedValueOnce(todosDirents);
        fs.readFile
            .mockResolvedValueOnce(entry1Content) // entry1.md
            .mockResolvedValueOnce(entry3Content); // entry3.md

        // Query for 'fix' with status 'open'
        const result = await handler({ query: 'fix', filterStatus: 'open' });

        expect(fs.readFile).toHaveBeenCalledTimes(2);
        expect(result.content[0].text).toContain('Found 2 entries'); // Both match query and status
        expect(result.content[0].text).toContain('with status "open"');
        expect(result.content[0].text).toContain('- todos/entry1');
        expect(result.content[0].text).toContain('- todos/entry3');
    });

    it('should filter entries by tags (requiring all specified tags)', async () => {
        const handler = getToolHandler();
        const mockDirs = [ { name: 'issues', isDirectory: () => true } ];
        const issuesDirents = [ 
            { name: 'entry1.md', isFile: () => true }, // tags: [important, frontend]
            { name: 'entry3.md', isFile: () => true }  // tags: [important, api]
        ];

        fs.readdir.mockResolvedValueOnce(mockDirs).mockResolvedValueOnce(issuesDirents);
        fs.readFile.mockResolvedValueOnce(entry1Content).mockResolvedValueOnce(entry3Content);

        // Query for 'fix' with tags 'important, api'
        const result = await handler({ query: 'fix', filterTags: 'important, api' });

        expect(fs.readFile).toHaveBeenCalledTimes(2);
        expect(result.content[0].text).toContain('Found 1 entry'); // Only entry3 matches tags and query
        expect(result.content[0].text).toContain('with tags [important, api]');
        expect(result.content[0].text).toContain('- issues/entry3');
    });

    it('should combine query, type, status, and tag filters', async () => {
        const handler = getToolHandler();
        const type = 'bugs';
        const bugsDirents = [ 
            { name: 'entry1.md', isFile: () => true }, // open, [important, frontend], content: "Fix the main login button."
            { name: 'entry3.md', isFile: () => true }  // open, [important, api], content: "Need to fix the API authentication flow. Login issue?"
        ];
        const typePath = path.join(MOCK_CONTEXT_PATH, type);

        fs.stat.mockResolvedValue({ isDirectory: () => true });
        fs.readdir.mockResolvedValue(bugsDirents);
        fs.readFile.mockResolvedValueOnce(entry1Content).mockResolvedValueOnce(entry3Content);

        // Query for 'login' in type 'bugs', status 'open', tag 'important'
        const result = await handler({ 
            query: 'login', 
            type: type, 
            filterStatus: 'open', 
            filterTags: 'important' 
        });

        expect(fs.readFile).toHaveBeenCalledTimes(2);
        expect(result.content[0].text).toContain('Found 2 entries'); // Both match all criteria
        expect(result.content[0].text).toContain('matching "login"');
        expect(result.content[0].text).toContain('with tags [important]');
        expect(result.content[0].text).toContain('with status "open"');
        expect(result.content[0].text).toContain(`in type '${type}'`);
        expect(result.content[0].text).toContain('- bugs/entry1');
        expect(result.content[0].text).toContain('- bugs/entry3');
    });

    it('should return "not found" message if no entries match criteria', async () => {
        const handler = getToolHandler();
        const mockDirs = [ { name: 'todos', isDirectory: () => true } ];
        const todosDirents = [ { name: 'entry1.md', isFile: () => true } ]; // status: open

        fs.readdir.mockResolvedValueOnce(mockDirs).mockResolvedValueOnce(todosDirents);
        fs.readFile.mockResolvedValueOnce(entry1Content);

        const result = await handler({ query: 'nonexistent', filterStatus: 'open' });

        expect(result.content[0].text).toContain('No entries found matching "nonexistent" with status "open"');
    });

    it('should handle errors like non-existent type directory', async () => {
        const handler = getToolHandler();
        const type = 'ghost';
        const error = new Error('ENOENT');
        error.code = 'ENOENT';
        fs.stat.mockRejectedValue(error);

        const result = await handler({ query: 'test', type: type });

        expect(result.content[0].text).toContain(`Context type '${type}' not found.`);
    });

}); 