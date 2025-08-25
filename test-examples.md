# Przykłady Implementacji Testów - Chrome Extension

## Unit Test Examples

### 1. BookmarkManagerApp Component Test

```typescript
// src/components/BookmarkManagerApp/BookmarkManagerApp.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BookmarkManagerApp } from './BookmarkManagerApp';

// Mock services
vi.mock('../../services/vectorStore.service', () => ({
  vectorStoreService: {
    searchBookmarks: vi.fn(),
    indexBookmarks: vi.fn(),
  }
}));

vi.mock('../../services/ai.service', () => ({
  aiService: {
    processQuery: vi.fn(),
  }
}));

describe('BookmarkManagerApp', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders search interface correctly', () => {
    render(<BookmarkManagerApp />);

    expect(screen.getByPlaceholderText(/Search bookmarks/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Search/i })).toBeInTheDocument();
  });

  it('performs search and displays results', async () => {
    const user = userEvent.setup();
    const mockResults = [
      { id: '1', title: 'Test Bookmark', url: 'https://example.com', score: 0.95 }
    ];

    // Mock the service
    const { vectorStoreService } = await import('../../services/vectorStore.service');
    (vectorStoreService.searchBookmarks as any).mockResolvedValue(mockResults);

    render(<BookmarkManagerApp />);

    const searchInput = screen.getByPlaceholderText(/Search bookmarks/i);
    const searchButton = screen.getByRole('button', { name: /Search/i });

    await user.type(searchInput, 'test query');
    await user.click(searchButton);

    await waitFor(() => {
      expect(screen.getByText('Test Bookmark')).toBeInTheDocument();
      expect(screen.getByText('0.95')).toBeInTheDocument();
    });
  });
});
```

### 2. Vector Store Service Test

```typescript
// src/services/vectorStore.service.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { vectorStoreService } from './vectorStore.service';

// Mock dependencies
vi.mock('./vectorStore/EmbeddingService', () => ({
  EmbeddingService: {
    generateEmbedding: vi.fn().mockResolvedValue([0.1, 0.2, 0.3])
  }
}));

vi.mock('./vectorStore/IndexedDBService', () => ({
  IndexedDBService: {
    saveEmbedding: vi.fn().mockResolvedValue(undefined),
    searchEmbeddings: vi.fn().mockResolvedValue([])
  }
}));

describe('vectorStoreService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('indexes bookmark with AI-generated embedding', async () => {
    const bookmark = {
      id: '1',
      title: 'Test Bookmark',
      url: 'https://example.com',
      content: 'Test content'
    };

    const result = await vectorStoreService.indexBookmark(bookmark);

    expect(result).toBeDefined();
    expect(result.success).toBe(true);

    // Verify embedding was generated
    const { EmbeddingService } = await import('./vectorStore/EmbeddingService');
    expect(EmbeddingService.generateEmbedding).toHaveBeenCalledWith(
      expect.stringContaining('Test Bookmark')
    );
  });

  it('searches bookmarks using semantic similarity', async () => {
    const query = 'test search';
    const mockResults = [
      { bookmarkId: '1', score: 0.95 }
    ];

    // Mock search results
    const { IndexedDBService } = await import('./vectorStore/IndexedDBService');
    (IndexedDBService.searchEmbeddings as any).mockResolvedValue(mockResults);

    const results = await vectorStoreService.searchBookmarks(query, 5);

    expect(results).toHaveLength(1);
    expect(results[0].score).toBe(0.95);
  });
});
```

## Integration Test Examples

### 3. AI Pipeline Integration Test

```typescript
// src/__tests__/integration/ai-pipeline.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleCurrencyConversionRequest } from '../../background/index';
import { getAIProvider } from '../../background/aiProvider';

describe('AI Pipeline Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('processes currency conversion through complete pipeline', async () => {
    // Mock AI provider
    const mockAIAdapter = {
      parseCurrency: vi.fn().mockResolvedValue({
        success: true,
        amount: 100,
        currencyCode: 'USD'
      })
    };

    (getAIProvider as any).mockReturnValue(mockAIAdapter);

    // Mock exchange rate service
    const { exchangeRateService } = await import('../../services/exchangeRateService');
    (exchangeRateService.getRate as any).mockResolvedValue(4.05);

    const result = await handleCurrencyConversionRequest('100 USD', 'PLN');

    expect(result.success).toBe(true);
    expect(result.originalAmount).toBe(100);
    expect(result.originalCurrency).toBe('USD');
    expect(result.convertedAmount).toBe(405.00);
    expect(result.targetCurrency).toBe('PLN');
    expect(result.rate).toBe(4.05);

    // Verify pipeline execution
    expect(mockAIAdapter.parseCurrency).toHaveBeenCalledWith({ text: '100 USD' });
    expect(exchangeRateService.getRate).toHaveBeenCalledWith('USD', 'PLN');
  });
});
```

## E2E Test Examples

### 4. Puppeteer E2E Setup

```typescript
// e2e/setup/extension.test.ts
import { Browser, Page } from 'puppeteer';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

describe('Chrome Extension E2E', () => {
  let browser: Browser;
  let page: Page;

  beforeAll(async () => {
    // Launch browser with extension
    browser = await puppeteer.launch({
      headless: false,
      args: [
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor'
      ]
    });

    page = await browser.newPage();

    // Load extension
    await page.goto('chrome://extensions/');
    // Enable developer mode and load extension
    // ... extension loading logic
  });

  afterAll(async () => {
    await browser.close();
  });

  it('loads extension popup correctly', async () => {
    // Open extension popup
    const popup = await browser.newPage();
    await popup.goto('chrome-extension://[extension-id]/popup.html');

    // Test popup functionality
    const title = await popup.$eval('h1', el => el.textContent);
    expect(title).toContain('Zentala Multitool');
  });
});
```

### 5. Currency Converter E2E Test

```typescript
// e2e/currency-converter.test.ts
describe('Currency Converter E2E', () => {
  it('converts currency via context menu', async () => {
    const page = await browser.newPage();
    await page.goto('https://example.com');

    // Create selectable text
    await page.evaluate(() => {
      const div = document.createElement('div');
      div.textContent = '100 USD to PLN';
      div.style.userSelect = 'text';
      document.body.appendChild(div);
    });

    // Select text and right-click
    const textElement = await page.$('div');
    await textElement.click({ button: 'right' });

    // Wait for context menu and click convert option
    // ... context menu interaction

    // Check notification
    // ... verify conversion result in notification
  });
});
```

## Test Utilities

### 6. Chrome Extension Test Helpers

```typescript
// src/test-utils/chrome-helpers.ts
export const mockChromeAPI = {
  resetAllMocks: () => {
    // Reset all chrome API mocks
    Object.values(chrome).forEach(api => {
      if (typeof api === 'object' && api !== null) {
        Object.values(api).forEach(method => {
          if (typeof method === 'object' && method !== null && 'mockClear' in method) {
            method.mockClear();
          }
        });
      }
    });
  },

  simulateMessage: (message: any) => {
    // Simulate chrome.runtime.sendMessage
    const listeners = chrome.runtime.onMessage.addListener.mock.calls;
    listeners.forEach(([listener]) => {
      listener(message, {}, () => {});
    });
  }
};

export const createMockBookmark = (overrides = {}) => ({
  id: 'test-bookmark-id',
  title: 'Test Bookmark',
  url: 'https://example.com',
  content: 'Test content for bookmark',
  category: 'test',
  addedAt: new Date().toISOString(),
  ...overrides
});
```

## Best Practices

### 7. Test Organization Patterns

```typescript
// Use descriptive test names
describe('CurrencyConverter Component', () => {
  describe('when user types valid currency', () => {
    it('displays conversion result', async () => {
      // Test implementation
    });

    it('handles API errors gracefully', async () => {
      // Test error handling
    });
  });

  describe('when AI needs clarification', () => {
    it('shows clarification input', async () => {
      // Test clarification flow
    });
  });
});

// Use consistent naming conventions
// ✅ Good: should convert currency on Enter key press
// ❌ Bad: test enter key

// Group related tests
describe('Storage Service', () => {
  describe('save operations', () => {
    // All save-related tests
  });

  describe('retrieval operations', () => {
    // All get-related tests
  });
});
```
