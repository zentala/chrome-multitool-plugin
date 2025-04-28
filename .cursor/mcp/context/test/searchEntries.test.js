import { describe, it, expect, vi, beforeEach } from 'vitest';
import path from 'path';
import fs from 'fs/promises';
// import yaml from 'js-yaml'; // Not needed
import { registerSearchEntriesTool } from '../src/tools/searchEntries.js';
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
    const entry1Metadata = { tags: ['important', 'frontend'], status: 'open' };
    const entry1Content = `---
tags: [important, frontend]
status: open
---

Fix the main login button.`;
    const entry2Metadata = { tags: ['backend', 'api'], status: 'done' };
    const entry2Content = `---
tags: [backend, api]
status: done
---

Implement user endpoint.`;
    const entry3Metadata = { tags: ['important', 'api'], status: 'open' };
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
        fs.stat.mockResolvedValue({ isDirectory: () => true }); // Default stat to succeed
    });

    it('should register the tool with the correct name', () => {
        expect(mockServer.tool).toHaveBeenCalled();
        const lastCallArgs = mockServer.tool.mock.calls[mockServer.tool.mock.calls.length - 1];
        expect(lastCallArgs[0]).toBe(toolName);
    });

    it('should return results and empty errors when matching query text across all types', async () => {
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

        // Verify structured response { results, errors }
        expect(result.content[0].type).toBe('json');
        const jsonResponse = result.content[0].json;
        expect(jsonResponse.results).toBeInstanceOf(Array);
        expect(jsonResponse.errors).toBeInstanceOf(Array);
        expect(jsonResponse.errors.length).toBe(0);
        expect(jsonResponse.results.length).toBe(2);
        
        // Check result 1 (todos/entry1)
        const res1 = jsonResponse.results.find(r => r.id === 'todos/entry1');
        expect(res1).toBeDefined();
        expect(res1.id).toBe('todos/entry1');
        expect(res1.metadata).toEqual(entry1Metadata);
        expect(res1.snippets).toBeInstanceOf(Array);
        expect(res1.snippets.length).toBe(1);
        expect(res1.snippets[0]).toHaveProperty('line');
        expect(res1.snippets[0]).toHaveProperty('snippet');
        expect(res1.snippets[0].snippet).toMatch(/\s*>>\s*\d+:.*login button/m);
        
        // Check result 2 (notes/entry4)
        const res2 = jsonResponse.results.find(r => r.id === 'notes/entry4');
        expect(res2).toBeDefined();
        expect(res2.id).toBe('notes/entry4');
        expect(res2.metadata).toEqual({}); // No metadata parsed
        expect(res2.snippets).toBeInstanceOf(Array);
        expect(res2.snippets.length).toBe(1);
        expect(res2.snippets[0].snippet).toMatch(/\s*>>\s*\d+:.*Button styling/m);
    });

    it('should find entries matching query text within a specific type', async () => {
        const handler = getToolHandler();
        const type = 'api_issues';
        const apiDirents = [
            { name: 'entry2.md', isFile: () => true }, // No content match 
            { name: 'entry3.md', isFile: () => true }  // Content match
        ];
        const typePath = path.join(MOCK_CONTEXT_PATH, type);

        fs.readdir.mockResolvedValue(apiDirents);
        fs.readFile
            .mockResolvedValueOnce(entry2Content) // entry2.md
            .mockResolvedValueOnce(entry3Content); // entry3.md

        const result = await handler({ query: 'API', type: type });

        expect(fs.stat).toHaveBeenCalledWith(typePath);
        expect(fs.readdir).toHaveBeenCalledWith(typePath, { withFileTypes: true });

        expect(result.content[0].type).toBe('json');
        const jsonResponse = result.content[0].json;
        expect(jsonResponse.results).toBeInstanceOf(Array);
        expect(jsonResponse.errors).toEqual([]);
        expect(jsonResponse.results.length).toBe(1); // Only entry3 should match content
        
        const res1 = jsonResponse.results[0];
        expect(res1.id).toBe('api_issues/entry3');
        expect(res1.metadata).toEqual(entry3Metadata);
        expect(res1.snippets).toBeInstanceOf(Array);
        expect(res1.snippets.length).toBe(1);
        expect(res1.snippets[0].snippet).toMatch(/\s*>>\s*\d+:.*fix the API/m);
    });

    it('should filter entries by status and return only matching results', async () => {
        const handler = getToolHandler();
        const mockDirs = [ { name: 'todos', isDirectory: () => true } ];
        const todosDirents = [ 
            { name: 'entry1.md', isFile: () => true }, // status: open, matches query
            { name: 'entry2.md', isFile: () => true }, // status: done, does not match status filter
            { name: 'entry3.md', isFile: () => true }  // status: open, matches query
        ];

        fs.readdir
            .mockResolvedValueOnce(mockDirs)
            .mockResolvedValueOnce(todosDirents);
        fs.readFile
            .mockResolvedValueOnce(entry1Content) // entry1.md
            .mockResolvedValueOnce(entry2Content) // entry2.md
            .mockResolvedValueOnce(entry3Content); // entry3.md

        const result = await handler({ query: 'fix', filterStatus: 'open' });

        expect(result.content[0].type).toBe('json');
        const jsonResponse = result.content[0].json;
        expect(jsonResponse.results).toBeInstanceOf(Array);
        expect(jsonResponse.errors).toEqual([]);
        expect(jsonResponse.results.length).toBe(2); // entry1 and entry3 match status and query

        const res1 = jsonResponse.results.find(r => r.id === 'todos/entry1');
        const res3 = jsonResponse.results.find(r => r.id === 'todos/entry3');

        expect(res1).toBeDefined();
        expect(res3).toBeDefined();
        expect(res1.metadata.status).toBe('open');
        expect(res3.metadata.status).toBe('open');
        expect(res1.snippets[0].snippet).toMatch(/Fix the main login button/);
        expect(res3.snippets[0].snippet).toMatch(/Need to fix the API/);
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

        const result = await handler({ query: 'fix', filterTags: 'important, api' });

        expect(result.content[0].type).toBe('json');
        const jsonResponse = result.content[0].json;
        expect(jsonResponse.results).toBeInstanceOf(Array);
        expect(jsonResponse.errors).toEqual([]);
        expect(jsonResponse.results.length).toBe(1); // Only entry3 matches query 'fix' AND tags 'important, api'

        const res1 = jsonResponse.results[0]; 
        expect(res1.id).toBe('issues/entry3');
        expect(res1.metadata.tags).toEqual(expect.arrayContaining(['important', 'api']));
        expect(res1.snippets).toBeInstanceOf(Array);
        expect(res1.snippets[0].snippet).toMatch(/\s*>>\s*\d+:.*Need to fix the API/m);
    });

    it('should combine query, type, status, and tag filters', async () => {
        const handler = getToolHandler();
        const type = 'bugs';
        const bugsDirents = [ 
            { name: 'entry1.md', isFile: () => true }, 
            { name: 'entry3.md', isFile: () => true }  
        ];
        fs.readdir.mockResolvedValue(bugsDirents);
        // Ensure readFile mocks match the order of dirents processing
        fs.readFile
            .mockResolvedValueOnce(entry1Content) // entry1.md
            .mockResolvedValueOnce(entry3Content); // entry3.md

        const result = await handler({ 
            query: 'login', // Case-insensitive match due to .toLowerCase()
            type: type, 
            filterStatus: 'open', 
            filterTags: 'important' 
        });
        
        expect(result.content[0].type).toBe('json');
        const jsonResponse = result.content[0].json;
        expect(jsonResponse.results).toBeInstanceOf(Array);
        expect(jsonResponse.errors).toEqual([]);
        // Re-verified: Both entry1 and entry3 should match
        expect(jsonResponse.results.length).toBe(2); 

        const res1 = jsonResponse.results.find(r => r.id === 'bugs/entry1');
        const res3 = jsonResponse.results.find(r => r.id === 'bugs/entry3');

        expect(res1).toBeDefined(); // Should find entry1
        expect(res3).toBeDefined(); // Should find entry3
        // ... (rest of the assertions for res1 and res3) ...
    });

    it('should return empty results and empty errors if no entries match criteria', async () => {
        const handler = getToolHandler();
        const mockDirs = [ { name: 'todos', isDirectory: () => true } ];
        const todosDirents = [ { name: 'entry1.md', isFile: () => true } ];

        fs.readdir.mockResolvedValueOnce(mockDirs).mockResolvedValueOnce(todosDirents);
        fs.readFile.mockResolvedValueOnce(entry1Content);

        const result = await handler({ query: 'nonexistent' });

        expect(result.content[0].type).toBe('json');
        const jsonResponse = result.content[0].json;
        expect(jsonResponse.results).toBeInstanceOf(Array);
        expect(jsonResponse.results).toEqual([]);
        expect(jsonResponse.errors).toEqual([]);
    });

    it('should return a structured error if context type directory not found', async () => {
        const handler = getToolHandler();
        const nonExistentType = 'ghost';
        const typePath = path.join(MOCK_CONTEXT_PATH, nonExistentType);
        const error = { code: 'ENOENT' }; // Simulate ENOENT
        fs.stat.mockRejectedValue(error);

        const result = await handler({ query: 'anything', type: nonExistentType });
            
        expect(fs.stat).toHaveBeenCalledWith(typePath);
        expect(result.content[0].type).toBe('json');
        expect(result.content[0].json.error).toBe(`Context type '${nonExistentType}' not found.`);
    });

    it('should return a structured error for invalid regex', async () => {
        const handler = getToolHandler();
        const invalidRegex = '[(';

        // No need to mock fs calls as the error should happen before fs interaction

        const result = await handler({ query: invalidRegex, isRegex: true });

        expect(result.content[0].type).toBe('json');
        // Check that the error message indicates an invalid regex directly
        expect(result.content[0].json.error).toMatch(/Invalid regular expression:/);
    });

    it('should return results and add errors for files with processing issues', async () => {
        const handler = getToolHandler();
        const type = 'mixed_issues';
        const mixedDirents = [
            { name: 'good.md', isFile: () => true },
            { name: 'parse_error.md', isFile: () => true },
            { name: 'read_error.md', isFile: () => true },
        ];
        const goodContent = '---\ntitle: Good Entry\n---\nContent matches query.';
        const parseErrorContent = '---\ninvalid: yaml: *anchor\n---\nContent here.';
        const readError = new Error('Permission denied');
        readError.code = 'EACCES';

        fs.readdir.mockResolvedValue(mixedDirents);
        fs.readFile
            .mockResolvedValueOnce(goodContent)       // good.md
            .mockResolvedValueOnce(parseErrorContent) // parse_error.md
            .mockRejectedValueOnce(readError);        // read_error.md

        const result = await handler({ query: 'query', type: type });

        expect(result.content[0].type).toBe('json');
        const jsonResponse = result.content[0].json;

        expect(jsonResponse.results).toBeInstanceOf(Array);
        expect(jsonResponse.results.length).toBe(1); // Only good.md
        expect(jsonResponse.results[0].id).toBe('mixed_issues/good');

        expect(jsonResponse.errors).toBeInstanceOf(Array);
        expect(jsonResponse.errors.length).toBe(2); // parse_error and read_error

        const parseErr = jsonResponse.errors.find(e => e.id === 'mixed_issues/parse_error');
        const readErr = jsonResponse.errors.find(e => e.id === 'mixed_issues/read_error');
        
        expect(parseErr).toBeDefined();
        expect(parseErr.error).toMatch(/YAML parse error:/);
        
        expect(readErr).toBeDefined();
        expect(readErr.error).toMatch(/Read error: Permission denied/);
    });

    it('should add directory read errors to the errors array', async () => {
        const handler = getToolHandler();
        const mockDirs = [
            { name: 'todos', isDirectory: () => true }, 
            { name: 'notes', isDirectory: () => true }
        ];
        const todosDirents = [ { name: 'entry1.md', isFile: () => true } ];
        const readDirError = new Error('Network drive unavailable');

        fs.readdir
            .mockResolvedValueOnce(mockDirs)       // For contextDataPath
            .mockResolvedValueOnce(todosDirents)   // For todos dir (success)
            .mockRejectedValueOnce(readDirError);  // For notes dir (fail)
        fs.readFile.mockResolvedValueOnce(entry1Content); // entry1.md

        const result = await handler({ query: 'button' });

        expect(result.content[0].type).toBe('json');
        const jsonResponse = result.content[0].json;

        // Check results (should find entry1 from todos)
        expect(jsonResponse.results).toBeInstanceOf(Array);
        expect(jsonResponse.results.length).toBe(1);
        expect(jsonResponse.results[0].id).toBe('todos/entry1');
        
        // Check errors (should include the readdir error for 'notes')
        expect(jsonResponse.errors).toBeInstanceOf(Array);
        expect(jsonResponse.errors.length).toBe(1);
        expect(jsonResponse.errors[0].id).toBe('notes');
        expect(jsonResponse.errors[0].error).toMatch(/Error reading directory: Network drive unavailable/);
    });

    // --- Ensure snippet tests also check the new JSON structure ---
    it('should return context snippets correctly within the JSON results', async () => {
         const handler = getToolHandler();
        const type = 'docs';
        const docContent = `Line 1: Intro.\nLine 2: Context before.\nLine 3: Here is the first keyword match.\nLine 4: Context after first.\nLine 5: More context.\nLine 6: Second keyword occurrence.\nLine 7: Context after second.\nLine 8: Final line.`; 
        const docDirents = [{ name: 'guide.md', isFile: () => true }];
        fs.readdir.mockResolvedValue(docDirents);
        fs.readFile.mockResolvedValue(docContent);

        const result = await handler({ query: 'keyword', type: type });
        
        expect(result.content[0].type).toBe('json');
        const jsonResponse = result.content[0].json;
        expect(jsonResponse.results.length).toBe(1);
        expect(jsonResponse.errors).toEqual([]);

        const res1 = jsonResponse.results[0];
        expect(res1.id).toBe('docs/guide');
        expect(res1.snippets).toBeInstanceOf(Array); 
        expect(res1.snippets.length).toBe(2); 

        const snippet1 = res1.snippets.find(s => s.line === 2); 
        const snippet2 = res1.snippets.find(s => s.line === 5); 
        
        expect(snippet1).toBeDefined();
        expect(snippet2).toBeDefined();

        // Check snippets content (same checks as before)
        const snippet1Lines = snippet1.snippet.split('\n');
        expect(snippet1Lines[2]).toMatch(/^\s*>>\s*3: Line 3: Here is the first keyword match./);
        const snippet2Lines = snippet2.snippet.split('\n');
        expect(snippet2Lines[2]).toMatch(/^\s*>>\s*6: Line 6: Second keyword occurrence./);
    });

}); 