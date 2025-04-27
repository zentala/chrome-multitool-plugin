# Best Practices for Testing Chrome Extensions (React, TypeScript, Vitest)

This document summarizes common approaches and best practices for testing Chrome extensions built with React, TypeScript, and potentially using Vitest.

## 1. Separation of Concerns: Abstract Chrome APIs

*   **Goal:** Minimize direct calls to `chrome.*` APIs within React components and core application logic.
*   **How:** Create an abstraction layer (e.g., custom hooks, service classes/functions) that handles communication with Chrome APIs (`chrome.runtime.sendMessage`, `chrome.storage.*`, etc.). Your components interact with this abstraction layer, not directly with `chrome.*`.
*   **Benefits:**
    *   Makes components easier to test in isolation (mock the abstraction layer).
    *   Makes the abstraction layer itself testable (mock the `chrome.*` APIs specifically for that layer).
    *   Improves code organization and maintainability.

## 2. Unit Tests (Vitest/Jest)

*   **Focus:** Testing individual functions, modules, or components in isolation.
*   **Tools:** Vitest (or Jest), `@testing-library/react` for components.
*   **Mocking:**
    *   **Crucial:** Mock *all* external dependencies, especially Chrome APIs (`chrome.*`) and network requests (`fetch`).
    *   Mock the abstraction layer created in point 1 when testing components.
    *   Mock the actual `chrome.*` APIs when testing the abstraction layer itself.
*   **Assertions:** Use standard `expect` along with extensions like `@testing-library/jest-dom` (using the `/vitest` import or setup).
*   **Speed:** Should be very fast.

## 3. Integration Tests

*   **Focus:** Testing the interaction between multiple units/modules. For example, testing the communication flow between a popup script and a background script via `sendMessage`.
*   **Tools:** Can often use the same framework (Vitest/Jest).
*   **Mocking:** Mock fewer things than in unit tests. You might mock external APIs called by the background script but use a *real* (or partially mocked) `sendMessage` mechanism between the tested units.
*   **Complexity:** More complex to set up than unit tests.

## 4. End-to-End (E2E) Tests

*   **Focus:** Testing the entire extension flow in a real browser environment, simulating user interactions.
*   **Tools:** Puppeteer, Playwright, Selenium.
*   **Process:**
    1.  Programmatically launch a browser (e.g., Chrome).
    2.  Load the built extension into the browser.
    3.  Automate user actions (clicking the popup icon, interacting with the popup UI, interacting with web pages for content scripts).
    4.  Assert the expected outcomes (UI changes, storage updates, background script behavior).
*   **Pros:** Highest confidence level.
*   **Cons:** Slowest, most complex to write and maintain, can be flaky.

## 5. Mocking Chrome APIs (The Challenge)

This is often the trickiest part in unit/integration tests because `chrome.*` APIs are not standard JavaScript modules and exist globally within the extension's context.

*   **Manual Mocking (Our current approach):**
    *   Use `vi.fn()` to create mock implementations for needed API methods (`sendMessage`, `storage.local.get`, etc.).
    *   Assign these mocks to the global scope. `vi.stubGlobal('chrome', { runtime: {...} })` is generally preferred over `Object.assign(global, { chrome: ... })` as it's cleaner and designed for this purpose within Vitest.
    *   Manage mock state (e.g., using `mockReset()` in `beforeEach`).
    *   **Challenge:** TypeScript typing for these global mocks can be problematic, as we've seen (`Cannot augment module 'chrome'`, issues recognizing mock methods like `mockReset`).
*   **Mocking Libraries:**
    *   `jest-chrome`: Designed for Jest, might require adaptation for Vitest.
    *   `sinon-chrome`: Another option, might integrate differently.
    *   These libraries aim to provide pre-built, correctly typed mocks. Research might be needed to see if Vitest-compatible forks or alternatives exist.
*   **`vi.mock()` (Ideal but difficult):** If `chrome` could be treated as a module, `vi.mock('chrome', ...)` would be the standard Vitest way, handling hoisting and factory functions correctly. This is generally not possible out-of-the-box.

## Recommendations Based on Our Current State

1.  **Try `vi.stubGlobal`:** Explicitly use `vi.stubGlobal('chrome', { ... })` in `setupTests.ts` or even within specific test files where needed, instead of `Object.assign`. This *might* improve type inference for the mock methods.
2.  **Refactor to Abstract:** Consider creating a simple service (e.g., `src/services/chromeApi.ts`) that wraps `chrome.runtime.sendMessage`. Components would import and use this service. Testing the component would involve mocking *this service* (easy), and testing the service would involve mocking `chrome.runtime.sendMessage` (contained problem).
3.  **Temporary `@ts-expect-error`:** If `vi.stubGlobal` doesn't fix typing issues, as a last resort before giving up on Vitest, use `@ts-expect-error` for the lines where TypeScript incorrectly complains about missing mock methods (`mockReset`, `mockResolvedValueOnce`).

Let's choose a path forward for the `CurrencyConverter.test.tsx` file based on these practices. 