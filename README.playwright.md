# 🚀 Playwright E2E Testing Setup for Chrome Extension

## 📋 **Szybki Start**

### 1. Instalacja Playwright

```bash
# Dodaj Playwright do projektu
pnpm add -D @playwright/test @playwright/test-chrome-extension

# Zainstaluj przeglądarki
npx playwright install --with-deps
```

### 2. Zbuduj Extension

```bash
# Zbuduj extension do folderu dist/
npm run build
```

### 3. Uruchom Testy

```bash
# Wszystkie testy
npm run test:e2e

# Testy z przeglądarką (headed mode)
npm run test:e2e:headed

# Debug mode
npm run test:e2e:debug

# Visual UI mode
npm run test:e2e:ui
```

---

## 🏗️ **Struktura Testów**

```
tests/
├── e2e/                          # Testy E2E
│   ├── currency-converter.spec.ts   # Currency converter tests
│   ├── allegro-integration.spec.ts  # Allegro integration
│   ├── youtube-integration.spec.ts  # YouTube integration
│   └── cross-origin.spec.ts         # Cross-origin tests
├── fixtures/                     # Helper functions
│   ├── extension-helpers.ts         # Extension loading
│   ├── mock-data.ts                # Mock data
│   └── debug-helpers.ts            # Debug utilities
├── global-setup.ts               # Global test setup
└── playwright.config.ts           # Playwright configuration
```

---

## 🎯 **Główne Funkcje**

### **Currency Converter Tests**
```bash
npm run test:e2e:currency
```

Testuje:
- ✅ Popup interface
- ✅ Currency conversion flow
- ✅ Context menu integration
- ✅ Target currency selection
- ✅ Error handling
- ✅ Storage persistence

### **Allegro Integration Tests**
```bash
npm run test:e2e:allegro
```

Testuje:
- ✅ Content script loading
- ✅ Price detection
- ✅ Favourites functionality
- ✅ Cross-origin communication
- ✅ Storage integration

### **YouTube Integration Tests**
```bash
# (Do implementacji)
npm run test:e2e:youtube
```

---

## 🔧 **Konfiguracja**

### **Playwright Config**

```typescript
// playwright.config.ts
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false, // Important for extension tests
  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [{
    name: 'chrome-extension',
    use: { ...devices['Desktop Chrome'] }
  }]
});
```

### **Extension Helpers**

```typescript
// tests/fixtures/extension-helpers.ts
import { chromium, BrowserContext } from '@playwright/test';
import path from 'path';

export async function loadExtension(): Promise<{
  context: BrowserContext;
  extensionId: string
}> {
  const pathToExtension = path.join(process.cwd(), 'dist');

  const context = await chromium.launchPersistentContext('', {
    headless: false,
    args: [
      `--load-extension=${pathToExtension}`,
      '--disable-web-security'
    ]
  });

  // Get extension ID from chrome://extensions
  const extensionsPage = await context.newPage();
  await extensionsPage.goto('chrome://extensions/');

  const extensions = await extensionsPage.$$eval(
    'extensions-item-list extensions-item',
    items => items.map(item => ({
      id: item.getAttribute('id'),
      name: item.getAttribute('name')
    }))
  );

  const extension = extensions.find(ext =>
    ext.name?.includes('Zentala')
  );

  return { context, extensionId: extension!.id };
}
```

---

## 🧪 **Przykładowe Testy**

### **Basic Extension Test**

```typescript
// tests/e2e/currency-converter.spec.ts
import { test, expect } from '@playwright/test';
import { loadExtension, openExtensionPopup } from '../fixtures/extension-helpers';

test.describe('Currency Converter', () => {
  let context: any;
  let extensionId: string;

  test.beforeAll(async () => {
    ({ context, extensionId } = await loadExtension());
  });

  test('popup loads correctly', async () => {
    const popupPage = await openExtensionPopup(context, extensionId);
    await expect(popupPage.locator('h1')).toContainText('Zentala');
  });

  test('converts currency successfully', async () => {
    const popupPage = await openExtensionPopup(context, extensionId);

    // Type currency and convert
    await popupPage.fill('input[placeholder*="USD"]', '100 USD');
    await popupPage.click('button:has-text("Convert")');

    // Verify result
    await expect(popupPage.locator('div')).toContainText('≈');
  });
});
```

### **Allegro Integration Test**

```typescript
// tests/e2e/allegro-integration.spec.ts
test.describe('Allegro Integration', () => {
  test('content script loads on Allegro', async () => {
    const allegroPage = await context.newPage();

    // Mock Allegro page
    await allegroPage.route('https://allegro.pl/**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: `<html><body><div class="price">299,99 zł</div></body></html>`
      });
    });

    await allegroPage.goto('https://allegro.pl/test');

    // Test currency detection
    await allegroPage.locator('.price').selectText();
    await allegroPage.locator('.price').click({ button: 'right' });

    // Verify extension processes the price
    // ... extension interaction tests
  });
});
```

---

## 🐛 **Debugging i Troubleshooting**

### **Debug Mode**

```bash
# Uruchom test w debug mode
npm run test:e2e:debug

# Uruchom konkretny test
npx playwright test tests/e2e/currency-converter.spec.ts --debug
```

### **Visual Testing**

```bash
# Uruchom z UI mode
npm run test:e2e:ui

# Zobacz trace po teście
npx playwright show-trace test-results/
```

### **Extension Debugging**

```typescript
// tests/fixtures/debug-helpers.ts
export async function debugExtension(page: Page, extensionId: string) {
  // Open extension dev tools
  await page.goto(`chrome://extensions/?id=${extensionId}`);
  await page.click('button[data-devtools]');

  // Open background script console
  const backgroundPage = await page.context().newPage();
  await backgroundPage.goto(
    `chrome-extension://${extensionId}/_generated_background_page.html`
  );
}
```

---

## 📊 **Raporty i Coverage**

### **HTML Report**

```bash
# Po testach, otwórz raport
npm run test:e2e:report

# Lub bezpośrednio
npx playwright show-report
```

### **CI/CD Integration**

```yaml
# .github/workflows/e2e.yml
name: E2E Tests
on: [push, pull_request]

jobs:
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install

      - name: Build extension
        run: npm run build

      - name: Install Playwright
        run: npx playwright install --with-deps

      - name: Run E2E tests
        run: npm run test:e2e

      - name: Upload test results
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
```

---

## 🎯 **Best Practices**

### **1. Test Isolation**
```typescript
// Use beforeAll/afterAll for expensive setup
test.beforeAll(async () => {
  ({ context, extensionId } = await loadExtension());
});

test.afterAll(async () => {
  await context.close();
});
```

### **2. Mock External Services**
```typescript
// Mock APIs for consistent testing
await context.route('https://api.exchangerate-api.com/**', (route) => {
  route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ rates: { PLN: 4.05 } })
  });
});
```

### **3. Flexible Selectors**
```typescript
// Use data-testid for reliable selection
await page.click('[data-testid="convert-button"]');

// Or flexible text matching
await page.click('button:has-text("Convert")');
```

### **4. Wait Strategies**
```typescript
// Wait for extension-specific elements
await page.waitForSelector('.extension-loaded-indicator');

// Wait for async operations
await page.waitForTimeout(1000); // For AI processing
```

---

## 🚀 **Następne Kroki**

1. **Zainstaluj Playwright** - `pnpm add -D @playwright/test`
2. **Dodaj skrypty** - Skopiuj skrypty z `package.e2e.json`
3. **Uruchom testy** - `npm run test:e2e`
4. **Rozszerz testy** - Dodaj więcej scenariuszy

---

## 📞 **Wsparcie**

- **Dokumentacja Playwright**: https://playwright.dev/
- **Chrome Extension Testing**: https://playwright.dev/docs/chrome-extensions
- **GitHub Issues**: https://github.com/microsoft/playwright/issues

**Pamiętaj**: Playwright to najlepszy wybór do testowania Chrome Extensions! 🎉
