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
        
        // Verify structured response
        expect(result.content).toBeInstanceOf(Array);
        expect(result.content.length).toBe(3); // Intro text + 2 results
        
        // Check intro text
        expect(result.content[0]).toEqual({ type: 'text', text: 'Found 2 entries matching "button":' });
        
        // Check result 1 (todos/entry1)
        const res1 = result.content[1];
        expect(res1.type).toBe('search_result');
        expect(res1.id).toBe('todos/entry1');
        expect(res1.snippets).toBeInstanceOf(Array);
        expect(res1.snippets.length).toBeGreaterThan(0);
        // Basic snippet content check
        expect(res1.snippets[0]).toContain('login button');
        expect(res1.snippets[0]).toMatch(/^> \d+:.*button/m); // Check for highlight marker and line number
        
        // Check result 2 (notes/entry4)
        const res2 = result.content[2];
        expect(res2.type).toBe('search_result');
        expect(res2.id).toBe('notes/entry4');
        expect(res2.snippets).toBeInstanceOf(Array);
        expect(res2.snippets.length).toBeGreaterThan(0);
        expect(res2.snippets[0]).toContain('Button styling');
        expect(res2.snippets[0]).toMatch(/^> \d+:.*Button/m);
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

        // Verify structured response
        expect(result.content).toBeInstanceOf(Array);
        expect(result.content.length).toBe(3); // Intro text + 2 results
        expect(result.content[0]).toEqual({ 
            type: 'text', 
            text: `Found 2 entries matching "API" in type '${type}':` 
        });

        // Check result 1 (api_issues/entry2 - metadata match only)
        const res1 = result.content[1];
        expect(res1.type).toBe('search_result');
        expect(res1.id).toBe('api_issues/entry2');
        expect(res1.snippets).toEqual(['(Match found in metadata)']);

        // Check result 2 (api_issues/entry3 - content match)
        const res2 = result.content[2];
        expect(res2.type).toBe('search_result');
        expect(res2.id).toBe('api_issues/entry3');
        expect(res2.snippets).toBeInstanceOf(Array);
        expect(res2.snippets.length).toBeGreaterThan(0);
        expect(res2.snippets[0]).toContain('fix the API');
        expect(res2.snippets[0]).toMatch(/^> \d+:.*API/m);
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
        
        // Verify structured response
        expect(result.content).toBeInstanceOf(Array);
        expect(result.content.length).toBe(3); // Intro text + 2 results
        expect(result.content[0]).toEqual({ 
            type: 'text', 
            text: 'Found 2 entries matching "fix" with status "open":' 
        });

        // Check result 1 (todos/entry1)
        const res1 = result.content[1];
        expect(res1.type).toBe('search_result');
        expect(res1.id).toBe('todos/entry1');
        expect(res1.snippets).toBeInstanceOf(Array);
        expect(res1.snippets[0]).toMatch(/^> \d+:.*Fix/m);

        // Check result 2 (todos/entry3)
        const res2 = result.content[2];
        expect(res2.type).toBe('search_result');
        expect(res2.id).toBe('todos/entry3');
        expect(res2.snippets).toBeInstanceOf(Array);
        expect(res2.snippets[0]).toMatch(/^> \d+:.*fix the API/m);
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
        
        // Verify structured response
        expect(result.content).toBeInstanceOf(Array);
        expect(result.content.length).toBe(2); // Intro text + 1 result
        expect(result.content[0]).toEqual({ 
            type: 'text', 
            text: 'Found 1 entry matching "fix" with tags [important, api]:' 
        });

        // Check result 1 (issues/entry3)
        const res1 = result.content[1];
        expect(res1.type).toBe('search_result');
        expect(res1.id).toBe('issues/entry3');
        expect(res1.snippets).toBeInstanceOf(Array);
        expect(res1.snippets[0]).toMatch(/^> \d+:.*fix the API/m);
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
        
        // Verify structured response
        expect(result.content).toBeInstanceOf(Array);
        expect(result.content.length).toBe(3); // Intro text + 2 results
        expect(result.content[0]).toEqual({ 
            type: 'text', 
            text: `Found 2 entries matching "login" with tags [important] with status "open" in type '${type}':` 
        });

        // Check result 1 (bugs/entry1)
        const res1 = result.content[1];
        expect(res1.type).toBe('search_result');
        expect(res1.id).toBe('bugs/entry1');
        expect(res1.snippets).toBeInstanceOf(Array);
        expect(res1.snippets[0]).toMatch(/^> \d+:.*login button/m);

        // Check result 2 (bugs/entry3)
        const res2 = result.content[2];
        expect(res2.type).toBe('search_result');
        expect(res2.id).toBe('bugs/entry3');
        expect(res2.snippets).toBeInstanceOf(Array);
        expect(res2.snippets[0]).toMatch(/^> \d+:.*Login issue?/m);
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

    it('should return context snippets correctly with line numbers and highlight', async () => {
        const handler = getToolHandler();
        const type = 'docs';
        // Added more lines for better context testing
        const docContent = `Line 1: Intro.
Line 2: Context before.
Line 3: Here is the first keyword match.
Line 4: Context after first.
Line 5: More context.
Line 6: Second keyword occurrence.
Line 7: Context after second.
Line 8: Final line.`; 
        const docDirents = [{ name: 'guide.md', isFile: () => true }];
        fs.stat.mockResolvedValue({ isDirectory: () => true });
        fs.readdir.mockResolvedValue(docDirents);
        fs.readFile.mockResolvedValue(docContent);

        const result = await handler({ query: 'keyword', type: type });
        
        expect(result.content.length).toBe(2); // Intro + 1 result
        expect(result.content[0].text).toContain('Found 1 entry');
        
        const res = result.content[1];
        expect(res.type).toBe('search_result');
        expect(res.id).toBe('docs/guide');
        expect(res.snippets).toBeInstanceOf(Array);
        expect(res.snippets.length).toBe(2); // Expect two separate snippets due to distance

        // Check first snippet (CONTEXT_LINES = 2)
        const snippet1Lines = res.snippets[0].split('\n');
        expect(snippet1Lines.length).toBe(5); // Line 1, 2, 3(match), 4, 5 
        expect(snippet1Lines[0]).toBe('  1: Line 1: Intro.');
        expect(snippet1Lines[1]).toBe('  2: Line 2: Context before.');
        expect(snippet1Lines[2]).toBe('> 3: Line 3: Here is the first keyword match.'); 
        expect(snippet1Lines[3]).toBe('  4: Line 4: Context after first.');
        expect(snippet1Lines[4]).toBe('  5: Line 5: More context.');

        // Check second snippet
        const snippet2Lines = res.snippets[1].split('\n');
        expect(snippet2Lines.length).toBe(5); // Line 4, 5, 6(match), 7, 8
        expect(snippet2Lines[0]).toBe('  4: Line 4: Context after first.');
        expect(snippet2Lines[1]).toBe('  5: Line 5: More context.');
        expect(snippet2Lines[2]).toBe('> 6: Line 6: Second keyword occurrence.'); 
        expect(snippet2Lines[3]).toBe('  7: Line 7: Context after second.');
        expect(snippet2Lines[4]).toBe('  8: Line 8: Final line.');
    });

    it('should handle snippets at the beginning and end of the file', async () => {
        const handler = getToolHandler();
        const type = 'edge_cases';
        const edgeContent = `Keyword at start.
Line 2.
Line 3.
Line 4.
Keyword near end.
Final line.`;
        const edgeDirents = [{ name: 'edges.md', isFile: () => true }];
        fs.stat.mockResolvedValue({ isDirectory: () => true });
        fs.readdir.mockResolvedValue(edgeDirents);
        fs.readFile.mockResolvedValue(edgeContent);

        const result = await handler({ query: 'Keyword', type: type });
        expect(result.content.length).toBe(2);
        const res = result.content[1];
        expect(res.snippets.length).toBe(2);

        // Check snippet at start (CONTEXT_LINES = 2)
        const snippetStartLines = res.snippets[0].split('\n');
        expect(snippetStartLines.length).toBe(3); // Line 1(match), 2, 3
        expect(snippetStartLines[0]).toBe('> 1: Keyword at start.');
        expect(snippetStartLines[1]).toBe('  2: Line 2.');
        expect(snippetStartLines[2]).toBe('  3: Line 3.');

        // Check snippet near end
        const snippetEndLines = res.snippets[1].split('\n');
        expect(snippetEndLines.length).toBe(4); // Line 3, 4, 5(match), 6
        expect(snippetEndLines[0]).toBe('  3: Line 3.');
        expect(snippetEndLines[1]).toBe('  4: Line 4.');
        expect(snippetEndLines[2]).toBe('> 5: Keyword near end.');
        expect(snippetEndLines[3]).toBe('  6: Final line.');
    });

    it('should return metadata match snippet if content does not match', async () => {
        const handler = getToolHandler();
        const type = 'meta_only';
        const metaContent = `---
tags: [keyword]
---

No match here.`;
        const metaDirents = [{ name: 'meta.md', isFile: () => true }];
        fs.stat.mockResolvedValue({ isDirectory: () => true });
        fs.readdir.mockResolvedValue(metaDirents);
        fs.readFile.mockResolvedValue(metaContent);

        const result = await handler({ query: 'keyword', type: type });
        expect(result.content.length).toBe(2);
        const res = result.content[1];
        expect(res.id).toBe('meta_only/meta');
        expect(res.snippets).toEqual(['(Match found in metadata)']);
    });

}); 