import { describe, it, expect, vi, beforeEach } from 'vitest';
import path from 'path';
import { parseFrontMatter, formatWithFrontMatter, getValidatedFilePath } from '../src/utils/fileUtils.js';
import fs from 'fs/promises'; // We will mock this

// Mock the fs/promises module
vi.mock('fs/promises');

describe('fileUtils', () => {
    
    describe('parseFrontMatter', () => {
        it('should parse valid YAML front matter and content', () => {
            const rawContent = `---  
tags: [test, yaml]
status: parsing
---

This is the main content.`;
            const { metadata, mainContent } = parseFrontMatter(rawContent, 'dummy/path.md');
            
            expect(metadata).toEqual({ tags: ['test', 'yaml'], status: 'parsing' });
            expect(mainContent).toBe('This is the main content.');
        });

        it('should return empty metadata and full content if no front matter exists', () => {
            const rawContent = `# Title

Just content.`;
            const { metadata, mainContent } = parseFrontMatter(rawContent, 'dummy/path.md');

            expect(metadata).toEqual({});
            expect(mainContent).toBe(rawContent);
        });

        it('should return parseError in metadata for invalid YAML', () => {
            const rawContent = `--- 
tags: [test
status: invalid
---

Content.`;
            const { metadata, mainContent } = parseFrontMatter(rawContent, 'dummy/path.md');

            expect(metadata).toHaveProperty('parseError');
            expect(metadata.parseError).toContain('YAML');
            expect(mainContent).toBe(rawContent); // Keep raw content on parse error
        });

         it('should handle empty front matter block', () => {
            const rawContent = `--- 
---

Content.`;
            const { metadata, mainContent } = parseFrontMatter(rawContent, 'dummy/path.md');
            
            expect(metadata).toEqual({}); // Parsed as empty object
            expect(mainContent).toBe('Content.');
        });
    });

    describe('formatWithFrontMatter', () => {
        it('should format metadata and content correctly', () => {
            const metadata = { title: 'Test Entry', tags: ['format'] };
            const content = 'Main body of the entry.';
            // Use template literal for multiline string
            const expectedYaml = `title: Test Entry
tags:
  - format
`; 
            const expectedOutput = `---
${expectedYaml}---

${content}`; 

            const formatted = formatWithFrontMatter(metadata, content);
            // Normalize line endings for comparison
            expect(formatted.replace(/\r\n/g, '\n')).toBe(expectedOutput.replace(/\r\n/g, '\n'));
        });

        it('should handle empty metadata object', () => {
            const metadata = {};
            const content = 'Content only.';
            const formatted = formatWithFrontMatter(metadata, content);
             // Expect only the content to be returned when metadata is empty
             expect(formatted).toBe(content);
        });
    });

    describe('getValidatedFilePath', () => {
        const MOCK_CONTEXT_PATH = '/mock/workspace/.cursor/context'; // Using forward slashes for consistency

        beforeEach(() => {
            // Reset mocks before each test in this suite
            vi.resetAllMocks();
        });

        it('should return the full path if type and file exist', async () => {
            const type = 'todos';
            const id = 'task1';
            const expectedPath = path.join(MOCK_CONTEXT_PATH, type, `${id}.md`);

            // Mock fs.stat for directory check
            fs.stat.mockResolvedValue({ isDirectory: () => true }); 
            // Mock fs.access for file check (resolves = accessible)
            fs.access.mockResolvedValue(undefined); 

            await expect(getValidatedFilePath(MOCK_CONTEXT_PATH, type, id)).resolves.toBe(expectedPath);
            expect(fs.stat).toHaveBeenCalledWith(path.join(MOCK_CONTEXT_PATH, type));
            expect(fs.access).toHaveBeenCalledWith(expectedPath, fs.constants.R_OK);
        });

        it('should throw if context type directory does not exist', async () => {
            const type = 'nonexistent';
            const id = 'task1';
            const error = new Error('ENOENT: no such file or directory');
            error.code = 'ENOENT';

            fs.stat.mockRejectedValue(error);

            await expect(getValidatedFilePath(MOCK_CONTEXT_PATH, type, id))
                  .rejects.toThrow(`Context type directory '${type}' not found.`);
            expect(fs.stat).toHaveBeenCalledWith(path.join(MOCK_CONTEXT_PATH, type));
            expect(fs.access).not.toHaveBeenCalled();
        });

         it('should throw if context type path is not a directory', async () => {
            const type = 'not_a_dir';
            const id = 'task1';

            fs.stat.mockResolvedValue({ isDirectory: () => false });

            await expect(getValidatedFilePath(MOCK_CONTEXT_PATH, type, id))
                  .rejects.toThrow(`Context path for type '${type}' is not a valid directory.`);
            expect(fs.stat).toHaveBeenCalledWith(path.join(MOCK_CONTEXT_PATH, type));
            expect(fs.access).not.toHaveBeenCalled();
        });

        it('should throw if entry file does not exist', async () => {
            const type = 'todos';
            const id = 'nonexistent_task';
            const expectedPath = path.join(MOCK_CONTEXT_PATH, type, `${id}.md`);
            const error = new Error('ENOENT: no such file or directory');
            error.code = 'ENOENT';

            fs.stat.mockResolvedValue({ isDirectory: () => true });
            fs.access.mockRejectedValue(error);

            await expect(getValidatedFilePath(MOCK_CONTEXT_PATH, type, id))
                  .rejects.toThrow(`Entry '${id}' not found in context type '${type}'.`);
            expect(fs.stat).toHaveBeenCalledWith(path.join(MOCK_CONTEXT_PATH, type));
            expect(fs.access).toHaveBeenCalledWith(expectedPath, fs.constants.R_OK);
        });

        it('should re-throw other fs.access errors', async () => {
            const type = 'todos';
            const id = 'no_permission';
            const expectedPath = path.join(MOCK_CONTEXT_PATH, type, `${id}.md`);
            const error = new Error('EACCES: permission denied');
            error.code = 'EACCES';

            fs.stat.mockResolvedValue({ isDirectory: () => true });
            fs.access.mockRejectedValue(error);

            await expect(getValidatedFilePath(MOCK_CONTEXT_PATH, type, id))
                  .rejects.toThrow(error);
         });
    });
}); 