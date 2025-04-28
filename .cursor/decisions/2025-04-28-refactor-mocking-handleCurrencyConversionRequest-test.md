# Decision Log

## [2025-04-28] — Refactor Mocking Strategy for handleCurrencyConversionRequest Test

- **Context:** The test file `src/background/features/currency-converter/handleCurrencyConversionRequest.test.ts` failed with a Vitest error related to module mocking (`Error: [vitest] There was an error when mocking a module...`). The initial approach involved mocking the `getAIProvider` function directly within the `../../index` module, which is also the module exporting the function under test (`handleCurrencyConversionRequest`).

- **Options considered:**
    1.  Continue mocking `getAIProvider` within `../../index` (risky due to potential circular dependencies or mocking conflicts).
    2.  Mock the dependency used by `getAIProvider`, which is the `GoogleAIAdapter` class constructor imported from `../services/ai/GoogleAIAdapter`.
    3.  Mock the `IAIAdapter` interface (less practical as mocking interfaces directly is complex).

- **Decision taken:** Option 2: Mock the `GoogleAIAdapter` module directly.

- **Why this choice:** Mocking the direct dependency (`GoogleAIAdapter`) avoids potential issues with mocking the same module (`../../index`) that exports the function being tested. It provides a cleaner separation and targets the actual external dependency responsible for AI interactions.

- **Risks or alternatives noted:** Mocking the class might require handling its instantiation if the constructor logic is complex (though in this case, the mock factory can return a simple object with the necessary mocked methods).
