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
        const resultText = result.content[0].text;
        expect(resultText).toContain('Found 2 entries');
        // Check entry 1
        expect(resultText).toContain('**todos/entry1**');
        expect(resultText).toContain('Fix the main login button.'); 
        // Check entry 4 (no metadata, only content match)
        expect(resultText).toContain('**notes/entry4**');
        expect(resultText).toContain('Button styling needed.');
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
        const resultText = result.content[0].text;
        expect(resultText).toContain('Found 2 entries');
        expect(resultText).toContain(`in type '${type}'`);
        // Check entry 2 (match in metadata only)
        expect(resultText).toContain('**api_issues/entry2**');
        expect(resultText).toContain('(Match found in metadata)');
        // Check entry 3 (match in content)
        expect(resultText).toContain('**api_issues/entry3**');
        expect(resultText).toContain('Need to fix the API authentication flow.');
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
        const resultText = result.content[0].text;
        expect(resultText).toContain('Found 2 entries'); 
        expect(resultText).toContain('with status "open"');
        expect(resultText).toContain('**todos/entry1**');
        expect(resultText).toContain('Fix the main login button.');
        expect(resultText).toContain('**todos/entry3**');
        expect(resultText).toContain('Need to fix the API authentication flow.');
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
        const resultText = result.content[0].text;
        expect(resultText).toContain('Found 1 entry'); 
        expect(resultText).toContain('with tags [important, api]');
        expect(resultText).toContain('**issues/entry3**'); // Only entry3 matches tags AND query
        expect(resultText).toContain('Need to fix the API authentication flow.');
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
        const resultText = result.content[0].text;
        expect(resultText).toContain('Found 2 entries'); 
        expect(resultText).toContain('matching "login"');
        expect(resultText).toContain('with tags [important]');
        expect(resultText).toContain('with status "open"');
        expect(resultText).toContain(`in type '${type}'`);
        expect(resultText).toContain('**bugs/entry1**');
        expect(resultText).toContain('Fix the main login button.');
        expect(resultText).toContain('**bugs/entry3**');
        expect(resultText).toContain('Login issue?'); // Contains 'login'
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

    // --- NEW TESTS FOR SNIPPETS --- 

    it('should return context snippets correctly', async () => {
        const handler = getToolHandler();
        const type = 'docs';
        const docContent = `Line 1: Intro.
Line 2: Here is the keyword.
Line 3: Some explanation.
Line 4: Another mention of the keyword.
Line 5: Conclusion.`;
        const docDirents = [{ name: 'guide.md', isFile: () => true }];
        fs.stat.mockResolvedValue({ isDirectory: () => true });
        fs.readdir.mockResolvedValue(docDirents);
        fs.readFile.mockResolvedValue(docContent);

        const result = await handler({ query: 'keyword', type: type });
        const resultText = result.content[0].text;

        expect(resultText).toContain('Found 1 entry');
        expect(resultText).toContain('**docs/guide**');
        // Check first snippet
        expect(resultText).toContain('  Line 1: Intro.\n  Line 2: Here is the keyword.\n  Line 3: Some explanation.');
        expect(resultText).not.toContain('...\n  Line 1: Intro.'); // Should not have prefix ellipsis
        // Check second snippet
        expect(resultText).toContain('  Line 3: Some explanation.\n  Line 4: Another mention of the keyword.\n  Line 5: Conclusion.');
        expect(resultText).not.toContain('Line 5: Conclusion.\n...'); // Should not have suffix ellipsis
    });

    it('should handle matches at the start and end of the file', async () => {
        const handler = getToolHandler();
        const type = 'logs';
        const logContent = `Keyword at start.\nLine 2.\nLine 3.\nKeyword at end.`;
        const logDirents = [{ name: 'daily.md', isFile: () => true }];
        fs.stat.mockResolvedValue({ isDirectory: () => true });
        fs.readdir.mockResolvedValue(logDirents);
        fs.readFile.mockResolvedValue(logContent);

        const result = await handler({ query: 'keyword', type: type });
        const resultText = result.content[0].text;
        // console.log("--- DEBUG START/END TEST ---");
        // console.log(resultText);
        // console.log("--- END DEBUG ---");

        expect(resultText).toContain('Found 1 entry');
        expect(resultText).toContain('**logs/daily**');
        
        // Define expected snippets precisely
        const expectedSnippet1 = `  Keyword at start.\n  Line 2.`;
        const expectedSnippet2 = `  Line 3.\n  Keyword at end.`;

        // Check first snippet precisely (no prefix ellipsis)
        expect(resultText).toContain(expectedSnippet1);
        // Ensure it doesn't have the prefix ellipsis immediately before
        expect(resultText).not.toContain(`...\n${expectedSnippet1}`); 

        // Check second snippet precisely (no suffix ellipsis)
        expect(resultText).toContain(expectedSnippet2);
        // Ensure it doesn't have the suffix ellipsis immediately after
        expect(resultText).not.toContain(`${expectedSnippet2}\n...`); 
    });

    it('should indicate when a match is found only in metadata', async () => {
         const handler = getToolHandler();
         const type = 'config';
         const configContent = `---
setting: keyword
---

Main content without the word.`;
         const configDirents = [{ name: 'app.md', isFile: () => true }];
         fs.stat.mockResolvedValue({ isDirectory: () => true });
         fs.readdir.mockResolvedValue(configDirents);
         fs.readFile.mockResolvedValue(configContent);

         const result = await handler({ query: 'keyword', type: type });
         const resultText = result.content[0].text;

         expect(resultText).toContain('Found 1 entry');
         expect(resultText).toContain('**config/app**');
         expect(resultText).toContain('  (Match found in metadata)');
    });

}); 