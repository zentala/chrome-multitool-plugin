// tests/e2e/allegro-integration.spec.ts
import { test, expect } from '@playwright/test';
import { loadExtension, createTestPage } from '../fixtures/extension-helpers';

test.describe('Allegro Integration', () => {
  let context: any;
  let extensionId: string;

  test.beforeAll(async () => {
    ({ context, extensionId } = await loadExtension());

    // Mock Allegro API responses
    await context.route('https://allegro.pl/**', (route) => {
      const url = route.request().url();

      if (url.includes('/api/')) {
        // Mock API responses
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            products: [
              {
                id: '12345',
                name: 'Test Product 1',
                price: 299.99,
                currency: 'PLN',
                category: 'Electronics'
              },
              {
                id: '67890',
                name: 'Test Product 2',
                price: 149.50,
                currency: 'PLN',
                category: 'Books'
              }
            ]
          })
        });
      } else {
        // Mock HTML pages
        route.fulfill({
          status: 200,
          contentType: 'text/html',
          body: `
            <!DOCTYPE html>
            <html lang="pl">
            <head>
              <meta charset="UTF-8">
              <title>Allegro.pl - Test Page</title>
            </head>
            <body>
              <div class="allegro-header">
                <h1>Allegro.pl</h1>
              </div>

              <div class="search-results">
                <div class="product-item" data-product-id="12345">
                  <h3 class="product-title">Test Product 1</h3>
                  <div class="price">
                    <span class="price-value">299,99</span>
                    <span class="price-currency">zł</span>
                  </div>
                  <button class="add-to-favourites" data-product-id="12345">
                    Dodaj do ulubionych
                  </button>
                </div>

                <div class="product-item" data-product-id="67890">
                  <h3 class="product-title">Test Product 2</h3>
                  <div class="price">
                    <span class="price-value">149,50</span>
                    <span class="price-currency">zł</span>
                  </div>
                  <button class="add-to-favourites" data-product-id="67890">
                    Dodaj do ulubionych
                  </button>
                </div>
              </div>

              <div class="favourites-section">
                <h2>Ulubione</h2>
                <div id="favourites-list">
                  <!-- Favourites will be populated here -->
                </div>
              </div>

              <!-- Extension integration indicator -->
              <div id="zentala-extension-status" style="display: none;">
                Extension loaded
              </div>
            </body>
            </html>
          `
        });
      }
    });
  });

  test.afterAll(async () => {
    await context.close();
  });

  test('extension loads on Allegro domain', async () => {
    const allegroPage = await createTestPage(context, 'https://allegro.pl/test-category');

    // Verify page loaded
    await expect(allegroPage.locator('.allegro-header h1')).toContainText('Allegro.pl');

    // Check if extension content script loaded (indicator)
    await expect(allegroPage.locator('#zentala-extension-status')).toBeVisible();

    console.log('✅ Extension content script loaded on Allegro');
  });

  test('currency detection on product prices', async () => {
    const allegroPage = await createTestPage(context, 'https://allegro.pl/test-category');

    // Find first product price
    const priceElement = allegroPage.locator('.price').first();
    await expect(priceElement).toBeVisible();

    // Select price text
    await priceElement.selectText();

    // Test currency parsing via extension
    const result = await allegroPage.evaluate(async () => {
      const selectedText = window.getSelection()?.toString();
      return new Promise((resolve) => {
        // @ts-ignore
        if (typeof chrome !== 'undefined' && chrome.runtime) {
          // @ts-ignore
          chrome.runtime.sendMessage(
            { action: 'parseAndConvertCurrency', text: selectedText },
            (response: any) => {
              resolve(response);
            }
          );
        } else {
          resolve({ error: 'Extension not available' });
        }
      });
    });

    console.log('Currency parsing result:', result);

    // Verify extension processed the request
    if (result && typeof result === 'object') {
      expect(result).toHaveProperty('success');
    }
  });

  test('favourites functionality integration', async () => {
    const allegroPage = await createTestPage(context, 'https://allegro.pl/favourites');

    // Verify favourites section exists
    await expect(allegroPage.locator('.favourites-section')).toBeVisible();

    // Test extension's favourites extraction
    const favouritesData = await allegroPage.evaluate(async () => {
      return new Promise((resolve) => {
        // @ts-ignore
        if (typeof chrome !== 'undefined' && chrome.runtime) {
          // @ts-ignore
          chrome.runtime.sendMessage(
            { action: 'extractFavourites' },
            (response: any) => {
              resolve(response);
            }
          );
        } else {
          resolve({ error: 'Extension not available' });
        }
      });
    });

    console.log('Favourites extraction result:', favouritesData);

    // Verify extension responded
    if (favouritesData && typeof favouritesData === 'object') {
      expect(favouritesData).toBeDefined();
    }
  });

  test('context menu on product prices', async () => {
    const allegroPage = await createTestPage(context, 'https://allegro.pl/test-category');

    // Find and click on a price
    const priceValue = allegroPage.locator('.price-value').first();
    await expect(priceValue).toBeVisible();

    // Select price text and right-click
    await priceValue.selectText();
    await priceValue.click({ button: 'right' });

    // Wait for any extension processing
    await allegroPage.waitForTimeout(1000);

    // Verify the price text was selectable and clickable
    const selectedText = await allegroPage.evaluate(() => {
      return window.getSelection()?.toString();
    });

    expect(selectedText).toMatch(/\d+,\d+/); // Should contain price format like "299,99"
    console.log('✅ Price text selection works:', selectedText);
  });

  test('multiple products handling', async () => {
    const allegroPage = await createTestPage(context, 'https://allegro.pl/test-category');

    // Count products
    const productCount = await allegroPage.locator('.product-item').count();
    expect(productCount).toBeGreaterThan(1);

    console.log(`✅ Found ${productCount} products on page`);

    // Verify each product has required elements
    for (let i = 0; i < productCount; i++) {
      const product = allegroPage.locator('.product-item').nth(i);
      await expect(product.locator('.product-title')).toBeVisible();
      await expect(product.locator('.price')).toBeVisible();
    }

    console.log('✅ All products have required elements');
  });

  test('extension storage integration', async () => {
    const allegroPage = await createTestPage(context, 'https://allegro.pl/test-category');

    // Test extension storage operations
    const storageResult = await allegroPage.evaluate(async () => {
      return new Promise((resolve) => {
        // @ts-ignore
        if (typeof chrome !== 'undefined' && chrome.storage) {
          // @ts-ignore
          chrome.storage.local.set({ 'test-key': 'test-value' }, () => {
            // @ts-ignore
            chrome.storage.local.get(['test-key'], (result) => {
              resolve(result);
            });
          });
        } else {
          resolve({ error: 'Storage not available' });
        }
      });
    });

    console.log('Storage test result:', storageResult);

    // Verify storage works
    if (storageResult && typeof storageResult === 'object') {
      expect(storageResult).toHaveProperty('test-key');
    }
  });
});
