# ESLint Error Fix Plan (Updated)

This plan outlines the steps to resolve the remaining ESLint errors.

## Phase 1: Simple Fixes (Low Hanging Fruit)

1.  **Fix Markdown Errors:**
    *   `./.cursor/TODO_CONVERTER.md`: Add language identifier to fenced code block (Rule: `markdown/fenced-code-language`).
    *   `./.cursor/INFO_GCLOUD.md`: Investigate and fix/ignore missing label references (Rule: `markdown/no-missing-label-refs`).
2.  **Fix Simple Source Code Escapes/Entities:**
    *   `src/components/CurrencyConverter/CurrencyConverter.tsx`: Fix unescaped entity (likely `'`) (Rule: `react/no-unescaped-entities`).
    *   `src/services/ai/googleAiAdapter.ts`: Remove unnecessary escape character (`\"`) (Rule: `no-useless-escape`).
    *   `jest.config.js`: Remove unnecessary escape character (`\.`) (Rule: `no-useless-escape`).
3.  **Fix Obvious Unused Variables (`@typescript-eslint/no-unused-vars`):**
    *   **Grouped File Edits:** Address multiple `@typescript-eslint/no-unused-vars` errors simultaneously in the following files:
        *   `src/components/BookmarkManagerApp.tsx` (multiple unused imports and variables like `ChangeEvent`, `Container`, `CircularProgress`, `ToggleButton`, `ToggleButtonGroup`, `TreeView`, `isLoading`, `isSubscribed`, `_`, `renderBookmarkTree`, `countBookmarks`, `handleChatCommand`, `args`)
        *   `src/services/storage.service.ts` (`error` variable in catch blocks)
        *   `src/services/favourites.service.ts` (`result`, `error` variables)
        *   `src/components/SettingsDialog.tsx` (`InputAdornment`, `FormControl` imports)
        *   `src/components/EditDataDialog.tsx` (`handleAddTag`, `handleRemoveTag`)
        *   `src/background/listeners.ts` (`tab` variable)
        *   `src/services/settings.service.ts` (`provider` variable)
        *   `src/services/exchangeRateService.ts` (`e` variable in catch block)
        *   `src/components/BookmarkChat.tsx` (`selectedProvider` variable)
    *   **Action:** Remove the unused import/variable declaration. If a variable in a function signature (like `_` or `e` in catch) is needed for the signature but not the body, prefix it with an underscore (`_tab`, `_e`) if not already done.

## Phase 2: More Complex Fixes (Requires Code Analysis)

*(Run `npm run lint` after Phase 1 to get an updated error list)*

4.  **Address `no-explicit-any` (`@typescript-eslint/no-explicit-any`):**
    *   **Grouped File Review:** Review and fix `any` usage in the following files:
        *   `src/services/vectorStore.service.ts` (multiple instances)
        *   `src/content/logViewer.ts` (multiple instances)
        *   `src/components/BookmarkChat.tsx`
        *   `src/components/BookmarkManagerApp.tsx`
        *   `src/components/DebugPanel.tsx`
        *   `src/components/SearchResults.tsx`
        *   `src/services/ai/googleAiAdapter.ts`
        *   `src/services/storage.service.ts`
        *   `src/types/bookmarks.types.ts`
    *   **Action:** Replace `any` with specific types, `unknown`, or add `// TODO: Fix any type` comments.

## Post-Fix Steps

*   Run `npm run lint` one last time.
*   Run `npm test`.
*   Commit the changes. 