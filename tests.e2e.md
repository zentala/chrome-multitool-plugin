# 🚀 Playwright E2E Testing Strategy - Chrome Extension

## 🎯 **Cel i Zakres**

Implementacja kompleksowych End-to-End testów dla **Zentala Chrome Multitool Plugin** przy użyciu **Playwright** - najlepszego narzędzia do testowania rozszerzeń przeglądarek.

### **Dlaczego Playwright?**
- ✅ **Native Chrome Extension Support** - oficjalne wsparcie dla testowania extension
- ✅ **Multi-browser** - Chrome, Firefox, Safari (przyszłość)
- ✅ **Auto-waiting** - inteligentne czekanie na elementy
- ✅ **Rich Assertions** - potężne API do weryfikacji
- ✅ **Trace & Video** - doskonałe debugowanie
- ✅ **Fast & Reliable** - stabilne i szybkie testy

---

## 📋 **Faza 1: Setup i Konfiguracja (2-3 dni)**

### **1.1 Instalacja i Konfiguracja**

```bash
# Dodaj Playwright do devDependencies
pnpm add -D @playwright/test
pnpm add -D @playwright/test-chrome-extension

# Zainstaluj przeglądarki
npx playwright install
npx playwright install-deps
```

### **1.2 Struktura Katalogów**

```
tests/
├── e2e/
│   ├── chrome-extension.spec.ts      # Główny test suite
│   ├── currency-converter.spec.ts    # Currency converter tests
│   ├── bookmark-manager.spec.ts      # Bookmark manager tests
│   ├── allegro-integration.spec.ts   # Allegro integration tests
│   ├── youtube-integration.spec.ts   # YouTube integration tests
│   ├── cross-origin.spec.ts          # Cross-origin scenarios
│   └── performance.spec.ts           # Performance tests
├── fixtures/
│   ├── test-bookmarks.ts             # Test data
│   ├── mock-ai-responses.ts         # Mock AI responses
│   └── extension-helpers.ts          # Extension utilities
└── playwright.config.ts              # Playwright configuration
```

### **1.3 Konfiguracja Playwright**

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',

  use: {
    baseURL: 'chrome-extension://[extension-id]',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chrome-extension',
      use: {
        ...devices['Desktop Chrome'],
        channel: 'chrome',
        // Extension specific config
        contextOptions: {
          permissions: ['bookmarks', 'storage', 'activeTab'],
          acceptDownloads: true,
        }
      },
    },
  ],
});
```

### **1.4 Extension Loading Helper**

```typescript
// tests/fixtures/extension-helpers.ts
import { chromium, BrowserContext, Page } from '@playwright/test';
import path from 'path';

export async function loadExtension(): Promise<{ context: BrowserContext; extensionId: string }> {
  const pathToExtension = path.join(process.cwd(), 'dist');

  const context = await chromium.launchPersistentContext('', {
    headless: false,
    args: [
      `--disable-extensions-except=${pathToExtension}`,
      `--load-extension=${pathToExtension}`,
      '--disable-web-security',
      '--disable-features=VizDisplayCompositor'
    ]
  });

  const page = await context.newPage();
  await page.goto('chrome://extensions/');
  await page.waitForLoadState();

  // Get extension ID
  const extensions = await page.$$eval(
    'extensions-item-list extensions-item',
    items => items.map(item => ({
      id: item.getAttribute('id'),
      name: item.getAttribute('name')
    }))
  );

  const extension = extensions.find(ext => ext.name?.includes('Zentala'));
  if (!extension) {
    throw new Error('Extension not found');
  }

  return { context, extensionId: extension.id };
}
```

---

## 📋 **Faza 2: Core Extension Tests (3-4 dni)**

### **2.1 Extension Loading & Initialization**

```typescript
// tests/e2e/chrome-extension.spec.ts
import { test, expect } from '@playwright/test';
import { loadExtension } from '../fixtures/extension-helpers';

test.describe('Chrome Extension Core', () => {
  let context: BrowserContext;
  let extensionId: string;

  test.beforeAll(async () => {
    ({ context, extensionId } = await loadExtension());
  });

  test.afterAll(async () => {
    await context.close();
  });

  test('extension loads correctly', async () => {
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/popup.html`);

    await expect(page.locator('h1')).toContainText('Zentala Multitool');
  });

  test('background service worker is active', async () => {
    const page = await context.newPage();
    await page.goto('chrome://extensions/');

    // Check if service worker is running
    const workerStatus = await page.locator(`[data-extension-id="${extensionId}"] .service-worker-status`);
    await expect(workerStatus).toContainText('Active');
  });

  test('context menu is registered', async () => {
    // This would require right-click simulation
    const page = await context.newPage();
    await page.goto('https://example.com');

    // Right-click and check context menu
    await page.locator('body').click({ button: 'right' });
    // Note: Context menu testing is limited in Playwright
    // We'll test the functionality through message passing
  });
});
```

### **2.2 Currency Converter E2E Tests**

```typescript
// tests/e2e/currency-converter.spec.ts
import { test, expect } from '@playwright/test';
import { loadExtension } from '../fixtures/extension-helpers';

test.describe('Currency Converter E2E', () => {
  let context: BrowserContext;
  let extensionId: string;

  test.beforeAll(async () => {
    ({ context, extensionId } = await loadExtension());
  });

  test.afterAll(async () => {
    await context.close();
  });

  test('popup currency conversion flow', async () => {
    const popupPage = await context.newPage();
    await popupPage.goto(`chrome-extension://${extensionId}/popup.html`);

    // Wait for component to load
    await popupPage.waitForSelector('[data-testid="currency-input"]');

    // Type currency amount
    await popupPage.fill('[data-testid="currency-input"]', '100 USD');

    // Click convert button
    await popupPage.click('[data-testid="convert-button"]');

    // Wait for result
    await popupPage.waitForSelector('[data-testid="conversion-result"]');

    // Verify result
    const result = popupPage.locator('[data-testid="conversion-result"]');
    await expect(result).toContainText('100 USD');
    await expect(result).toContainText('PLN');
  });

  test('context menu currency conversion', async () => {
    const testPage = await context.newPage();
    await testPage.goto('https://example.com');

    // Create selectable text
    await testPage.evaluate(() => {
      const div = document.createElement('div');
      div.textContent = 'Convert 50 EUR to PLN please';
      div.style.fontSize = '16px';
      div.style.padding = '10px';
      div.style.userSelect = 'text';
      document.body.appendChild(div);
    });

    // Select text
    await testPage.locator('div').selectText();

    // Right-click
    await testPage.locator('div').click({ button: 'right' });

    // Wait for notification (if extension creates one)
    // Note: Context menu simulation is limited in Playwright
    // Alternative: Test through direct message simulation
  });

  test('clarification flow', async () => {
    const popupPage = await context.newPage();
    await popupPage.goto(`chrome-extension://${extensionId}/popup.html`);

    // Type ambiguous currency
    await popupPage.fill('[data-testid="currency-input"]', '100 dollars');

    // Click convert
    await popupPage.click('[data-testid="convert-button"]');

    // Wait for clarification input to appear
    await popupPage.waitForSelector('[data-testid="clarification-input"]');

    // Enter clarification
    await popupPage.fill('[data-testid="clarification-input"]', 'USD');

    // Click retry
    await popupPage.click('[data-testid="retry-button"]');

    // Verify successful conversion
    await popupPage.waitForSelector('[data-testid="conversion-result"]');
    await expect(popupPage.locator('[data-testid="conversion-result"]')).toContainText('USD');
  });

  test('target currency selection and persistence', async () => {
    const popupPage = await context.newPage();
    await popupPage.goto(`chrome-extension://${extensionId}/popup.html`);

    // Change target currency
    await popupPage.selectOption('[data-testid="target-currency-select"]', 'EUR');

    // Verify selection
    await expect(popupPage.locator('[data-testid="target-currency-select"]')).toHaveValue('EUR');

    // Reload page and verify persistence
    await popupPage.reload();
    await expect(popupPage.locator('[data-testid="target-currency-select"]')).toHaveValue('EUR');
  });
});
```

---

## 📋 **Faza 3: Integration Tests (4-5 dni)**

### **3.1 Allegro Integration Tests**

```typescript
// tests/e2e/allegro-integration.spec.ts
import { test, expect } from '@playwright/test';
import { loadExtension } from '../fixtures/extension-helpers';

test.describe('Allegro Integration', () => {
  let context: BrowserContext;
  let extensionId: string;

  test.beforeAll(async () => {
    ({ context, extensionId } = await loadExtension());
  });

  test.afterAll(async () => {
    await context.close();
  });

  test('content script loads on Allegro', async () => {
    const allegroPage = await context.newPage();

    // Mock Allegro page (since we can't access real Allegro without login)
    await allegroPage.route('https://allegro.pl/**', (route) => {
      if (route.request().url().includes('allegro.pl')) {
        route.fulfill({
          status: 200,
          contentType: 'text/html',
          body: `
            <html>
              <body>
                <div class="product-list">
                  <div class="product-item" data-price="299.99" data-name="Test Product">
                    <h3>Test Product</h3>
                    <span class="price">299,99 zł</span>
                  </div>
                </div>
              </body>
            </html>
          `
        });
      } else {
        route.continue();
      }
    });

    await allegroPage.goto('https://allegro.pl/test-category');

    // Verify content script injected elements
    await expect(allegroPage.locator('.zentala-extension-indicator')).toBeVisible();

    // Test currency conversion on Allegro prices
    const priceElement = allegroPage.locator('.price').first();
    await priceElement.selectText();

    // Right-click should trigger context menu
    await priceElement.click({ button: 'right' });
  });

  test('favourites functionality', async () => {
    const allegroPage = await context.newPage();

    await allegroPage.route('https://allegro.pl/**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: `
          <html>
            <body>
              <div class="favourites-container">
                <button class="favourite-btn" data-product-id="12345">
                  Add to Favourites
                </button>
              </div>
            </body>
          </html>
        `
      });
    });

    await allegroPage.goto('https://allegro.pl/favourites');

    // Verify favourites extraction
    await expect(allegroPage.locator('.zentala-favourites-extracted')).toBeVisible();
  });
});
```

### **3.2 YouTube Integration Tests**

```typescript
// tests/e2e/youtube-integration.spec.ts
import { test, expect } from '@playwright/test';
import { loadExtension } from '../fixtures/extension-helpers';

test.describe('YouTube Integration', () => {
  let context: BrowserContext;
  let extensionId: string;

  test.beforeAll(async () => {
    ({ context, extensionId } = await loadExtension());
  });

  test.afterAll(async () => {
    await context.close();
  });

  test('content script loads on YouTube', async () => {
    const youtubePage = await context.newPage();

    await youtubePage.route('https://www.youtube.com/**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: `
          <html>
            <body>
              <div id="primary">
                <div class="video-title">Test Video</div>
                <div id="transcript">Test transcript content...</div>
              </div>
            </body>
          </html>
        `
      });
    });

    await youtubePage.goto('https://www.youtube.com/watch?v=test123');

    // Verify content script loaded
    await expect(youtubePage.locator('.zentala-youtube-controls')).toBeVisible();
  });

  test('transcript enhancement', async () => {
    const youtubePage = await context.newPage();

    await youtubePage.route('https://www.youtube.com/**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: `
          <html>
            <body>
              <div id="transcript-renderer">
                <div class="transcript-line">This is a test transcript with currency 100 USD</div>
              </div>
            </body>
          </html>
        `
      });
    });

    await youtubePage.goto('https://www.youtube.com/watch?v=test123');

    // Click on transcript text with currency
    const transcriptLine = youtubePage.locator('.transcript-line').first();
    await transcriptLine.selectText();
    await transcriptLine.click({ button: 'right' });

    // Verify context menu appears for currency conversion
  });
});
```

---

## 📋 **Faza 4: Advanced Testing (3-4 dni)**

### **4.1 Cross-Origin Communication Tests**

```typescript
// tests/e2e/cross-origin.spec.ts
import { test, expect } from '@playwright/test';
import { loadExtension } from '../fixtures/extension-helpers';

test.describe('Cross-Origin Communication', () => {
  let context: BrowserContext;
  let extensionId: string;

  test.beforeAll(async () => {
    ({ context, extensionId } = await loadExtension());
  });

  test.afterAll(async () => {
    await context.close();
  });

  test('background script message handling', async () => {
    const testPage = await context.newPage();
    await testPage.goto('https://example.com');

    // Inject test script to communicate with extension
    await testPage.addScriptTag({
      content: `
        chrome.runtime.sendMessage(
          { action: 'parseAndConvertCurrency', text: '100 USD' },
          (response) => {
            window.testResult = response;
          }
        );
      `
    });

    // Wait for message processing
    await testPage.waitForTimeout(2000);

    // Verify response
    const result = await testPage.evaluate(() => (window as any).testResult);
    expect(result.success).toBe(true);
    expect(result.originalCurrency).toBe('USD');
  });

  test('content script to background communication', async () => {
    const allegroPage = await context.newPage();

    await allegroPage.route('https://allegro.pl/**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: `
          <html>
            <body>
              <script>
                // Simulate content script sending message
                setTimeout(() => {
                  chrome.runtime.sendMessage(
                    { action: 'extractFavourites' },
                    (response) => {
                      console.log('Favourites extracted:', response);
                    }
                  );
                }, 1000);
              </script>
            </body>
          </html>
        `
      });
    });

    await allegroPage.goto('https://allegro.pl/test');

    // Verify message was processed (check console or storage)
    await allegroPage.waitForTimeout(2000);
  });
});
```

### **4.2 Performance Tests**

```typescript
// tests/e2e/performance.spec.ts
import { test, expect } from '@playwright/test';
import { loadExtension } from '../fixtures/extension-helpers';

test.describe('Performance Tests', () => {
  let context: BrowserContext;
  let extensionId: string;

  test.beforeAll(async () => {
    ({ context, extensionId } = await loadExtension());
  });

  test.afterAll(async () => {
    await context.close();
  });

  test('AI processing time', async () => {
    const popupPage = await context.newPage();
    await popupPage.goto(`chrome-extension://${extensionId}/popup.html`);

    const startTime = Date.now();

    await popupPage.fill('[data-testid="currency-input"]', '100 USD');
    await popupPage.click('[data-testid="convert-button"]');

    await popupPage.waitForSelector('[data-testid="conversion-result"]');

    const endTime = Date.now();
    const processingTime = endTime - startTime;

    // AI processing should be under 3 seconds
    expect(processingTime).toBeLessThan(3000);
  });

  test('storage operation performance', async () => {
    const popupPage = await context.newPage();
    await popupPage.goto(`chrome-extension://${extensionId}/popup.html`);

    const startTime = Date.now();

    // Change target currency multiple times
    for (let i = 0; i < 10; i++) {
      await popupPage.selectOption('[data-testid="target-currency-select"]', 'EUR');
      await popupPage.selectOption('[data-testid="target-currency-select"]', 'USD');
    }

    const endTime = Date.now();
    const operationTime = (endTime - startTime) / 10; // Average per operation

    // Storage operations should be fast
    expect(operationTime).toBeLessThan(100); // < 100ms per operation
  });
});
```

---

## 📋 **Faza 5: CI/CD Integration (1-2 dni)**

### **5.1 GitHub Actions Workflow**

```yaml
# .github/workflows/e2e-tests.yml
name: E2E Tests

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]

jobs:
  e2e-tests:
    runs-on: ubuntu-latest

    steps:
    - uses: actions/checkout@v4

    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '18'
        cache: 'pnpm'

    - name: Install dependencies
      run: pnpm install

    - name: Build extension
      run: pnpm run build

    - name: Install Playwright
      run: npx playwright install --with-deps

    - name: Run E2E tests
      run: npx playwright test

    - name: Upload test results
      uses: actions/upload-artifact@v4
      if: always()
      with:
        name: playwright-report
        path: playwright-report/
        retention-days: 30
```

### **5.2 Test Scripts**

```json
// package.json scripts
{
  "scripts": {
    "test:e2e": "playwright test",
    "test:e2e:headed": "playwright test --headed",
    "test:e2e:debug": "playwright test --debug",
    "test:e2e:ui": "playwright test --ui",
    "test:e2e:currency": "playwright test currency-converter.spec.ts",
    "test:e2e:allegro": "playwright test allegro-integration.spec.ts",
    "test:e2e:performance": "playwright test performance.spec.ts"
  }
}
```

---

## 🛠️ **Narzędzia i Best Practices**

### **Debugging i Troubleshooting**

```typescript
// tests/fixtures/debug-helpers.ts
export async function debugExtension(page: Page, extensionId: string) {
  // Open extension dev tools
  await page.goto(`chrome://extensions/?id=${extensionId}`);
  await page.click('button[data-devtools]');

  // Open background script console
  const backgroundPage = await page.context().newPage();
  await backgroundPage.goto(`chrome-extension://${extensionId}/_generated_background_page.html`);
}

export async function monitorMessages(page: Page) {
  // Monitor chrome.runtime messages
  await page.evaluate(() => {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      console.log('Message received:', message);
    });
  });
}
```

### **Mock Data Management**

```typescript
// tests/fixtures/mock-data.ts
export const mockExchangeRates = {
  'USD_PLN': 4.05,
  'EUR_PLN': 4.32,
  'GBP_PLN': 5.12,
  'USD_EUR': 0.92
};

export const mockAIResponses = {
  simple: {
    success: true,
    amount: 100,
    currencyCode: 'USD'
  },
  clarificationNeeded: {
    success: false,
    needsClarification: 'Please specify currency type',
    error: 'Ambiguous currency'
  },
  error: {
    success: false,
    error: 'AI service unavailable'
  }
};

export async function mockExchangeRateAPI(page: Page) {
  await page.route('https://api.exchangerate-api.com/**', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockExchangeRates)
    });
  });
}
```

---

## 📊 **Metryki i Monitoring**

### **Coverage Goals**
- **Unit Tests:** 80%+ statement coverage
- **Integration Tests:** 90%+ critical path coverage
- **E2E Tests:** 100% user journey coverage
- **Overall:** 85%+ total coverage

### **Test Categories Distribution**
```
- Unit Tests: 70% (istniejące)
- Integration Tests: 20% (nowe)
- E2E Tests: 10% (nowe Playwright)
```

### **Performance Benchmarks**
- AI processing: < 3 seconds
- Storage operations: < 100ms
- Page load impact: < 50ms
- Memory usage: < 50MB

---

## 🎯 **Implementation Roadmap**

### **Week 1: Foundation**
- [ ] Setup Playwright
- [ ] Create basic test structure
- [ ] Extension loading tests
- [ ] Simple popup tests

### **Week 2: Core Functionality**
- [ ] Currency converter E2E
- [ ] Context menu testing
- [ ] Storage integration
- [ ] Error handling

### **Week 3: Integration**
- [ ] Allegro integration tests
- [ ] YouTube integration tests
- [ ] Cross-origin communication
- [ ] Message passing verification

### **Week 4: Polish & CI/CD**
- [ ] Performance tests
- [ ] CI/CD integration
- [ ] Test documentation
- [ ] Maintenance procedures

---

## 🚀 **Zalety Podejścia**

1. **Kompletne Pokrycie** - od UI przez service worker do content scripts
2. **Niezawodność** - auto-waiting i stabilne selektory
3. **Debugging** - trace, video, screenshots
4. **Przyszłość** - gotowość na multi-browser
5. **Performance** - szybkie i efektywne testy
6. **CI/CD Ready** - łatwa integracja z pipeline

Ten plan zapewni **kompletne, niezawodne E2E testy** dla Twojej wtyczki Chrome! 🎉
